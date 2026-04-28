"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function WorkEntryPage() {
  const [workers, setWorkers] = useState([])
  const [entries, setEntries] = useState([])

  const [workerId, setWorkerId] = useState("")
  const [date, setDate] = useState("")
  const [bricks, setBricks] = useState("")

  useEffect(() => {
    fetchWorkers()
    fetchEntries()
    fixOldEntries()
  }, [])

  //-----------------------------------
  // GET THURSDAY WEEK START
  //-----------------------------------
  function getWeekStart(selectedDate) {
    const d = new Date(selectedDate)
    const day = d.getDay()

    let diff

    // Thursday = week start
    if (day >= 4) {
      diff = day - 4
    } else {
      diff = day + 3
    }

    d.setDate(d.getDate() - diff)

    return d.toISOString().split("T")[0]
  }

  //-----------------------------------
  // FIX OLD NULL WEEK_START DATA
  //-----------------------------------
  async function fixOldEntries() {
    const { data } = await supabase
      .from("work_entries")
      .select("*")
      .is("week_start", null)

    if (!data || data.length === 0) return

    for (const entry of data) {
      const correctWeekStart = getWeekStart(entry.date)

      await supabase
        .from("work_entries")
        .update({
          week_start: correctWeekStart
        })
        .eq("id", entry.id)
    }

    fetchEntries()
  }

  //-----------------------------------
  // FETCH WORKERS
  //-----------------------------------
  async function fetchWorkers() {
    const { data } = await supabase
      .from("workers")
      .select("*")
      .eq("status", "active")
      .order("name")

    if (data) {
      setWorkers(data)
    }
  }

  //-----------------------------------
  // FETCH ENTRIES
  //-----------------------------------
  async function fetchEntries() {
    const { data } = await supabase
      .from("work_entries")
      .select(`
        *,
        workers(name)
      `)
      .order("date", { ascending: false })

    if (data) {
      setEntries(data)
    }
  }

  //-----------------------------------
  // SAVE NEW ENTRY
  //-----------------------------------
  async function handleSubmit(e) {
    e.preventDefault()

    const weekStart = getWeekStart(date)

    const { error } = await supabase
      .from("work_entries")
      .insert([
        {
          worker_id: workerId,
          date,
          bricks: Number(bricks),
          week_start: weekStart
        }
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

      {/* HEADER */}
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

      {/* ENTRY FORM */}
      <div className="bg-[#0f223a] p-6 rounded-xl mb-8">
        <h2 className="text-2xl font-semibold mb-6">
          Record Daily Production
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-3 gap-4"
        >
          <select
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            className="p-3 rounded bg-[#081a2f]"
            required
          >
            <option value="">Select Worker</option>

            {workers.map((worker) => (
              <option
                key={worker.id}
                value={worker.id}
              >
                {worker.name}
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

          <button className="col-span-3 bg-orange-500 p-3 rounded font-semibold hover:opacity-90">
            Save Entry
          </button>
        </form>
      </div>

      {/* HISTORY */}
      <div className="bg-[#0f223a] p-6 rounded-xl">
        <h2 className="text-2xl font-semibold mb-6">
          Production History
        </h2>

        <table className="w-full">
          <thead>
            <tr className="text-left text-orange-500 border-b border-gray-700">
              <th className="pb-3">Worker</th>
              <th className="pb-3">Date</th>
              <th className="pb-3">Bricks</th>
              <th className="pb-3">Week Start</th>
            </tr>
          </thead>

          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-gray-800"
              >
                <td className="py-3">
                  {entry.workers?.name}
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
  )
}
