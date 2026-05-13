"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

function calculatePeshgiBalance(transactions = []) {
  return transactions.reduce((sum, t) => {
    const amount = Number(t.amount) || 0

    if (
      t.transaction_type === "peshgi" ||
      t.transaction_type === "advance" ||
      t.transaction_type === "electricity" ||
      t.transaction_type === "deduction"
    ) {
      return sum + amount
    }

    if (t.transaction_type === "return") {
      return sum - amount
    }

    return sum
  }, 0)
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState([])
  const [filter, setFilter] = useState("all")

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [cnic, setCnic] = useState("")
  const [workerType, setWorkerType] = useState("patheer")
  const [rate, setRate] = useState("")
  const [openingPeshgi, setOpeningPeshgi] = useState("")
  const [joiningDate, setJoiningDate] = useState("")
  const [notes, setNotes] = useState("")

  const [editingWorker, setEditingWorker] = useState(null)

  useEffect(() => {
    fetchWorkers()
  }, [])

  useEffect(() => {
    fetchWorkers()
  }, [filter])

  async function fetchWorkers() {
    let query = supabase.from("workers").select("*")

    if (filter !== "all") {
      query = query.eq("status", filter)
    }

    const { data: workersData, error } = await query.order("created_at", {
      ascending: false,
    })

    if (error) {
      alert(error.message)
      return
    }

    const enrichedWorkers = await Promise.all(
      (workersData || []).map(async (worker) => {
        const { data: transactions, error: txError } = await supabase
          .from("worker_financial_transactions")
          .select("transaction_type, amount")
          .eq("worker_id", worker.id)

        if (txError) {
          return {
            ...worker,
            current_peshgi: 0,
          }
        }

        return {
          ...worker,
          current_peshgi: calculatePeshgiBalance(transactions || []),
        }
      })
    )

    setWorkers(enrichedWorkers)
  }

  async function saveWorker() {
    if (!name || !phone || !rate || !joiningDate) {
      alert("Please fill all required fields")
      return
    }

    const workerPayload = {
      name,
      phone,
      cnic,
      worker_type: workerType,
      default_rate: Number(rate) || 0,
      joining_date: joiningDate,
      notes,
    }

    if (editingWorker) {
      const { error } = await supabase
        .from("workers")
        .update(workerPayload)
        .eq("id", editingWorker.id)

      if (error) {
        alert(error.message)
        return
      }

      alert("Worker updated successfully")
    } else {
      const { data: newWorker, error } = await supabase
        .from("workers")
        .insert([
          {
            ...workerPayload,
            status: "active",
          },
        ])
        .select()
        .single()

      if (error) {
        alert(error.message)
        return
      }

      if (Number(openingPeshgi) > 0) {
        const { error: peshgiError } = await supabase
          .from("worker_financial_transactions")
          .insert([
            {
              worker_id: newWorker.id,
              transaction_type: "peshgi",
              amount: Number(openingPeshgi),
              transaction_date: joiningDate,
              notes: "Opening peshgi",
            },
          ])

        if (peshgiError) {
          alert(
            "Worker created, but opening peshgi was not saved: " +
              peshgiError.message
          )
          resetForm()
          fetchWorkers()
          return
        }
      }

      alert("Worker created successfully")
    }

    resetForm()
    fetchWorkers()
  }

  function resetForm() {
    setName("")
    setPhone("")
    setCnic("")
    setWorkerType("patheer")
    setRate("")
    setOpeningPeshgi("")
    setJoiningDate("")
    setNotes("")
    setEditingWorker(null)
  }

  function handleEdit(worker) {
    setEditingWorker(worker)
    setName(worker.name || "")
    setPhone(worker.phone || "")
    setCnic(worker.cnic || "")
    setWorkerType(worker.worker_type || "patheer")
    setRate(worker.default_rate || "")
    setJoiningDate(worker.joining_date || "")
    setNotes(worker.notes || "")
  }

  async function terminateWorker(workerId) {
    const confirmAction = confirm(
      "Are you sure you want to terminate this worker?"
    )

    if (!confirmAction) return

    const { error } = await supabase
      .from("workers")
      .update({
        status: "terminated",
        termination_date: new Date().toISOString().split("T")[0],
      })
      .eq("id", workerId)

    if (error) {
      alert(error.message)
      return
    }

    fetchWorkers()
  }

  async function reinstateWorker(workerId) {
    const { error } = await supabase
      .from("workers")
      .update({
        status: "active",
        termination_date: null,
      })
      .eq("id", workerId)

    if (error) {
      alert(error.message)
      return
    }

    fetchWorkers()
  }

  return (
    <div className="min-h-screen bg-[#061226] text-white p-8">
      <div className="flex justify-between items-center mb-8">

  <h1 className="text-4xl font-bold text-orange-500">
    Workers Management
  </h1>

  <Link href="/admin">
    <button className="bg-[#0f223a] px-4 py-2 rounded-lg">
      Back to Dashboard
    </button>
  </Link>

</div>

      <div className="bg-[#0f223a] p-6 rounded-xl mb-8">
        <h2 className="text-2xl mb-6">
          {editingWorker ? "Edit Worker" : "Add New Worker"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Worker Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="p-3 rounded bg-[#081a2f]"
          />

          <input
            type="text"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="p-3 rounded bg-[#081a2f]"
          />

          <input
            type="text"
            placeholder="CNIC"
            value={cnic}
            onChange={(e) => setCnic(e.target.value)}
            className="p-3 rounded bg-[#081a2f]"
          />

          <select
            value={workerType}
            onChange={(e) => setWorkerType(e.target.value)}
            className="p-3 rounded bg-[#081a2f]"
          >
            <option value="patheer">Patheer</option>
            <option value="bharai">Bharai</option>
            <option value="nakasi">Nakasi</option>
            <option value="loading">Loading</option>
          </select>

          <input
            type="number"
            placeholder="Default Rate"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="p-3 rounded bg-[#081a2f]"
          />

          <input
            type="number"
            placeholder="Opening Peshgi"
            value={openingPeshgi}
            onChange={(e) => setOpeningPeshgi(e.target.value)}
            className="p-3 rounded bg-[#081a2f]"
          />

          <input
            type="date"
            value={joiningDate}
            onChange={(e) => setJoiningDate(e.target.value)}
            className="p-3 rounded bg-[#081a2f]"
          />

          <textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="p-3 rounded bg-[#081a2f] lg:col-span-3"
          />
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={saveWorker}
            className="bg-orange-500 px-6 py-3 rounded-lg font-semibold"
          >
            {editingWorker ? "Update Worker" : "Create Worker"}
          </button>

          {editingWorker && (
            <button
              onClick={resetForm}
              className="bg-gray-600 px-6 py-3 rounded-lg"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setFilter("all")}
          className="bg-[#0f223a] px-4 py-2 rounded"
        >
          All Workers
        </button>

        <button
          onClick={() => setFilter("active")}
          className="bg-[#0f223a] px-4 py-2 rounded"
        >
          Active
        </button>

        <button
          onClick={() => setFilter("terminated")}
          className="bg-[#0f223a] px-4 py-2 rounded"
        >
          Terminated
        </button>
      </div>

      <div className="bg-[#0f223a] rounded-xl p-6 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-700 text-orange-500">
              <th className="pb-3">Name</th>
              <th className="pb-3">Type</th>
              <th className="pb-3">Phone</th>
              <th className="pb-3">Rate</th>
              <th className="pb-3">Current Peshgi</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {workers.map((worker) => (
              <tr key={worker.id} className="border-b border-gray-800">
                <td className="py-4">{worker.name}</td>
                <td className="capitalize">{worker.worker_type}</td>
                <td>{worker.phone}</td>
                <td>Rs {worker.default_rate}</td>
                <td className="text-orange-500 font-semibold">
                  Rs {worker.current_peshgi || 0}
                </td>
                <td className="capitalize">{worker.status}</td>
                <td className="flex gap-3 py-4">
                  <button
                    onClick={() => handleEdit(worker)}
                    className="text-blue-400"
                  >
                    Edit
                  </button>

                  {worker.status === "active" ? (
                    <button
                      onClick={() => terminateWorker(worker.id)}
                      className="text-red-400"
                    >
                      Terminate
                    </button>
                  ) : (
                    <button
                      onClick={() => reinstateWorker(worker.id)}
                      className="text-green-400"
                    >
                      Reinstate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
