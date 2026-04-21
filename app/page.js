"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function Home() {
  const [workers, setWorkers] = useState([])

  useEffect(() => {
    async function fetchWorkers() {
      const { data, error } = await supabase
        .from("workers")
        .select("*")

      if (!error) {
        setWorkers(data)
      } else {
        console.log(error)
      }
    }

    fetchWorkers()
  }, [])

  return (
    <div style={{ padding: "20px" }}>
      <h1>Anayat Sons Bricks</h1>

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
