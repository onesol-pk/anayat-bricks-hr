import Link from "next/link"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

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

export default async function AdminDashboard() {
  const todayDate = getTodayDateInput()

  const { data: workEntries, error } = await supabase
    .from("work_entries")
    .select("bricks, date, created_at, workers(name, worker_type)")
    .eq("date", todayDate)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const totals = {
    patheer: 0,
    bharai: 0,
    nakasi: 0,
    loading: 0,
    total: 0,
  }

  const todaysEntries = (workEntries || []).map((entry) => {
    const workerType = String(entry.workers?.worker_type || "").toLowerCase()
    const bricks = Number(entry.bricks) || 0

    if (workerType in totals) {
      totals[workerType] += bricks
    }

    totals.total += bricks

    return {
      ...entry,
      workerType,
      workerName: entry.workers?.name || "-",
      bricks,
    }
  })

  const workCards = [
    {
      key: "patheer",
      title: "Patheer",
      subtitle: "New bricks laid",
      value: totals.patheer,
    },
    {
      key: "bharai",
      title: "Bharai",
      subtitle: "Added to kiln",
      value: totals.bharai,
    },
    {
      key: "nakasi",
      title: "Nakasi",
      subtitle: "New stock",
      value: totals.nakasi,
    },
    {
      key: "loading",
      title: "Loading",
      subtitle: "Bricks sold / loaded out",
      value: totals.loading,
    },
  ]

  const modules = [
    {
      href: "/workers",
      title: "Workers",
      desc: "Manage employee records",
    },
    {
      href: "/work-entry",
      title: "Daily Work Entry",
      desc: "Record daily brick production",
    },
    {
      href: "/advances",
      title: "Advances",
      desc: "Manage worker advances",
    },
    {
      href: "/additions",
      title: "Additions to Khatta",
      desc: "Add electricity, loan and damage",
    },
    {
      href: "/deductions",
      title: "Deductions",
      desc: "Manage worker deductions",
    },
    {
      href: "/ledger",
      title: "Ledger",
      desc: "View worker balances",
    },
    {
      href: "/reports",
      title: "Reports",
      desc: "View historical reports",
    },
  ]

  return (
    <div className="min-h-screen bg-[#061226] text-white p-8">
      <h1 className="text-4xl font-bold text-orange-500 mb-4">
        Admin Dashboard
      </h1>

      <p className="text-gray-400 mb-8">
        Daily work summary for {todayDate}
      </p>

      {/* DAILY WORK SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        <div className="bg-[#0f223a] p-6 rounded-xl">
          <h2 className="text-gray-400 text-lg mb-2">
            Total Bricks Today
          </h2>
          <p className="text-3xl font-bold text-orange-500">
            {formatNumber(totals.total)}
          </p>
        </div>

        {workCards.map((card) => (
          <div key={card.key} className="bg-[#0f223a] p-6 rounded-xl">
            <h2 className="text-gray-400 text-lg mb-2">
              {card.title}
            </h2>
            <p className="text-xl text-gray-300 mb-2">
              {card.subtitle}
            </p>
            <p className="text-3xl font-bold text-orange-500">
              {formatNumber(card.value)}
            </p>
          </div>
        ))}
      </div>

      {/* MODULES */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        {modules.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="bg-[#0f223a] p-6 rounded-xl hover:bg-[#16314f] transition cursor-pointer h-full">
              <h2 className="text-xl font-semibold">{item.title}</h2>
              <p className="text-gray-400 mt-2">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* TODAY'S ENTRIES */}
      <div className="bg-[#0f223a] p-6 rounded-xl">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-semibold">
            Today&apos;s Work Entries
          </h2>
          <span className="text-gray-400">{todayDate}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700 text-orange-400">
                <th className="py-3">Type</th>
                <th className="py-3">Worker</th>
                <th className="py-3">Bricks</th>
                <th className="py-3">Time</th>
              </tr>
            </thead>

            <tbody>
              {todaysEntries.length === 0 ? (
                <tr>
                  <td className="py-6 text-gray-400" colSpan={4}>
                    No work entries recorded for today.
                  </td>
                </tr>
              ) : (
                todaysEntries.map((entry) => (
                  <tr key={entry.created_at || `${entry.workerName}-${entry.bricks}`} className="border-b border-gray-800">
                    <td className="py-3 capitalize">
                      {entry.workerType || "-"}
                    </td>
                    <td className="py-3">
                      {entry.workerName}
                    </td>
                    <td className="py-3">
                      {formatNumber(entry.bricks)}
                    </td>
                    <td className="py-3">
                      {entry.created_at
                        ? new Date(entry.created_at).toLocaleTimeString("en-PK", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
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
