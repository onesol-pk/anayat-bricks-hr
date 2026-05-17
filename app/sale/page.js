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

export default function SalePage() {
  const [customers, setCustomers] = useState([])
  const [sales, setSales] = useState([])
  const [stockMovements, setStockMovements] = useState([])
  const [loading, setLoading] = useState(true)

  const [customerId, setCustomerId] = useState("")
  const [brickType, setBrickType] = useState("awal")
  const [quantity, setQuantity] = useState("")
  const [rate, setRate] = useState("")
  const [paidAmount, setPaidAmount] = useState("")
  const [driverName, setDriverName] = useState("")
  const [tractorType, setTractorType] = useState("russi")
  const [notes, setNotes] = useState("")
  const [saleDate, setSaleDate] = useState(getTodayDateInput())

  const [lastSale, setLastSale] = useState(null)

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

  const totalAmount = useMemo(() => {
    return (Number(quantity) || 0) * (Number(rate) || 0)
  }, [quantity, rate])

  const effectivePaidAmount = isCashSale
    ? totalAmount
    : Number(paidAmount) || 0

  const currentBalanceAfter = isCashSale
    ? previousBalance
    : previousBalance + totalAmount - effectivePaidAmount

  const stockMap = useMemo(() => {
    return calculateStockFromMovements(stockMovements)
  }, [stockMovements])

  const totalStock = useMemo(() => {
    return Object.values(stockMap).reduce((sum, value) => sum + value, 0)
  }, [stockMap])

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
    setBrickType("awal")
    setQuantity("")
    setRate("")
    setPaidAmount("")
    setDriverName("")
    setTractorType("russi")
    setNotes("")
    setSaleDate(getTodayDateInput())

    if (!keepCustomer) {
      setCustomerId("")
    }
  }

  async function handleSave(e) {
    e.preventDefault()

    if (!selectedCustomer) {
      alert("Please select a customer")
      return
    }

    if (!brickType || !quantity || !rate || !saleDate) {
      alert("Please fill all required fields")
      return
    }

    const qty = Number(quantity) || 0
    const unitRate = Number(rate) || 0
    const total = qty * unitRate

    if (qty <= 0 || unitRate <= 0) {
      alert("Quantity and rate must be greater than zero")
      return
    }

    const paid = isCashSale ? total : Number(paidAmount) || 0
    const balanceAfter = isCashSale
      ? previousBalance
      : previousBalance + total - paid

    const salePayload = {
      customer_id: Number(selectedCustomer.id),
      customer_name: selectedCustomer.name,
      customer_type: customerType,
      brick_type: brickType,
      quantity: qty,
      rate: unitRate,
      total_amount: total,
      paid_amount: paid,
      balance_after: balanceAfter,
      driver_name: driverName.trim(),
      tractor_type: tractorType,
      notes: notes.trim(),
      sale_type: customerType,
      sale_date: saleDate,
    }

    try {
      const { data: insertedSale, error: saleError } = await supabase
        .from("sales")
        .insert([salePayload])
        .select("*")
        .single()

      if (saleError) {
        alert(saleError.message)
        return
      }

      const { error: stockError } = await supabase
        .from("stock_movements")
        .insert([
          {
            movement_type: "out",
            source_module: "sale",
            brick_type,
            quantity: qty,
            reference_id: insertedSale.id,
            notes: notes.trim() || `Sale to ${selectedCustomer.name}`,
            movement_date: saleDate,
          },
        ])

      if (stockError) {
        alert(
          "Sale saved but stock movement failed: " + stockError.message
        )
        setLastSale({
          ...insertedSale,
          customer: selectedCustomer,
          paid_amount: paid,
          total_amount: total,
          balance_after: balanceAfter,
        })
        fetchData()
        return
      }

      if (!isCashSale) {
        const { error: customerError } = await supabase
          .from("customers")
          .update({
            current_balance: balanceAfter,
          })
          .eq("id", selectedCustomer.id)

        if (customerError) {
          alert(
            "Sale saved but customer balance update failed: " +
              customerError.message
          )
          setLastSale({
            ...insertedSale,
            customer: selectedCustomer,
            paid_amount: paid,
            total_amount: total,
            balance_after: balanceAfter,
          })
          fetchData()
          return
        }
      }

      setLastSale({
        ...insertedSale,
        customer: selectedCustomer,
        paid_amount: paid,
        total_amount: total,
        balance_after: balanceAfter,
      })

      alert("Sale saved successfully")
      resetForm(true)
      fetchData()
    } catch (error) {
      alert(error.message || "Failed to save sale")
    }
  }

  function handlePrint() {
    if (!lastSale) {
      alert("Please save a sale before printing")
      return
    }

    window.print()
  }

  const recentSales = sales

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
                Create cash and khatta sales, track stock movement, and keep customer balances updated.
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
          {/* STATS */}
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
                Rs {formatMoney(totalAmount)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* FORM */}
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
                      Cash customers are settled immediately. Khatta customers carry a balance.
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                      Sale date
                    </p>
                    <p className="text-sm text-gray-200 mt-1">{saleDate}</p>
                  </div>
                </div>

                <form
                  onSubmit={handleSave}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
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
                      Sale Mode
                    </label>
                    <div className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          isCashSale
                            ? "bg-emerald-500/15 text-emerald-200"
                            : "bg-sky-500/15 text-sky-200"
                        }`}
                      >
                        {isCashSale ? "Cash Sale" : "Khatta Sale"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                      Brick Type
                    </label>
                    <select
                      value={brickType}
                      onChange={(e) => setBrickType(e.target.value)}
                      className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                      required
                    >
                      {SALE_BRICK_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {titleCase(type)}
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

                  <div>
                    <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                      placeholder="Enter quantity"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                      Rate
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                      placeholder="Enter rate"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                      Paid Amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={isCashSale ? totalAmount : paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      disabled={isCashSale}
                      className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500 disabled:opacity-60"
                      placeholder={isCashSale ? "Auto filled" : "Enter paid amount"}
                      required={!isCashSale}
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                      Driver Name
                    </label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                      placeholder="Driver name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                      Tractor
                    </label>
                    <select
                      value={tractorType}
                      onChange={(e) => setTractorType(e.target.value)}
                      className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                    >
                      {TRACTOR_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {titleCase(type)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
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

                  <div className="md:col-span-2 flex flex-wrap gap-3 pt-1">
                    <button
                      type="submit"
                      className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:opacity-90 transition"
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
                </form>
              </div>
            </section>

            {/* RECEIPT PREVIEW */}
            <section className="sale-receipt relative overflow-hidden rounded-3xl border border-white/10 bg-[#0f223a] shadow-2xl">
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
                      Rs {formatMoney(currentBalanceAfter)}
                    </p>
                  </div>
                </div>

                {selectedCustomer ? (
                  <div className="space-y-3 text-sm">
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                      <p className="text-gray-400">Customer</p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {selectedCustomer.name}
                      </p>
                      <p className="text-gray-400 mt-1">
                        {titleCase(customerType)} customer
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                        <p className="text-gray-400">Previous Balance</p>
                        <p className="mt-1 text-lg font-semibold text-orange-200">
                          Rs {formatMoney(previousBalance)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                        <p className="text-gray-400">Sale Mode</p>
                        <p className="mt-1 text-lg font-semibold text-white">
                          {isCashSale ? "Cash" : "Khatta"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                        <p className="text-gray-400">Brick Type</p>
                        <p className="mt-1 text-lg font-semibold text-white">
                          {titleCase(brickType)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                        <p className="text-gray-400">Quantity</p>
                        <p className="mt-1 text-lg font-semibold text-white">
                          {formatMoney(quantity || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                        <p className="text-gray-400">Rate</p>
                        <p className="mt-1 text-lg font-semibold text-white">
                          Rs {formatMoney(rate || 0)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                        <p className="text-gray-400">Total</p>
                        <p className="mt-1 text-lg font-semibold text-orange-200">
                          Rs {formatMoney(totalAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                        <p className="text-gray-400">Paid</p>
                        <p className="mt-1 text-lg font-semibold text-emerald-300">
                          Rs {formatMoney(effectivePaidAmount)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                        <p className="text-gray-400">After Sale</p>
                        <p className="mt-1 text-lg font-semibold text-sky-300">
                          Rs {formatMoney(currentBalanceAfter)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                      <p className="text-gray-400">Driver / Tractor</p>
                      <p className="mt-1 text-base font-semibold text-white">
                        {driverName || "-"} / {titleCase(tractorType)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                      <p className="text-gray-400">Notes</p>
                      <p className="mt-1 text-base text-white">
                        {notes || "-"}
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

          {/* STOCK */}
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

          {/* HISTORY */}
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
                        <td className="py-3 pr-4">
                          {sale.customer_name || "-"}
                        </td>
                        <td className="py-3 pr-4 capitalize">
                          {sale.sale_type || "-"}
                        </td>
                        <td className="py-3 pr-4 capitalize">
                          {sale.brick_type || "-"}
                        </td>
                        <td className="py-3 pr-4">
                          {formatMoney(sale.quantity)}
                        </td>
                        <td className="py-3 pr-4">
                          Rs {formatMoney(sale.rate)}
                        </td>
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

          .sale-receipt {
            width: 33.33vw !important;
            max-width: 33.33vw !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: 1px solid #ddd !important;
            background: #fff !important;
            color: #000 !important;
          }

          .sale-receipt * {
            color: #000 !important;
          }

          .sale-receipt .bg-white\/5,
          .sale-receipt .bg-\[\#0f223a\],
          .sale-receipt .bg-\[\#081a2f\] {
            background: #fff !important;
          }

          .sale-receipt .border-white\/10,
          .sale-receipt .border-white\/10 *,
          .sale-receipt .border-orange-500\/20 {
            border-color: #ddd !important;
          }
        }
      `}</style>
    </div>
  )
}
