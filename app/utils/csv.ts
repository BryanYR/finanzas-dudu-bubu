/** Descarga un CSV (con BOM para que Excel respete los acentos). */
export const downloadCsv = (
  filename: string,
  headers: string[],
  rows: (string | number | null)[][]
) => {
  const cell = (v: string | number | null) => {
    const s = v == null ? '' : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
