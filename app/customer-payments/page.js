"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@supabase/supabase-js"
const [visibleRows, setVisibleRows] = useState(10)
const [fromDate, setFromDate] = useState("")
const [toDate, setToDate] = useState("")

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const PAYMENT_METHODS = ["cash", "jazzcash", "ubl", "meezan"]

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

export default function CustomerPaymentsPage() {
  const [customers, setCustomers] = useState([])
  const [payments, setPayments] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [notes, setNotes] = useState("")
  const [paymentDate, setPaymentDate] = useState(getTodayDateInput())

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (!selectedCustomerId && customers.length > 0) {
      setSelectedCustomerId(String(customers[0].id))
    }
  }, [customers, selectedCustomerId])

  useEffect(() => {
    if (selectedCustomerId) {
      fetchLedger(selectedCustomerId)
    }
  }, [selectedCustomerId])

  const selectedCustomer = useMemo(() => {
    return customers.find(
      (customer) => String(customer.id) === String(selectedCustomerId)
    )
  }, [customers, selectedCustomerId])

  const currentBalance = Number(
    selectedCustomer?.current_balance ?? selectedCustomer?.opening_balance ?? 0
  ) || 0

  const totalPayments = useMemo(() => {
    return payments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  }, [payments])

  const totalSales = useMemo(() => {
    return sales.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0)
  }, [sales])

  const ledgerRows = useMemo(() => {
    const rows = []

    sales.forEach((sale) => {
      rows.push({
        id: `sale-${sale.id}`,
        date: sale.sale_date,
        type: "Sale",
        details: `${titleCase(sale.brick_type)} • ${formatMoney(
          sale.quantity
        )} qty @ Rs ${formatMoney(sale.rate)}`,
        amount: -1 * (Number(sale.total_amount) || 0),
      })
    })

    payments.forEach((payment) => {
      rows.push({
        id: `payment-${payment.id}`,
        date: payment.payment_date,
        type: "Payment",
        details: `${titleCase(payment.payment_method)}${
          payment.notes ? ` • ${payment.notes}` : ""
        }`,
        amount: Number(payment.amount) || 0,
      })
    })

    return rows.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [sales, payments])

  async function fetchCustomers() {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, customer_type, opening_balance, current_balance, status")
        .order("name", { ascending: true })

      if (error) throw error

      setCustomers(data || [])
    } catch (error) {
      alert(error.message || "Failed to load customers")
    } finally {
      setLoading(false)
    }
  }

  async function fetchLedger(customerId) {
    setLoading(true)

    try {
      const [paymentsRes, salesRes] = await Promise.all([
        supabase
          .from("customer_payments")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false }),

        supabase
          .from("sales")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false }),
      ])

      if (paymentsRes.error) throw paymentsRes.error
      if (salesRes.error) throw salesRes.error

      setPayments(paymentsRes.data || [])
      setSales(salesRes.data || [])
    } catch (error) {
      alert(error.message || "Failed to load customer ledger")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()

    if (!selectedCustomer) {
      alert("Please select a customer")
      return
    }

    const paymentAmount = Number(amount) || 0

    if (paymentAmount <= 0) {
      alert("Please enter a valid payment amount")
      return
    }

    const newBalance = currentBalance + paymentAmount

    try {
      const { error: paymentError } = await supabase
        .from("customer_payments")
        .insert([
          {
            customer_id: selectedCustomer.id,
            customer_name: selectedCustomer.name,
            amount: paymentAmount,
            payment_method: paymentMethod,
            notes: notes.trim(),
            payment_date: paymentDate,
          },
        ])

      if (paymentError) {
        alert(paymentError.message)
        return
      }

      const { error: balanceError } = await supabase
        .from("customers")
        .update({
          current_balance: newBalance,
        })
        .eq("id", selectedCustomer.id)

      if (balanceError) {
        alert(
          "Payment saved but customer balance update failed: " +
            balanceError.message
        )
        await fetchCustomers()
        await fetchLedger(selectedCustomer.id)
        return
      }

      alert("Payment saved successfully")

      setAmount("")
      setPaymentMethod("cash")
      setNotes("")
      setPaymentDate(getTodayDateInput())

      await fetchCustomers()
      await fetchLedger(selectedCustomer.id)
    } catch (error) {
      alert(error.message || "Failed to save payment")
    }
  }

  function handleCustomerChange(value) {
    setSelectedCustomerId(value)
    setPayments([])
    setSales([])
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
                Customer Payments
              </h1>
              <p className="text-gray-400 mt-3 max-w-2xl">
                Record customer payments, reduce khatta balance, and review the running ledger.
              </p>
            </div>

            <div className="flex gap-3">
              <Link href="/customers">
                <button className="rounded-xl bg-white/5 px-5 py-3 font-semibold text-gray-200 hover:bg-white/10 transition border border-white/10">
                  Back to Customers
                </button>
              </Link>

              <Link href="/admin">
                <button className="rounded-xl bg-white/5 px-5 py-3 font-semibold text-gray-200 hover:bg-white/10 transition border border-white/10">
                  Dashboard
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
              <p className="text-gray-400">Current Balance</p>
              <p className="mt-2 text-3xl font-bold text-orange-300">
                Rs {formatMoney(currentBalance)}
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Total Payments</p>
              <p className="mt-2 text-3xl font-bold text-emerald-300">
                Rs {formatMoney(totalPayments)}
              </p>
            </div>

            <div className="rounded-3xl border border-sky-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Total Sales</p>
              <p className="mt-2 text-3xl font-bold text-sky-300">
                Rs {formatMoney(totalSales)}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Customer Type</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {titleCase(selectedCustomer?.customer_type || "-")}
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
                    Customer Payment
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold mt-3">
                    Add New Payment
                  </h2>
                  <p className="text-gray-400 mt-1">
                    Payments move the customer balance toward zero or into credit.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                    Payment date
                  </p>
                  <p className="text-sm text-gray-200 mt-1">{paymentDate}</p>
                </div>
              </div>

              <form
                onSubmit={handleSave}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Customer
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {titleCase(customer.customer_type)} - {customer.name}
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
                    placeholder="Enter payment amount"
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
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                    required
                  />
                </div>

                <div className="xl:col-span-3">
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full min-h-[110px] rounded-2xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                    placeholder="Optional notes"
                  />
                </div>

                <div className="xl:col-span-3 pt-1">
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:opacity-90 transition"
                  >
                    Save Payment
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* CUSTOMER SUMMARY */}
          <section className="bg-[#0f223a] border border-white/10 rounded-3xl p-6 md:p-7 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Selected Customer</h2>
                <p className="text-gray-400 mt-1">
                  Quick snapshot of the active customer ledger.
                </p>
              </div>
            </div>

            {selectedCustomer ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-gray-400">Name</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {selectedCustomer.name}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-gray-400">Type</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {titleCase(selectedCustomer.customer_type)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-gray-400">Opening Balance</p>
                  <p className="mt-1 text-lg font-semibold text-orange-200">
                    Rs {formatMoney(selectedCustomer.opening_balance || 0)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-gray-400">Current Balance</p>
                  <p className="mt-1 text-lg font-semibold text-sky-300">
                    Rs {formatMoney(currentBalance)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-gray-400">
                Select a customer to see the ledger summary.
              </div>
            )}
          </section>

          {/* LEDGER HISTORY */}
<section
  id="customer-ledger-print"
  className="bg-[#0f223a] border border-white/10 rounded-3xl p-6 md:p-7 shadow-2xl"
>
  {(() => {
    const filteredLedgerRows = ledgerRows.filter((row) => {
      if (fromDate && row.date < fromDate) return false
      if (toDate && row.date > toDate) return false
      return true
    })

    const visibleLedgerRows = filteredLedgerRows.slice(0, visibleRows)

    function handlePrintLedger() {
      const printContents = document.getElementById(
        "customer-ledger-print"
      ).innerHTML

      const printWindow = window.open("", "", "width=1200,height=800")

      printWindow.document.write(`
        <html>
          <head>
            <title>Customer Ledger</title>

            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 30px;
                color: #000;
              }

              h1 {
                margin-bottom: 6px;
              }

              .sub {
                color: #666;
                margin-bottom: 25px;
              }

              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }

              th, td {
                border: 1px solid #d1d5db;
                padding: 10px;
                text-align: left;
                font-size: 14px;
              }

              th {
                background: #f3f4f6;
                font-weight: bold;
              }

              .green {
                color: #059669;
                font-weight: bold;
              }

              .red {
                color: #dc2626;
                font-weight: bold;
              }

              button,
              input {
                display: none !important;
              }

              .hide-print {
                display: none !important;
              }
            </style>
          </head>

          <body>
            <h1>Customer Ledger</h1>

            <div class="sub">
              ${selectedCustomer?.name || ""}
            </div>

            ${printContents}
          </body>
        </html>
      `)

      printWindow.document.close()
      printWindow.focus()

      setTimeout(() => {
        printWindow.print()
      }, 500)
    }

    return (
      <>
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 mb-6">
          <div>
            <h2 className="text-2xl font-bold">Ledger History</h2>

            <p className="text-gray-400 mt-1">
              Combined sales and payment entries for the selected customer.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 hide-print">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                From
              </label>

              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setVisibleRows(10)
                  setFromDate(e.target.value)
                }}
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
                onChange={(e) => {
                  setVisibleRows(10)
                  setToDate(e.target.value)
                }}
                className="rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handlePrintLedger}
                className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:opacity-90 transition"
              >
                Print Ledger
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
                <th className="py-3 pr-4">Details</th>
                <th className="py-3 pr-4">Amount</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="py-6 text-gray-400" colSpan={4}>
                    Loading customer ledger...
                  </td>
                </tr>
              ) : visibleLedgerRows.length === 0 ? (
                <tr>
                  <td className="py-6 text-gray-400" colSpan={4}>
                    No transactions found for this customer yet.
                  </td>
                </tr>
              ) : (
                visibleLedgerRows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-800">
                    <td className="py-3 pr-4">
                      {row.date}
                    </td>

                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          row.type === "Payment"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-rose-500/15 text-rose-300"
                        }`}
                      >
                        {row.type}
                      </span>
                    </td>

                    <td className="py-3 pr-4">
                      {row.details}
                    </td>

                    <td
                      className={
                        row.amount >= 0
                          ? "py-3 pr-4 text-emerald-300 font-semibold"
                          : "py-3 pr-4 text-rose-300 font-semibold"
                      }
                    >
                      Rs {formatMoney(Math.abs(row.amount))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredLedgerRows.length > visibleRows && (
          <div className="mt-6 flex justify-center hide-print">
            <button
              onClick={() => setVisibleRows((prev) => prev + 10)}
              className="rounded-xl bg-white/5 px-6 py-3 font-semibold text-gray-200 hover:bg-white/10 transition border border-white/10"
            >
              Load More
            </button>
          </div>
        )}
      </>
    )
  })()}
</section>
        </div>
      </div>
    </div>
  )
}
