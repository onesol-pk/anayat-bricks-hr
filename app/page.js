"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function Home() {
  const [workers, setWorkers] = useState([])
  const [entries, setEntries] = useState([])

  const [selectedWorker, setSelectedWorker] = useState("")
  const [bricks, setBricks] = useState("")
  const [rate, setRate] = useState("")

  async function fetchWorkers() {
    const { data } = await supabase.from("workers").select("*")
    setWorkers(data || [])
  }

  async function fetchEntries() {
    const { data } = await supabase
      .from("work_entries")
      .select("*, workers(name)")
      .order("date", { ascending: false })

    setEntries(data || [])
  }

  async function addWorkEntry() {
    if (!selectedWorker || !bricks || !rate) return

    const today = new Date().toISOString().split("T")[0]

    await supabase.from("work_entries").insert([
      {
        worker_id: selectedWorker,
        date: today,
        bricks: Number(bricks),
        rate_per_1000: Number(rate),
      },
    ])

    setBricks("")
    setRate("")
    fetchEntries()
  }

  useEffect(() => {
    fetchWorkers()
    fetchEntries()
  }, [])

  return (
    <div style={{ padding: "20px" }}>
      <h1>Anayat Sons Bricks</h1>

      {/* Add Work Entry */}
      <h2>Add Work Entry</h2>

      <select onChange={(e) => setSelectedWorker(e.target.value)}>
        <option value="">Select Worker</option>
        {workers.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>

      <br /><br />

      <input
        placeholder="Bricks"
        value={bricks}
        onChange={(e) => setBricks(e.target.value)}
      />

      <input
        placeholder="Rate per 1000"
        value={rate}
        onChange={(e) => setRate(e.target.value)}
      />

      <br /><br />

      <button onClick={addWorkEntry}>Save Entry</button>

      <hr />

      {/* Work Records */}
      <h2>Work Records</h2>

      <ul>
        {entries.map((e) => {
          const earning = (e.bricks / 1000) * e.rate_per_1000

          return (
            <li key={e.id}>
              {e.workers?.name} — {e.bricks} bricks — Rs {earning}
            </li>
          )
        })}
      </ul>

      <hr />

      {/* Worker Totals */}
      <h2>Worker Totals</h2>

      <ul>
        {workers.map((w) => {
          const total = entries
            .filter((e) => e.worker_id === w.id)
            .reduce((sum, e) => {
              return sum + (e.bricks / 1000) * e.rate_per_1000
            }, 0)

          return (
            <li key={w.id}>
              {w.name} — Total: Rs {total}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
