export default function LoginPage() {
  return (
    <div className="h-screen w-full bg-[#061226] flex items-center justify-center overflow-hidden">
      
      {/* Main Container */}
      <div className="w-[90%] max-w-6xl h-[85vh] flex rounded-[28px] border border-orange-500/60 overflow-hidden shadow-2xl">

        {/* LEFT PANEL */}
        <div className="w-1/2 bg-[#081a2f] flex items-center justify-center px-14">
          <div className="w-full max-w-md text-white mt-10">

            {/* Logo/Brand */}
            <div className="text-center mb-14">
              <h1 className="text-3xl font-semibold tracking-wide">
                ANAYAT SONS BRICKS
              </h1>

              <p className="text-orange-500 text-sm mt-3 tracking-wider">
                HR & WAGE MANAGEMENT SYSTEM
              </p>
            </div>

            {/* Welcome Text */}
            <div className="text-left mb-8">
              <h2 className="text-5xl font-semibold mb-3">
                Welcome Back
              </h2>

              <p className="text-gray-400 text-lg">
                Sign in to continue to your dashboard
              </p>
            </div>

            {/* Inputs */}
            <div className="space-y-5">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-5 py-4 rounded-xl bg-[#0f223a] border border-gray-700 text-white placeholder-gray-500 outline-none focus:border-orange-500"
              />

              <input
                type="password"
                placeholder="Enter your password"
                className="w-full px-5 py-4 rounded-xl bg-[#0f223a] border border-gray-700 text-white placeholder-gray-500 outline-none focus:border-orange-500"
              />

              {/* Remember row */}
              <div className="flex justify-between items-center text-sm">
                <label className="flex items-center gap-2 text-gray-400">
                  <input type="checkbox" />
                  Remember me
                </label>

                <span className="text-orange-500 cursor-pointer">
                  Forgot Password?
                </span>
              </div>

              {/* Login Button */}
              <button className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xl font-semibold hover:scale-[1.01] transition">
                Login →
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="relative w-1/2 h-full overflow-hidden">
          
          {/* Background Image */}
          <img
            src="/login-bg.jpg"
            alt="Bricks"
            className="w-full h-full object-cover"
          />

          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/35"></div>

          {/* Top Right Text */}
          <div className="absolute top-10 right-10 text-right z-10">
            <h2 className="text-white text-4xl font-semibold mb-2">
              Building Strength.
            </h2>

            <h1 className="text-orange-500 text-5xl font-bold">
              Empowering People.
            </h1>
          </div>
        </div>

      </div>
    </div>
  )
}
