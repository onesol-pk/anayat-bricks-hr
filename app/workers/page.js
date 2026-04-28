"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function WorkersPage() {
  const [workers, setWorkers] = useState([])
  const [filter, setFilter] = useState("all")

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [rate, setRate] = useState("")
  const [joiningDate, setJoiningDate] = useState("")
  const [notes, setNotes] = useState("")

  const [editingWorker, setEditingWorker] = useState(null)

  useEffect(() => {
    fetchWorkers()
  }, [])

  async function fetchWorkers() {
    let query = supabase.from("workers").select("*")

    if (filter !== "all") {
      query = query.eq("status", filter)
    }

    const { data } = await query.order("created_at", {
      ascending: false,
    })

    setWorkers(data || [])
  }

  useEffect(() => {
    fetchWorkers()
  }, [filter])

  async function saveWorker() {
    if (!name || !phone || !rate || !joiningDate) {
      alert("Please fill all required fields")
      return
    }

    if (editingWorker) {
      const { error } = await supabase
        .from("workers")
        .update({
          name,
          phone,
          default_rate: Number(rate),
          joining_date: joiningDate,
          notes,
        })
        .eq("id", editingWorker.id)

      if (error) {
        alert(error.message)
        return
      }

      alert("Worker updated successfully")
    } else {
      const { error } = await supabase
        .from("workers")
        .insert([
          {
            name,
            phone,
            default_rate: Number(rate),
            joining_date: joiningDate,
            notes,
            status: "active",
          },
        ])

      if (error) {
        alert(error.message)
        return
      }

      alert("Worker created successfully")
    }

    resetForm()
    fetchWorkers()
  }

  function resetForm() {
    setName("")
    setPhone("")
    setRate("")
    setJoiningDate("")
    setNotes("")
    setEditingWorker(null)
  }

  function handleEdit(worker) {
    setEditingWorker(worker)
    setName(worker.name || "")
    setPhone(worker.phone || "")
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
        termination_date: new Date()
          .toISOString()
          .split("T")[0],
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
      <h1 className="text-4xl font-bold text-orange-500 mb-8">
        Workers Management
      </h1>

      {/* Add/Edit Worker Form */}
      <div className="bg-[#0f223a] p-6 rounded-xl mb-8">
        <h2 className="text-2xl mb-6">
          {editingWorker ? "Edit Worker" : "Add New Worker"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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
            type="number"
            placeholder="Default Rate Per 1000"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
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
            className="p-3 rounded bg-[#081a2f] md:col-span-2"
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

      {/* Filter Buttons */}
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

      {/* Workers Table */}
      <div className="bg-[#0f223a] rounded-xl p-6 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-700">
              <th>Name</th>
              <th>Phone</th>
              <th>Rate</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {workers.map((worker) => (
              <tr
                key={worker.id}
                className="border-b border-gray-800"
              >
                <td className="py-4">{worker.name}</td>
                <td>{worker.phone}</td>
                <td>Rs {worker.default_rate}</td>
                <td>{worker.status}</td>

                <td className="flex gap-3 py-4">
                  <button
                    onClick={() => handleEdit(worker)}
                    className="text-blue-400"
                  >
                    Edit
                  </button>

                  {worker.status === "active" ? (
                    <button
                      onClick={() =>
                        terminateWorker(worker.id)
                      }
                      className="text-red-400"
                    >
                      Terminate
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        reinstateWorker(worker.id)
                      }
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
