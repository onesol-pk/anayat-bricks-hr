"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
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

export default function AdditionsPage() {
  const [workers, setWorkers] = useState([])
  const [additions, setAdditions] = useState([])
  const [loading, setLoading] = useState(true)

  const [workerId, setWorkerId] = useState("")
  const [amount, setAmount] = useState("")
  const [additionType, setAdditionType] = useState("electricity")
  const [notes, setNotes] = useState("")
  const [date, setDate] = useState(getTodayDateInput())

  useEffect(() => {
    fetchWorkers()
    fetchAdditions()
  }, [])

  async function fetchWorkers() {
    const { data, error } = await supabase
      .from("workers")
      .select("*")
      .order("name")

    if (error) {
      alert(error.message)
      return
    }

    setWorkers(data || [])
  }

  async function fetchAdditions() {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from("worker_financial_transactions")
        .select(`
          *,
          workers(name, worker_type)
        `)
        .in("transaction_type", ["electricity", "loan", "damage"])
        .order("created_at", { ascending: false })

      if (error) {
        alert(error.message)
        return
      }

      setAdditions(data || [])
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const totalAmount = additions.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    )

    return {
      totalAmount,
      totalEntries: additions.length,
      workerCount: workers.length,
    }
  }, [additions, workers])

  async function handleSubmit(e) {
    e.preventDefault()

    if (!workerId || !amount || !date) {
      alert("Please fill all required fields")
      return
    }

    const weekStart = getWeekStart(date)

    const { error } = await supabase
      .from("worker_financial_transactions")
      .insert([
        {
          worker_id: workerId,
          transaction_type: additionType,
          amount: Number(amount),
          transaction_date: date,
          week_start: weekStart,
          notes: notes || additionType,
        },
      ])

    if (error) {
      alert(error.message)
      return
    }

    alert("Addition added successfully")

    setWorkerId("")
    setAmount("")
    setAdditionType("electricity")
    setNotes("")
    setDate(getTodayDateInput())
    fetchAdditions()
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
                Additions to Khatta
              </h1>
              <p className="text-gray-400 mt-3 max-w-2xl">
                Record electricity, loan, and damage entries that are added to a worker&apos;s khatta.
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-orange-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Total Additions</p>
              <p className="mt-2 text-3xl font-bold text-orange-300">
                Rs {formatNumber(stats.totalAmount)}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Addition Entries</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {formatNumber(stats.totalEntries)}
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Workers Available</p>
              <p className="mt-2 text-3xl font-bold text-emerald-300">
                {formatNumber(stats.workerCount)}
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
                    Khatta Entry
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold mt-3">
                    Add New Addition
                  </h2>
                  <p className="text-gray-400 mt-1">
                    Select worker, addition type, amount, and date.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                    Week start
                  </p>
                  <p className="text-sm text-gray-200 mt-1">
                    {getWeekStart(date)}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Worker
                  </label>
                  <select
                    value={workerId}
                    onChange={(e) => setWorkerId(e.target.value)}
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
                    Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Type
                  </label>
                  <select
                    value={additionType}
                    onChange={(e) => setAdditionType(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  >
                    <option value="electricity">Electricity</option>
                    <option value="loan">Loan</option>
                    <option value="damage">Damage</option>
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

                <div className="md:col-span-2 xl:col-span-4">
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Notes
                  </label>
                  <textarea
                    placeholder="Optional notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full min-h-[110px] rounded-2xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  />
                </div>

                <div className="xl:col-span-4 pt-1">
                  <button className="w-full rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:opacity-90 transition">
                    Save Addition
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* HISTORY */}
          <section className="bg-[#0f223a] border border-white/10 rounded-3xl p-6 md:p-7 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Additions History</h2>
                <p className="text-gray-400 mt-1">
                  Electricity, loan, and damage entries already recorded.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700 text-orange-400">
                    <th className="py-3 pr-4">Worker Type</th>
                    <th className="py-3 pr-4">Worker</th>
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Amount</th>
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Week Start</th>
                    <th className="py-3 pr-4">Notes</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td className="py-6 text-gray-400" colSpan={7}>
                        Loading additions...
                      </td>
                    </tr>
                  ) : additions.length === 0 ? (
                    <tr>
                      <td className="py-6 text-gray-400" colSpan={7}>
                        No additions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    additions.map((item) => (
                      <tr key={item.id} className="border-b border-gray-800">
                        <td className="py-3 pr-4 capitalize">
                          {item.workers?.worker_type || "-"}
                        </td>
                        <td className="py-3 pr-4">
                          {item.workers?.name || "-"}
                        </td>
                        <td className="py-3 pr-4 capitalize">
                          {item.transaction_type}
                        </td>
                        <td className="py-3 pr-4 text-orange-300 font-semibold">
                          Rs {formatNumber(item.amount)}
                        </td>
                        <td className="py-3 pr-4">{item.transaction_date}</td>
                        <td className="py-3 pr-4">{item.week_start || "-"}</td>
                        <td className="py-3 pr-4">{item.notes || "-"}</td>
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
