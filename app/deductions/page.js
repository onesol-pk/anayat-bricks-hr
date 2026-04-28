"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function DeductionsPage() {
  const [workers, setWorkers] = useState([])
  const [deductions, setDeductions] = useState([])

  const [workerId, setWorkerId] = useState("")
  const [amount, setAmount] = useState("")
  const [deductionType, setDeductionType] = useState("Electricity")
  const [notes, setNotes] = useState("")
  const [date, setDate] = useState("")

  // Get current week start (Thursday)
  const getWeekStart = () => {
    const today = new Date()
    const day = today.getDay()

    // Thursday = 4
    let diff

    if (day >= 4) {
      diff = day - 4
    } else {
      diff = day + 3
    }

    const thursday = new Date(today)
    thursday.setDate(today.getDate() - diff)

    return thursday.toISOString().split("T")[0]
  }

  // Fetch workers
  const fetchWorkers = async () => {
    const { data } = await supabase
      .from("workers")
      .select("*")
      .order("name")

    if (data) setWorkers(data)
  }

  // Fetch deductions
  const fetchDeductions = async () => {
    const { data } = await supabase
      .from("deductions")
      .select(`
        *,
        workers(name)
      `)
      .order("created_at", { ascending: false })

    if (data) setDeductions(data)
  }

  useEffect(() => {
    fetchWorkers()
    fetchDeductions()
  }, [])

  // Save deduction
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!workerId || !amount || !date) {
      alert("Please fill all required fields")
      return
    }

    const { error } = await supabase
      .from("deductions")
      .insert([
        {
          worker_id: workerId,
          amount: Number(amount),
          deduction_type: deductionType,
          notes,
          date,
          week_start: getWeekStart()
        }
      ])

    if (error) {
      alert(error.message)
      return
    }

    alert("Deduction added successfully")

    setWorkerId("")
    setAmount("")
    setDeductionType("Electricity")
    setNotes("")
    setDate("")

    fetchDeductions()
  }

  return (
    <div className="min-h-screen bg-[#061226] text-white p-8">
      
      {/* HEADER */}
      <h1 className="text-4xl font-bold text-orange-500 mb-8">
        Deductions Management
      </h1>

      {/* FORM */}
      <div className="bg-[#0f223a] p-6 rounded-xl mb-10 max-w-2xl">
        <h2 className="text-2xl font-semibold mb-6">
          Add Deduction
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Worker */}
          <select
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#081a2f] border border-gray-700"
          >
            <option value="">Select Worker</option>
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
              </option>
            ))}
          </select>

          {/* Amount */}
          <input
            type="number"
            placeholder="Enter deduction amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#081a2f] border border-gray-700"
          />

          {/* Type */}
          <select
            value={deductionType}
            onChange={(e) => setDeductionType(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#081a2f] border border-gray-700"
          >
            <option>Electricity</option>
            <option>Food</option>
            <option>Loan</option>
            <option>Transport</option>
            <option>Damage</option>
            <option>Other</option>
          </select>

          {/* Notes */}
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#081a2f] border border-gray-700"
          />

          {/* Date */}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#081a2f] border border-gray-700"
          />

          {/* Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-orange-500 hover:bg-orange-600 font-semibold"
          >
            Save Deduction
          </button>

        </form>
      </div>

      {/* HISTORY TABLE */}
      <div className="bg-[#0f223a] p-6 rounded-xl">
        <h2 className="text-2xl font-semibold mb-6">
          Deduction History
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left">

            <thead>
              <tr className="border-b border-gray-700 text-orange-400">
                <th className="py-3">Worker</th>
                <th className="py-3">Type</th>
                <th className="py-3">Amount</th>
                <th className="py-3">Date</th>
                <th className="py-3">Notes</th>
              </tr>
            </thead>

            <tbody>
              {deductions.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-800"
                >
                  <td className="py-3">
                    {item.workers?.name}
                  </td>
                  <td className="py-3">
                    {item.deduction_type}
                  </td>
                  <td className="py-3">
                    Rs {item.amount}
                  </td>
                  <td className="py-3">
                    {item.date}
                  </td>
                  <td className="py-3">
                    {item.notes || "-"}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      </div>

    </div>
  )
}
