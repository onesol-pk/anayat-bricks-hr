"use client"

export default function LoginPage() {
  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>

        {/* LEFT PANEL */}
        <div style={styles.left}>
          <div style={styles.card}>
            <h1 style={styles.title}>ANAYAT SONS BRICKS</h1>
            <p style={styles.subtitle}>HR & WAGE MANAGEMENT SYSTEM</p>

            <h2 style={styles.welcome}>Welcome Back</h2>
            <p style={styles.desc}>Sign in to continue to your dashboard</p>

            <input placeholder="Enter your email" style={styles.input} />
            <input placeholder="Enter your password" type="password" style={styles.input} />

            <div style={styles.row}>
              <label style={{ color: "#ccc" }}>
                <input type="checkbox" /> Remember me
              </label>
              <span style={styles.link}>Forgot Password?</span>
            </div>

            <button style={styles.button}>Login →</button>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={styles.right}>
          <div style={styles.overlay}>
            <h2 style={styles.heading1}>Building Strength.</h2>
            <h2 style={styles.heading2}>Empowering People.</h2>
          </div>
        </div>

      </div>
    </div>
  )
}

const styles = {
  page: {
    height: "110vh",
    width: "110vw",
    backgroundColor: "#0b1320",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  wrapper: {
    width: "95%",
    height: "90%",
    display: "flex",
    borderRadius: "20px",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 0 40px rgba(0,0,0,0.6)",
  },

  left: {
    width: "50%",
    background: "#0b1320",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    width: "80%",
    maxWidth: "420px",
  },

  title: {
    color: "#fff",
    fontSize: "22px",
    fontWeight: "bold",
  },

  subtitle: {
    color: "#ff7a00",
    marginBottom: "30px",
  },

  welcome: {
    color: "#fff",
    fontSize: "32px",
    marginBottom: "10px",
  },

  desc: {
    color: "#aaa",
    marginBottom: "30px",
  },

  input: {
    width: "100%",
    padding: "14px",
    marginBottom: "15px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "#111827",
    color: "#fff",
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "20px",
    fontSize: "14px",
  },

  link: {
    color: "#ff7a00",
    cursor: "pointer",
  },

  button: {
    width: "100%",
    padding: "15px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(90deg, #ff7a00, #ff4500)",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer",
  },

  right: {
    width: "50%",
    backgroundImage: "url('/login-bg.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    position: "relative",
  },

  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "#fff",
    textAlign: "center",
  },

  heading1: {
    fontSize: "28px",
    marginBottom: "10px",
  },

  heading2: {
    fontSize: "36px",
    color: "#ff7a00",
  },
}
