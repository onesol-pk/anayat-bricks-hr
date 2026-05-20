"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"

function calculatePeshgiBalance(transactions = []) {
  return transactions.reduce((sum, t) => {
    const amount = Number(t.amount) || 0

    if (
      t.transaction_type === "peshgi" ||
      t.transaction_type === "advance" ||
      t.transaction_type === "electricity" ||
      t.transaction_type === "loan" ||
      t.transaction_type === "damage"
    ) {
      return sum + amount
    }

    if (t.transaction_type === "deduction" || t.transaction_type === "return") {
      return sum - amount
    }

    return sum
  }, 0)
}

function getTodayDateInput() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().split("T")[0]
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value) || 0))
}

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState([])
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [cnic, setCnic] = useState("")
  const [workerType, setWorkerType] = useState("patheer")
  const [openingPeshgi, setOpeningPeshgi] = useState("")
  const [joiningDate, setJoiningDate] = useState(getTodayDateInput())
  const [notes, setNotes] = useState("")

  const [editingWorker, setEditingWorker] = useState(null)

  useEffect(() => {
    fetchWorkers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  async function fetchWorkers() {
    setLoading(true)

    try {
      let query = supabase.from("workers").select("*")

      if (filter !== "all") {
        query = query.eq("status", filter)
      }

      const { data: workersData, error } = await query.order("created_at", {
        ascending: false,
      })

      if (error) {
        alert(error.message)
        return
      }

      const enrichedWorkers = await Promise.all(
        (workersData || []).map(async (worker) => {
          const { data: transactions, error: txError } = await supabase
            .from("worker_financial_transactions")
            .select("transaction_type, amount")
            .eq("worker_id", worker.id)

          if (txError) {
            return {
              ...worker,
              current_peshgi: 0,
            }
          }

          return {
            ...worker,
            current_peshgi: calculatePeshgiBalance(transactions || []),
          }
        })
      )

      setWorkers(enrichedWorkers)
    } catch (error) {
      alert(error.message || "Failed to load workers")
    } finally {
      setLoading(false)
    }
  }

  const filteredWorkers = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return workers

    return workers.filter((worker) => {
      const nameMatch = String(worker.name || "").toLowerCase().includes(term)
      const phoneMatch = String(worker.phone || "").toLowerCase().includes(term)
      const cnicMatch = String(worker.cnic || "").toLowerCase().includes(term)
      const typeMatch = String(worker.worker_type || "").toLowerCase().includes(term)
      const statusMatch = String(worker.status || "").toLowerCase().includes(term)

      return nameMatch || phoneMatch || cnicMatch || typeMatch || statusMatch
    })
  }, [workers, search])

  const stats = useMemo(() => {
    const total = workers.length
    const active = workers.filter((w) => w.status === "active").length
    const terminated = workers.filter((w) => w.status === "terminated").length
    const totalPeshgi = workers.reduce(
      (sum, w) => sum + (Number(w.current_peshgi) || 0),
      0
    )

    return { total, active, terminated, totalPeshgi }
  }, [workers])

  async function saveWorker() {
    if (!name || !phone || !joiningDate) {
      alert("Please fill all required fields")
      return
    }

    const workerPayload = {
      name,
      phone,
      cnic,
      worker_type: workerType,
      joining_date: joiningDate,
      notes,
    }

    if (editingWorker) {
      const { error } = await supabase
        .from("workers")
        .update(workerPayload)
        .eq("id", editingWorker.id)

      if (error) {
        alert(error.message)
        return
      }

      alert("Worker updated successfully")
    } else {
      const { data: newWorker, error } = await supabase
        .from("workers")
        .insert([
          {
            ...workerPayload,
            status: "active",
          },
        ])
        .select()
        .single()

      if (error) {
        alert(error.message)
        return
      }

      if (Number(openingPeshgi) > 0) {
        const { error: peshgiError } = await supabase
          .from("worker_financial_transactions")
          .insert([
            {
              worker_id: newWorker.id,
              transaction_type: "peshgi",
              amount: Number(openingPeshgi),
              transaction_date: joiningDate,
              notes: "Opening peshgi",
            },
          ])

        if (peshgiError) {
          alert(
            "Worker created, but opening peshgi was not saved: " +
              peshgiError.message
          )
          resetForm()
          fetchWorkers()
          return
        }
      }

      alert("Worker created successfully")
    }

    resetForm()
    fetchWorkers()
  }

  function resetForm() {
    setName("")
    setPhone("")
    setCnic("")
    setWorkerType("patheer")
    setOpeningPeshgi("")
    setJoiningDate(getTodayDateInput())
    setNotes("")
    setEditingWorker(null)
  }

  function handleEdit(worker) {
    setEditingWorker(worker)
    setName(worker.name || "")
    setPhone(worker.phone || "")
    setCnic(worker.cnic || "")
    setWorkerType(worker.worker_type || "patheer")
    setJoiningDate(worker.joining_date || getTodayDateInput())
    setNotes(worker.notes || "")
    setOpeningPeshgi("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function terminateWorker(workerId) {
    const confirmAction = confirm(
      "Are you sure you want to terminate this worker?"
    )

    if (!confirmAction) return

    const { error } = await supabase
      .from("workers")
      .update({
        status: "terminated",
        termination_date: new Date().toISOString().split("T")[0],
      })
      .eq("id", workerId)

    if (error) {
      alert(error.message)
      return
    }

    fetchWorkers()
  }

  async function reinstateWorker(workerId) {
    const { error } = await supabase
      .from("workers")
      .update({
        status: "active",
        termination_date: null,
      })
      .eq("id", workerId)

    if (error) {
      alert(error.message)
      return
    }

    fetchWorkers()
  }

  return (
    <div className="min-h-screen bg-[#061226] text-white">
      <div className="px-8 pt-8 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-orange-400 uppercase tracking-[0.35em] text-xs mb-3">
                Anayat Sons Bricks
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Workers Management
              </h1>
              <p className="text-gray-400 mt-3 max-w-2xl">
                Create, update, terminate, and reinstate workers from one clean record screen.
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

      <div className="px-8 pb-10">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="rounded-3xl border border-white/10 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Total Workers</p>
              <p className="mt-2 text-3xl font-bold text-orange-300">
                {formatNumber(stats.total)}
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Active Workers</p>
              <p className="mt-2 text-3xl font-bold text-emerald-300">
                {formatNumber(stats.active)}
              </p>
            </div>

            <div className="rounded-3xl border border-rose-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Terminated Workers</p>
              <p className="mt-2 text-3xl font-bold text-rose-300">
                {formatNumber(stats.terminated)}
              </p>
            </div>

            <div className="rounded-3xl border border-orange-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Current Peshgi</p>
              <p className="mt-2 text-3xl font-bold text-orange-300">
                Rs {formatNumber(stats.totalPeshgi)}
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
                    Worker Profile
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold mt-3">
                    {editingWorker ? "Edit Worker" : "Add New Worker"}
                  </h2>
                  <p className="text-gray-400 mt-1">
                    Keep the master worker record clean and stable.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                    Date
                  </p>
                  <p className="text-sm text-gray-200 mt-1">{joiningDate}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Worker Name
                  </label>
                  <input
                    type="text"
                    placeholder="Worker Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    CNIC
                  </label>
                  <input
                    type="text"
                    placeholder="CNIC"
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Worker Type
                  </label>
                  <select
                    value={workerType}
                    onChange={(e) => setWorkerType(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  >
                    <option value="patheer">Patheer</option>
                    <option value="bharai">Bharai</option>
                    <option value="nakasi">Nakasi</option>
                    <option value="loading">Loading</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Opening Peshgi
                  </label>
                  <input
                    type="number"
                    placeholder="Opening Peshgi"
                    value={openingPeshgi}
                    onChange={(e) => setOpeningPeshgi(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  />
                </div>

                <div className="md:col-span-2 xl:col-span-3">
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Notes
                  </label>
                  <textarea
                    placeholder="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full min-h-[110px] rounded-2xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-6">
                <button
                  onClick={saveWorker}
                  className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:opacity-90 transition"
                >
                  {editingWorker ? "Update Worker" : "Create Worker"}
                </button>

                {editingWorker && (
                  <button
                    onClick={resetForm}
                    className="rounded-xl bg-white/5 px-6 py-3 font-semibold text-gray-200 hover:bg-white/10 transition border border-white/10"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* FILTERS */}
          <section className="bg-[#0f223a] border border-white/10 rounded-3xl p-5 md:p-6 shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Worker Directory</h2>
                <p className="text-gray-400 mt-1">
                  Browse workers by status or search across the list.
                </p>
              </div>

              <div className="w-full lg:w-[320px]">
                <input
                  type="text"
                  placeholder="Search worker, phone, CNIC..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-5">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-xl px-4 py-2 font-semibold transition border ${
                  filter === "all"
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white/5 text-gray-200 border-white/10 hover:bg-white/10"
                }`}
              >
                All Workers
              </button>

              <button
                onClick={() => setFilter("active")}
                className={`rounded-xl px-4 py-2 font-semibold transition border ${
                  filter === "active"
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-white/5 text-gray-200 border-white/10 hover:bg-white/10"
                }`}
              >
                Active
              </button>

              <button
                onClick={() => setFilter("terminated")}
                className={`rounded-xl px-4 py-2 font-semibold transition border ${
                  filter === "terminated"
                    ? "bg-rose-500 text-white border-rose-500"
                    : "bg-white/5 text-gray-200 border-white/10 hover:bg-white/10"
                }`}
              >
                Terminated
              </button>
            </div>
          </section>

          {/* TABLE */}
          <section className="bg-[#0f223a] border border-white/10 rounded-3xl p-6 md:p-7 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Workers List</h2>
                <p className="text-gray-400 mt-1">
                  {loading
                    ? "Loading workers..."
                    : `${filteredWorkers.length} worker${
                        filteredWorkers.length === 1 ? "" : "s"
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
                    <th className="py-3 pr-4">Join Date</th>
                    <th className="py-3 pr-4">Current Peshgi</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td className="py-6 text-gray-400" colSpan={7}>
                        Loading workers...
                      </td>
                    </tr>
                  ) : filteredWorkers.length === 0 ? (
                    <tr>
                      <td className="py-6 text-gray-400" colSpan={7}>
                        No workers found for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredWorkers.map((worker) => (
                      <tr key={worker.id} className="border-b border-gray-800">
                        <td className="py-4 pr-4 font-medium">{worker.name}</td>
                        <td className="py-4 pr-4 capitalize">
                          {worker.worker_type}
                        </td>
                        <td className="py-4 pr-4">{worker.phone}</td>
                        <td className="py-4 pr-4">
                          {worker.joining_date || "-"}
                        </td>
                        <td className="py-4 pr-4 text-orange-300 font-semibold">
                          Rs {formatNumber(worker.current_peshgi || 0)}
                        </td>
                        <td className="py-4 pr-4 capitalize">
                          {worker.status}
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => handleEdit(worker)}
                              className="text-blue-300 hover:text-blue-200 font-medium"
                            >
                              Edit
                            </button>

                            {worker.status === "active" ? (
                              <button
                                onClick={() => terminateWorker(worker.id)}
                                className="text-rose-300 hover:text-rose-200 font-medium"
                              >
                                Terminate
                              </button>
                            ) : (
                              <button
                                onClick={() => reinstateWorker(worker.id)}
                                className="text-emerald-300 hover:text-emerald-200 font-medium"
                              >
                                Reinstate
                              </button>
                            )}
                          </div>
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
    </div>
  )
}
