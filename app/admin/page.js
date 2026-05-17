"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const LABOUR_SECTIONS = [
  {
    key: "patheer",
    title: "Patheer",
    subtitle: "New bricks laid",
    accent: "from-orange-500/25 via-orange-500/10 to-transparent",
    border: "border-orange-500/20",
    chip: "bg-orange-500/15 text-orange-200",
    brickTypes: ["gutka", "tile", "special"],
  },
  {
    key: "bharai",
    title: "Bharai",
    subtitle: "Bricks added to kiln",
    accent: "from-emerald-500/25 via-emerald-500/10 to-transparent",
    border: "border-emerald-500/20",
    chip: "bg-emerald-500/15 text-emerald-200",
    brickTypes: ["gutka", "tile", "special"],
  },
  {
    key: "nakasi",
    title: "Nakasi",
    subtitle: "Sorted stock",
    accent: "from-sky-500/25 via-sky-500/10 to-transparent",
    border: "border-sky-500/20",
    chip: "bg-sky-500/15 text-sky-200",
    brickTypes: ["awal", "dome", "tirak", "tile", "special", "kachi kali"],
  },
  {
    key: "loading",
    title: "Loading",
    subtitle: "Dispatched bricks",
    accent: "from-violet-500/25 via-violet-500/10 to-transparent",
    border: "border-violet-500/20",
    chip: "bg-violet-500/15 text-violet-200",
    brickTypes: ["awal", "dome", "tirak", "tile", "special", "kachi kali"],
  },
]

const MENU_GROUPS = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard" }],
  },
  {
    title: "Operations",
    items: [
      { href: "/workers", label: "Workers" },
      { href: "/work-entry", label: "Work Entry" },
      { href: "/ledger", label: "Ledger" },
      { href: "/sale", label: "Sale" },
    ],
  },
  {
    title: "Customers",
    items: [{ href: "/customers", label: "Customers" }],
  },
  {
    title: "Financials",
    items: [
      { href: "/advances", label: "Advances" },
      { href: "/additions", label: "Additions" },
      { href: "/deductions", label: "Deductions" },
      { href: "/expenses", label: "Expenses" },
      { href: "/income", label: "Income" },
      { href: "/rokar", label: "Rokar" },
    ],
  },
]

function getTodayDateInput() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().split("T")[0]
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value) || 0))
}

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function buildEmptyReport() {
  return Object.fromEntries(
    LABOUR_SECTIONS.map((section) => [
      section.key,
      Object.fromEntries(
        section.brickTypes.map((brickType) => [
          brickType,
          { bricks: 0, amount: 0, entries: 0 },
        ])
      ),
    ])
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const pathname = usePathname()
  const closeTimerRef = useRef(null)

  const todayDate = useMemo(() => getTodayDateInput(), [])
  const [drawerMounted, setDrawerMounted] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [dateFrom, setDateFrom] = useState(todayDate)
  const [dateTo, setDateTo] = useState(todayDate)

  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(buildEmptyReport())
  const [allEntries, setAllEntries] = useState([])
  const [workersCount, setWorkersCount] = useState(0)

  function openDrawer() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setDrawerMounted(true)
    requestAnimationFrame(() => setDrawerOpen(true))
  }

  function closeDrawer() {
    setDrawerOpen(false)
    closeTimerRef.current = setTimeout(() => {
      setDrawerMounted(false)
    }, 260)
  }

  useEffect(() => {
    fetchDashboard()
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchDashboard(fromDate = dateFrom, toDate = dateTo) {
    const rangeFrom = fromDate <= toDate ? fromDate : toDate
    const rangeTo = fromDate <= toDate ? toDate : fromDate

    setLoading(true)

    try {
      const [workEntriesRes, workersRes] = await Promise.all([
        supabase
          .from("work_entries")
          .select(`
            id,
            worker_id,
            date,
            created_at,
            worker_type,
            brick_type,
            bricks,
            rate_per_1000,
            total_amount
          `)
          .gte("date", rangeFrom)
          .lte("date", rangeTo)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase.from("workers").select("id"),
      ])

      if (workEntriesRes.error) throw workEntriesRes.error
      if (workersRes.error) throw workersRes.error

      const nextReport = buildEmptyReport()
      const nextEntries = []

      ;(workEntriesRes.data || []).forEach((entry) => {
        const workerType = String(entry.worker_type || "").toLowerCase()
        const brickType = String(entry.brick_type || "").toLowerCase()
        const bricks = Number(entry.bricks) || 0
        const amount = Number(entry.total_amount) || 0

        if (nextReport[workerType] && nextReport[workerType][brickType]) {
          nextReport[workerType][brickType].bricks += bricks
          nextReport[workerType][brickType].amount += amount
          nextReport[workerType][brickType].entries += 1
        }

        nextEntries.push({
          id: entry.id,
          date: entry.date,
          created_at: entry.created_at,
          workerType,
          brickType,
          bricks,
          ratePer1000: Number(entry.rate_per_1000) || 0,
          amount,
        })
      })

      setReport(nextReport)
      setAllEntries(nextEntries)
      setWorkersCount(workersRes.data?.length || 0)
    } catch (error) {
      alert(error.message || "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert(error.message)
      return
    }

    router.push("/login")
    router.refresh()
  }

  function handleSubmit(e) {
    e.preventDefault()
    fetchDashboard(dateFrom, dateTo)
  }

  function handleToday() {
    const today = getTodayDateInput()
    setDateFrom(today)
    setDateTo(today)
    fetchDashboard(today, today)
  }

  const totals = useMemo(() => {
    const totalBricks = allEntries.reduce((sum, item) => sum + item.bricks, 0)
    const totalEarnings = allEntries.reduce((sum, item) => sum + item.amount, 0)
    const totalEntries = allEntries.length

    const stockByType = {}
    const stockTypes = [
      "awal",
      "dome",
      "tirak",
      "tile",
      "special",
      "kachi kali",
    ]

    stockTypes.forEach((type) => {
      const nakasiQty = report.nakasi?.[type]?.bricks || 0
      const loadingQty = report.loading?.[type]?.bricks || 0
      stockByType[type] = loadingQty - nakasiQty
    })

    const totalStock = Object.values(stockByType).reduce((sum, val) => sum + val, 0)

    return {
      totalBricks,
      totalEarnings,
      totalEntries,
      totalStock,
      stockByType,
    }
  }, [allEntries, report])

  function DrawerMenu() {
    return (
      <div className="flex h-full flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/admin" onClick={closeDrawer} className="block">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center">
                <span className="text-orange-300 text-xl">🧱</span>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-gray-400">
                  Kiln Ops
                </p>
                <h2 className="text-lg font-bold text-white">Dashboard</h2>
              </div>
            </div>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {MENU_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-2 text-xs uppercase tracking-[0.25em] text-gray-500 mb-3">
                {group.title}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname?.startsWith(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeDrawer}
                      className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition border ${
                        isActive
                          ? "bg-orange-500/15 border-orange-500/25 text-orange-200"
                          : "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10"
                      }`}
                    >
                      <span className="font-medium">{item.label}</span>
                      <span className="text-xs text-gray-400">→</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500/15 border border-rose-500/20 px-4 py-3 font-semibold text-rose-200 hover:bg-rose-500/20 transition"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#061226] text-white">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#061226]/95 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-4 md:px-6">
          <button
            onClick={openDrawer}
            className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-xl leading-none hover:bg-white/10 transition"
            aria-label="Open menu"
          >
            ☰
          </button>

          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-gray-400">
              Kiln Operations Center
            </p>
            <h1 className="text-lg font-bold">Dashboard</h1>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 hover:bg-white/10 transition"
            title="Logout"
          >
            Logout
          </button>
        </div>
      </div>

      {drawerMounted && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close sidebar overlay"
            className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
              drawerOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeDrawer}
          />

          <aside
            className={`absolute left-0 top-0 h-full w-[88%] max-w-sm bg-[#081a2f] border-r border-white/10 shadow-2xl transform transition-transform duration-300 ease-out ${
              drawerOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-gray-400">
                  Kiln Ops
                </p>
                <h2 className="text-lg font-bold">Menu</h2>
              </div>
              <button
                onClick={closeDrawer}
                className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-xl leading-none hover:bg-white/10 transition"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <DrawerMenu />
          </aside>
        </div>
      )}

      <main className="px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-orange-400 uppercase tracking-[0.35em] text-xs mb-3">
                Kiln Operations Center
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Dashboard
              </h1>
              <p className="text-gray-400 mt-3 max-w-2xl">
                Production, stock, and settlement overview for the selected date range.
              </p>
            </div>

            <div className="hidden lg:block" />
          </div>

          <section className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-[#0f223a] shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-orange-500/25 via-orange-500/10 to-transparent" />
            <div className="relative p-6 md:p-7">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-6">
                <div>
                  <p className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-orange-500/15 text-orange-200">
                    Dashboard Filter
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold mt-3">
                    Select a Date or Range
                  </h2>
                  <p className="text-gray-400 mt-1">
                    Use the same date in both fields for a single-day view.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                    Selected range
                  </p>
                  <p className="text-sm text-gray-200 mt-1">
                    {dateFrom} → {dateTo}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Workers tracked: {formatNumber(workersCount)}
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              >
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

                <div className="sm:col-span-2 lg:col-span-2 flex flex-wrap gap-3 items-end">
                  <button
                    type="submit"
                    className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:opacity-90 transition"
                  >
                    Apply Filter
                  </button>

                  <button
                    type="button"
                    onClick={handleToday}
                    className="rounded-xl bg-white/5 px-5 py-3 font-semibold text-gray-200 hover:bg-white/10 transition border border-white/10"
                  >
                    Today
                  </button>
                </div>
              </form>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="rounded-3xl border border-orange-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Entries</p>
              <p className="mt-2 text-3xl font-bold text-orange-300">
                {formatNumber(totals.totalEntries)}
              </p>
            </div>

            <div className="rounded-3xl border border-orange-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Total Production</p>
              <p className="mt-2 text-3xl font-bold text-orange-300">
                {formatNumber(totals.totalBricks)}
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Estimated Earnings</p>
              <p className="mt-2 text-3xl font-bold text-emerald-300">
                Rs {formatNumber(totals.totalEarnings)}
              </p>
            </div>

            <div className="rounded-3xl border border-sky-500/20 bg-[#0f223a] p-6 shadow-2xl">
              <p className="text-gray-400">Current Stock</p>
              <p className="mt-2 text-3xl font-bold text-sky-300">
                {formatNumber(totals.totalStock)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {LABOUR_SECTIONS.map((section) => {
              const sectionTotals = report[section.key]
              const sectionCount = Object.values(sectionTotals).reduce(
                (sum, item) => sum + item.entries,
                0
              )

              return (
                <section
                  key={section.key}
                  className={`relative overflow-hidden rounded-3xl border ${section.border} bg-[#0f223a] shadow-2xl`}
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-r ${section.accent}`}
                  />
                  <div className="relative p-6 md:p-7">
                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-6">
                      <div>
                        <p
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${section.chip}`}
                        >
                          {titleCase(section.key)}
                        </p>
                        <h2 className="text-2xl md:text-3xl font-bold mt-3">
                          {section.title}
                        </h2>
                        <p className="text-gray-400 mt-1">
                          {section.subtitle}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                          Filtered range
                        </p>
                        <p className="text-sm text-gray-200 mt-1">
                          {dateFrom} → {dateTo}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {sectionCount} entry{sectionCount === 1 ? "" : "ies"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {section.brickTypes.map((brickType) => {
                        const item = sectionTotals[brickType]

                        return (
                          <div
                            key={brickType}
                            className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm uppercase tracking-[0.2em] text-gray-400">
                                  {titleCase(brickType)}
                                </p>
                                <p className="mt-2 text-3xl font-bold text-white">
                                  {formatNumber(item.bricks)}
                                </p>
                              </div>

                              <span className="rounded-full bg-black/20 px-3 py-1 text-xs text-gray-200 border border-white/10">
                                {item.entries} rec
                              </span>
                            </div>

                            <div className="mt-4 h-2 rounded-full bg-black/20 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-orange-500/80"
                                style={{
                                  width: item.bricks > 0 ? "100%" : "0%",
                                }}
                              />
                            </div>

                            <p className="mt-3 text-sm text-gray-400">
                              Qty recorded for the selected period
                            </p>

                            <div className="mt-4 rounded-xl bg-black/20 border border-white/10 p-3">
                              <p className="text-gray-400">Total Amount</p>
                              <p className="mt-1 font-semibold text-orange-200 text-xl">
                                Rs {formatNumber(item.amount)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </section>
              )
            })}
          </div>

          <section className="bg-[#0f223a] border border-white/10 rounded-3xl p-6 md:p-7 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Stock</h2>
                <p className="text-gray-400 mt-1">
                  Loading minus Nakasi for each stock type.
                </p>
              </div>
              <div className="text-sm text-gray-400">
                {dateFrom} → {dateTo}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {["awal", "dome", "tirak", "tile", "special", "kachi kali"].map(
                (type) => {
                  const current = totals.stockByType[type] || 0
                  return (
                    <div
                      key={type}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <p className="text-sm uppercase tracking-[0.2em] text-gray-400">
                        {titleCase(type)}
                      </p>
                      <p className="mt-2 text-3xl font-bold text-sky-300">
                        {formatNumber(current)}
                      </p>
                      <p className="mt-2 text-sm text-gray-400">
                         Loading - Nakasi
                      </p>
                    </div>
                  )
                }
              )}
            </div>
          </section>

          <section className="bg-[#0f223a] border border-white/10 rounded-3xl p-6 md:p-7 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Filtered Work Entries</h2>
                <p className="text-gray-400 mt-1">
                  Showing records for {dateFrom} to {dateTo}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700 text-orange-400">
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Labour</th>
                    <th className="py-3 pr-4">Brick Type</th>
                    <th className="py-3 pr-4">Bricks</th>
                    <th className="py-3 pr-4">Rate / 1000</th>
                    <th className="py-3 pr-4">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td className="py-6 text-gray-400" colSpan={6}>
                        Loading dashboard...
                      </td>
                    </tr>
                  ) : allEntries.length === 0 ? (
                    <tr>
                      <td className="py-6 text-gray-400" colSpan={6}>
                        No work entries found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    allEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-800">
                        <td className="py-3 pr-4">{entry.date}</td>
                        <td className="py-3 pr-4 capitalize">
                          {entry.workerType || "-"}
                        </td>
                        <td className="py-3 pr-4 capitalize">
                          {entry.brickType || "-"}
                        </td>
                        <td className="py-3 pr-4">{formatNumber(entry.bricks)}</td>
                        <td className="py-3 pr-4">
                          Rs {formatNumber(entry.ratePer1000)}
                        </td>
                        <td className="py-3 pr-4 text-orange-300 font-semibold">
                          Rs {formatNumber(entry.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
