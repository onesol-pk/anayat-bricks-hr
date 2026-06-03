"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const SALE_BRICK_TYPES = [
  "awal",
  "dome",
  "tirak",
  "tile",
  "special",
  "kachi kali",
  "roray",
]

const STOCK_BRICK_TYPES = [
  "awal",
  "dome",
  "tirak",
  "tile",
  "special",
  "kachi kali",
]

const TRACTOR_TYPES = ["russi", "messy", "fiat", "other"]

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

function emptyStockMap() {
  return Object.fromEntries(STOCK_BRICK_TYPES.map((type) => [type, 0]))
}

function calculateStockFromMovements(movements = []) {
  const stock = emptyStockMap()

  for (const item of movements) {
    const brickType = String(item.brick_type || "").toLowerCase()
    const qty = Number(item.quantity) || 0
    const movementType = String(item.movement_type || "").toLowerCase()
    const sourceModule = String(item.source_module || "").toLowerCase()

    if (!STOCK_BRICK_TYPES.includes(brickType)) continue

    const isIn =
      movementType === "in" ||
      movementType === "add" ||
      movementType === "credit" ||
      sourceModule === "nakasi"

    const isOut =
      movementType === "out" ||
      movementType === "subtract" ||
      movementType === "debit" ||
      sourceModule === "sale"

    if (isIn) stock[brickType] += qty
    if (isOut) stock[brickType] -= qty
  }

  return stock
}

function makeRow(brickType = "awal") {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    brickType,
    quantity: "",
    rate: "",
  }
}

export default function SalePage() {
  const [customers, setCustomers] = useState([])
  const [sales, setSales] = useState([])
  const [stockMovements, setStockMovements] = useState([])
  const [loading, setLoading] = useState(true)

  const [customerId, setCustomerId] = useState("")
  const [saleDate, setSaleDate] = useState(getTodayDateInput())
  const [paidAmount, setPaidAmount] = useState("")
  const [driverName, setDriverName] = useState("")
  const [tractorType, setTractorType] = useState("russi")
  const [notes, setNotes] = useState("")
  const [lineItems, setLineItems] = useState([makeRow("awal")])

  const [savedSale, setSavedSale] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (!customerId && customers.length > 0) {
      setCustomerId(String(customers[0].id))
    }
  }, [customers, customerId])

  const selectedCustomer = useMemo(() => {
    return customers.find((customer) => String(customer.id) === String(customerId))
  }, [customers, customerId])

  const customerType = String(selectedCustomer?.customer_type || "cash").toLowerCase()
  const isCashSale = customerType === "cash"

  const previousBalance = Number(
    selectedCustomer?.current_balance ?? selectedCustomer?.opening_balance ?? 0
  ) || 0

  const validLineItems = useMemo(() => {
    return lineItems
      .map((row) => ({
        id: row.id,
        brickType: String(row.brickType || "").toLowerCase(),
        quantity: Number(row.quantity) || 0,
        rate: Number(row.rate) || 0,
      }))
      .filter(
        (row) =>
          row.brickType &&
          row.quantity > 0 &&
          row.rate > 0
      )
  }, [lineItems])

  const totalQuantity = useMemo(() => {
    return validLineItems.reduce((sum, row) => sum + row.quantity, 0)
  }, [validLineItems])

  const grandTotal = useMemo(() => {
    return validLineItems.reduce((sum, row) => {
      return sum + (row.quantity / 1000) * row.rate
    }, 0)
  }, [validLineItems])

  const effectivePaidAmount = isCashSale ? grandTotal : Number(paidAmount) || 0

  const currentBalanceAfter = isCashSale
    ? previousBalance
    : previousBalance + grandTotal - effectivePaidAmount

  const stockMap = useMemo(() => {
    return calculateStockFromMovements(stockMovements)
  }, [stockMovements])

  const totalStock = useMemo(() => {
    return Object.values(stockMap).reduce((sum, value) => sum + value, 0)
  }, [stockMap])

  const receiptData = savedSale || {
    customer_name: selectedCustomer?.name || "",
    customer_type: customerType,
    sale_date: saleDate,
    total_quantity: totalQuantity,
    total_amount: grandTotal,
    paid_amount: effectivePaidAmount,
    balance_after: currentBalanceAfter,
    driver_name: driverName.trim(),
    tractor_type: tractorType,
    notes: notes.trim(),
    line_items: validLineItems,
  }

  async function fetchData() {
    setLoading(true)

    try {
      const [customersRes, salesRes, stockRes] = await Promise.all([
        supabase
          .from("customers")
          .select("id, name, phone, customer_type, opening_balance, current_balance, status")
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("sales")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),

        supabase
          .from("stock_movements")
          .select("*")
          .order("created_at", { ascending: false }),
      ])

      if (customersRes.error) throw customersRes.error
      if (salesRes.error) throw salesRes.error
      if (stockRes.error) throw stockRes.error

      setCustomers(customersRes.data || [])
      setSales(salesRes.data || [])
      setStockMovements(stockRes.data || [])
    } catch (error) {
      alert(error.message || "Failed to load sale page")
    } finally {
      setLoading(false)
    }
  }

  function resetForm(keepCustomer = true) {
    setSaleDate(getTodayDateInput())
    setPaidAmount("")
    setDriverName("")
    setTractorType("russi")
    setNotes("")
    setLineItems([makeRow("awal")])

    if (!keepCustomer) {
      setCustomerId("")
    }
  }

  function handleAddRow() {
    setLineItems((prev) => [...prev, makeRow("awal")])
  }

  function handleRemoveRow(rowId) {
    setLineItems((prev) => {
      if (prev.length === 1) return prev
      return prev.filter((row) => row.id !== rowId)
    })
  }

  function handleRowChange(rowId, field, value) {
    setLineItems((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row
        return { ...row, [field]: value }
      })
    )
  }

  async function handleSave(e) {
    e.preventDefault()

    if (!selectedCustomer) {
      alert("Please select a customer")
      return
    }

    if (!saleDate) {
      alert("Please select a date")
      return
    }

    const rows = validLineItems

    if (rows.length === 0) {
      alert("Please add at least one complete line item")
      return
    }

    const saleRows = rows.map((row) => ({
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      customer_type: customerType,
      brick_type: row.brickType,
      quantity: row.quantity,
      rate: row.rate,
      total_amount: (row.quantity / 1000) * row.rate,
      paid_amount: isCashSale ? grandTotal : effectivePaidAmount,
      balance_after: isCashSale ? previousBalance : currentBalanceAfter,
      driver_name: driverName.trim(),
      tractor_type: tractorType,
      notes: notes.trim(),
      sale_type: customerType,
      sale_date: saleDate,
    }))

    setLoading(true)

    try {
      const { data: insertedSales, error: saleError } = await supabase
        .from("sales")
        .insert(saleRows)
        .select("*")

      if (saleError) {
        alert(saleError.message)
        return
      }

      const stockRows = rows.map((row, index) => ({
        movement_type: "out",
        source_module: "sale",
        brick_type: row.brickType,
        quantity: row.quantity,
        reference_id: insertedSales?.[index]?.id || null,
        notes: notes.trim() || `Sale to ${selectedCustomer.name}`,
        movement_date: saleDate,
      }))

      const { error: stockError } = await supabase
        .from("stock_movements")
        .insert(stockRows)

      if (stockError) {
        alert("Sale saved but stock movement failed: " + stockError.message)
      }

      if (!isCashSale) {
        const { error: customerError } = await supabase
          .from("customers")
          .update({
            current_balance: currentBalanceAfter,
          })
          .eq("id", selectedCustomer.id)

        if (customerError) {
          alert(
            "Sale saved but customer balance update failed: " +
              customerError.message
          )
        }
      }

      setSavedSale({
        customer_name: selectedCustomer.name,
        customer_type: customerType,
        sale_date: saleDate,
        total_quantity: totalQuantity,
        total_amount: grandTotal,
        paid_amount: effectivePaidAmount,
        balance_after: currentBalanceAfter,
        driver_name: driverName.trim(),
        tractor_type: tractorType,
        notes: notes.trim(),
        line_items: rows,
      })

      alert("Sale saved successfully")
      resetForm(true)
      await fetchData()
    } catch (error) {
      alert(error.message || "Failed to save sale")
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    if (!receiptData?.customer_name || !receiptData?.line_items?.length) {
      alert("Please save a sale before printing")
      return
    }

    const printWindow = window.open("", "", "width=1200,height=800")
    if (!printWindow) {
      alert("Popup blocked. Please allow popups for printing.")
      return
    }

    const lineItemsHtml = (receiptData.line_items || [])
      .map(
        (item) => `
          <tr>
            <td>${titleCase(item.brickType)}</td>
            <td>${formatMoney(item.quantity)}</td>
            <td>Rs ${formatMoney(item.rate)}</td>
            <td>Rs ${formatMoney((item.quantity / 1000) * item.rate)}</td>
          </tr>
        `
      )
      .join("")

    printWindow.document.write(`
      <html>
        <head>
          <title>Sale Slip</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #000;
            }
            h1, h2, p {
              margin: 0;
            }
            .muted {
              color: #555;
              margin-top: 4px;
            }
            .top {
              margin-bottom: 18px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 18px;
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
            .summary {
              margin-top: 18px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            .box {
              border: 1px solid #ccc;
              padding: 10px;
            }
            .label {
              color: #555;
              font-size: 13px;
            }
            .value {
              font-size: 16px;
              font-weight: bold;
              margin-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="top">
            <h1>Sale Slip</h1>
            <p class="muted">${receiptData.customer_name} • ${titleCase(receiptData.customer_type)}</p>
            <p class="muted">Date: ${receiptData.sale_date}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Brick Type</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsHtml || `<tr><td colspan="4">No items</td></tr>`}
            </tbody>
          </table>

          <div class="summary">
            <div class="box">
              <div class="label">Grand Total</div>
              <div class="value">Rs ${formatMoney(receiptData.total_amount)}</div>
            </div>
            <div class="box">
              <div class="label">Paid</div>
              <div class="value">Rs ${formatMoney(receiptData.paid_amount)}</div>
            </div>
            <div class="box">
              <div class="label">Balance After</div>
              <div class="value">Rs ${formatMoney(receiptData.balance_after)}</div>
            </div>
            <div class="box">
              <div class="label">Delivery</div>
              <div class="value">${receiptData.driver_name || "-"} / ${titleCase(
      receiptData.tractor_type
    )}</div>
            </div>
          </div>

          <p style="margin-top: 18px;">Notes: ${receiptData.notes || "-"}</p>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 500)
  }

  const recentSales = useMemo(() => sales, [sales])

  return (
    <div className="min-h-screen bg-[#061226] text-white">
      <div className="no-print px-4 py-4 md:px-8 md:py-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-orange-400 uppercase tracking-[0.35em] text-xs mb-3">
                Kiln Operations Center
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Sale
              </h1>
              <p className="text-gray-400 mt-3 max-w-2xl">
                Create multi-item sales with one customer, separate rates per row, and print the full slip in one go.
              </p>
            </div>

            <Link href="/admin">
              <button className="rounded-xl bg-white/5 px-5 py-3 font-semibold text-gray-200 hover:bg-white/10 transition border border-white/10">
                Back to Dashboard
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="no-print px-4 pb-10 md:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="rounded-3xl border border-orange-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Sales Entries</p>
              <p className="mt-2 text-3xl font-bold text-orange-300">
                {formatMoney(sales.length)}
              </p>
            </div>

            <div className="rounded-3xl border border-sky-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Customers</p>
              <p className="mt-2 text-3xl font-bold text-sky-300">
                {formatMoney(customers.length)}
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Total Stock</p>
              <p className="mt-2 text-3xl font-bold text-emerald-300">
                {formatMoney(totalStock)}
              </p>
            </div>

            <div className="rounded-3xl border border-violet-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Sale Amount</p>
              <p className="mt-2 text-3xl font-bold text-violet-300">
                Rs {formatMoney(grandTotal)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <section className="xl:col-span-2 relative overflow-hidden rounded-3xl border border-orange-500/20 bg-[#0f223a] shadow-2xl">
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-orange-500/25 via-orange-500/10 to-transparent" />
              <div className="relative p-6 md:p-7">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-6">
                  <div>
                    <p className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-orange-500/15 text-orange-200">
                      Sale Entry
                    </p>
                    <h2 className="text-2xl md:text-3xl font-bold mt-3">
                      Add New Sale
                    </h2>
                    <p className="text-gray-400 mt-1">
                      One customer, one date, many item rows, each with its own rate.
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                      Sale date
                    </p>
                    <p className="text-sm text-gray-200 mt-1">{saleDate}</p>
                  </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                        Customer
                      </label>
                      <select
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
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
                        Sale Date
                      </label>
                      <input
                        type="date"
                        value={saleDate}
                        onChange={(e) => setSaleDate(e.target.value)}
                        className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {lineItems.map((row, index) => (
                      <div
                        key={row.id}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <h3 className="font-semibold text-white">
                            Row {index + 1}
                          </h3>

                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="rounded-xl bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/20 transition border border-rose-500/20"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                              Brick Type
                            </label>
                            <select
                              value={row.brickType}
                              onChange={(e) =>
                                handleRowChange(row.id, "brickType", e.target.value)
                              }
                              className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                            >
                              {SALE_BRICK_TYPES.map((brick) => (
                                <option key={brick} value={brick}>
                                  {titleCase(brick)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={row.quantity}
                              onChange={(e) =>
                                handleRowChange(row.id, "quantity", e.target.value)
                              }
                              className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                              placeholder="Enter quantity"
                            />
                          </div>

                          <div>
                            <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                              Rate / 1000
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={row.rate}
                              onChange={(e) =>
                                handleRowChange(row.id, "rate", e.target.value)
                              }
                              className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                              placeholder="Enter rate"
                            />
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl bg-black/20 border border-white/10 p-3">
                          <p className="text-gray-400 text-sm">Row Total</p>
                          <p className="mt-1 font-semibold text-orange-200 text-xl">
                            Rs {formatMoney(((Number(row.quantity) || 0) / 1000) * (Number(row.rate) || 0))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="rounded-xl bg-white/5 px-6 py-3 font-semibold text-gray-200 hover:bg-white/10 transition border border-white/10"
                    >
                      Add Row
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:opacity-90 transition disabled:opacity-60"
                    >
                      Save Sale
                    </button>

                    <button
                      type="button"
                      onClick={handlePrint}
                      className="rounded-xl bg-white/5 px-6 py-3 font-semibold text-gray-200 hover:bg-white/10 transition border border-white/10"
                    >
                      Print Slip
                    </button>
                  </div>

                  {!isCashSale && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                          Paid Amount
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(e.target.value)}
                          className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                          placeholder="Enter paid amount"
                        />
                      </div>

                      <div className="flex items-end">
                        <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 w-full">
                          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                            Balance After
                          </p>
                          <p className="mt-1 text-lg font-semibold text-sky-300">
                            Rs {formatMoney(currentBalanceAfter)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0f223a] shadow-2xl">
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-violet-500/25 via-violet-500/10 to-transparent" />
              <div className="relative p-6 md:p-7">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div>
                    <p className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-violet-500/15 text-violet-200">
                      Receipt Preview
                    </p>
                    <h2 className="text-2xl font-bold mt-3">
                      Sale Slip
                    </h2>
                  </div>

                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                      Balance
                    </p>
                    <p className="text-sm text-gray-200 mt-1">
                      Rs {formatMoney(receiptData.balance_after)}
                    </p>
                  </div>
                </div>

                {receiptData.customer_name ? (
                  <div className="space-y-3 text-sm">
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                      <p className="text-gray-400">Customer</p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {receiptData.customer_name}
                      </p>
                      <p className="text-gray-400 mt-1">
                        {titleCase(receiptData.customer_type)} customer
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                      <p className="text-gray-400">Line Items</p>
                      <div className="mt-3 space-y-2">
                        {(receiptData.line_items || []).map((item, idx) => (
                          <div
                            key={`${item.brickType}-${idx}`}
                            className="rounded-xl bg-black/20 border border-white/10 p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-white">
                                {titleCase(item.brickType)}
                              </span>
                              <span className="text-gray-300">
                                {formatMoney(item.quantity)} qty
                              </span>
                            </div>
                            <div className="mt-1 text-gray-400 text-xs">
                              Rate: Rs {formatMoney(item.rate)} / 1000
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                        <p className="text-gray-400">Total Quantity</p>
                        <p className="mt-1 text-lg font-semibold text-white">
                          {formatMoney(receiptData.total_quantity || totalQuantity)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                        <p className="text-gray-400">Grand Total</p>
                        <p className="mt-1 text-lg font-semibold text-orange-200">
                          Rs {formatMoney(receiptData.total_amount)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                        <p className="text-gray-400">Paid</p>
                        <p className="mt-1 text-lg font-semibold text-emerald-300">
                          Rs {formatMoney(receiptData.paid_amount)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                        <p className="text-gray-400">After Sale</p>
                        <p className="mt-1 text-lg font-semibold text-sky-300">
                          Rs {formatMoney(receiptData.balance_after)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                      <p className="text-gray-400">Delivery</p>
                      <p className="mt-1 text-base font-semibold text-white">
                        {receiptData.driver_name || "-"} / {titleCase(receiptData.tractor_type)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                      <p className="text-gray-400">Notes</p>
                      <p className="mt-1 text-base text-white">
                        {receiptData.notes || "-"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-gray-400">
                    Select a customer to preview the sale slip.
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="bg-[#0f223a] border border-white/10 rounded-3xl p-6 md:p-7 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Stock Snapshot</h2>
                <p className="text-gray-400 mt-1">
                  Current stock based on stock movements.
                </p>
              </div>

              <div className="text-sm text-gray-400">
                Total stock: {formatMoney(totalStock)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {STOCK_BRICK_TYPES.map((type) => (
                <div
                  key={type}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-sm uppercase tracking-[0.2em] text-gray-400">
                    {titleCase(type)}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-sky-300">
                    {formatMoney(stockMap[type] || 0)}
                  </p>
                  <p className="mt-2 text-sm text-gray-400">
                    Nakasi - Loading
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[#0f223a] border border-white/10 rounded-3xl p-6 md:p-7 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Recent Sales</h2>
                <p className="text-gray-400 mt-1">
                  Latest sales entries recorded in the system.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700 text-orange-400">
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Customer</th>
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Brick Type</th>
                    <th className="py-3 pr-4">Qty</th>
                    <th className="py-3 pr-4">Rate</th>
                    <th className="py-3 pr-4">Total</th>
                    <th className="py-3 pr-4">Paid</th>
                    <th className="py-3 pr-4">Balance After</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td className="py-6 text-gray-400" colSpan={9}>
                        Loading sales...
                      </td>
                    </tr>
                  ) : recentSales.length === 0 ? (
                    <tr>
                      <td className="py-6 text-gray-400" colSpan={9}>
                        No sales recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recentSales.map((sale) => (
                      <tr key={sale.id} className="border-b border-gray-800">
                        <td className="py-3 pr-4">{sale.sale_date}</td>
                        <td className="py-3 pr-4">{sale.customer_name || "-"}</td>
                        <td className="py-3 pr-4 capitalize">
                          {sale.sale_type || "-"}
                        </td>
                        <td className="py-3 pr-4 capitalize">
                          {sale.brick_type || "-"}
                        </td>
                        <td className="py-3 pr-4">{formatMoney(sale.quantity)}</td>
                        <td className="py-3 pr-4">Rs {formatMoney(sale.rate)}</td>
                        <td className="py-3 pr-4 text-orange-300 font-semibold">
                          Rs {formatMoney(sale.total_amount)}
                        </td>
                        <td className="py-3 pr-4 text-emerald-300 font-semibold">
                          Rs {formatMoney(sale.paid_amount)}
                        </td>
                        <td className="py-3 pr-4 text-sky-300 font-semibold">
                          Rs {formatMoney(sale.balance_after)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: #fff !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
