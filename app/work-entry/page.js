"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"

const BRICK_TYPES = {
  patheer: ["gutka", "tile", "special"],
  bharai: ["gutka", "tile", "special"],
  nakasi: ["awal", "dome", "tirak", "tile", "special"],
  loading: ["awal", "dome", "tirak", "tile", "special"],
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

export default function WorkEntryPage() {
  const [workers, setWorkers] = useState([])
  const [entries, setEntries] = useState([])

  const [workerId, setWorkerId] = useState("")
  const [date, setDate] = useState("")
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

    if (error) {
      alert(error.message)
      return
    }

    setEntries(data || [])
  }

  const selectedWorker = useMemo(() => {
    return workers.find((w) => w.id === workerId)
  }, [workerId, workers])

  const workerType = selectedWorker?.worker_type || ""

  const availableBrickTypes =
    BRICK_TYPES[workerType?.toLowerCase()] || []

  const totalAmount = useMemo(() => {
    const total =
      ((Number(bricks) || 0) / 1000) *
      (Number(ratePer1000) || 0)

    return total
  }, [bricks, ratePer1000])

  async function handleSubmit(e) {
    e.preventDefault()

    if (
      !workerId ||
      !date ||
      !brickType ||
      !bricks ||
      !ratePer1000
    ) {
      alert("Please fill all required fields")
      return
    }

    const weekStart = getWeekStart(date)

    const { error } = await supabase
      .from("work_entries")
      .insert([
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
    setDate("")
    setBrickType("")
    setBricks("")
    setRatePer1000("")

    fetchEntries()
  }

  return (
    <div className="min-h-screen bg-[#061226] text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-orange-500">
          Daily Work Entry
        </h1>

        <Link href="/admin">
          <button className="bg-[#0f223a] px-4 py-2 rounded-lg">
            Back to Dashboard
          </button>
        </Link>
      </div>

      {/* FORM */}
      <div className="bg-[#0f223a] p-6 rounded-xl mb-8">
        <h2 className="text-2xl font-semibold mb-6">
          Record Daily Production
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {/* WORKER */}
          <select
            value={workerId}
            onChange={(e) => {
              setWorkerId(e.target.value)
              setBrickType("")
            }}
            className="p-3 rounded bg-[#081a2f]"
            required
          >
            <option value="">Select Worker</option>

            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.worker_type?.toUpperCase()} - {worker.name}
              </option>
            ))}
          </select>

          {/* DATE */}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="p-3 rounded bg-[#081a2f]"
            required
          />

          {/* BRICK TYPE */}
          <select
            value={brickType}
            onChange={(e) => setBrickType(e.target.value)}
            className="p-3 rounded bg-[#081a2f]"
            required
            disabled={!workerType}
          >
            <option value="">Select Brick Type</option>

            {availableBrickTypes.map((type) => (
              <option key={type} value={type}>
                {type.toUpperCase()}
              </option>
            ))}
          </select>

          {/* BRICKS */}
          <input
            type="number"
            placeholder="Bricks"
            value={bricks}
            onChange={(e) => setBricks(e.target.value)}
            className="p-3 rounded bg-[#081a2f]"
            required
          />

          {/* RATE */}
          <input
            type="number"
            placeholder="Rate per 1000"
            value={ratePer1000}
            onChange={(e) => setRatePer1000(e.target.value)}
            className="p-3 rounded bg-[#081a2f]"
            required
          />

          {/* TOTAL */}
          <div className="bg-[#081a2f] rounded p-3 flex flex-col justify-center">
            <span className="text-gray-400 text-sm">
              Total Amount
            </span>

            <span className="text-orange-500 text-2xl font-bold">
              Rs {formatMoney(totalAmount)}
            </span>
          </div>

          {/* SAVE */}
          <button className="lg:col-span-3 bg-orange-500 p-3 rounded font-semibold hover:opacity-90 transition">
            Save Entry
          </button>
        </form>
      </div>

      {/* HISTORY */}
      <div className="bg-[#0f223a] p-6 rounded-xl">
        <h2 className="text-2xl font-semibold mb-6">
          Production History
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-orange-500 border-b border-gray-700">
                <th className="pb-3">Worker Type</th>
                <th className="pb-3">Worker</th>
                <th className="pb-3">Brick Type</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Bricks</th>
                <th className="pb-3">Rate</th>
                <th className="pb-3">Total</th>
              </tr>
            </thead>

            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-gray-800"
                >
                  <td className="py-3 capitalize">
                    {entry.worker_type || "-"}
                  </td>

                  <td className="py-3">
                    {entry.workers?.name || "-"}
                  </td>

                  <td className="capitalize">
                    {entry.brick_type || "-"}
                  </td>

                  <td>{entry.date}</td>

                  <td>{formatMoney(entry.bricks)}</td>

                  <td>
                    Rs {formatMoney(entry.rate_per_1000)}
                  </td>

                  <td className="text-orange-500 font-semibold">
                    Rs {formatMoney(entry.total_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
