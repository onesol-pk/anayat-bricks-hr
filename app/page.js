"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function Home() {
  const [workers, setWorkers] = useState([])
  const [entries, setEntries] = useState([])
  const [advances, setAdvances] = useState([])

  const [selectedWorker, setSelectedWorker] = useState("")
  const [bricks, setBricks] = useState("")
  const [rate, setRate] = useState("")
  const [advanceAmount, setAdvanceAmount] = useState("")

  async function fetchWorkers() {
    const { data } = await supabase.from("workers").select("*")
    setWorkers(data || [])
  }

  async function fetchEntries() {
    const { data } = await supabase
      .from("work_entries")
      .select("*")

    setEntries(data || [])
  }

  async function fetchAdvances() {
    const { data } = await supabase
      .from("advances")
      .select("*")

    setAdvances(data || [])
  }

  function getWorkerEarnings(workerId) {
    return entries
      .filter((e) => e.worker_id === workerId)
      .reduce((sum, e) => {
        return sum + (e.bricks / 1000) * e.rate_per_1000
      }, 0)
  }

  function getWorkerAdvances(workerId) {
    return advances
      .filter((a) => a.worker_id === workerId)
      .reduce((sum, a) => sum + Number(a.amount), 0)
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

  async function addAdvance() {
    if (!selectedWorker || !advanceAmount) return

    const earnings = getWorkerEarnings(selectedWorker)
    const alreadyTaken = getWorkerAdvances(selectedWorker)

    const maxAllowed = earnings * 0.7

    if (alreadyTaken + Number(advanceAmount) > maxAllowed) {
      alert("Advance exceeds 70% limit ❌")
      return
    }

    const today = new Date().toISOString().split("T")[0]

    await supabase.from("advances").insert([
      {
        worker_id: selectedWorker,
        amount: Number(advanceAmount),
        date: today,
      },
    ])

    setAdvanceAmount("")
    fetchAdvances()
  }

  useEffect(() => {
    fetchWorkers()
    fetchEntries()
    fetchAdvances()
  }, [])

  return (
    <div style={{ padding: "20px" }}>
      <h1>Anayat Sons Bricks</h1>

      {/* Work Entry */}
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

      {/* Advance */}
      <h2>Give Advance</h2>

      <input
        placeholder="Advance Amount"
        value={advanceAmount}
        onChange={(e) => setAdvanceAmount(e.target.value)}
      />

      <button onClick={addAdvance}>Give Advance</button>

      <hr />

      {/* Worker Summary */}
      <h2>Worker Summary</h2>

      <ul>
        {workers.map((w) => {
          const earnings = getWorkerEarnings(w.id)
          const adv = getWorkerAdvances(w.id)
          const balance = earnings - adv

          return (
            <li key={w.id}>
              {w.name} — Earned: Rs {earnings} — Advance: Rs {adv} — Balance: Rs {balance}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
