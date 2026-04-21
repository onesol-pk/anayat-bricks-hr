"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) alert(error.message)
    else window.location.href = "/"
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0b1220" }}>

      {/* LEFT PANEL */}
      <div style={{
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px",
        color: "white"
      }}>

        <div style={{
          width: "100%",
          maxWidth: "420px",
        }}>

          {/* LOGO + BRAND */}
          <div style={{ marginBottom: "30px" }}>
            <h2 style={{ margin: 0 }}>ANAYAT SONS BRICKS</h2>
            <p style={{ color: "#ff7a18", marginTop: "5px" }}>
              HR & WAGE MANAGEMENT SYSTEM
            </p>
          </div>

          {/* TITLE */}
          <h1 style={{ marginBottom: "10px" }}>Welcome Back</h1>
          <p style={{ opacity: 0.7, marginBottom: "30px" }}>
            Sign in to continue to your dashboard
          </p>

          {/* EMAIL */}
          <div style={{ marginBottom: "15px" }}>
            <input
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid #1f2a44",
                background: "#0f172a",
                color: "white"
              }}
            />
          </div>

          {/* PASSWORD */}
          <div style={{ marginBottom: "10px" }}>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid #1f2a44",
                background: "#0f172a",
                color: "white"
              }}
            />
          </div>

          {/* REMEMBER + FORGOT */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "14px",
            marginBottom: "25px"
          }}>
            <label>
              <input type="checkbox" /> Remember me
            </label>
            <span style={{ color: "#ff7a18", cursor: "pointer" }}>
              Forgot Password?
            </span>
          </div>

          {/* BUTTON */}
          <button
            onClick={handleLogin}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(90deg, #ff7a18, #ff4d00)",
              color: "white",
              fontWeight: "bold",
              fontSize: "16px",
              cursor: "pointer",
              boxShadow: "0 10px 30px rgba(255,122,24,0.3)"
            }}
          >
            Login →
          </button>

        </div>
      </div>

      {/* RIGHT IMAGE PANEL */}
      <div style={{
        flex: 1,
        backgroundImage: "url('/login-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative"
      }}>

        {/* DARK OVERLAY */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.4)"
        }} />

        {/* TEXT */}
        <div style={{
          position: "absolute",
          top: "30%",
          left: "10%",
          color: "white"
        }}>
          <h2 style={{ fontSize: "34px" }}>
            Building Strength.
          </h2>
          <h1 style={{
            fontSize: "42px",
            color: "#ff7a18"
          }}>
            Empowering People.
          </h1>
        </div>

      </div>

    </div>
  )
}
