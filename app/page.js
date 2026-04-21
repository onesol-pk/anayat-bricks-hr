"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function Home() {
  const [workers, setWorkers] = useState([])
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")

  async function fetchWorkers() {
    const { data, error } = await supabase
      .from("workers")
      .select("*")

    if (!error) {
      setWorkers(data)
    }
  }

  async function addWorker() {
    if (!name || !phone) return

    await supabase.from("workers").insert([
      {
        name,
        phone,
        status: "active",
      },
    ])

    setName("")
    setPhone("")
    fetchWorkers()
  }

  useEffect(() => {
    fetchWorkers()
  }, [])

  return (
    <div style={{ padding: "20px" }}>
      <h1>Anayat Sons Bricks</h1>

      <h2>Add Worker</h2>

      <input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <button onClick={addWorker}>Add</button>

      <h2>Workers</h2>

      <ul>
        {workers.map((worker) => (
          <li key={worker.id}>
            {worker.name} - {worker.phone} - {worker.status}
          </li>
        ))}
      </ul>
    </div>
  )
}
