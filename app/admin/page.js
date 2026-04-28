import Link from "next/link"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function AdminDashboard() {
  
  // Current week start (Monday)
  const today = new Date()
  const day = today.getDay()

  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(today.setDate(diff))

  monday.setHours(0, 0, 0, 0)

  const weekStart = monday.toISOString().split("T")[0]

  // --------------------------
  // WEEKLY BRICK PRODUCTION
  // --------------------------
  const { data: workEntries } = await supabase
    .from("work_entries")
    .select("bricks, rate_per_1000")
    .eq("week_start", weekStart)

  const weeklyBricks =
    workEntries?.reduce((sum, entry) => {
      return sum + (entry.bricks || 0)
    }, 0) || 0

  // --------------------------
  // WEEKLY ADVANCES
  // --------------------------
  const { data: advances } = await supabase
    .from("advances")
    .select("amount")
    .eq("week_start", weekStart)

  const weeklyAdvances =
    advances?.reduce((sum, entry) => {
      return sum + (entry.amount || 0)
    }, 0) || 0

  // --------------------------
  // SALARIES DUE
  // --------------------------
  const salariesDue =
    workEntries?.reduce((sum, entry) => {
      const wage =
        ((entry.bricks || 0) / 1000) *
        (entry.rate_per_1000 || 0)

      return sum + wage
    }, 0) || 0

  return (
    <div className="min-h-screen bg-[#061226] text-white p-8">
      
      {/* HEADER */}
      <h1 className="text-4xl font-bold text-orange-500 mb-8">
        Admin Dashboard
      </h1>

      {/* KPI SECTION */}
      <div className="grid grid-cols-3 gap-6 mb-10">

        <div className="bg-[#0f223a] p-6 rounded-xl">
          <h2 className="text-gray-400 text-lg mb-2">
            Weekly Brick Production
          </h2>
          <p className="text-3xl font-bold text-orange-500">
            {weeklyBricks.toLocaleString()}
          </p>
        </div>

        <div className="bg-[#0f223a] p-6 rounded-xl">
          <h2 className="text-gray-400 text-lg mb-2">
            Weekly Advances Paid
          </h2>
          <p className="text-3xl font-bold text-orange-500">
            Rs {weeklyAdvances.toLocaleString()}
          </p>
        </div>

        <div className="bg-[#0f223a] p-6 rounded-xl">
          <h2 className="text-gray-400 text-lg mb-2">
            Salaries Due
          </h2>
          <p className="text-3xl font-bold text-orange-500">
            Rs {salariesDue.toLocaleString()}
          </p>
        </div>

      </div>

      {/* MODULES */}
     <div className="grid grid-cols-5 gap-6">

        <Link href="/workers">
          <div className="bg-[#0f223a] p-6 rounded-xl hover:bg-[#16314f] transition cursor-pointer">
            <h2 className="text-xl font-semibold">Workers</h2>
            <p className="text-gray-400 mt-2">
              Manage employee records
            </p>
          </div>
        </Link>

        <Link href="/attendance">
          <div className="bg-[#0f223a] p-6 rounded-xl hover:bg-[#16314f] transition cursor-pointer">
            <h2 className="text-xl font-semibold">Attendance</h2>
            <p className="text-gray-400 mt-2">
              Track daily work entries
            </p>
          </div>
        </Link>

        <Link href="/payroll">
          <div className="bg-[#0f223a] p-6 rounded-xl hover:bg-[#16314f] transition cursor-pointer">
            <h2 className="text-xl font-semibold">Payroll</h2>
            <p className="text-gray-400 mt-2">
              Manage wages and payments
            </p>
          </div>
        </Link>

       <Link href="/deductions">
          <div className="bg-[#0f223a] p-6 rounded-xl hover:bg-[#16314f] transition cursor-pointer">
            <h2 className="text-xl font-semibold">Deductions</h2>
            <p className="text-gray-400 mt-2">
              Manage worker deductions
            </p>
          </div>
        </Link>

        <Link href="/reports">
          <div className="bg-[#0f223a] p-6 rounded-xl hover:bg-[#16314f] transition cursor-pointer">
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
