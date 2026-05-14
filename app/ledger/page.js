"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"

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

export default function LedgerPage() {
  const currentWeek = getCurrentWeekRange()

  const [workers, setWorkers] = useState([])
  const [selectedWorker, setSelectedWorker] = useState("")
  const [dateFrom, setDateFrom] = useState(currentWeek.start)
  const [dateTo, setDateTo] = useState(currentWeek.end)

  const [workerInfo, setWorkerInfo] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState({
    bricksMade: 0,
    totalEarnings: 0,
    totalAdvances: 0,
    totalDeductions: 0,
    currentPeshgi: 0,
    carryForward: 0,
    finalWeeklySalary: 0,
  })

  const [loading, setLoading] = useState(false)
  const [settlementStatus, setSettlementStatus] = useState(null)

  useEffect(() => {
    fetchWorkers()
  }, [])

  useEffect(() => {
    if (workers.length > 0 && !selectedWorker) {
      setSelectedWorker(workers[0].id)
    }
  }, [workers, selectedWorker])

  useEffect(() => {
    if (selectedWorker) {
      fetchLedger()
    }
  }, [selectedWorker, dateFrom, dateTo])

  async function fetchWorkers() {
    const { data, error } = await supabase
      .from("workers")
      .select("*")
      .order("name", { ascending: true })

    if (error) {
      alert(error.message)
      return
    }

    setWorkers(data || [])
  }

  async function fetchLedger() {
    if (!selectedWorker) return

    setLoading(true)

    try {
      const { data: workerData, error: workerError } = await supabase
        .from("workers")
        .select("*")
        .eq("id", selectedWorker)
        .single()

      if (workerError) throw workerError

      const [
        workRes,
        advancesRes,
        deductionsRes,
        financialHistoryRes,
        financialAllRes,
        settlementRes,
        previousSettlementRes,
      ] = await Promise.all([
        supabase
          .from("work_entries")
          .select("*")
          .eq("worker_id", selectedWorker)
          .gte("date", dateFrom)
          .lte("date", dateTo),

        supabase
          .from("advances")
          .select("*")
          .eq("worker_id", selectedWorker)
          .gte("date", dateFrom)
          .lte("date", dateTo),

        supabase
          .from("deductions")
          .select("*")
          .eq("worker_id", selectedWorker)
          .gte("date", dateFrom)
          .lte("date", dateTo),

        supabase
          .from("worker_financial_transactions")
          .select("*")
          .eq("worker_id", selectedWorker)
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
          .eq("worker_id", selectedWorker)
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
          .select("*")
          .eq("worker_id", selectedWorker)
          .eq("week_start", dateFrom)
          .maybeSingle(),

        supabase
          .from("weekly_settlements")
          .select("final_balance, week_start")
          .eq("worker_id", selectedWorker)
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
      if (settlementRes.error && settlementRes.error.code !== "PGRST116") {
        throw settlementRes.error
      }
      if (previousSettlementRes.error && previousSettlementRes.error.code !== "PGRST116") {
        throw previousSettlementRes.error
      }

      const workData = workRes.data || []
      const advancesData = advancesRes.data || []
      const deductionsData = deductionsRes.data || []
      const financialHistoryData = financialHistoryRes.data || []
      const financialAllData = financialAllRes.data || []

      const rate = Number(workerData.default_rate) || 0

      const bricksMade = workData.reduce((sum, item) => {
        return sum + (Number(item.bricks) || 0)
      }, 0)

      const totalEarnings = workData.reduce((sum, item) => {
        const bricks = Number(item.bricks) || 0
        return sum + (bricks / 1000) * rate
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

      const combinedTransactions = []

      workData.forEach((item) => {
        const bricks = Number(item.bricks) || 0
        const earning = (bricks / 1000) * rate

        combinedTransactions.push({
          date: item.date,
          type: "Work",
          details: `${bricks} bricks`,
          amount: earning,
        })
      })

      advancesData.forEach((item) => {
        const amount = Number(item.amount) || 0

        combinedTransactions.push({
          date: item.date,
          type: "Advance",
          details: item.notes || "Advance Payment",
          amount: -amount,
        })
      })

      deductionsData.forEach((item) => {
        const amount = Number(item.amount) || 0

        combinedTransactions.push({
          date: item.date,
          type: "Deduction",
          details: item.deduction_type || "Deduction",
          amount: -amount,
        })
      })

      financialHistoryData.forEach((item) => {
        const amount = Number(item.amount) || 0

        const typeLabels = {
          peshgi: "Peshgi",
          electricity: "Electricity",
          loan: "Loan",
          damage: "Damage",
          return: "Return",
        }

        combinedTransactions.push({
          date: item.transaction_date,
          type: typeLabels[item.transaction_type] || item.transaction_type,
          details: item.notes || typeLabels[item.transaction_type] || "Entry",
          amount: -amount,
        })
      })

      combinedTransactions.sort((a, b) => new Date(a.date) - new Date(b.date))

      setWorkerInfo(workerData)
      setTransactions(combinedTransactions)
      setSummary({
        bricksMade,
        totalEarnings,
        totalAdvances,
        totalDeductions,
        currentPeshgi,
        carryForward,
        finalWeeklySalary,
      })
      setSettlementStatus(settlementRes.data || null)
    } catch (error) {
      alert(error.message || "Failed to load ledger")
    } finally {
      setLoading(false)
    }
  }

  async function markPaid() {
    if (!selectedWorker) return

    const payload = {
      worker_id: selectedWorker,
      week_start: dateFrom,
      total_bricks: summary.bricksMade,
      earnings: summary.totalEarnings,
      advances: summary.totalAdvances,
      deductions: summary.totalDeductions,
      previous_balance: summary.carryForward,
      final_balance: summary.finalWeeklySalary,
      payment_status: "paid",
      paid_at: new Date().toISOString(),
    }

    const { data: existing, error: existingError } = await supabase
      .from("weekly_settlements")
      .select("id")
      .eq("worker_id", selectedWorker)
      .eq("week_start", dateFrom)
      .maybeSingle()

    if (existingError && existingError.code !== "PGRST116") {
      alert(existingError.message)
      return
    }

    const action = existing?.id
      ? supabase
          .from("weekly_settlements")
          .update(payload)
          .eq("id", existing.id)
      : supabase.from("weekly_settlements").insert([payload])

    const { error } = await action

    if (error) {
      alert(error.message)
      return
    }

    alert("Worker marked paid")
    fetchLedger()
  }

  function printSlip() {
    if (!selectedWorker) return

    window.open(
      `/ledger/${selectedWorker}/print?from=${dateFrom}&to=${dateTo}`,
      "_blank",
      "noopener,noreferrer"
    )
  }

  function resetToCurrentWeek() {
    const range = getCurrentWeekRange()
    setDateFrom(range.start)
    setDateTo(range.end)
  }

  return (
    <div className="min-h-screen bg-[#061226] text-white p-8">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-orange-500">
            Worker Ledger
          </h1>
          {workerInfo && (
            <p className="text-gray-400 mt-2">
              {workerInfo.worker_type?.toUpperCase()} - {workerInfo.name}
            </p>
          )}
        </div>

        <Link href="/admin">
          <button className="bg-[#0f223a] px-4 py-2 rounded-lg">
            Back to Dashboard
          </button>
        </Link>
      </div>

      <div className="bg-[#0f223a] p-6 rounded-xl mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
          <div className="lg:col-span-2">
            <label className="block text-sm text-gray-400 mb-2">
              Worker
            </label>
            <select
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              className="w-full p-3 rounded bg-[#081a2f] border border-gray-700"
            >
              <option value="">Select Worker</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.worker_type?.toUpperCase()} - {worker.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full p-3 rounded bg-[#081a2f] border border-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full p-3 rounded bg-[#081a2f] border border-gray-700"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <button
            type="button"
            onClick={resetToCurrentWeek}
            className="bg-[#081a2f] px-4 py-2 rounded-lg border border-gray-700"
          >
            Current Week
          </button>

          <span className="text-gray-400 self-center">
            Friday to Thursday cycle
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#0f223a] p-6 rounded-xl">
          <p className="text-gray-400">Bricks Made</p>
          <h2 className="text-3xl font-bold text-orange-500 mt-2">
            {formatMoney(summary.bricksMade)}
          </h2>
        </div>

        <div className="bg-[#0f223a] p-6 rounded-xl">
          <p className="text-gray-400">Total Earnings</p>
          <h2 className="text-3xl font-bold text-orange-500 mt-2">
            Rs {formatMoney(summary.totalEarnings)}
          </h2>
        </div>

        <div className="bg-[#0f223a] p-6 rounded-xl">
          <p className="text-gray-400">Total Advances</p>
          <h2 className="text-3xl font-bold text-orange-500 mt-2">
            Rs {formatMoney(summary.totalAdvances)}
          </h2>
        </div>

        <div className="bg-[#0f223a] p-6 rounded-xl">
          <p className="text-gray-400">Total Deductions</p>
          <h2 className="text-3xl font-bold text-orange-500 mt-2">
            Rs {formatMoney(summary.totalDeductions)}
          </h2>
        </div>

        <div className="bg-[#0f223a] p-6 rounded-xl">
          <p className="text-gray-400">Current Peshgi</p>
          <h2 className="text-3xl font-bold text-orange-500 mt-2">
            Rs {formatMoney(summary.currentPeshgi)}
          </h2>
        </div>

        <div className="bg-[#0f223a] p-6 rounded-xl">
          <p className="text-gray-400">Carry Forward</p>
          <h2
            className={`text-3xl font-bold mt-2 ${
              Number(summary.carryForward) < 0 ? "text-red-400" : "text-orange-500"
            }`}
          >
            Rs {formatMoney(summary.carryForward)}
          </h2>
        </div>

        <div className="bg-[#0f223a] p-6 rounded-xl xl:col-span-3">
          <p className="text-gray-400">Final Weekly Salary</p>
          <h2 className="text-3xl font-bold text-orange-500 mt-2">
            Rs {formatMoney(summary.finalWeeklySalary)}
          </h2>
        </div>
      </div>

      <div className="bg-[#0f223a] p-6 rounded-xl mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Actions</h2>
            <p className="text-gray-400 mt-1">
              {settlementStatus?.payment_status === "paid"
                ? "This week is already marked as paid"
                : "Mark the selected week as paid after reviewing the ledger"}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={markPaid}
              disabled={!selectedWorker || loading}
              className="bg-green-600 px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
            >
              Mark Paid
            </button>

            <button
              onClick={printSlip}
              disabled={!selectedWorker || loading}
              className="bg-orange-500 px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
            >
              Print
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#0f223a] rounded-xl p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h2 className="text-2xl font-semibold">
            Transaction History
          </h2>
          <span className="text-gray-400">
            {dateFrom} to {dateTo}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700 text-orange-400">
                <th className="py-3">Date</th>
                <th className="py-3">Type</th>
                <th className="py-3">Details</th>
                <th className="py-3">Amount</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="py-6 text-gray-400" colSpan={4}>
                    Loading ledger...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td className="py-6 text-gray-400" colSpan={4}>
                    No transactions found for this period.
                  </td>
                </tr>
              ) : (
                transactions.map((item, index) => (
                  <tr key={index} className="border-b border-gray-800">
                    <td className="py-3">{item.date}</td>
                    <td>{item.type}</td>
                    <td>{item.details}</td>
                    <td
                      className={
                        Number(item.amount) >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      Rs {formatMoney(item.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
