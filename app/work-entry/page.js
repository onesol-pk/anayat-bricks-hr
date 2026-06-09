"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const BRICK_OPTIONS = {
  patheer: ["gutka", "tile", "special"],
  bharai: ["gutka", "tile", "special"],
  nakasi: ["awal", "dome", "tirak", "tile", "special", "kachi kali"],
  loading: ["awal", "dome", "tirak", "tile", "special", "kachi kali"],
}

function getTodayDateInput() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().split("T")[0]
}

function getWeekStartInput(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`)
  const day = date.getDay() // Friday = 5
  const diff = (day - 5 + 7) % 7
  date.setDate(date.getDate() - diff)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
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



export default function WorkEntryPage() {
  const [workers, setWorkers] = useState([])
  const [selectedWorkerId, setSelectedWorkerId] = useState("")
  const [entryDate, setEntryDate] = useState(getTodayDateInput())
  const [rate, setRate] = useState("")
  const [brickEntries, setBrickEntries] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [recentEntries, setRecentEntries] = useState([])

  useEffect(() => {
    fetchWorkersAndEntries()
  }, [])

  const selectedWorker = useMemo(() => {
    return workers.find((worker) => String(worker.id) === String(selectedWorkerId))
  }, [workers, selectedWorkerId])

  const workerType = String(selectedWorker?.worker_type || "").toLowerCase()
  const brickOptions = BRICK_OPTIONS[workerType] || []

  useEffect(() => {
    if (!selectedWorkerId && workers.length > 0) {
      setSelectedWorkerId(String(workers[0].id))
      return
    }

    if (brickOptions.length > 0) {
    const initial = {}
  
    brickOptions.forEach((brick) => {
      initial[brick] = ""
    })
  
    setBrickEntries(initial)
  }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkerId, selectedWorker])

  async function fetchWorkersAndEntries() {
    setLoading(true)

    try {
      const [workersRes, entriesRes] = await Promise.all([
        supabase
          .from("workers")
          .select("id, name, worker_type, status")
          .eq("status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("work_entries")
          .select(`
            id,
            worker_id,
            worker_name,
            worker_type,
            date,
            brick_type,
            bricks,
            rate_per_1000,
            total_amount,
            worker:workers(name)
          `)
          .order("created_at", { ascending: false })
          .limit(50),
      ])

      if (workersRes.error) throw workersRes.error
      if (entriesRes.error) throw entriesRes.error

      setWorkers(workersRes.data || [])
      setRecentEntries(entriesRes.data || [])
    } catch (error) {
      alert(error.message || "Failed to load work entry page")
    } finally {
      setLoading(false)
    }
  }

  function handleWorkerChange(value) {
    setSelectedWorkerId(value)
  }
  
  const totalBricks = useMemo(() => {
  return Object.values(brickEntries).reduce(
    (sum, qty) => sum + (Number(qty) || 0),
    0
  )
}, [brickEntries])

  const totalLabour = useMemo(() => {
  const sharedRate = Number(rate) || 0

  return Object.values(brickEntries).reduce(
    (sum, qty) =>
      sum + ((Number(qty) || 0) / 1000) * sharedRate,
    0
  )
}, [brickEntries, rate])

  async function handleSubmit(e) {
    e.preventDefault()

    if (!selectedWorker) {
      alert("Please select a worker")
      return
    }

    if (!entryDate) {
      alert("Please select a date")
      return
    }

    const sharedRate = Number(rate) || 0
    if (sharedRate <= 0) {
      alert("Please enter a valid rate")
      return
    }

    const validRows = Object.entries(brickEntries)
  .map(([brickType, quantity]) => ({
    brickType,
    quantity: Number(quantity),
  }))
      .filter(
        (row) =>
          row.brickType &&
          Number.isFinite(row.quantity) &&
          row.quantity > 0
      )

    if (validRows.length === 0) {
      alert("Please add at least one complete row with brick type and quantity")
      return
    }

    const payload = validRows.map((row) => ({
      worker_id: selectedWorker.id,
      worker_name: selectedWorker.name,
      worker_type: String(selectedWorker.worker_type || "").toLowerCase(),
      date: entryDate,
      week_start: getWeekStartInput(entryDate),
      brick_type: row.brickType,
      bricks: row.quantity,
      rate_per_1000: sharedRate,
      total_amount: (row.quantity / 1000) * sharedRate,
    }))

    if (payload.some((item) => !item.worker_id || !item.worker_name)) {
      alert("Worker details are missing, cannot save entry")
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase.from("work_entries").insert(payload)

      if (error) {
        alert(error.message)
        return
      }

      alert("Work entries saved successfully")

      const resetEntries = {}

      brickOptions.forEach((brick) => {
        resetEntries[brick] = ""
      })
      
      setBrickEntries(resetEntries)
      setRate("")
      setEntryDate(getTodayDateInput())

      await fetchWorkersAndEntries()
    } catch (error) {
      alert(error.message || "Failed to save entries")
    } finally {
      setSaving(false)
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
                Work Entry
              </h1>
              <p className="text-gray-400 mt-3 max-w-2xl">
                Add multiple brick rows for one worker in a single save with one common rate.
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="rounded-3xl border border-orange-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Active Entries</p>
              <p className="mt-2 text-3xl font-bold text-orange-300">
                {
                  Object.values(brickEntries).filter(
                    (qty) => Number(qty) > 0
                  ).length
                }
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Total Bricks</p>
              <p className="mt-2 text-3xl font-bold text-emerald-300">
                {formatMoney(totalBricks)}
              </p>
            </div>

            <div className="rounded-3xl border border-sky-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Estimated Labour</p>
              <p className="mt-2 text-3xl font-bold text-sky-300">
                Rs {formatMoney(totalLabour)}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Worker Type</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {titleCase(workerType || "-")}
              </p>
            </div>
          </div>

          <section className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-[#0f223a] shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-orange-500/25 via-orange-500/10 to-transparent" />
            <div className="relative p-6 md:p-7">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-6">
                <div>
                  <p className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-orange-500/15 text-orange-200">
                    Multi Entry Form
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold mt-3">
                    Add Worker Entries
                  </h2>
                  <p className="text-gray-400 mt-1">
                    One worker, one date, many brick rows, one shared rate.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                    Entry date
                  </p>
                  <p className="text-sm text-gray-200 mt-1">{entryDate}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                      Worker
                    </label>
                    <select
                      value={selectedWorkerId}
                      onChange={(e) => handleWorkerChange(e.target.value)}
                      className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                      required
                    >
                      <option value="">Select Worker</option>
                      {workers.map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {titleCase(worker.worker_type)} - {worker.name}
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
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Rate / 1000
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                    placeholder="Enter one shared rate"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {brickOptions.map((brick) => (
                    <div key={brick}>
                      <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                        {titleCase(brick)}
                      </label>
                
                      <input
                        type="number"
                        min="0"
                        value={brickEntries[brick] || ""}
                        onChange={(e) =>
                          setBrickEntries((prev) => ({
                            ...prev,
                            [brick]: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                        placeholder="Enter quantity"
                      />
                    </div>
                  ))}
                </div>

                  <button
                    type="submit"
                    disabled={saving || loading}
                    className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:opacity-90 transition disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save All Entries"}
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section className="bg-[#0f223a] border border-white/10 rounded-3xl p-6 md:p-7 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Recent Work Entries</h2>
                <p className="text-gray-400 mt-1">
                  Latest saved entries across all workers.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700 text-orange-400">
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Worker</th>
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Brick</th>
                    <th className="py-3 pr-4">Bricks</th>
                    <th className="py-3 pr-4">Rate</th>
                    <th className="py-3 pr-4">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td className="py-6 text-gray-400" colSpan={7}>
                        Loading work entries...
                      </td>
                    </tr>
                  ) : recentEntries.length === 0 ? (
                    <tr>
                      <td className="py-6 text-gray-400" colSpan={7}>
                        No work entries recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recentEntries.map((item) => (
                      <tr key={item.id} className="border-b border-gray-800">
                        <td className="py-3 pr-4">{item.date}</td>
                        <td className="py-3 pr-4">
                          {item.worker_name || item.worker?.name || "-"}
                        </td>
                        <td className="py-3 pr-4 capitalize">
                          {titleCase(item.worker_type)}
                        </td>
                        <td className="py-3 pr-4 capitalize">
                          {titleCase(item.brick_type)}
                        </td>
                        <td className="py-3 pr-4">
                          {formatMoney(item.bricks)}
                        </td>
                        <td className="py-3 pr-4">
                          Rs {formatMoney(item.rate_per_1000)}
                        </td>
                        <td className="py-3 pr-4 text-orange-300 font-semibold">
                          Rs {formatMoney(item.total_amount)}
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
