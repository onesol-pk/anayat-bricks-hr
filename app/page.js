"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

// ✅ Helper: get Thursday of current week
function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun ... 4=Thu
  const diff = day >= 4 ? day - 4 : 7 - (4 - day)
  d.setDate(d.getDate() - diff)
  return d.toISOString().split("T")[0]
}

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
    const { data } = await supabase.from("work_entries").select("*")
    setEntries(data || [])
  }

  async function fetchAdvances() {
    const { data } = await supabase.from("advances").select("*")
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
    const weekStart = getWeekStart()

    await supabase.from("work_entries").insert([
      {
        worker_id: selectedWorker,
        date: today,
        bricks: Number(bricks),
        rate_per_1000: Number(rate),
        week_start: weekStart,
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
    const weekStart = getWeekStart()

    await supabase.from("advances").insert([
      {
        worker_id: selectedWorker,
        amount: Number(advanceAmount),
        date: today,
        week_start: weekStart,
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

      <hr />

      {/* Weekly Settlement */}
      <h2>Weekly Settlement (Current Week)</h2>

      <ul>
        {workers.map((w) => {
          const weekStart = getWeekStart()

          const weekEntries = entries.filter(
            (e) => e.worker_id === w.id && e.week_start === weekStart
          )

          const weekAdvances = advances.filter(
            (a) => a.worker_id === w.id && a.week_start === weekStart
          )

          const earnings = weekEntries.reduce((sum, e) => {
            return sum + (e.bricks / 1000) * e.rate_per_1000
          }, 0)

          const adv = weekAdvances.reduce(
            (sum, a) => sum + Number(a.amount),
            0
          )

          const net = earnings - adv
  function printSlip(worker) {
  const weekStart = getWeekStart()

  const weekEntries = entries.filter(
    (e) => e.worker_id === worker.id && e.week_start === weekStart
  )

  const weekAdvances = advances.filter(
    (a) => a.worker_id === worker.id && a.week_start === weekStart
  )

  const totalBricks = weekEntries.reduce((sum, e) => sum + e.bricks, 0)

  const earnings = weekEntries.reduce((sum, e) => {
    return sum + (e.bricks / 1000) * e.rate_per_1000
  }, 0)

  const adv = weekAdvances.reduce((sum, a) => sum + Number(a.amount), 0)

  const net = earnings - adv

  const html = `
    <html>
      <body style="font-family: Arial; padding:20px;">
        <h2>Weekly Settlement / ہفتہ وار حساب</h2>

        <table border="1" cellpadding="10" style="width:100%; border-collapse:collapse;">
          <tr>
            <th>English</th>
            <th>اردو</th>
          </tr>

          <tr>
            <td>Name: ${worker.name}</td>
            <td>نام: ${worker.name}</td>
          </tr>

          <tr>
            <td>Week Start: ${weekStart}</td>
            <td>ہفتہ شروع: ${weekStart}</td>
          </tr>

          <tr>
            <td>Total Bricks: ${totalBricks}</td>
            <td>کل اینٹیں: ${totalBricks}</td>
          </tr>

          <tr>
            <td>Total Earnings: Rs ${earnings}</td>
            <td>کل مزدوری: Rs ${earnings}</td>
          </tr>

          <tr>
            <td>Advance: Rs ${adv}</td>
            <td>ایڈوانس: Rs ${adv}</td>
          </tr>

          <tr>
            <td>Final Balance: Rs ${net}</td>
            <td>بقایا: Rs ${net}</td>
          </tr>
        </table>

        <br/><br/>
        <button onclick="window.print()">Print</button>
      </body>
    </html>
  `

  const win = window.open("", "_blank")
  win.document.write(html)
  win.document.close()
}
          return (
            <li key={w.id}>
  <button onClick={() => printSlip(w)}>Print</button>
              {w.name} — Earned: Rs {earnings} — Advance: Rs {adv} — Net: Rs {net}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
