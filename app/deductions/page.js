"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
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
  const [deductionType, setDeductionType] = useState("Fine / Low Production")
  const [notes, setNotes] = useState("")
  const [date, setDate] = useState("")

  // Friday = week start
  function getWeekStart(selectedDate) {
    const d = new Date(selectedDate)
    const day = d.getDay()

    let diff

    if (day >= 5) {
      diff = day - 5
    } else {
      diff = day + 2
    }

    d.setDate(d.getDate() - diff)

    return d.toISOString().split("T")[0]
  }

  // Fetch workers
  async function fetchWorkers() {
    const { data, error } = await supabase
      .from("workers")
      .select("*")
      .order("name")

    if (error) {
      alert(error.message)
      return
    }

    setWorkers(data || [])
  }

  // Fetch deductions
  async function fetchDeductions() {
    const { data, error } = await supabase
      .from("deductions")
      .select(`
        *,
        workers(name, worker_type)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      alert(error.message)
      return
    }

    setDeductions(data || [])
  }

  useEffect(() => {
    fetchWorkers()
    fetchDeductions()
  }, [])

  // Save deduction
  async function handleSubmit(e) {
    e.preventDefault()

    if (!workerId || !amount || !date) {
      alert("Please fill all required fields")
      return
    }

    const weekStart = getWeekStart(date)

    const { error } = await supabase
      .from("deductions")
      .insert([
        {
          worker_id: workerId,
          amount: Number(amount),
          deduction_type: deductionType,
          notes,
          date,
          week_start: weekStart,
        },
      ])

    if (error) {
      alert(error.message)
      return
    }

    const { error: txError } = await supabase
      .from("worker_financial_transactions")
      .insert([
        {
          worker_id: workerId,
          transaction_type: "deduction",
          amount: Number(amount),
          transaction_date: date,
          week_start: weekStart,
          notes: notes || deductionType,
        },
      ])

    if (txError) {
      alert(txError.message)
      return
    }

    alert("Deduction added successfully")

    setWorkerId("")
    setAmount("")
    setDeductionType("Fine / Low Production")
    setNotes("")
    setDate("")

    fetchDeductions()
  }

  return (
    <div className="min-h-screen bg-[#061226] text-white p-8">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-orange-500">
          Deductions Management
        </h1>

        <Link href="/admin">
          <button className="bg-[#0f223a] px-4 py-2 rounded-lg">
            Back to Dashboard
          </button>
        </Link>
      </div>

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
                {worker.worker_type?.toUpperCase()} - {worker.name}
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
            <option value="Fine / Low Production">
              Fine / Low Production
            </option>

            <option value="Other">
              Other
            </option>
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
                <th className="py-3">Worker Type</th>
                <th className="py-3">Worker</th>
                <th className="py-3">Type</th>
                <th className="py-3">Amount</th>
                <th className="py-3">Date</th>
                <th className="py-3">Week Start</th>
                <th className="py-3">Notes</th>
              </tr>
            </thead>

            <tbody>
              {deductions.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-800"
                >
                  <td className="py-3 capitalize">
                    {item.workers?.worker_type || "-"}
                  </td>

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
                    {item.week_start}
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
