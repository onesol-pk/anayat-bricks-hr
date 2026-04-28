"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function LedgerPage() {
  const [workers, setWorkers] = useState([])
  const [selectedWorker, setSelectedWorker] = useState("")
  const [ledger, setLedger] = useState([])
  const [summary, setSummary] = useState({
    earnings: 0,
    advances: 0,
    deductions: 0,
    balance: 0
  })

  useEffect(() => {
    fetchWorkers()
  }, [])

  useEffect(() => {
    if (selectedWorker) {
      fetchLedger()
    }
  }, [selectedWorker])

  async function fetchWorkers() {
    const { data } = await supabase
      .from("workers")
      .select("*")

    setWorkers(data || [])
  }

  async function fetchLedger() {
    // Work entries
    const { data: workData } = await supabase
      .from("work_entries")
      .select("*")
      .eq("worker_id", selectedWorker)

    // Advances
    const { data: advanceData } = await supabase
      .from("advances")
      .select("*")
      .eq("worker_id", selectedWorker)

    // Deductions
    const { data: deductionData } = await supabase
      .from("deductions")
      .select("*")
      .eq("worker_id", selectedWorker)

    let transactions = []

    let totalEarnings = 0
    let totalAdvances = 0
    let totalDeductions = 0

    // Work transactions
    workData?.forEach((item) => {
      const earning = (item.bricks / 1000) * item.rate_per_1000
      totalEarnings += earning

      transactions.push({
        type: "Work",
        date: item.date,
        details: `${item.bricks} bricks`,
        amount: earning
      })
    })

    // Advance transactions
    advanceData?.forEach((item) => {
      totalAdvances += item.amount

      transactions.push({
        type: "Advance",
        date: item.date,
        details: "Advance Payment",
        amount: -item.amount
      })
    })

    // Deduction transactions
    deductionData?.forEach((item) => {
      totalDeductions += item.amount

      transactions.push({
        type: "Deduction",
        date: item.date,
        details: item.deduction_type,
        amount: -item.amount
      })
    })

    transactions.sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    )

    setLedger(transactions)

    setSummary({
      earnings: totalEarnings,
      advances: totalAdvances,
      deductions: totalDeductions,
      balance:
        totalEarnings -
        totalAdvances -
        totalDeductions
    })
  }

  return (
    <div className="min-h-screen bg-[#061226] text-white p-8">
      <h1 className="text-4xl font-bold text-orange-500 mb-8">
        Worker Ledger
      </h1>

      {/* Worker Selector */}
      <select
        value={selectedWorker}
        onChange={(e) => setSelectedWorker(e.target.value)}
        className="w-full max-w-md p-3 rounded bg-[#0f223a] mb-8"
      >
        <option value="">Select Worker</option>
        {workers.map((worker) => (
          <option key={worker.id} value={worker.id}>
            {worker.name}
          </option>
        ))}
      </select>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0f223a] p-5 rounded-xl">
          <p>Total Earnings</p>
          <h2 className="text-2xl text-orange-500">
            Rs {summary.earnings}
          </h2>
        </div>

        <div className="bg-[#0f223a] p-5 rounded-xl">
          <p>Total Advances</p>
          <h2 className="text-2xl text-orange-500">
            Rs {summary.advances}
          </h2>
        </div>

        <div className="bg-[#0f223a] p-5 rounded-xl">
          <p>Total Deductions</p>
          <h2 className="text-2xl text-orange-500">
            Rs {summary.deductions}
          </h2>
        </div>

        <div className="bg-[#0f223a] p-5 rounded-xl">
          <p>Current Balance</p>
          <h2 className="text-2xl text-orange-500">
            Rs {summary.balance}
          </h2>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-[#0f223a] rounded-xl p-6">
        <h2 className="text-2xl mb-4">
          Transaction History
        </h2>

        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-gray-600">
              <th className="py-2">Date</th>
              <th>Type</th>
              <th>Details</th>
              <th>Amount</th>
            </tr>
          </thead>

          <tbody>
            {ledger.map((item, index) => (
              <tr key={index} className="border-b border-gray-700">
                <td className="py-3">{item.date}</td>
                <td>{item.type}</td>
                <td>{item.details}</td>
                <td
                  className={
                    item.amount >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  Rs {item.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
