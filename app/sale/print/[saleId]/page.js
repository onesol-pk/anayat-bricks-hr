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



  function Slip({ copyTitle }) {
    return (
<div className="max-w-3xl mx-auto">
        <Slip copyTitle="OFFICE COPY" />
        <div style={{height:"40px"}} />
        <Slip copyTitle="CUSTOMER COPY" />
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
            margin: 0 auto 30px auto !important;
            border: 1px solid #ccc !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
