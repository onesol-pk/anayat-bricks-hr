"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function getTodayDateInput() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().split("T")[0]
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

function getRowColor(type) {
  if (type === "Income") return "text-emerald-300"
  if (type === "Expense") return "text-rose-300"
  if (type === "Advance") return "text-orange-300"
  return "text-gray-200"
}

function getRowBadge(type) {
  if (type === "Income") return "bg-emerald-500/15 text-emerald-300"
  if (type === "Expense") return "bg-rose-500/15 text-rose-300"
  if (type === "Advance") return "bg-orange-500/15 text-orange-300"
  return "bg-white/10 text-gray-200"
}

export default function RokarPage() {
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState(getTodayDateInput())
  const [toDate, setToDate] = useState(getTodayDateInput())
  const [visibleRows, setVisibleRows] = useState(10)

  const [customerPayments, setCustomerPayments] = useState([])
  const [workerDeductions, setWorkerDeductions] = useState([])
  const [cashSales, setCashSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [advances, setAdvances] = useState([])

  useEffect(() => {
    fetchRokar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchRokar() {
    setLoading(true)

    try {
      const startDate = fromDate <= toDate ? fromDate : toDate
      const endDate = fromDate <= toDate ? toDate : fromDate

      const [
        customerPaymentsRes,
        workerDeductionsRes,
        cashSalesRes,
        expensesRes,
        advancesRes,
      ] = await Promise.all([
        supabase
          .from("customer_payments")
          .select("*")
          .gte("payment_date", startDate)
          .lte("payment_date", endDate)
          .order("payment_date", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("deductions")
          .select("*")
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("sales")
          .select("*")
          .eq("sale_type", "cash")
          .gte("sale_date", startDate)
          .lte("sale_date", endDate)
          .order("sale_date", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("expenses")
          .select("*")
          .gte("expense_date", startDate)
          .lte("expense_date", endDate)
          .order("expense_date", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("advances")
          .select("*")
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false }),
      ])

      if (customerPaymentsRes.error) throw customerPaymentsRes.error
      if (workerDeductionsRes.error) throw workerDeductionsRes.error
      if (cashSalesRes.error) throw cashSalesRes.error
      if (expensesRes.error) throw expensesRes.error
      if (advancesRes.error) throw advancesRes.error

      setCustomerPayments(customerPaymentsRes.data || [])
      setWorkerDeductions(workerDeductionsRes.data || [])
      setCashSales(cashSalesRes.data || [])
      setExpenses(expensesRes.data || [])
      setAdvances(advancesRes.data || [])
    } catch (error) {
      alert(error.message || "Failed to load rokar")
    } finally {
      setLoading(false)
    }
  }

  function handleFilter(e) {
    e.preventDefault()
    fetchRokar()
  }

  function handleToday() {
    const today = getTodayDateInput()
    setFromDate(today)
    setToDate(today)
    setVisibleRows(10)
    setTimeout(() => fetchRokar(), 0)
  }
  const rows = useMemo(() => {
    const list = []

    customerPayments.forEach((item) => {
      list.push({
        id: `cp-${item.id}`,
        date: item.payment_date,
        type: "Income",
        source: "Customer Payment",
        name: item.customer_name || "-",
        method: item.payment_method || "-",
        note: item.notes || "-",
        amount: Number(item.amount) || 0,
      })
    })

    workerDeductions.forEach((item) => {
      list.push({
        id: `ded-${item.id}`,
        date: item.date,
        type: "Income",
        source: "Worker Deduction",
        name: item.worker_name || item.name || "-",
        method: item.deduction_type || "-",
        note: item.notes || "-",
        amount: Number(item.amount) || 0,
      })
    })

    cashSales.forEach((item) => {
      list.push({
        id: `sale-${item.id}`,
        date: item.sale_date,
        type: "Income",
        source: "Cash Sale",
        name: item.customer_name || "-",
        method: item.brick_type || "-",
        note: `${titleCase(item.sale_type)} sale`,
        amount: Number(item.total_amount) || 0,
      })
    })

    expenses.forEach((item) => {
      list.push({
        id: `exp-${item.id}`,
        date: item.expense_date,
        type: "Expense",
        source: titleCase(item.expense_type),
        name: "-",
        method: titleCase(item.payment_method),
        note: item.note || "-",
        amount: Number(item.amount) || 0,
      })
    })

    advances.forEach((item) => {
      list.push({
        id: `adv-${item.id}`,
        date: item.date,
        type: "Advance",
        source: "Worker Advance",
        name: item.worker_name || item.name || "-",
        method: "-",
        note: item.notes || "-",
        amount: Number(item.amount) || 0,
      })
    })

    return list.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [customerPayments, workerDeductions, cashSales, expenses, advances])

  const filteredRows = useMemo(() => {
    const startDate = fromDate <= toDate ? fromDate : toDate
    const endDate = fromDate <= toDate ? toDate : fromDate

    return rows.filter((row) => {
      if (startDate && row.date < startDate) return false
      if (endDate && row.date > endDate) return false
      return true
    })
  }, [rows, fromDate, toDate])

  const visibleHistoryRows = useMemo(() => {
    return filteredRows.slice(0, visibleRows)
  }, [filteredRows, visibleRows])

  const totals = useMemo(() => {
    const totalIncome = customerPayments.reduce((sum, item) => {
      return sum + (Number(item.amount) || 0)
    }, 0) + workerDeductions.reduce((sum, item) => {
      return sum + (Number(item.amount) || 0)
    }, 0) + cashSales.reduce((sum, item) => {
      return sum + (Number(item.total_amount) || 0)
    }, 0)

    const totalExpense = expenses.reduce((sum, item) => {
      return sum + (Number(item.amount) || 0)
    }, 0)

    const totalAdvance = advances.reduce((sum, item) => {
      return sum + (Number(item.amount) || 0)
    }, 0)

    const currentRokar = totalIncome - totalExpense - totalAdvance

    const today = getTodayDateInput()

    const todayIncome = rows.reduce((sum, row) => {
      if (row.date !== today) return sum
      return row.type === "Income" ? sum + Number(row.amount || 0) : sum
    }, 0)

    const todayExpense = rows.reduce((sum, row) => {
      if (row.date !== today) return sum
      return row.type === "Expense" ? sum + Number(row.amount || 0) : sum
    }, 0)

    const todayAdvance = rows.reduce((sum, row) => {
      if (row.date !== today) return sum
      return row.type === "Advance" ? sum + Number(row.amount || 0) : sum
    }, 0)

    const todayRokar = todayIncome - todayExpense - todayAdvance

    return {
      totalIncome,
      totalExpense,
      totalAdvance,
      currentRokar,
      todayIncome,
      todayExpense,
      todayAdvance,
      todayRokar,
    }
  }, [rows, customerPayments, workerDeductions, cashSales, expenses, advances])

  function handlePrint() {
    const printWindow = window.open("", "", "width=1200,height=800")

    if (!printWindow) {
      alert("Popup blocked. Please allow popups for printing.")
      return
    }

    const printRows = filteredRows
      .map(
        (row) => `
          <tr>
            <td>${row.date}</td>
            <td>${row.type}</td>
            <td>${row.source}</td>
            <td>${row.name}</td>
            <td>${row.method}</td>
            <td>${row.note}</td>
            <td>${row.type === "Expense" || row.type === "Advance" ? "-" : "+"}${formatMoney(row.amount)}</td>
          </tr>
        `
      )
      .join("")

    printWindow.document.write(`
      <html>
        <head>
          <title>Rokar Print</title>
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
          <h1>Rokar</h1>
          <div class="sub">${fromDate || "All"} to ${toDate || "All"}</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Source</th>
                <th>Name</th>
                <th>Method</th>
                <th>Note</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${printRows || `<tr><td colspan="7">No records found</td></tr>`}
            </tbody>
          </table>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 500)
  }
  return (
    <div className="min-h-screen bg-[#061226] text-white">
      <div className="px-4 py-4 md:px-8 md:py-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-orange-400 uppercase tracking-[0.35em] text-xs mb-3">
                Kiln Operations Center
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Rokar
              </h1>
              <p className="text-gray-400 mt-3 max-w-2xl">
                Live cash position calculated from customer payments, worker deductions, cash sales, expenses, and advances.
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
            <div className="rounded-3xl border border-orange-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Current Rokar</p>
              <p className="mt-2 text-3xl font-bold text-orange-300">
                Rs {formatMoney(totals.currentRokar)}
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Total Income</p>
              <p className="mt-2 text-3xl font-bold text-emerald-300">
                Rs {formatMoney(totals.totalIncome)}
              </p>
            </div>

            <div className="rounded-3xl border border-rose-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Total Expense</p>
              <p className="mt-2 text-3xl font-bold text-rose-300">
                Rs {formatMoney(totals.totalExpense)}
              </p>
            </div>

            <div className="rounded-3xl border border-orange-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Advances</p>
              <p className="mt-2 text-3xl font-bold text-orange-300">
                Rs {formatMoney(totals.totalAdvance)}
              </p>
            </div>

            <div className="rounded-3xl border border-sky-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Today Rokar</p>
              <p className="mt-2 text-3xl font-bold text-sky-300">
                Rs {formatMoney(totals.todayRokar)}
              </p>
            </div>
          </div>

          <section className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-[#0f223a] shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-orange-500/25 via-orange-500/10 to-transparent" />
            <div className="relative p-6 md:p-7">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-6">
                <div>
                  <p className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-orange-500/15 text-orange-200">
                    Rokar Filter
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold mt-3">
                    Date Range
                  </h2>
                  <p className="text-gray-400 mt-1">
                    Use the filter to review cash movement in any period.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                    Selected range
                  </p>
                  <p className="text-sm text-gray-200 mt-1">
                    {fromDate} → {toDate}
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleFilter}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    From
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value)
                      setVisibleRows(10)
                    }}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    To
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value)
                      setVisibleRows(10)
                    }}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex items-end gap-3">
                  <button
                    type="submit"
                    className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:opacity-90 transition"
                  >
                    Apply Filter
                  </button>

                  <button
                    type="button"
                    onClick={handleToday}
                    className="rounded-xl bg-white/5 px-5 py-3 font-semibold text-gray-200 hover:bg-white/10 transition border border-white/10"
                  >
                    Today
                  </button>
                </div>

                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="rounded-xl bg-white/5 px-5 py-3 font-semibold text-gray-200 hover:bg-white/10 transition border border-white/10"
                  >
                    Print
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section className="bg-[#0f223a] border border-white/10 rounded-3xl p-6 md:p-7 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Rokar History</h2>
                <p className="text-gray-400 mt-1">
                  All cash movements in the selected period.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700 text-orange-400">
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Source</th>
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Method</th>
                    <th className="py-3 pr-4">Note</th>
                    <th className="py-3 pr-4">Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td className="py-6 text-gray-400" colSpan={7}>
                        Loading rokar...
                      </td>
                    </tr>
                  ) : visibleHistoryRows.length === 0 ? (
                    <tr>
                      <td className="py-6 text-gray-400" colSpan={7}>
                        No records found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    visibleHistoryRows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-800">
                        <td className="py-3 pr-4">{row.date}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRowBadge(
                              row.type
                            )}`}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{row.source}</td>
                        <td className="py-3 pr-4">{row.name}</td>
                        <td className="py-3 pr-4">{row.method}</td>
                        <td className="py-3 pr-4">{row.note}</td>
                        <td className={`py-3 pr-4 font-semibold ${getRowColor(row.type)}`}>
                          {row.type === "Expense" || row.type === "Advance" ? "-" : "+"}
                          Rs {formatMoney(row.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredRows.length > visibleRows && (
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
