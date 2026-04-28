"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function PrintSlipPage() {
  const params = useParams()
  const workerId = params.workerId

  const [worker, setWorker] = useState(null)
  const [payroll, setPayroll] = useState(null)

  useEffect(() => {
    fetchSlip()
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

  async function fetchSlip() {
    const weekStart = getCurrentWeekStart()

    const { data: workerData } = await supabase
      .from("workers")
      .select("*")
      .eq("id", workerId)
      .single()

    const { data: workData } = await supabase
      .from("work_entries")
      .select("*")
      .eq("worker_id", workerId)
      .eq("week_start", weekStart)

    const { data: advanceData } = await supabase
      .from("advances")
      .select("*")
      .eq("worker_id", workerId)
      .eq("week_start", weekStart)

    const { data: deductionData } = await supabase
      .from("deductions")
      .select("*")
      .eq("worker_id", workerId)
      .eq("week_start", weekStart)

    const totalBricks =
      workData?.reduce((sum, item) => sum + item.bricks, 0) || 0

    const earnings =
      (totalBricks / 1000) * workerData.default_rate

    const advances =
      advanceData?.reduce((sum, item) => sum + item.amount, 0) || 0

    const deductions =
      deductionData?.reduce((sum, item) => sum + item.amount, 0) || 0

    const previousBalance = workerData.previous_balance || 0

    const finalBalance =
      previousBalance +
      earnings -
      advances -
      deductions

    setWorker(workerData)

    setPayroll({
      totalBricks,
      earnings,
      advances,
      deductions,
      previousBalance,
      finalBalance,
      weekStart
    })
  }

  function handlePrint() {
    window.print()
  }

  if (!worker || !payroll) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black p-10">
      
      <div className="max-w-4xl mx-auto border p-8">

        <h1 className="text-2xl font-bold text-center mb-2">
            Anayat Sons Bricks - Weekly Settlement Slip
          </h1>
          
          <h2 
            className="text-xl font-bold text-center mb-8"
            dir="rtl"
          >
            عنایت سنز برکس - ہفتہ وار ادائیگی پرچی
          </h2>

        <div className="grid grid-cols-2 gap-10">

          {/* English */}
          <div>
            <h2 className="text-xl font-bold mb-4">
              English
            </h2>

            <p>Date: {payroll.weekStart}</p>
            <p>Name: {worker.name}</p>
            <p>Previous Balance: Rs {payroll.previousBalance}</p>
            <p>Bricks Made: {payroll.totalBricks}</p>
            <p>Rate per 1000: Rs {worker.default_rate}</p>
            <p>Total Labour: Rs {payroll.earnings}</p>
            <p>Advance: Rs {payroll.advances}</p>
            <p>Deductions: Rs {payroll.deductions}</p>

            <hr className="my-4" />

            <p className="font-bold text-lg">
              Final Balance: Rs {payroll.finalBalance}
            </p>
          </div>

          {/* Urdu */}
          <div dir="rtl">
            <h2 className="text-xl font-bold mb-4">
              اردو
            </h2>

            <p>تاریخ: {payroll.weekStart}</p>
            <p>نام: {worker.name}</p>
            <p>سابقہ بقایا: {payroll.previousBalance} روپے</p>
            <p>اینٹیں: {payroll.totalBricks}</p>
            <p>فی ہزار ریٹ: {worker.default_rate} روپے</p>
            <p>کل مزدوری: {payroll.earnings} روپے</p>
            <p>ایڈوانس: {payroll.advances} روپے</p>
            <p>کٹوتیاں: {payroll.deductions} روپے</p>

            <hr className="my-4" />

            <p className="font-bold text-lg">
              موجودہ بقایا: {payroll.finalBalance} روپے
            </p>
          </div>

        </div>

        {/* Print Button */}
        <div className="text-center mt-8 print:hidden">
          <button
            onClick={handlePrint}
            className="bg-orange-500 text-white px-6 py-3 rounded"
          >
            Print Slip
          </button>
        </div>

      </div>
    </div>
  )
}
