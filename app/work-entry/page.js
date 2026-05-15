"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"

const BRICK_TYPES = {
  patheer: ["gutka", "tile", "special"],
  bharai: ["gutka", "tile", "special"],
  nakasi: ["awal", "dome", "tirak", "tile", "special", "Kachi kali"],
  loading: ["awal", "dome", "tirak", "tile", "special", "Kachi kali"],
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

export default function WorkEntryPage() {
  const [workers, setWorkers] = useState([])
  const [entries, setEntries] = useState([])

  const [workerId, setWorkerId] = useState("")
  const [date, setDate] = useState(getTodayDateInput())
  const [brickType, setBrickType] = useState("")
  const [bricks, setBricks] = useState("")
  const [ratePer1000, setRatePer1000] = useState("")

  useEffect(() => {
    fetchWorkers()
    fetchEntries()
  }, [])

  function getWeekStart(selectedDate) {
    const d = new Date(selectedDate)
    const day = d.getDay()

    // Friday = week start
    let diff
    if (day >= 5) {
      diff = day - 5
    } else {
      diff = day + 2
    }

    d.setDate(d.getDate() - diff)
    return d.toISOString().split("T")[0]
  }

  async function fetchWorkers() {
    const { data, error } = await supabase
      .from("workers")
      .select("*")
      .eq("status", "active")
      .order("name")

    if (error) {
      alert(error.message)
      return
    }

    setWorkers(data || [])
  }

  async function fetchEntries() {
    const { data, error } = await supabase
      .from("work_entries")
      .select(`
        *,
        workers(name, worker_type)
      `)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      alert(error.message)
      return
    }

    setEntries(data || [])
  }

  const selectedWorker = useMemo(() => {
    return workers.find((w) => w.id === workerId)
  }, [workerId, workers])

  const workerType = String(selectedWorker?.worker_type || "").toLowerCase()

  const availableBrickTypes = BRICK_TYPES[workerType] || []

  const totalAmount = useMemo(() => {
    return ((Number(bricks) || 0) / 1000) * (Number(ratePer1000) || 0)
  }, [bricks, ratePer1000])

  async function handleSubmit(e) {
    e.preventDefault()

    if (!workerId || !date || !brickType || !bricks || !ratePer1000) {
      alert("Please fill all required fields")
      return
    }

    const weekStart = getWeekStart(date)

    const { error } = await supabase.from("work_entries").insert([
      {
        worker_id: workerId,
        worker_type: workerType,
        brick_type: brickType,
        date,
        bricks: Number(bricks),
        rate_per_1000: Number(ratePer1000),
        total_amount: Number(totalAmount),
        week_start: weekStart,
      },
    ])

    if (error) {
      alert(error.message)
      return
    }

    alert("Daily work entry added successfully")

    setWorkerId("")
    setDate(getTodayDateInput())
    setBrickType("")
    setBricks("")
    setRatePer1000("")
    fetchEntries()
  }

  return (
    <div className="min-h-screen bg-[#061226] text-white">
      <div className="px-8 pt-8 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-orange-400 uppercase tracking-[0.35em] text-xs mb-3">
                Kiln Operations Center
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Daily Work Entry
              </h1>
              <p className="text-gray-400 mt-3 max-w-2xl">
                Record production by worker, labour stage, and brick type.
                Each entry stores its own rate and total amount for accurate ledgering.
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
          {/* FORM */}
          <section className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-[#0f223a] shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-orange-500/25 via-orange-500/10 to-transparent" />
            <div className="relative p-6 md:p-7">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-6">
                <div>
                  <p className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-orange-500/15 text-orange-200">
                    Production Entry
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold mt-3">
                    Record Daily Production
                  </h2>
                  <p className="text-gray-400 mt-1">
                    Select worker, brick type, quantity, and rate for the entry.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                    Entry date
                  </p>
                  <p className="text-sm text-gray-200 mt-1">{date}</p>
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Worker
                  </label>
                  <select
                    value={workerId}
                    onChange={(e) => {
                      setWorkerId(e.target.value)
                      setBrickType("")
                    }}
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
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Brick Type
                  </label>
                  <select
                    value={brickType}
                    onChange={(e) => setBrickType(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500 disabled:opacity-50"
                    required
                    disabled={!workerType}
                  >
                    <option value="">Select Brick Type</option>
                    {availableBrickTypes.map((type) => (
                      <option key={type} value={type}>
                        {titleCase(type)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Bricks
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter bricks"
                    value={bricks}
                    onChange={(e) => setBricks(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Rate / 1000
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter rate"
                    value={ratePer1000}
                    onChange={(e) => setRatePer1000(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                    required
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                    Total Amount
                  </p>
                  <p className="mt-3 text-3xl font-bold text-orange-300">
                    Rs {formatNumber(totalAmount)}
                  </p>
                  <p className="mt-2 text-sm text-gray-400">
                    Calculated automatically from bricks and rate.
                  </p>
                </div>

                <div className="md:col-span-2 xl:col-span-3 pt-1">
                  <button className="w-full rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:opacity-90 transition">
                    Save Entry
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* HISTORY */}
          <section className="bg-[#0f223a] border border-white/10 rounded-3xl p-6 md:p-7 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Production History</h2>
                <p className="text-gray-400 mt-1">
                  Latest entries recorded in the system.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700 text-orange-400">
                    <th className="py-3 pr-4">Worker Type</th>
                    <th className="py-3 pr-4">Worker</th>
                    <th className="py-3 pr-4">Brick Type</th>
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Bricks</th>
                    <th className="py-3 pr-4">Rate</th>
                    <th className="py-3 pr-4">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td className="py-6 text-gray-400" colSpan={7}>
                        No work entries found.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-800">
                        <td className="py-3 pr-4 capitalize">
                          {entry.worker_type || "-"}
                        </td>
                        <td className="py-3 pr-4">
                          {entry.workers?.name || "-"}
                        </td>
                        <td className="py-3 pr-4 capitalize">
                          {entry.brick_type || "-"}
                        </td>
                        <td className="py-3 pr-4">{entry.date}</td>
                        <td className="py-3 pr-4">{formatNumber(entry.bricks)}</td>
                        <td className="py-3 pr-4">
                          Rs {formatNumber(entry.rate_per_1000)}
                        </td>
                        <td className="py-3 pr-4 text-orange-300 font-semibold">
                          Rs {formatNumber(entry.total_amount)}
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
