'use client'

import React from 'react'
import * as XLSX from 'xlsx'
import { ProcessedRow } from '@/lib/types'
import { METRICS } from '@/lib/constants'
import { exportCoaPdfForDate } from '@/lib/pdfExport'

interface ReportProps {
  rows: ProcessedRow[]
}

export default function Report({ rows }: ReportProps) {
  if (!rows || !rows.length) {
    return (
      <div className="card stack" id="results">
        No rows (check date filter or headers).
      </div>
    )
  }

  // Group by date
  const byDate = new Map<string, Map<string, ProcessedRow[]>>()
  rows.forEach(r => {
    if (!byDate.has(r.Date)) byDate.set(r.Date, new Map())
    const m = byDate.get(r.Date)!
    if (!m.has(r.Rewinder)) m.set(r.Rewinder, [])
    m.get(r.Rewinder)!.push(r)
  })

  // Export functions
  const getExportRows = () => {
    const exportRows: any[] = []
    for (const [date, rwMap] of byDate) {
      const rwKeys = [...rwMap.keys()].sort((a, b) => String(a).localeCompare(String(b)))
      for (const rw of rwKeys) {
        const items = rwMap.get(rw)!.slice().sort((a, b) => {
          if (a.Quality !== b.Quality) return String(a.Quality).localeCompare(String(b.Quality))
          return (a["GSM/Ply"] || 0) - (b["GSM/Ply"] || 0)
        })
        
        for (const g of items) {
          const label = g["GSM/Ply Label"] || g["GSM/Ply"]
          METRICS.forEach(m => {
            const spec = g[`${m.label} (Spec)`] ?? ""
            const min = g[`${m.label} (Min)`] ?? ""
            const max = g[`${m.label} (Max)`] ?? ""
            const avg = g[`${m.label} (Avg)`] ?? ""
            
            exportRows.push({
              Date: g.Date,
              Rewinder: g.Rewinder,
              Quality: g.Quality,
              "GSM/Ply Label": label,
              Metric: m.label,
              Spec: spec,
              Min: min,
              Max: max,
              Avg: avg
            })
          })
        }
      }
    }
    return exportRows
  }

  React.useEffect(() => {
    // Set up export handlers
    const csvBtn = document.getElementById('dlCsvBtn')
    const xlsBtn = document.getElementById('dlXlsxBtn')
    const coaBtn = document.getElementById('dlCoaPdfBtn')
    
    if (csvBtn) {
      csvBtn.onclick = () => {
        const exportRows = getExportRows()
        if (!exportRows.length) {
          alert("Nothing to export.")
          return
        }
        
        const headers = Object.keys(exportRows[0] || {})
        const esc = (s: any) => {
          const v = s == null ? "" : String(s)
          return /[,"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
        }
        
        const csv = [
          headers.join(","),
          ...exportRows.map(r => headers.map(h => esc(r[h])).join(","))
        ].join("\n")
        
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "Rewinder_Daily_Report_Specs_MinMaxAvg.csv"
        a.rel = "noopener"
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      }
    }
    
    if (xlsBtn) {
      xlsBtn.onclick = () => {
        const exportRows = getExportRows()
        if (!exportRows.length) {
          alert("Nothing to export.")
          return
        }
        
        const ws = XLSX.utils.json_to_sheet(exportRows)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Report")
        XLSX.writeFile(wb, "Rewinder_Daily_Report_Specs_MinMaxAvg.xlsx")
      }
    }
    
    if (coaBtn) {
      coaBtn.onclick = async () => {
        if (!rows.length) {
          alert('Please generate the report first.')
          return
        }
        
        const dates = [...new Set(rows.map(r => r.Date))].sort((a, b) => a < b ? 1 : -1)
        const latest = dates[0]
        const input = prompt('Enter COA date (YYYY-MM-DD):', latest || '')
        if (!input) return
        
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
          alert('Please enter date as YYYY-MM-DD')
          return
        }
        
        try {
          await exportCoaPdfForDate(rows, input)
        } catch (err) {
          console.error(err)
          alert('Failed to generate COA PDF.')
        }
      }
    }
  }, [rows])

  return (
    <div className="card stack" id="results">
      {[...byDate].map(([date, rwMap]) => (
        <React.Fragment key={date}>
          <div className="dateHead">{date}</div>
          {[...rwMap.keys()].sort((a, b) => String(a).localeCompare(String(b))).map(rw => (
            <React.Fragment key={`${date}-${rw}`}>
              <div className="rewHead">{rw}</div>
              {rwMap.get(rw)!
                .slice()
                .sort((a, b) => {
                  if (a.Quality !== b.Quality) return String(a.Quality).localeCompare(String(b.Quality))
                  return (a["GSM/Ply"] || 0) - (b["GSM/Ply"] || 0)
                })
                .map((g, idx) => (
                  <React.Fragment key={`${date}-${rw}-${idx}`}>
                    <div className="qgpHead">
                      {g.Quality} – {g["GSM/Ply Label"] || g["GSM/Ply"]}
                    </div>
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Metric</th>
                          <th>Spec</th>
                          <th>Min</th>
                          <th>Max</th>
                          <th>Avg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {METRICS.map(m => (
                          <tr key={m.key}>
                            <td>{m.label}</td>
                            <td>{g[`${m.label} (Spec)`] ?? ""}</td>
                            <td className="right">{g[`${m.label} (Min)`] ?? ""}</td>
                            <td className="right">{g[`${m.label} (Max)`] ?? ""}</td>
                            <td className="right">{g[`${m.label} (Avg)`] ?? ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </React.Fragment>
                ))}
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </div>
  )
}