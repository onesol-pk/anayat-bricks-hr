"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin() {
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push("/") // go to dashboard
  }

  return (
    <div style={styles.container}>
      
      {/* LEFT SIDE */}
      <div style={styles.left}>
        <div style={styles.card}>
          <h1 style={styles.title}>Anayat Sons Bricks</h1>
          <p style={styles.subtitle}>HR Management System</p>

          <input
            style={styles.input}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.button} onClick={handleLogin}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div style={styles.right}>
        <div style={styles.glowBox}></div>
        <div style={styles.circle1}></div>
        <div style={styles.circle2}></div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    background: "#0f172a",
    color: "white",
  },

  left: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(15px)",
    padding: "40px",
    borderRadius: "16px",
    width: "320px",
    boxShadow: "0 0 40px rgba(0,0,0,0.5)",
  },

  title: {
    marginBottom: "5px",
  },

  subtitle: {
    marginBottom: "20px",
    opacity: 0.7,
  },

  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "none",
    outline: "none",
    background: "rgba(255,255,255,0.1)",
    color: "white",
  },

  button: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },

  error: {
    color: "red",
    marginBottom: "10px",
  },

  right: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },

  glowBox: {
    width: "300px",
    height: "300px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    position: "absolute",
    top: "20%",
    left: "30%",
    borderRadius: "20px",
    filter: "blur(80px)",
  },

  circle1: {
    width: "80px",
    height: "80px",
    background: "#facc15",
    borderRadius: "50%",
    position: "absolute",
    top: "30%",
    right: "20%",
  },

  circle2: {
    width: "60px",
    height: "60px",
    background: "#22c55e",
    borderRadius: "50%",
    position: "absolute",
    bottom: "20%",
    left: "20%",
  },
}
