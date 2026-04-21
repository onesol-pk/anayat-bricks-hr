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

    if (error) {
      alert(error.message)
    } else {
      window.location.href = "/"
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0b1220" }}>
      
      {/* LEFT SIDE */}
      <div style={{
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px"
      }}>
        <div style={{
          width: "100%",
          maxWidth: "400px",
          background: "rgba(255,255,255,0.05)",
          padding: "30px",
          borderRadius: "16px",
          backdropFilter: "blur(10px)",
          color: "white",
          boxShadow: "0 10px 40px rgba(0,0,0,0.4)"
        }}>
          <h1 style={{ marginBottom: "10px" }}>
            Anayat Sons Bricks
          </h1>
          <p style={{ opacity: 0.7, marginBottom: "30px" }}>
            HR Management System
          </p>

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "15px",
              borderRadius: "8px",
              border: "none",
              background: "#1a2335",
              color: "white"
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "20px",
              borderRadius: "8px",
              border: "none",
              background: "#1a2335",
              color: "white"
            }}
          />

          <button
            onClick={handleLogin}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(90deg, #ff7a18, #ff4d00)",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            Login →
          </button>
        </div>
      </div>

      {/* RIGHT SIDE IMAGE */}
      <div style={{
        flex: 1,
        backgroundImage: "url('/login-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative"
      }}>
        <div style={{
          position: "absolute",
          top: "20%",
          left: "10%",
          color: "white"
        }}>
          <h2 style={{ fontSize: "32px", opacity: 0.8 }}>
            Building Strength.
          </h2>
          <h1 style={{ fontSize: "40px", color: "#ff7a18" }}>
            Empowering People.
          </h1>
        </div>
      </div>

    </div>
  )
}
