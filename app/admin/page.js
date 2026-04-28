import Link from "next/link"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function AdminDashboard() {
  
  // Get current week start (Monday)
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)

  const weekStart = new Date(today.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)

  const formattedWeekStart = weekStart.toISOString()

  // Weekly Brick Production
  const { data: workEntries } = await supabase
    .from("work_entries")
    .select("bricks_total")
    .gte("date", formattedWeekStart)

  const weeklyBricks =
    workEntries?.reduce(
      (sum, entry) => sum + (entry.bricks_total || 0),
      0
    ) || 0

  // Weekly Advances
  const { data: advances } = await supabase
    .from("advances")
    .select("amount")
    .gte("date", formattedWeekStart)

  const weeklyAdvances =
    advances?.reduce(
      (sum, entry) => sum + (entry.amount || 0),
      0
    ) || 0

  // Salaries Due
  const { data: unpaidSalaries } = await supabase
    .from("work_entries")
    .select("total_wages")
    .eq("paid", false)

  const salariesDue =
    unpaidSalaries?.reduce(
      (sum, entry) => sum + (entry.total_wages || 0),
      0
    ) || 0

  return (
    <div className="min-h-screen bg-[#061226] text-white p-8">
      
      {/* HEADER */}
      <h1 className="text-4xl font-bold text-orange-500 mb-8">
        Admin Dashboard
      </h1>

      {/* KPI CARDS */}
      <div className="grid grid-cols-3 gap-6 mb-10">

        <div className="bg-[#0f223a] p-6 rounded-xl shadow-lg">
          <h2 className="text-gray-400 text-lg mb-2">
            Weekly Brick Production
          </h2>
          <p className="text-3xl font-bold text-orange-500">
            {weeklyBricks.toLocaleString()}
          </p>
        </div>

        <div className="bg-[#0f223a] p-6 rounded-xl shadow-lg">
          <h2 className="text-gray-400 text-lg mb-2">
            Weekly Advances Paid
          </h2>
          <p className="text-3xl font-bold text-orange-500">
            Rs {weeklyAdvances.toLocaleString()}
          </p>
        </div>

        <div className="bg-[#0f223a] p-6 rounded-xl shadow-lg">
          <h2 className="text-gray-400 text-lg mb-2">
            Salaries Due
          </h2>
          <p className="text-3xl font-bold text-orange-500">
            Rs {salariesDue.toLocaleString()}
          </p>
        </div>

      </div>

      {/* MODULES */}
      <div className="grid grid-cols-4 gap-6">

        <Link href="/workers">
          <div className="bg-[#0f223a] p-6 rounded-xl hover:bg-[#16314f] cursor-pointer transition">
            <h2 className="text-xl font-semibold">Workers</h2>
            <p className="text-gray-400 mt-2">
              Manage employee records
            </p>
          </div>
        </Link>

        <Link href="/attendance">
          <div className="bg-[#0f223a] p-6 rounded-xl hover:bg-[#16314f] cursor-pointer transition">
            <h2 className="text-xl font-semibold">Attendance</h2>
            <p className="text-gray-400 mt-2">
              Track daily work entries
            </p>
          </div>
        </Link>

        <Link href="/payroll">
          <div className="bg-[#0f223a] p-6 rounded-xl hover:bg-[#16314f] cursor-pointer transition">
            <h2 className="text-xl font-semibold">Payroll</h2>
            <p className="text-gray-400 mt-2">
              Manage wages and payments
            </p>
          </div>
        </Link>

        <Link href="/reports">
          <div className="bg-[#0f223a] p-6 rounded-xl hover:bg-[#16314f] cursor-pointer transition">
            <h2 className="text-xl font-semibold">Reports</h2>
            <p className="text-gray-400 mt-2">
              View production & payroll reports
            </p>
          </div>
        </Link>

      </div>
    </div>
  )
}
