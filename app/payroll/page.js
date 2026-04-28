"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function PayrollPage() {
  const [workers, setWorkers] = useState([])
  const [weekStart, setWeekStart] = useState("")

  useEffect(() => {
    fetchPayroll()
  }, [])

  function getCurrentWeekStart() {
    const d = new Date()
    const day = d.getDay()

    let diff

    if (day >= 4) {
      diff = day - 4
    } else {
      diff = day + 3
    }

    d.setDate(d.getDate() - diff)

    return d.toISOString().split("T")[0]
  }

  async function fetchPayroll() {
    const currentWeek = getCurrentWeekStart()
    setWeekStart(currentWeek)

    const { data: workersData } = await supabase
      .from("workers")
      .select("*")
      .eq("status", "active")

    const payrollData = []

    for (const worker of workersData || []) {
      const { data: work } = await supabase
        .from("work_entries")
        .select("*")
        .eq("worker_id", worker.id)
        .eq("week_start", currentWeek)

      const { data: advances } = await supabase
        .from("advances")
        .select("*")
        .eq("worker_id", worker.id)
        .eq("week_start", currentWeek)

      const { data: deductions } = await supabase
        .from("deductions")
        .select("*")
        .eq("worker_id", worker.id)
        .eq("week_start", currentWeek)

      const totalBricks =
        work?.reduce((sum, item) => sum + item.bricks, 0) || 0

      const totalEarnings =
        (totalBricks / 1000) * worker.default_rate

      const totalAdvances =
        advances?.reduce((sum, item) => sum + item.amount, 0) || 0

      const totalDeductions =
        deductions?.reduce((sum, item) => sum + item.amount, 0) || 0

      const previousBalance = worker.previous_balance || 0

      const finalBalance =
        previousBalance +
        totalEarnings -
        totalAdvances -
        totalDeductions

      payrollData.push({
        ...worker,
        totalBricks,
        totalEarnings,
        totalAdvances,
        totalDeductions,
        previousBalance,
        finalBalance
      })
    }

    setWorkers(payrollData)
  }

  async function markPaid(worker) {
    const { error } = await supabase
      .from("weekly_settlements")
      .insert([
        {
          worker_id: worker.id,
          week_start: weekStart,
          total_bricks: worker.totalBricks,
          earnings: worker.totalEarnings,
          advances: worker.totalAdvances,
          deductions: worker.totalDeductions,
          previous_balance: worker.previousBalance,
          final_balance: worker.finalBalance,
          payment_status: "paid",
          paid_at: new Date()
        }
      ])

    if (error) {
      alert(error.message)
      return
    }

    alert("Worker marked paid")
  }

  function printSlip(worker) {
  window.open(`/payroll/${worker.id}/print`)
}

  return (
    <div className="min-h-screen bg-[#061226] text-white p-8">
      <h1 className="text-4xl font-bold text-orange-500 mb-8">
        Weekly Payroll
      </h1>

      <p className="mb-6 text-gray-400">
        Week Starting: {weekStart}
      </p>

      <div className="overflow-x-auto bg-[#0f223a] rounded-xl p-6">
        <table className="w-full">
          <thead>
            <tr className="text-orange-500 text-left">
              <th>Worker</th>
              <th>Bricks</th>
              <th>Rate</th>
              <th>Earnings</th>
              <th>Advances</th>
              <th>Deductions</th>
              <th>Balance</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {workers.map((worker) => (
              <tr
                key={worker.id}
                className="border-t border-gray-700"
              >
                <td className="py-3">{worker.name}</td>
                <td>{worker.totalBricks}</td>
                <td>{worker.default_rate}</td>
                <td>Rs {worker.totalEarnings}</td>
                <td>Rs {worker.totalAdvances}</td>
                <td>Rs {worker.totalDeductions}</td>
                <td className="font-bold text-orange-500">
                  Rs {worker.finalBalance}
                </td>

                <td className="flex gap-2 py-3">
                  <button
                    onClick={() => markPaid(worker)}
                    className="bg-green-600 px-3 py-1 rounded"
                  >
                    Mark Paid
                  </button>

                  <button
                    onClick={() => printSlip(worker)}
                    className="bg-orange-500 px-3 py-1 rounded"
                  >
                    Print Slip
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
