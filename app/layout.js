import "./globals.css"
import { Inter, Poppins } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })
const poppins = Poppins({ weight: ["400", "600"], subsets: ["latin"] })

export const metadata = {
  title: "Anayat Sons Bricks",
  description: "HR & Wage System",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* ✅ ADD THIS LINE */}
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className={`${inter.className} ${poppins.className}`}>
        {children}
      </body>
    </html>
  )
}
