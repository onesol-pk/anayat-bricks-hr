"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const EXPENSE_TYPES = [
  "dasti",
  "oil",
  "miti",
  "crane time",
  "coal",
  "bora",
  "food",
  "repairing",
  "advance",
  "sand",
  "bhatha khata",
  "coal crushing",
  "others",
]

const PAYMENT_METHODS = ["cash", "jazzcash", "ubl", "meezan"]

function getTodayDateInput() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().split("T")[0]
}

function getMonthStartInput() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}-01`
}

function formatMoney(value) {
  const number = Number(value) || 0
  return new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(Math.round(number))
}

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  const [expenseType, setExpenseType] = useState("dasti")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [expenseDate, setExpenseDate] = useState(getTodayDateInput())

  const [visibleRows, setVisibleRows] = useState(10)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  useEffect(() => {
    fetchExpenses()
  }, [])

  async function fetchExpenses() {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) throw error

      setExpenses(data || [])
    } catch (error) {
      alert(error.message || "Failed to load expenses")
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const today = getTodayDateInput()
    const monthStart = getMonthStartInput()

    const totalEntries = expenses.length

    const todayExpense = expenses.reduce((sum, item) => {
      if (String(item.expense_date || "") === today) {
        return sum + (Number(item.amount) || 0)
      }
      return sum
    }, 0)

    const monthExpense = expenses.reduce((sum, item) => {
      const expenseDateValue = String(item.expense_date || "")
      if (expenseDateValue >= monthStart) {
        return sum + (Number(item.amount) || 0)
      }
      return sum
    }, 0)

    const largestExpense = expenses.reduce((max, item) => {
      const value = Number(item.amount) || 0
      return value > max ? value : max
    }, 0)

    const totalExpense = expenses.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    )

    return {
      totalEntries,
      todayExpense,
      monthExpense,
      largestExpense,
      totalExpense,
    }
  }, [expenses])

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const date = String(item.expense_date || "")

      if (fromDate && date < fromDate) return false
      if (toDate && date > toDate) return false

      return true
    })
  }, [expenses, fromDate, toDate])

  const visibleExpenses = useMemo(() => {
    return filteredExpenses.slice(0, visibleRows)
  }, [filteredExpenses, visibleRows])

  async function handleSave(e) {
    e.preventDefault()

    const parsedAmount = Number(amount) || 0

    if (parsedAmount <= 0) {
      alert("Please enter a valid amount")
      return
    }

    try {
      const { error } = await supabase.from("expenses").insert([
        {
          expense_type: expenseType,
          amount: parsedAmount,
          note: note.trim(),
          payment_method: paymentMethod,
          expense_date: expenseDate,
        },
      ])

      if (error) {
        alert(error.message)
        return
      }

      // Rokar will read from the expenses table directly, so this save is the feed.
      alert("Expense saved successfully")

      setExpenseType("dasti")
      setAmount("")
      setNote("")
      setPaymentMethod("cash")
      setExpenseDate(getTodayDateInput())
      setVisibleRows(10)

      await fetchExpenses()
    } catch (error) {
      alert(error.message || "Failed to save expense")
    }
  }

  function handlePrint() {
    const rowsToPrint = filteredExpenses

    const printWindow = window.open("", "", "width=1200,height=800")
    if (!printWindow) {
      alert("Popup blocked. Please allow popups for printing.")
      return
    }

    const rowsHtml =
      rowsToPrint.length > 0
        ? rowsToPrint
            .map(
              (item) => `
                <tr>
                  <td>${item.expense_date || "-"}</td>
                  <td>${titleCase(item.expense_type)}</td>
                  <td>${titleCase(item.payment_method)}</td>
                  <td>${formatMoney(item.amount)}</td>
                  <td>${item.note || "-"}</td>
                </tr>
              `
            )
            .join("")
        : `
          <tr>
            <td colspan="5">No expense records found</td>
          </tr>
        `

    printWindow.document.write(`
      <html>
        <head>
          <title>Expenses Print</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #000;
            }
            h1 {
              margin: 0 0 6px 0;
            }
            .sub {
              margin-bottom: 18px;
              color: #555;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 10px;
              text-align: left;
              font-size: 14px;
            }
            th {
              background: #f3f4f6;
            }
          </style>
        </head>
        <body>
          <h1>Expenses History</h1>
          <div class="sub">
            ${fromDate || "All"} to ${toDate || "All"}
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  function handleDateFilterChange(setter, value) {
    setter(value)
    setVisibleRows(10)
  }

  return (
    <div className="min-h-screen bg-[#061226] text-white">
      <div className="px-4 py-4 md:px-8 md:py-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-orange-400 uppercase tracking-[0.35em] text-xs mb-3">
                Anayat Sons Bricks
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Expenses
              </h1>
              <p className="text-gray-400 mt-3 max-w-2xl">
                Record kiln expenses, keep the history clean, and make everything ready for Rokar.
              </p>
            </div>

            <div className="flex gap-3">
              <Link href="/admin">
                <button className="rounded-xl bg-white/5 px-5 py-3 font-semibold text-gray-200 hover:bg-white/10 transition border border-white/10">
                  Back to Dashboard
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-10 md:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="rounded-3xl border border-orange-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Today Expense</p>
              <p className="mt-2 text-3xl font-bold text-orange-300">
                Rs {formatMoney(stats.todayExpense)}
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">This Month</p>
              <p className="mt-2 text-3xl font-bold text-emerald-300">
                Rs {formatMoney(stats.monthExpense)}
              </p>
            </div>

            <div className="rounded-3xl border border-sky-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Total Entries</p>
              <p className="mt-2 text-3xl font-bold text-sky-300">
                {formatMoney(stats.totalEntries)}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Largest Expense</p>
              <p className="mt-2 text-3xl font-bold text-white">
                Rs {formatMoney(stats.largestExpense)}
              </p>
            </div>
          </div>

          {/* FORM */}
          <section className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-[#0f223a] shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-orange-500/25 via-orange-500/10 to-transparent" />
            <div className="relative p-6 md:p-7">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-6">
                <div>
                  <p className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-orange-500/15 text-orange-200">
                    Expense Entry
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold mt-3">
                    Add New Expense
                  </h2>
                  <p className="text-gray-400 mt-1">
                    Keep every operational cost recorded and ready for Rokar.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                    Expense date
                  </p>
                  <p className="text-sm text-gray-200 mt-1">{expenseDate}</p>
                </div>
              </div>

              <form
                onSubmit={handleSave}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Expense Type
                  </label>
                  <select
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                    required
                  >
                    {EXPENSE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {titleCase(type)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                    placeholder="Enter amount"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {titleCase(method)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                    required
                  />
                </div>

                <div className="md:col-span-2 xl:col-span-3">
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Note
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full min-h-[110px] rounded-2xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                    placeholder="Optional note"
                  />
                </div>

                <div className="xl:col-span-3 pt-1">
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:opacity-90 transition"
                  >
                    Save Expense
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* HISTORY */}
          <section className="bg-[#0f223a] border border-white/10 rounded-3xl p-6 md:p-7 shadow-2xl">
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Expense History</h2>
                <p className="text-gray-400 mt-1">
                  Showing the latest records with date filtering and print.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    From
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => handleDateFilterChange(setFromDate, e.target.value)}
                    className="rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    To
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => handleDateFilterChange(setToDate, e.target.value)}
                    className="rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handlePrint}
                    className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:opacity-90 transition"
                  >
                    Print
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700 text-orange-400">
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Method</th>
                    <th className="py-3 pr-4">Amount</th>
                    <th className="py-3 pr-4">Note</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td className="py-6 text-gray-400" colSpan={5}>
                        Loading expenses...
                      </td>
                    </tr>
                  ) : visibleExpenses.length === 0 ? (
                    <tr>
                      <td className="py-6 text-gray-400" colSpan={5}>
                        No expenses found for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    visibleExpenses.map((item) => (
                      <tr key={item.id} className="border-b border-gray-800">
                        <td className="py-3 pr-4">{item.expense_date}</td>
                        <td className="py-3 pr-4">{titleCase(item.expense_type)}</td>
                        <td className="py-3 pr-4">{titleCase(item.payment_method)}</td>
                        <td className="py-3 pr-4 text-rose-300 font-semibold">
                          Rs {formatMoney(item.amount)}
                        </td>
                        <td className="py-3 pr-4">{item.note || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredExpenses.length > visibleRows && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setVisibleRows((prev) => prev + 10)}
                  className="rounded-xl bg-white/5 px-6 py-3 font-semibold text-gray-200 hover:bg-white/10 transition border border-white/10"
                >
                  Load More
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
