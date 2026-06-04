"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "../../../../lib/supabase"

function formatMoney(value) {
  const number = Number(value) || 0
  return new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(Math.round(number))
}

function toDateInput(date) {
  return date.toISOString().split("T")[0]
}

function getCurrentWeekRange() {
  const now = new Date()
  const day = now.getDay()

  // Friday to Thursday cycle
  const diffToFriday = day >= 5 ? day - 5 : day + 2

  const start = new Date(now)
  start.setDate(now.getDate() - diffToFriday)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return {
    start: toDateInput(start),
    end: toDateInput(end),
  }
}

function calculateCurrentPeshgi(transactions = []) {
  return transactions.reduce((sum, tx) => {
    const amount = Number(tx.amount) || 0

    switch (tx.transaction_type) {
      case "peshgi":
      case "advance":
      case "electricity":
      case "loan":
      case "damage":
        return sum + amount

      case "deduction":
      case "return":
        return sum - amount

      default:
        return sum
    }
  }, 0)
}

export default function PrintLedgerPage() {
  const params = useParams()
  const searchParams = useSearchParams()

  const workerId = params.workerId
  const fallbackWeek = getCurrentWeekRange()

  const dateFrom = searchParams.get("from") || fallbackWeek.start
  const dateTo = searchParams.get("to") || fallbackWeek.end

  const [workerInfo, setWorkerInfo] = useState(null)
  const [summary, setSummary] = useState({
    bricksMade: 0,
    totalEarnings: 0,
    totalAdvances: 0,
    totalDeductions: 0,
    currentPeshgi: 0,
    carryForward: 0,
    finalWeeklySalary: 0,
  })

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (workerId) {
      fetchLedger()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId, dateFrom, dateTo])

  async function fetchLedger() {
    setLoading(true)

    try {
      const { data: workerData, error: workerError } = await supabase
        .from("workers")
        .select("*")
        .eq("id", workerId)
        .single()

      if (workerError) {
        throw workerError
      }

      const [
        workRes,
        advancesRes,
        deductionsRes,
        financialHistoryRes,
        financialAllRes,
        previousSettlementRes,
      ] = await Promise.all([
        supabase
          .from("work_entries")
          .select("*")
          .eq("worker_id", workerId)
          .gte("date", dateFrom)
          .lte("date", dateTo),

        supabase
          .from("advances")
          .select("*")
          .eq("worker_id", workerId)
          .gte("date", dateFrom)
          .lte("date", dateTo),

        supabase
          .from("deductions")
          .select("*")
          .eq("worker_id", workerId)
          .gte("date", dateFrom)
          .lte("date", dateTo),

        supabase
          .from("worker_financial_transactions")
          .select("*")
          .eq("worker_id", workerId)
          .in("transaction_type", [
            "peshgi",
            "electricity",
            "loan",
            "damage",
            "return",
          ])
          .gte("transaction_date", dateFrom)
          .lte("transaction_date", dateTo),

        supabase
          .from("worker_financial_transactions")
          .select("transaction_type, amount")
          .eq("worker_id", workerId)
          .in("transaction_type", [
            "peshgi",
            "advance",
            "electricity",
            "loan",
            "damage",
            "deduction",
            "return",
          ]),

        supabase
          .from("weekly_settlements")
          .select("final_balance, week_start")
          .eq("worker_id", workerId)
          .lt("week_start", dateFrom)
          .order("week_start", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (workRes.error) throw workRes.error
      if (advancesRes.error) throw advancesRes.error
      if (deductionsRes.error) throw deductionsRes.error
      if (financialHistoryRes.error) throw financialHistoryRes.error
      if (financialAllRes.error) throw financialAllRes.error
      if (previousSettlementRes.error && previousSettlementRes.error.code !== "PGRST116") {
        throw previousSettlementRes.error
      }

      const workData = workRes.data || []
      const advancesData = advancesRes.data || []
      const deductionsData = deductionsRes.data || []
      const financialAllData = financialAllRes.data || []

      const bricksMade = workData.reduce((sum, item) => {
        return sum + (Number(item.bricks) || 0)
      }, 0)

      const totalEarnings = workData.reduce((sum, item) => {
        return sum + (Number(item.total_amount) || 0)
      }, 0)

      const totalAdvances = advancesData.reduce((sum, item) => {
        return sum + (Number(item.amount) || 0)
      }, 0)

      const totalDeductions = deductionsData.reduce((sum, item) => {
        return sum + (Number(item.amount) || 0)
      }, 0)

      const currentPeshgi = calculateCurrentPeshgi(financialAllData)

      const carryForward =
        Number(previousSettlementRes?.final_balance) < 0
          ? Number(previousSettlementRes.final_balance)
          : 0

      const finalWeeklySalary =
        carryForward +
        totalEarnings -
        totalAdvances -
        totalDeductions

      setWorkerInfo(workerData)
      setSummary({
        bricksMade,
        totalEarnings,
        totalAdvances,
        totalDeductions,
        currentPeshgi,
        carryForward,
        finalWeeklySalary,
      })
    } catch (error) {
      alert(error.message || "Failed to load print slip")
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  if (loading || !workerInfo) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black p-6 print:p-0">
      <div className="max-w-5xl mx-auto border border-gray-300 p-8 print:border-0">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">
            Anayat Sons Bricks – Worker Ledger Slip
          </h1>
          <div class="address">
            248 R.B, Dalowal,<br />
            Samundri Road, Faisalabad
          </div>

          <h2 className="text-xl font-bold mt-2" dir="rtl">
            عنایت سنز برکس – ورکر لیجر سلپ
          </h2>

          <p className="mt-3 text-sm">
            Worker: {workerInfo.worker_type?.toUpperCase()} - {workerInfo.name}
          </p>

          <p className="text-sm">
            Period: {dateFrom} to {dateTo}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">English</h3>

            <div className="space-y-2 text-[15px]">
              <p>Date Range: {dateFrom} to {dateTo}</p>
              <p>Name: {workerInfo.name}</p>
              <p>Bricks Made: {formatMoney(summary.bricksMade)}</p>
              <p>Total Earnings: Rs {formatMoney(summary.totalEarnings)}</p>
              <p>Total Advances: Rs {formatMoney(summary.totalAdvances)}</p>
              <p>Total Deductions: Rs {formatMoney(summary.totalDeductions)}</p>
              <p>Current Peshgi: Rs {formatMoney(summary.currentPeshgi)}</p>
              <p>Carry Forward: Rs {formatMoney(summary.carryForward)}</p>

              <hr className="my-4" />

              <p className="font-bold text-lg">
                Final Weekly Salary: Rs {formatMoney(summary.finalWeeklySalary)}
              </p>
            </div>
          </div>

          <div dir="rtl">
            <h3 className="text-xl font-bold mb-4">اردو</h3>

            <div className="space-y-2 text-[15px] text-right">
              <p>تاریخ: {dateFrom} سے {dateTo}</p>
              <p>نام: {workerInfo.name}</p>
              <p>اینٹیں: {formatMoney(summary.bricksMade)}</p>
              <p>کل آمدنی: {formatMoney(summary.totalEarnings)} روپے</p>
              <p>کل ایڈوانس: {formatMoney(summary.totalAdvances)} روپے</p>
              <p>کل کٹوتیاں: {formatMoney(summary.totalDeductions)} روپے</p>
              <p>موجودہ پیشگی: {formatMoney(summary.currentPeshgi)} روپے</p>
              <p>سابقہ بقایا: {formatMoney(summary.carryForward)} روپے</p>

              <hr className="my-4" />

              <p className="font-bold text-lg">
                حتمی ہفتہ وار تنخواہ: {formatMoney(summary.finalWeeklySalary)} روپے
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 flex justify-center gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="bg-orange-500 text-white px-6 py-3 rounded"
          >
            Print Slip
          </button>

          <Link href="/ledger">
            <button className="bg-gray-200 text-black px-6 py-3 rounded">
              Back to Ledger
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
