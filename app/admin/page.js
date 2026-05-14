import Link from "next/link"
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
    brickTypes: ["awal", "dome", "tirak", "tile", "special"],
  },
  {
    key: "loading",
    title: "Loading",
    subtitle: "Dispatched bricks",
    accent: "from-violet-500/25 via-violet-500/10 to-transparent",
    border: "border-violet-500/20",
    chip: "bg-violet-500/15 text-violet-200",
    brickTypes: ["awal", "dome", "tirak", "tile", "special"],
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

function getParamValue(input, fallback) {
  if (Array.isArray(input)) return input[0] || fallback
  return input || fallback
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

export default async function AdminDashboard({ searchParams }) {
  const todayDate = getTodayDateInput()

  const rawFrom = getParamValue(searchParams?.from, todayDate)
  const rawTo = getParamValue(searchParams?.to, todayDate)

  const rangeFrom = rawFrom <= rawTo ? rawFrom : rawTo
  const rangeTo = rawFrom <= rawTo ? rawTo : rawFrom

  const { data: workEntries, error } = await supabase
    .from("work_entries")
    .select(`
      bricks,
      rate_per_1000,
      total_amount,
      date,
      created_at,
      worker_type,
      brick_type,
      workers(name, worker_type)
    `)
    .gte("date", rangeFrom)
    .lte("date", rangeTo)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const report = buildEmptyReport()
  const allEntries = []

  ;(workEntries || []).forEach((entry) => {
    const workerType = String(
      entry.worker_type || entry.workers?.worker_type || ""
    ).toLowerCase()

    const brickType = String(entry.brick_type || "").toLowerCase()
    const bricks = Number(entry.bricks) || 0
    const amount = Number(entry.total_amount) || 0

    if (report[workerType] && report[workerType][brickType]) {
      report[workerType][brickType].bricks += bricks
      report[workerType][brickType].amount += amount
      report[workerType][brickType].entries += 1
    }

    allEntries.push({
      id: entry.created_at || `${entry.date}-${entry.brick_type}-${entry.worker_type}`,
      date: entry.date,
      created_at: entry.created_at,
      workerType,
      workerName: entry.workers?.name || "-",
      brickType,
      bricks,
      ratePer1000: Number(entry.rate_per_1000) || 0,
      amount,
    })
  })

  const modules = [
    {
      href: "/workers",
      title: "Workers",
      desc: "Manage worker records",
    },
    {
      href: "/work-entry",
      title: "Daily Work Entry",
      desc: "Record production by brick type",
    },
    {
      href: "/advances",
      title: "Advances",
      desc: "Manage worker advances",
    },
    {
      href: "/additions",
      title: "Additions to Khatta",
      desc: "Electricity, loan and damage",
    },
    {
      href: "/deductions",
      title: "Deductions",
      desc: "Manage fines and other deductions",
    },
    {
      href: "/ledger",
      title: "Ledger",
      desc: "View settlements and balances",
    },
  ]

  const todayLink = `/admin?from=${todayDate}&to=${todayDate}`

  return (
    <div className="min-h-screen bg-[#061226] text-white">
      <div className="px-8 pt-8 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-orange-400 uppercase tracking-[0.35em] text-xs mb-3">
                Kiln Operations Center
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Admin Dashboard
              </h1>
              <p className="text-gray-400 mt-3 max-w-2xl">
                Filter the production snapshot by a specific day or a date range.
                Set the same date in both fields for a single-day view.
              </p>
            </div>

            <div className="bg-[#0f223a] border border-white/10 rounded-3xl p-4 shadow-2xl w-full lg:w-[430px]">
              <form
                method="get"
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    From
                  </label>
                  <input
                    type="date"
                    name="from"
                    defaultValue={rangeFrom}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                    To
                  </label>
                  <input
                    type="date"
                    name="to"
                    defaultValue={rangeTo}
                    className="w-full rounded-xl bg-[#081a2f] border border-white/10 px-4 py-3 outline-none focus:border-orange-500"
                  />
                </div>

                <div className="sm:col-span-2 flex flex-wrap gap-3 pt-1">
                  <button
                    type="submit"
                    className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:opacity-90 transition"
                  >
                    Apply Filter
                  </button>

                  <Link
                    href={todayLink}
                    className="rounded-xl bg-white/5 px-5 py-3 font-semibold text-gray-200 hover:bg-white/10 transition border border-white/10"
                  >
                    Today
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 pb-10">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* REPORTING BLOCKS */}
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
                        <p className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${section.chip}`}>
                          {titleCase(section.key)}
                        </p>
                        <h2 className="text-2xl md:text-3xl font-bold mt-3">
                          {section.title}
                        </h2>
                        <p className="text-gray-400 mt-1">{section.subtitle}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                          Filtered range
                        </p>
                        <p className="text-sm text-gray-200 mt-1">
                          {rangeFrom} → {rangeTo}
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
                                  width:
                                    item.bricks > 0
                                      ? "100%"
                                      : "0%",
                                }}
                              />
                            </div>

                            <p className="mt-3 text-sm text-gray-400">
                              Qty recorded for the selected period
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </section>
              )
            })}
          </div>

          {/* MODULES */}
          <section className="bg-[#0f223a] border border-white/10 rounded-3xl p-6 md:p-7 shadow-2xl">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Modules</h2>
                <p className="text-gray-400 mt-1">
                  Quick access to the main operational screens.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {modules.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className="group h-full rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-0.5 hover:bg-white/10 hover:border-orange-500/30">
                    <h3 className="text-lg font-semibold group-hover:text-orange-300">
                      {item.title}
                    </h3>
                    <p className="text-gray-400 mt-2">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* RECENT ENTRIES */}
          <section className="bg-[#0f223a] border border-white/10 rounded-3xl p-6 md:p-7 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">
                  Filtered Work Entries
                </h2>
                <p className="text-gray-400 mt-1">
                  Showing records for {rangeFrom} to {rangeTo}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700 text-orange-400">
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Labour</th>
                    <th className="py-3 pr-4">Worker</th>
                    <th className="py-3 pr-4">Brick Type</th>
                    <th className="py-3 pr-4">Bricks</th>
                    <th className="py-3 pr-4">Rate / 1000</th>
                    <th className="py-3 pr-4">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {allEntries.length === 0 ? (
                    <tr>
                      <td className="py-6 text-gray-400" colSpan={7}>
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
                        <td className="py-3 pr-4">{entry.workerName}</td>
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
      </div>
    </div>
  )
}
