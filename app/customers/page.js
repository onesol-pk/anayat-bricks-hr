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

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const [editingCustomer, setEditingCustomer] = useState(null)

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [customerType, setCustomerType] = useState("khatta")
  const [openingBalance, setOpeningBalance] = useState("")
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState("active")
  const [createdAtDate] = useState(getTodayDateInput())

  useEffect(() => {
    fetchCustomers()
  }, [])

  async function fetchCustomers() {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        alert(error.message)
        return
      }

      setCustomers(data || [])
    } catch (error) {
      alert(error.message || "Failed to load customers")
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase()

    return customers.filter((customer) => {
      const matchesSearch =
        !term ||
        String(customer.name || "").toLowerCase().includes(term) ||
        String(customer.phone || "").toLowerCase().includes(term) ||
        String(customer.customer_type || "").toLowerCase().includes(term) ||
        String(customer.address || "").toLowerCase().includes(term) ||
        String(customer.notes || "").toLowerCase().includes(term)

      const matchesType =
        typeFilter === "all" || String(customer.customer_type || "") === typeFilter

      const matchesStatus =
        statusFilter === "all" || String(customer.status || "") === statusFilter

      return matchesSearch && matchesType && matchesStatus
    })
  }, [customers, search, typeFilter, statusFilter])

  const stats = useMemo(() => {
    const totalCustomers = customers.length
    const cashCustomers = customers.filter(
      (customer) => String(customer.customer_type || "") === "cash"
    ).length
    const khattaCustomers = customers.filter(
      (customer) => String(customer.customer_type || "") === "khatta"
    ).length

    const totalBalance = customers.reduce((sum, customer) => {
      const value =
        customer.current_balance ?? customer.opening_balance ?? 0
      return sum + (Number(value) || 0)
    }, 0)

    const receivable = customers.reduce((sum, customer) => {
      const value =
        customer.current_balance ?? customer.opening_balance ?? 0
      const num = Number(value) || 0
      return num > 0 ? sum + num : sum
    }, 0)

    return {
      totalCustomers,
      cashCustomers,
      khattaCustomers,
      totalBalance,
      receivable,
    }
  }, [customers])

  function resetForm() {
    setEditingCustomer(null)
    setName("")
    setPhone("")
    setCustomerType("khatta")
    setOpeningBalance("")
    setAddress("")
    setNotes("")
    setStatus("active")
  }

  function startEdit(customer) {
    setEditingCustomer(customer)
    setName(customer.name || "")
    setPhone(customer.phone || "")
    setCustomerType(customer.customer_type || "khatta")
    setOpeningBalance(
      customer.opening_balance !== null && customer.opening_balance !== undefined
        ? String(customer.opening_balance)
        : ""
    )
    setAddress(customer.address || "")
    setNotes(customer.notes || "")
    setStatus(customer.status || "active")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleSave(e) {
    e.preventDefault()

    if (!name.trim()) {
      alert("Please enter customer name")
      return
    }

    const normalizedOpeningBalance = Number(openingBalance) || 0

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      customer_type: customerType,
      opening_balance: normalizedOpeningBalance,
      address: address.trim(),
      notes: notes.trim(),
      status,
    }

    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update(payload)
          .eq("id", editingCustomer.id)

        if (error) {
          alert(error.message)
          return
        }

        alert("Customer updated successfully")
      } else {
        const { error } = await supabase.from("customers").insert([
          {
            ...payload,
            current_balance: normalizedOpeningBalance,
          },
        ])

        if (error) {
          alert(error.message)
          return
        }

        alert("Customer created successfully")
      }

      resetForm()
      fetchCustomers()
    } catch (error) {
      alert(error.message || "Failed to save customer")
    }
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
                Customers
              </h1>
              <p className="text-gray-400 mt-3 max-w-2xl">
                Create cash and khatta customers, manage balances, and prepare the ledger flow for sales and payments.
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

      <div className="px-4 pb-10 md:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="rounded-3xl border border-orange-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Total Customers</p>
              <p className="mt-2 text-3xl font-bold text-orange-300">
                {formatMoney(stats.totalCustomers)}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Cash Customers</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {formatMoney(stats.cashCustomers)}
              </p>
            </div>

            <div className="rounded-3xl border border-sky-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Khatta Customers</p>
              <p className="mt-2 text-3xl font-bold text-sky-300">
                {formatMoney(stats.khattaCustomers)}
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Total Receivable</p>
              <p className="mt-2 text-3xl font-bold text-emerald-300">
                Rs {formatMoney(stats.receivable)}
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
                    Customer Record
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold mt-3">
                    {editingCustomer ? "Edit Customer" : "Create Customer"}
                  </h2>
                  <p className="text-gray-400 mt-1">
                    Cash customers are settled immediately. Khatta customers can carry a balance.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                    Form date
                  </p>
                  <p className="text-sm text-gray-200 mt-1">
                    {createdAtDate}
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleSave}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                    placeholder="Customer name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Type
                  </label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="khatta">Khatta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Opening Balance
                  </label>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                    placeholder="Address"
                  />
                </div>

                <div className="md:col-span-2 xl:col-span-3">
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

                <div className="xl:col-span-3 flex flex-wrap gap-3 pt-1">
                  <button
                    type="submit"
                    className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:opacity-90 transition"
                  >
                    {editingCustomer ? "Update Customer" : "Save Customer"}
                  </button>

                  {editingCustomer && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl bg-white/5 px-6 py-3 font-semibold text-gray-200 hover:bg-white/10 transition border border-white/10"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </section>

          {/* FILTERS */}
          <section className="bg-[#0f223a] border border-white/10 rounded-3xl p-5 md:p-6 shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Customer Directory</h2>
                <p className="text-gray-400 mt-1">
                  Search and filter customers by type and status.
                </p>
              </div>

              <div className="w-full lg:w-[340px]">
                <input
                  type="text"
                  placeholder="Search by name, phone, address..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-5">
              <button
                onClick={() => setTypeFilter("all")}
                className={`rounded-xl px-4 py-2 font-semibold transition border ${
                  typeFilter === "all"
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white/5 text-gray-200 border-white/10 hover:bg-white/10"
                }`}
              >
                All Types
              </button>

              <button
                onClick={() => setTypeFilter("cash")}
                className={`rounded-xl px-4 py-2 font-semibold transition border ${
                  typeFilter === "cash"
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-white/5 text-gray-200 border-white/10 hover:bg-white/10"
                }`}
              >
                Cash
              </button>

              <button
                onClick={() => setTypeFilter("khatta")}
                className={`rounded-xl px-4 py-2 font-semibold transition border ${
                  typeFilter === "khatta"
                    ? "bg-sky-500 text-white border-sky-500"
                    : "bg-white/5 text-gray-200 border-white/10 hover:bg-white/10"
                }`}
              >
                Khatta
              </button>

              <button
                onClick={() => setStatusFilter("all")}
                className={`rounded-xl px-4 py-2 font-semibold transition border ${
                  statusFilter === "all"
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white/5 text-gray-200 border-white/10 hover:bg-white/10"
                }`}
              >
                All Status
              </button>

              <button
                onClick={() => setStatusFilter("active")}
                className={`rounded-xl px-4 py-2 font-semibold transition border ${
                  statusFilter === "active"
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-white/5 text-gray-200 border-white/10 hover:bg-white/10"
                }`}
              >
                Active
              </button>

              <button
                onClick={() => setStatusFilter("inactive")}
                className={`rounded-xl px-4 py-2 font-semibold transition border ${
                  statusFilter === "inactive"
                    ? "bg-rose-500 text-white border-rose-500"
                    : "bg-white/5 text-gray-200 border-white/10 hover:bg-white/10"
                }`}
              >
                Inactive
              </button>
            </div>
          </section>

          {/* TABLE */}
          <section className="bg-[#0f223a] border border-white/10 rounded-3xl p-6 md:p-7 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Customers List</h2>
                <p className="text-gray-400 mt-1">
                  {loading
                    ? "Loading customers..."
                    : `${filteredCustomers.length} customer${
                        filteredCustomers.length === 1 ? "" : "s"
                      } shown`}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700 text-orange-400">
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Phone</th>
                    <th className="py-3 pr-4">Balance</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td className="py-6 text-gray-400" colSpan={6}>
                        Loading customers...
                      </td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td className="py-6 text-gray-400" colSpan={6}>
                        No customers found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => {
                      const currentBalance =
                        customer.current_balance ?? customer.opening_balance ?? 0

                      return (
                        <tr key={customer.id} className="border-b border-gray-800">
                          <td className="py-4 pr-4 font-medium">
                            {customer.name}
                          </td>
                          <td className="py-4 pr-4 capitalize">
                            {customer.customer_type || "-"}
                          </td>
                          <td className="py-4 pr-4">
                            {customer.phone || "-"}
                          </td>
                          <td className="py-4 pr-4 font-semibold text-orange-300">
                            Rs {formatMoney(currentBalance)}
                          </td>
                          <td className="py-4 pr-4 capitalize">
                            {customer.status || "-"}
                          </td>
                          <td className="py-4 pr-4">
                            <button
                              onClick={() => startEdit(customer)}
                              className="text-blue-300 hover:text-blue-200 font-medium"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
