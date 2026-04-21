import { supabase } from "../lib/supabase"

export default async function Home() {
  const { data: workers, error } = await supabase
    .from("workers")
    .select("*")

  return (
    <div style={{ padding: "20px" }}>
      <h1>Anayat Sons Bricks</h1>

      <h2>Workers</h2>

      {error && <p>Error loading workers</p>}

      <ul>
        {workers?.map((worker) => (
          <li key={worker.id}>
            {worker.name} - {worker.phone} - {worker.status}
          </li>
        ))}
      </ul>
    </div>
  )
}
