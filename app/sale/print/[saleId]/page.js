"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function formatMoney(value) {
  const number = Number(value) || 0
  return new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(Math.round(number))
}

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function SalePrintPage() {
  const params = useParams()
  const saleId = params.saleId

  const [sale, setSale] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSale()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchSale() {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("id", saleId)
        .single()

      if (error) throw error

      setSale(data)
    } catch (error) {
      alert(error.message || "Failed to load sale slip")
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        Loading...
      </div>
    )
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        Sale not found
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black p-4">
      <div className="no-print flex justify-between items-center mb-4 max-w-3xl mx-auto">
        <Link href="/sale" className="text-blue-600 underline">
          Back to Sale
        </Link>

        <button
          onClick={handlePrint}
          className="bg-black text-white px-5 py-2 rounded"
        >
          Print
        </button>
      </div>

      <div className="sale-print-card max-w-3xl mx-auto border border-gray-300 p-6 rounded bg-white">
        <h1 className="text-2xl font-bold text-center">
          Anayat Sons Bricks
        </h1>
        <h2 className="text-lg font-semibold text-center mt-1">
          Sale Slip
        </h2>

        <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
          <div>
            <p className="text-gray-500">Date</p>
            <p className="font-semibold">{sale.sale_date}</p>
          </div>
          <div>
            <p className="text-gray-500">Customer</p>
            <p className="font-semibold">{sale.customer_name}</p>
          </div>
          <div>
            <p className="text-gray-500">Type</p>
            <p className="font-semibold">{titleCase(sale.customer_type)}</p>
          </div>
          <div>
            <p className="text-gray-500">Sale Mode</p>
            <p className="font-semibold">{titleCase(sale.sale_type)}</p>
          </div>
          <div>
            <p className="text-gray-500">Brick Type</p>
            <p className="font-semibold">{titleCase(sale.brick_type)}</p>
          </div>
          <div>
            <p className="text-gray-500">Quantity</p>
            <p className="font-semibold">{formatMoney(sale.quantity)}</p>
          </div>
          <div>
            <p className="text-gray-500">Rate</p>
            <p className="font-semibold">Rs {formatMoney(sale.rate)}</p>
          </div>
          <div>
            <p className="text-gray-500">Total Amount</p>
            <p className="font-semibold">Rs {formatMoney(sale.total_amount)}</p>
          </div>
          <div>
            <p className="text-gray-500">Paid Amount</p>
            <p className="font-semibold">Rs {formatMoney(sale.paid_amount)}</p>
          </div>
          <div>
            <p className="text-gray-500">Balance After</p>
            <p className="font-semibold">Rs {formatMoney(sale.balance_after)}</p>
          </div>
          <div>
            <p className="text-gray-500">Driver</p>
            <p className="font-semibold">{sale.driver_name || "-"}</p>
          </div>
          <div>
            <p className="text-gray-500">Tractor</p>
            <p className="font-semibold">{titleCase(sale.tractor_type) || "-"}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-gray-500 text-sm">Notes</p>
          <p className="font-semibold">{sale.notes || "-"}</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          .sale-print-card {
            width: 33.33vw !important;
            max-width: 33.33vw !important;
            margin: 0 auto !important;
            border: 1px solid #ccc !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  )
}
