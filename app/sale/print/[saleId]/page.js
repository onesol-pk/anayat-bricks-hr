"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
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
  const saleId = Array.isArray(params.saleId) ? params.saleId[0] : params.saleId

  const [loading, setLoading] = useState(true)
  const [saleRows, setSaleRows] = useState([])

  useEffect(() => {
    if (saleId) {
      fetchSale()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleId])

  async function fetchSale() {
    setLoading(true)

    try {
      const { data: baseSale, error } = await supabase
        .from("sales")
        .select("*")
        .eq("id", saleId)
        .single()

      if (error) throw error

      let rows = [baseSale]

      if (baseSale?.sale_group_id) {
        const { data: groupedRows, error: groupError } = await supabase
          .from("sales")
          .select("*")
          .eq("sale_group_id", baseSale.sale_group_id)
          .order("created_at", { ascending: true })

        if (groupError) throw groupError

        if (groupedRows && groupedRows.length > 0) {
          rows = groupedRows
        }
      }

      setSaleRows(rows)
    } catch (error) {
      alert(error.message || "Failed to load sale slip")
    } finally {
      setLoading(false)
    }
  }

  const firstSale = saleRows[0] || null

  const totalQuantity = useMemo(() => {
    return saleRows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)
  }, [saleRows])

  const grandTotal = useMemo(() => {
    return saleRows.reduce(
      (sum, row) => sum + (Number(row.total_amount) || 0),
      0
    )
  }, [saleRows])

  const paidAmount = Number(firstSale?.paid_amount) || 0
  const balanceAfter = Number(firstSale?.balance_after) || 0

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

  if (!firstSale) {
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
        <h1 className="text-2xl font-bold text-center">Anayat Sons Bricks</h1>
        <h2 className="text-lg font-semibold text-center mt-1">Sale Slip</h2>

        <div className="border-2 border-black text-center font-bold py-1 mt-3">OFFICE COPY</div>

        <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
          <div>
            <p className="text-gray-500">Date</p>
            <p className="font-semibold">{firstSale.sale_date}</p>
          </div>

          <div>
            <p className="text-gray-500">Customer</p>
            <p className="font-semibold">{firstSale.customer_name}</p>
          </div>

          <div>
            <p className="text-gray-500">Type</p>
            <p className="font-semibold">
              {titleCase(firstSale.customer_type)}
            </p>
          </div>

          <div>
            <p className="text-gray-500">Sale Mode</p>
            <p className="font-semibold">{titleCase(firstSale.sale_type)}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-gray-500 text-sm mb-2">Line Items</p>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 px-3 py-2 text-left">
                  Brick Type
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left">
                  Quantity
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left">
                  Rate
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {saleRows.map((row) => (
                <tr key={row.id}>
                  <td className="border border-gray-300 px-3 py-2">
                    {titleCase(row.brick_type)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    {formatMoney(row.quantity)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    Rs {formatMoney(row.rate)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    Rs {formatMoney(row.total_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
          <div>
            <p className="text-gray-500">Total Quantity</p>
            <p className="font-semibold">{formatMoney(totalQuantity)}</p>
          </div>

          <div>
            <p className="text-gray-500">Grand Total</p>
            <p className="font-semibold">Rs {formatMoney(grandTotal)}</p>
          </div>

          <div>
            <p className="text-gray-500">Paid Amount</p>
            <p className="font-semibold">Rs {formatMoney(paidAmount)}</p>
          </div>

          <div>
            <p className="text-gray-500">Balance After</p>
            <p className="font-semibold">Rs {formatMoney(balanceAfter)}</p>
          </div>

          <div>
            <p className="text-gray-500">Driver</p>
            <p className="font-semibold">{firstSale.driver_name || "-"}</p>
          </div>

          <div>
            <p className="text-gray-500">Tractor</p>
            <p className="font-semibold">
              {titleCase(firstSale.tractor_type) || "-"}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-gray-500 text-sm">Notes</p>
          <p className="font-semibold">{firstSale.notes || "-"}</p>
        </div>
      </div>

      <div style={{height:"32px"}} />

<div className="sale-print-card max-w-3xl mx-auto border border-gray-300 p-6 rounded bg-white">
        <h1 className="text-2xl font-bold text-center">Anayat Sons Bricks</h1>
        <h2 className="text-lg font-semibold text-center mt-1">Sale Slip</h2>

        <div className="border-2 border-black text-center font-bold py-1 mt-3">CUSTOMER COPY</div>

        <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
          <div>
            <p className="text-gray-500">Date</p>
            <p className="font-semibold">{firstSale.sale_date}</p>
          </div>

          <div>
            <p className="text-gray-500">Customer</p>
            <p className="font-semibold">{firstSale.customer_name}</p>
          </div>

          <div>
            <p className="text-gray-500">Type</p>
            <p className="font-semibold">
              {titleCase(firstSale.customer_type)}
            </p>
          </div>

          <div>
            <p className="text-gray-500">Sale Mode</p>
            <p className="font-semibold">{titleCase(firstSale.sale_type)}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-gray-500 text-sm mb-2">Line Items</p>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 px-3 py-2 text-left">
                  Brick Type
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left">
                  Quantity
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left">
                  Rate
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {saleRows.map((row) => (
                <tr key={row.id}>
                  <td className="border border-gray-300 px-3 py-2">
                    {titleCase(row.brick_type)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    {formatMoney(row.quantity)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    Rs {formatMoney(row.rate)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    Rs {formatMoney(row.total_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
          <div>
            <p className="text-gray-500">Total Quantity</p>
            <p className="font-semibold">{formatMoney(totalQuantity)}</p>
          </div>

          <div>
            <p className="text-gray-500">Grand Total</p>
            <p className="font-semibold">Rs {formatMoney(grandTotal)}</p>
          </div>

          <div>
            <p className="text-gray-500">Paid Amount</p>
            <p className="font-semibold">Rs {formatMoney(paidAmount)}</p>
          </div>

          <div>
            <p className="text-gray-500">Balance After</p>
            <p className="font-semibold">Rs {formatMoney(balanceAfter)}</p>
          </div>

          <div>
            <p className="text-gray-500">Driver</p>
            <p className="font-semibold">{firstSale.driver_name || "-"}</p>
          </div>

          <div>
            <p className="text-gray-500">Tractor</p>
            <p className="font-semibold">
              {titleCase(firstSale.tractor_type) || "-"}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-gray-500 text-sm">Notes</p>
          <p className="font-semibold">{firstSale.notes || "-"}</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: #fff !important;
          }

          .no-print {
            display: none !important;
          }

          .sale-print-card {
            margin: 0 auto 24px auto !important;
            page-break-inside: avoid;
            break-inside: avoid;
            border: 1px solid #ccc !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  )
}
