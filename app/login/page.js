"use client"

export default function LoginPage() {
  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>

        {/* LEFT PANEL */}
        <div style={styles.left}>
          <div style={styles.inner}>

            {/* CENTERED BRAND */}
            <div style={styles.brandCenter}>
              <h1 style={styles.brand}>ANAYAT SONS BRICKS</h1>
              <p style={styles.brandSub}>HR & WAGE MANAGEMENT SYSTEM</p>
            </div>

            {/* LEFT CONTENT */}
            <div style={styles.formArea}>
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
        </div>

        {/* RIGHT PANEL */}
        <div style={styles.right}>
          <div style={styles.textRight}>
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
    height: "100vh",
    width: "100vw",
    background: "#0b1320",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  wrapper: {
    width: "92%",
    height: "90%",
    display: "flex",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 0 60px rgba(0,0,0,0.6)",
  },

  left: {
    width: "50%",
    background: "#0b1320",
    border: "1px solid rgba(255,122,0,0.4)",
    borderRight: "none",
    borderTopLeftRadius: "20px",
    borderBottomLeftRadius: "20px",
  },

  right: {
    width: "50%",
    backgroundImage: "url('/login-bg.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    border: "1px solid rgba(255,122,0,0.4)",
    borderTopRightRadius: "20px",
    borderBottomRightRadius: "20px",
    position: "relative",
  },

  inner: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "60px",
  },

  brandCenter: {
    textAlign: "center",
    marginBottom: "40px",
  },

  brand: {
    color: "#fff",
    fontSize: "20px",
    fontWeight: "600",
    letterSpacing: "1px",
  },

  brandSub: {
    color: "#ff7a00",
    fontSize: "13px",
  },

  formArea: {
    maxWidth: "420px",
  },

  welcome: {
    color: "#fff",
    fontSize: "32px",
    marginBottom: "10px",
    fontWeight: "600",
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
    fontSize: "14px",
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "25px",
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
    fontWeight: "600",
    cursor: "pointer",
  },

  textRight: {
    position: "absolute",
    right: "40px",
    top: "50%",
    transform: "translateY(-50%)",
    textAlign: "right",
    color: "#fff",
  },

  heading1: {
    fontSize: "28px",
    marginBottom: "10px",
  },

  heading2: {
    fontSize: "36px",
    color: "#ff7a00",
    fontWeight: "600",
  },
}
