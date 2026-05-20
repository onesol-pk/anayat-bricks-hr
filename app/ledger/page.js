"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"

function formatMoney(value) {
  const number = Number(value) || 0
  return new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(Math.round(number))
}
function formatNumber(value) {
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

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
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
  const currentWeek = useMemo(() => getCurrentWeekRange(), [])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const combinedTransactions = []

      workData.forEach((item) => {
        const bricks = Number(item.bricks) || 0
        const amount = Number(item.total_amount) || 0

        combinedTransactions.push({
          date: item.date,
          type: item.worker_type || "Work",
          details: `${item.brick_type?.toUpperCase() || "-"} • ${formatMoney(
            bricks
          )} bricks @ Rs ${formatMoney(item.rate_per_1000)}`,
          amount,
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
    <div className="min-h-screen bg-[#061226] text-white">
      <div className="px-8 pt-8 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-orange-400 uppercase tracking-[0.35em] text-xs mb-3">
                Anayat Sons Bricks
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Worker Ledger
              </h1>
              <p className="text-gray-400 mt-3 max-w-2xl">
                Review weekly settlements, carry forward balances, and print the final slip.
              </p>
            </div>

            <Link href="/admin">
              <button className="rounded-xl bg-white/5 px-5 py-3 font-semibold text-gray-200 hover:bg-white/10 transition border border-white/10">
                Back to Dashboard
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="px-8 pb-10">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* FILTERS */}
          <section className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-[#0f223a] shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-orange-500/25 via-orange-500/10 to-transparent" />
            <div className="relative p-6 md:p-7">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-6">
                <div>
                  <p className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-orange-500/15 text-orange-200">
                    Ledger Filter
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold mt-3">
                    Select Worker and Date Range
                  </h2>
                  <p className="text-gray-400 mt-1">
                    Friday to Thursday cycle is used by default.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                    Selected range
                  </p>
                  <p className="text-sm text-gray-200 mt-1">
                    {dateFrom} → {dateTo}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
                <div className="lg:col-span-2">
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    Worker
                  </label>
                  <select
                    value={selectedWorker}
                    onChange={(e) => setSelectedWorker(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  >
                    <option value="">Select Worker</option>
                    {workers.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {titleCase(worker.worker_type)} - {worker.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    From
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    To
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  type="button"
                  onClick={resetToCurrentWeek}
                  className="rounded-xl bg-white/5 px-4 py-2 font-semibold text-gray-200 hover:bg-white/10 transition border border-white/10"
                >
                  Current Week
                </button>

                <span className="text-gray-400 self-center">
                  Friday to Thursday cycle
                </span>
              </div>
            </div>
          </section>

          {/* SUMMARY */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="bg-[#0f223a] rounded-3xl border border-orange-500/20 p-6 shadow-2xl">
              <p className="text-gray-400">Bricks Made</p>
              <h2 className="text-3xl font-bold text-orange-300 mt-2">
                {formatNumber(summary.bricksMade)}
              </h2>
            </div>

            <div className="bg-[#0f223a] rounded-3xl border border-orange-500/20 p-6 shadow-2xl">
              <p className="text-gray-400">Total Earnings</p>
              <h2 className="text-3xl font-bold text-orange-300 mt-2">
                Rs {formatMoney(summary.totalEarnings)}
              </h2>
            </div>

            <div className="bg-[#0f223a] rounded-3xl border border-orange-500/20 p-6 shadow-2xl">
              <p className="text-gray-400">Total Advances</p>
              <h2 className="text-3xl font-bold text-orange-300 mt-2">
                Rs {formatMoney(summary.totalAdvances)}
              </h2>
            </div>

            <div className="bg-[#0f223a] rounded-3xl border border-orange-500/20 p-6 shadow-2xl">
              <p className="text-gray-400">Total Deductions</p>
              <h2 className="text-3xl font-bold text-orange-300 mt-2">
                Rs {formatMoney(summary.totalDeductions)}
              </h2>
            </div>

            <div className="bg-[#0f223a] rounded-3xl border border-orange-500/20 p-6 shadow-2xl">
              <p className="text-gray-400">Current Peshgi</p>
              <h2 className="text-3xl font-bold text-orange-300 mt-2">
                Rs {formatMoney(summary.currentPeshgi)}
              </h2>
            </div>

            <div className="bg-[#0f223a] rounded-3xl border border-orange-500/20 p-6 shadow-2xl">
              <p className="text-gray-400">Carry Forward</p>
              <h2
                className={`text-3xl font-bold mt-2 ${
                  Number(summary.carryForward) < 0 ? "text-red-400" : "text-orange-300"
                }`}
              >
                Rs {formatMoney(summary.carryForward)}
              </h2>
            </div>

            <div className="bg-[#0f223a] rounded-3xl border border-orange-500/20 p-6 shadow-2xl xl:col-span-3">
              <p className="text-gray-400">Final Weekly Salary</p>
              <h2 className="text-3xl font-bold text-orange-300 mt-2">
                Rs {formatMoney(summary.finalWeeklySalary)}
              </h2>
            </div>
          </div>

          {/* ACTIONS */}
          <section className="bg-[#0f223a] border border-white/10 rounded-3xl p-6 md:p-7 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Actions</h2>
                <p className="text-gray-400 mt-1">
                  {settlementStatus?.payment_status === "paid"
                    ? "This week is already marked as paid"
                    : "Mark the selected week as paid after reviewing the ledger"}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={markPaid}
                  disabled={!selectedWorker || loading}
                  className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
                >
                  Mark Paid
                </button>

                <button
                  onClick={printSlip}
                  disabled={!selectedWorker || loading}
                  className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
                >
                  Print
                </button>
              </div>
            </div>
          </section>

          {/* TRANSACTIONS */}
          <section className="bg-[#0f223a] border border-white/10 rounded-3xl p-6 md:p-7 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Transaction History</h2>
                <p className="text-gray-400 mt-1">
                  All entries included in the selected settlement period.
                </p>
              </div>

              <div className="text-sm text-gray-400">
                {dateFrom} → {dateTo}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700 text-orange-400">
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Details</th>
                    <th className="py-3 pr-4">Amount</th>
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
                        <td className="py-3 pr-4">{item.date}</td>
                        <td className="py-3 pr-4">{item.type}</td>
                        <td className="py-3 pr-4">{item.details}</td>
                        <td
                          className={
                            Number(item.amount) >= 0
                              ? "py-3 pr-4 text-emerald-300 font-semibold"
                              : "py-3 pr-4 text-rose-300 font-semibold"
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
          </section>
        </div>
      </div>
    </div>
  )
}
