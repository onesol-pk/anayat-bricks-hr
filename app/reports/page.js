"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function ReportsPage() {
  const [report, setReport] = useState({
    totalBricks: 0,
    totalAdvances: 0,
    totalDeductions: 0,
    totalPayroll: 0
  })

  const [workerReport, setWorkerReport] = useState([])

  useEffect(() => {
    fetchReports()
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

  async function fetchReports() {
    const weekStart = getCurrentWeekStart()

    const { data: workers } = await supabase
      .from("workers")
      .select("*")
      .eq("status", "active")

    const { data: workEntries } = await supabase
      .from("work_entries")
      .select("*")
      .eq("week_start", weekStart)

    const { data: advances } = await supabase
      .from("advances")
      .select("*")
      .eq("week_start", weekStart)

    const { data: deductions } = await supabase
      .from("deductions")
      .select("*")
      .eq("week_start", weekStart)

    const totalBricks =
      workEntries?.reduce(
        (sum, item) => sum + item.bricks,
        0
      ) || 0

    const totalAdvances =
      advances?.reduce(
        (sum, item) => sum + item.amount,
        0
      ) || 0

    const totalDeductions =
      deductions?.reduce(
        (sum, item) => sum + item.amount,
        0
      ) || 0

    let totalPayroll = 0
    let workerData = []

    for (const worker of workers || []) {
      const workerBricks =
        workEntries
          ?.filter(
            (w) => w.worker_id === worker.id
          )
          .reduce(
            (sum, item) => sum + item.bricks,
            0
          ) || 0

      const earnings =
        (workerBricks / 1000) *
        worker.default_rate

      totalPayroll += earnings

      workerData.push({
        name: worker.name,
        bricks: workerBricks,
        earnings
      })
    }

    setReport({
      totalBricks,
      totalAdvances,
      totalDeductions,
      totalPayroll
    })

    setWorkerReport(workerData)
  }

  return (
    <div className="min-h-screen bg-[#061226] text-white p-8">
      <h1 className="text-4xl font-bold text-orange-500 mb-8">
        Weekly Reports
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6 mb-10">

        <div className="bg-[#0f223a] p-6 rounded-xl">
          <h2>Total Bricks</h2>
          <p className="text-2xl text-orange-500">
            {report.totalBricks}
          </p>
        </div>

        <div className="bg-[#0f223a] p-6 rounded-xl">
          <h2>Total Advances</h2>
          <p className="text-2xl text-orange-500">
            Rs {report.totalAdvances}
          </p>
        </div>

        <div className="bg-[#0f223a] p-6 rounded-xl">
          <h2>Total Deductions</h2>
          <p className="text-2xl text-orange-500">
            Rs {report.totalDeductions}
          </p>
        </div>

        <div className="bg-[#0f223a] p-6 rounded-xl">
          <h2>Total Payroll</h2>
          <p className="text-2xl text-orange-500">
            Rs {report.totalPayroll}
          </p>
        </div>

      </div>

      {/* Worker Performance */}
      <div className="bg-[#0f223a] p-6 rounded-xl">
        <h2 className="text-2xl mb-6">
          Worker Performance
        </h2>

        <table className="w-full">
          <thead>
            <tr className="text-left text-orange-500">
              <th>Worker</th>
              <th>Bricks</th>
              <th>Earnings</th>
            </tr>
          </thead>

          <tbody>
            {workerReport.map((worker, index) => (
              <tr
                key={index}
                className="border-t border-gray-700"
              >
                <td className="py-3">{worker.name}</td>
                <td>{worker.bricks}</td>
                <td>Rs {worker.earnings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
