"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"

export default function WorkEntryPage() {
  const [workers, setWorkers] = useState([])
  const [entries, setEntries] = useState([])

  const [workerId, setWorkerId] = useState("")
  const [date, setDate] = useState("")
  const [bricks, setBricks] = useState("")

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

  async function handleSubmit(e) {
    e.preventDefault()

    if (!workerId || !date || !bricks) {
      alert("Please fill all required fields")
      return
    }

    const weekStart = getWeekStart(date)

    const { error } = await supabase.from("work_entries").insert([
      {
        worker_id: workerId,
        date,
        bricks: Number(bricks),
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
    setBricks("")
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
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <select
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
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

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="p-3 rounded bg-[#081a2f]"
            required
          />

          <input
            type="number"
            placeholder="Bricks Produced"
            value={bricks}
            onChange={(e) => setBricks(e.target.value)}
            className="p-3 rounded bg-[#081a2f]"
            required
          />

          <button className="md:col-span-3 bg-orange-500 p-3 rounded font-semibold hover:opacity-90 transition">
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
                <th className="pb-3">Date</th>
                <th className="pb-3">Bricks</th>
                <th className="pb-3">Week Start</th>
              </tr>
            </thead>

            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-800">
                  <td className="py-3 capitalize">
                    {entry.workers?.worker_type || "-"}
                  </td>
                  <td className="py-3">
                    {entry.workers?.name || "-"}
                  </td>
                  <td>{entry.date}</td>
                  <td>{entry.bricks}</td>
                  <td>{entry.week_start}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
