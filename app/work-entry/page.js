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

function makeRow(brickType = "gutka", rate = 0) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    brickType,
    quantity: "",
    rate: String(rate || ""),
  }
}

function getWorkerTypeLabel(workerType) {
  return titleCase(workerType || "-")
}

export default function WorkEntryPage() {
  const [workers, setWorkers] = useState([])
  const [selectedWorkerId, setSelectedWorkerId] = useState("")
  const [entryDate, setEntryDate] = useState(getTodayDateInput())
  const [rows, setRows] = useState([makeRow()])
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

  const defaultRate = 0

  useEffect(() => {
    if (!selectedWorkerId && workers.length > 0) {
      setSelectedWorkerId(String(workers[0].id))
      return
    }

    if (selectedWorkerId && selectedWorker) {
      const firstBrick = brickOptions[0] || "gutka"
      setRows([makeRow(firstBrick, defaultRate)])
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
          .select("*")
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

  function handleRowChange(rowId, field, value) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row
        return { ...row, [field]: value }
      })
    )
  }

  function addRow() {
    const firstBrick = brickOptions[0] || "gutka"
    setRows((prev) => [...prev, makeRow(firstBrick, defaultRate)])
  }

  function removeRow(rowId) {
    setRows((prev) => {
      if (prev.length === 1) return prev
      return prev.filter((row) => row.id !== rowId)
    })
  }

  const totalBricks = useMemo(() => {
    return rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)
  }, [rows])

  const totalLabour = useMemo(() => {
    return rows.reduce((sum, row) => {
      const qty = Number(row.quantity) || 0
      const rate = Number(row.rate) || 0
      return sum + (qty / 1000) * rate
    }, 0)
  }, [rows])

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

    if (!rows.length) {
      alert("Please add at least one row")
      return
    }

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]
      const qty = Number(row.quantity) || 0
      const rate = Number(row.rate) || 0

      if (!row.brickType) {
        alert(`Please select brick type in row ${i + 1}`)
        return
      }

      if (qty <= 0) {
        alert(`Please enter quantity in row ${i + 1}`)
        return
      }

      if (rate <= 0) {
        alert(`Please enter rate in row ${i + 1}`)
        return
      }
    }

    const payload = rows.map((row) => {
      const qty = Number(row.quantity) || 0
      const rate = Number(row.rate) || 0

      return {
        worker_id: Number(selectedWorker.id),
        worker_type: selectedWorker.worker_type,
        date: entryDate,
        brick_type: String(row.brickType).toLowerCase(),
        bricks: qty,
        rate_per_1000: rate,
        total_amount: (qty / 1000) * rate,
      }
    })

    setSaving(true)

    try {
      const { error } = await supabase.from("work_entries").insert(payload)

      if (error) {
        alert(error.message)
        return
      }

      alert("Work entries saved successfully")

      const firstBrick = brickOptions[0] || "gutka"
      setRows([makeRow(firstBrick, defaultRate)])
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
                Add multiple brick rows for one worker in a single save.
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
              <p className="text-gray-400">Rows in Form</p>
              <p className="mt-2 text-3xl font-bold text-orange-300">
                {formatMoney(rows.length)}
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
                {getWorkerTypeLabel(workerType)}
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
                    One worker, one date, many brick rows, one save.
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

                <div className="space-y-4">
                  {rows.map((row, index) => (
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
                          onClick={() => removeRow(row.id)}
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
                            {brickOptions.map((brick) => (
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
                          Rs {formatMoney((Number(row.quantity) || 0) / 1000 * (Number(row.rate) || 0))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={addRow}
                    className="rounded-xl bg-white/5 px-6 py-3 font-semibold text-gray-200 hover:bg-white/10 transition border border-white/10"
                  >
                    Add Row
                  </button>

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
                    recentEntries.map((item) => {
                      const worker = workers.find(
                        (w) => Number(w.id) === Number(item.worker_id)
                      )

                      return (
                        <tr key={item.id} className="border-b border-gray-800">
                          <td className="py-3 pr-4">{item.date}</td>
                          <td className="py-3 pr-4">
                            {worker?.name || "-"}
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
