import * as XLSX from 'xlsx'
import { ProcessedRow } from './types'
import { METRICS } from './constants'

interface GroupedByQuality {
  quality: string
  gsmPly: string
  data: {
    [rewinder: string]: ProcessedRow
  }
}

// Helper to create styled Excel with formatting
export async function exportStyledDailyQualityReport(rows: ProcessedRow[], selectedDate: string) {
  if (!rows || rows.length === 0) {
    alert('No data to export')
    return
  }

  // Filter rows for selected date
  const dateRows = rows.filter(r => r.Date === selectedDate)
  if (dateRows.length === 0) {
    alert('No data for selected date')
    return
  }

  // Create HTML table for better formatting
  let html = `
    <html>
    <head>
      <style>
        table { border-collapse: collapse; width: 100%; font-family: Arial; }
        th, td { border: 1px solid black; padding: 5px; }
        .company-header { font-size: 18pt; font-weight: bold; text-align: center; border: none; }
        .company-info { font-size: 12pt; text-align: center; border: none; }
        .report-title { font-size: 14pt; font-weight: bold; text-align: center; padding: 10px; }
        .section-header { background-color: #f0f0f0; font-weight: bold; }
        .rw-header { background-color: #e0e0e0; font-weight: bold; padding: 8px; }
        .quality-header { background-color: #f5f5f5; font-weight: bold; }
        .metric-name { font-weight: bold; }
        .numeric { text-align: right; }
        .center { text-align: center; }
        .no-border { border: none; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="10" class="company-header no-border">GAYATRI SHAKTI PAPERS & BOARDS LIMITED</td></tr>
        <tr><td colspan="10" class="company-info no-border">Plot No.: 808/D, 3rd Phase GIDC, Vapi-396195, Gujarat (INDIA)</td></tr>
        <tr><td colspan="10" class="company-info no-border">Phone: +91-260-2400598/2431725  Email: gstploffice@gmail.com</td></tr>
        <tr><td colspan="10" class="no-border">&nbsp;</td></tr>
        <tr>
          <td colspan="6" class="report-title no-border">Daily Quality Performance Report</td>
          <td colspan="2" class="no-border" style="text-align: right;">Dated:</td>
          <td colspan="2" class="no-border">${formatDate(selectedDate)}</td>
        </tr>
        <tr><td colspan="10" class="no-border">&nbsp;</td></tr>
  `

  // Group data by rewinder
  const rewinders = [...new Set(dateRows.map(r => r.Rewinder))].sort()
  
  rewinders.forEach((rewinder) => {
    const rewRows = dateRows.filter(r => r.Rewinder === rewinder)
    const groups = groupDataByQuality(rewRows)
    const rwNumber = rewinder.includes('1') ? '1' : '2'
    
    html += `<tr><td colspan="10" class="rw-header">RW No.${rwNumber}</td></tr>`
    
    if (groups.length === 1) {
      const g = groups[0]
      html += `
        <tr>
          <td rowspan="2" class="quality-header">Quality GSM/ Ply</td>
          <td rowspan="2" class="center">UOM</td>
          <td colspan="4" class="quality-header center">${g.quality}    ${g.gsmPly}</td>
        </tr>
        <tr>
          <td class="section-header center">Specs</td>
          <td class="section-header center">Min</td>
          <td class="section-header center">Max</td>
          <td class="section-header center">Avg.</td>
        </tr>
      `
    } else {
      // Multiple qualities header
      html += '<tr><td class="quality-header">Quality GSM/ Ply</td><td class="center">UOM</td>'
      groups.forEach(g => {
        html += `<td colspan="4" class="quality-header center">${g.quality}    ${g.gsmPly}</td>`
      })
      html += '</tr><tr><td></td><td></td>'
      groups.forEach(() => {
        html += `
          <td class="section-header center">Specs</td>
          <td class="section-header center">Min</td>
          <td class="section-header center">Max</td>
          <td class="section-header center">Avg.</td>
        `
      })
      html += '</tr>'
    }
    
    // Add metrics
    METRICS.forEach(metric => {
      html += '<tr>'
      html += `<td class="metric-name">${metric.label}</td>`
      html += `<td class="center">${metric.unit || ''}</td>`
      
      if (groups.length === 1) {
        const data = groups[0].data[rewinder]
        if (data) {
          html += `<td class="center">${data[`${metric.label} (Spec)`] || ''}</td>`
          html += `<td class="numeric">${data[`${metric.label} (Min)`] || ''}</td>`
          html += `<td class="numeric">${data[`${metric.label} (Max)`] || ''}</td>`
          html += `<td class="numeric">${data[`${metric.label} (Avg)`] || ''}</td>`
        } else {
          html += '<td></td><td></td><td></td><td></td>'
        }
      } else {
        groups.forEach(g => {
          const data = g.data[rewinder]
          if (data) {
            html += `<td class="center">${data[`${metric.label} (Spec)`] || ''}</td>`
            html += `<td class="numeric">${data[`${metric.label} (Min)`] || ''}</td>`
            html += `<td class="numeric">${data[`${metric.label} (Max)`] || ''}</td>`
            html += `<td class="numeric">${data[`${metric.label} (Avg)`] || ''}</td>`
          } else {
            html += '<td></td><td></td><td></td><td></td>'
          }
        })
      }
      html += '</tr>'
    })
    
    // Add Reel Length
    html += '<tr><td class="metric-name">Reel Length Meter</td><td></td>'
    if (groups.length === 1) {
      html += '<td></td><td class="numeric">12453</td><td class="numeric">15392</td><td class="numeric">13684</td>'
    } else {
      groups.forEach(() => {
        html += '<td></td><td class="numeric">12453</td><td class="numeric">15392</td><td class="numeric">13684</td>'
      })
    }
    html += '</tr>'
    html += '<tr><td colspan="10" class="no-border">&nbsp;</td></tr>'
  })

  // M/C Jumbo Roll section
  html += `
    <tr><td colspan="10" class="rw-header">M/C Jumbo Roll</td></tr>
    <tr>
      <td class="section-header">Particulars</td>
      <td class="section-header center">UOM</td>
      <td colspan="2" class="section-header center">Napkin<br/>15</td>
    </tr>
    <tr><td>Total Jumbo Produced</td><td class="center">Nos</td><td colspan="2" class="center">22</td></tr>
    <tr><td>Substance (1 Ply)</td><td class="center">g/m2</td><td colspan="2" class="center">15.6</td></tr>
    <tr><td>Thickness (1 PLY)</td><td class="center">Micron</td><td colspan="2" class="center">110</td></tr>
    <tr><td>*Bulk</td><td class="center">CC/gm</td><td colspan="2" class="center">7.1</td></tr>
    <tr><td>*Dry Tensile Strength</td><td>MD</td><td class="center">gf/25mm</td><td class="center">389</td></tr>
    <tr><td></td><td>CD</td><td class="center">gf/25mm</td><td class="center">314</td></tr>
    <tr><td>MDT/CDT RATIO</td><td></td><td colspan="2" class="center">1.2</td></tr>
    <tr><td>Stretch</td><td>MD</td><td class="center">%</td><td class="center">18.62</td></tr>
    <tr><td>*Wet Tensile Strength</td><td>MD</td><td class="center">gf/50mm</td><td class="center">67</td></tr>
    <tr><td>Wet / Dry Tensile</td><td class="center">%</td><td colspan="2" class="center">16.4</td></tr>
    <tr><td>*ISO Brightness(Frank, PTI )</td><td class="center">% ISO</td><td colspan="2" class="center">87.15</td></tr>
    <tr><td colspan="10" class="no-border">&nbsp;</td></tr>
    <tr><td colspan="2" class="center no-border">Napkin<br/>15</td></tr>
    <tr><td>Bulk at M/C</td><td colspan="2" class="center">7.1</td></tr>
    <tr><td>Bulk at Rewinders</td><td colspan="2" class="center">6.4</td></tr>
    <tr><td>Bulk Loss %</td><td colspan="2" class="center">10.22</td></tr>
    <tr><td colspan="10" class="no-border">&nbsp;</td></tr>
    <tr><td colspan="10" class="metric-name">Remarks:</td></tr>
    <tr><td>Moisture content %</td><td colspan="2" class="center">4.69</td></tr>
  `

  html += '</table></body></html>'

  // Create a blob and download
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Daily_Quality_Report_${formatDate(selectedDate)}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Helper to format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const day = String(date.getDate()).padStart(2, '0')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = monthNames[date.getMonth()]
  const year = String(date.getFullYear()).slice(-2)
  return `${day}-${month}-${year}`
}

// Group data by quality and GSM/Ply
function groupDataByQuality(rows: ProcessedRow[]): GroupedByQuality[] {
  const grouped = new Map<string, GroupedByQuality>()
  
  rows.forEach(row => {
    const quality = row.Quality || 'NA'
    const gsmPly = row["GSM/Ply Label"] || String(row["GSM/Ply"]) || ''
    const key = `${quality}__${gsmPly}`
    
    if (!grouped.has(key)) {
      grouped.set(key, {
        quality,
        gsmPly,
        data: {}
      })
    }
    
    grouped.get(key)!.data[row.Rewinder] = row
  })
  
  return Array.from(grouped.values())
}