"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function Home() {
  const [workers, setWorkers] = useState([])
  const [selectedWorker, setSelectedWorker] = useState("")
  const [bricks, setBricks] = useState("")
  const [rate, setRate] = useState("")

  async function fetchWorkers() {
    const { data } = await supabase.from("workers").select("*")
    setWorkers(data || [])
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
    alert("Work entry added")
  }

  useEffect(() => {
    fetchWorkers()
  }, [])

  return (
    <div style={{ padding: "20px" }}>
      <h1>Anayat Sons Bricks</h1>

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
    </div>
  )
}
