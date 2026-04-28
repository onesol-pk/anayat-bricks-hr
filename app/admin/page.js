export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-[#061226] text-white p-8">
      <h1 className="text-3xl font-bold text-orange-500 mb-6">
        Admin Dashboard
      </h1>

      <div className="grid grid-cols-3 gap-6">
        
        <div className="bg-[#0f223a] p-6 rounded-xl">
          <h2 className="text-xl font-semibold">Workers</h2>
          <p className="text-gray-400 mt-2">
            Manage employee records
          </p>
        </div>

        <div className="bg-[#0f223a] p-6 rounded-xl">
          <h2 className="text-xl font-semibold">Attendance</h2>
          <p className="text-gray-400 mt-2">
            Track daily work entries
          </p>
        </div>

        <div className="bg-[#0f223a] p-6 rounded-xl">
          <h2 className="text-xl font-semibold">Payroll</h2>
          <p className="text-gray-400 mt-2">
            Manage wages and payments
          </p>
        </div>

      </div>
    </div>
  )
}
