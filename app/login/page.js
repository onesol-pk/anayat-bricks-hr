"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) {
      alert("Please enter email and password")
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    const userId = data.user.id

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (profileError || !profile) {
      alert("Profile not found")
      setLoading(false)
      return
    }

    if (profile.role === "admin") {
      router.push("/admin")
    } else if (profile.role === "staff") {
      router.push("/staff")
    } else {
      alert("Invalid role assigned")
    }

    setLoading(false)
  }

  return (
    <div className="h-screen w-full bg-[#061226] flex items-center justify-center overflow-hidden">
      
      {/* MAIN CONTAINER */}
      <div className="w-[90%] max-w-6xl h-[85vh] flex rounded-2xl border border-orange-500 overflow-hidden shadow-2xl">
        
        {/* LEFT SIDE */}
        <div className="w-1/2 bg-[#081a2f] flex items-center justify-center px-12">
          <div className="w-full max-w-md text-left text-white">

            {/* BRAND */}
            <div className="text-center mb-10">
              <h1 className="text-2xl font-semibold tracking-wide">
                ANAYAT SONS BRICKS
              </h1>
              <p className="text-orange-500 text-sm mt-2">
                HR & WAGE MANAGEMENT SYSTEM
              </p>
            </div>

            {/* HEADING */}
            <h2 className="text-4xl font-semibold mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-400 mb-8">
              Sign in to continue to your dashboard
            </p>

            {/* FORM */}
            <div className="space-y-4">

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#0f223a] border border-gray-700 focus:border-orange-500 outline-none"
              />

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#0f223a] border border-gray-700 focus:border-orange-500 outline-none"
              />

              {/* ROW */}
              <div className="flex items-center justify-between text-sm text-gray-400">
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Remember me
                </label>
                <span className="text-orange-500 cursor-pointer">
                  Forgot Password?
                </span>
              </div>

              {/* BUTTON */}
              <button
                onClick={handleLogin}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-lg hover:opacity-90 transition"
              >
                {loading ? "Logging in..." : "Login →"}
              </button>

            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="relative w-1/2 h-full">
          <img
            src="/login-bg.jpg"
            alt="Bricks"
            className="w-full h-full object-cover"
          />

          {/* TEXT */}
          <div className="absolute top-10 left-10 text-left">
            <h2 className="text-white text-2xl font-semibold drop-shadow-lg">
              Building Strength.
            </h2>
            <h1 className="text-orange-500 text-3xl font-bold mt-2 drop-shadow-lg">
              Empowering People.
            </h1>
          </div>
        </div>

      </div>
    </div>
  )
}
