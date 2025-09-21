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

// Helper to parse numeric values
const parseNum = (val: any): number | null => {
  const num = parseFloat(val)
  return isNaN(num) ? null : num
}

// Helper to format date
const formatDate = (dateStr: string): string => {
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

// Get unique qualities for M/C Jumbo section
function getUniqueQualities(groups: GroupedByQuality[]): Set<string> {
  const qualities = new Set<string>()
  groups.forEach(g => {
    const baseQuality = g.quality.split(/\s+/)[0] // Get first part (e.g., "Napkin" from "Napkin 15/1")
    qualities.add(baseQuality)
  })
  return qualities
}

// Calculate M/C Jumbo Roll data (mock implementation - replace with actual logic)
function calculateJumboData(rows: ProcessedRow[], quality: string) {
  // This is a simplified calculation - adjust based on your actual requirements
  const qualityRows = rows.filter(r => r.Quality?.includes(quality))
  
  if (qualityRows.length === 0) return null
  
  // Mock data - replace with actual calculations
  return {
    totalJumboProduced: 22, // This should come from your data source
    substance: '15.6',
    thickness: '110',
    bulk: '7.1',
    dryTensileMD: '389',
    dryTensileCD: '314',
    mdtCdtRatio: '1.2',
    stretchMD: '18.62',
    wetTensileMD: '67',
    wetDryRatio: '16.4',
    brightness: '87.15'
  }
}

export async function exportDailyQualityReport(rows: ProcessedRow[], selectedDate: string) {
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

  // Create a new workbook
  const wb = XLSX.utils.book_new()
  const ws_data: any[][] = []

  // Add company header
  ws_data.push(['GAYATRI SHAKTI PAPERS & BOARDS LIMITED'])
  ws_data.push(['Plot No.: 808/D, 3rd Phase GIDC, Vapi-396195, Gujarat (INDIA)'])
  ws_data.push(['Phone: +91-260-2400598/2431725  Email: gstploffice@gmail.com'])
  ws_data.push([])
  ws_data.push(['Daily Quality Performance Report', '', '', '', '', '', 'Dated:', formatDate(selectedDate)])
  ws_data.push([]) // Empty row

  // Group data by rewinder
  const rewinders = [...new Set(dateRows.map(r => r.Rewinder))].sort()
  
  rewinders.forEach((rewinder, rwIdx) => {
    const rewRows = dateRows.filter(r => r.Rewinder === rewinder)
    const groups = groupDataByQuality(rewRows)
    
    // Rewinder header (e.g., "RW No.1" or "RW No.2")
    const rwNumber = rewinder.includes('1') ? '1' : '2'
    ws_data.push([`RW No.${rwNumber}`])
    
    // For single quality/GSM per rewinder
    if (groups.length === 1) {
      const g = groups[0]
      ws_data.push(['Quality GSM/ Ply', '', `${g.quality}    ${g.gsmPly}`])
      ws_data.push(['', 'UOM', 'Specs', 'Min', 'Max', 'Avg.'])
    } else {
      // For multiple qualities in same rewinder
      const headerRow = ['Quality GSM/ Ply', 'UOM']
      const specRow = ['', '']
      
      groups.forEach(g => {
        headerRow.push(`${g.quality}    ${g.gsmPly}`, '', '', '')
        specRow.push('Specs', 'Min', 'Max', 'Avg.')
      })
      
      ws_data.push(headerRow)
      ws_data.push(specRow)
    }
    
    // Add metric rows
    METRICS.forEach(metric => {
      const row: any[] = [metric.label, metric.unit || '']
      
      if (rewinder === 'Rewinder-2' && groups.length > 1) {
        groups.forEach(g => {
          const data = g.data[rewinder]
          if (data) {
            row.push(
              data[`${metric.label} (Spec)`] || '',
              data[`${metric.label} (Min)`] || '',
              data[`${metric.label} (Max)`] || '',
              data[`${metric.label} (Avg)`] || ''
            )
          } else {
            row.push('', '', '', '')
          }
        })
      } else {
        const data = groups[0]?.data[rewinder]
        if (data) {
          row.push(
            data[`${metric.label} (Spec)`] || '',
            data[`${metric.label} (Min)`] || '',
            data[`${metric.label} (Max)`] || '',
            data[`${metric.label} (Avg)`] || ''
          )
        }
      }
      
      ws_data.push(row)
    })
    
    // Add Reel Length if available
    const reelLengthRow = ['Reel Length Meter', '']
    if (rewinder === 'Rewinder-2' && groups.length > 1) {
      groups.forEach(() => {
        // Mock data - replace with actual reel length data
        reelLengthRow.push('', '12453', '15392', '13684')
      })
    } else {
      reelLengthRow.push('', '12453', '15392', '13684')
    }
    ws_data.push(reelLengthRow)
    
    ws_data.push([]) // Empty row between rewinders
  })
  
  // Add M/C Jumbo Roll section
  ws_data.push(['M/C Jumbo Roll'])
  ws_data.push(['Particulars', 'UOM', 'Napkin'])
  ws_data.push(['', '', '15'])
  
  const qualities = getUniqueQualities(groupDataByQuality(dateRows))
  qualities.forEach(quality => {
    const jumboData = calculateJumboData(dateRows, quality)
    if (jumboData) {
      ws_data.push(['Total Jumbo Produced', 'Nos', jumboData.totalJumboProduced])
      ws_data.push(['Substance (1 Ply)', 'g/m2', jumboData.substance])
      ws_data.push(['Thickness (1 PLY)', 'Micron', jumboData.thickness])
      ws_data.push(['*Bulk', 'CC/gm', jumboData.bulk])
      ws_data.push(['*Dry Tensile Strength', 'MD', 'gf/25mm', jumboData.dryTensileMD])
      ws_data.push(['', 'CD', 'gf/25mm', jumboData.dryTensileCD])
      ws_data.push(['MDT/CDT RATIO', '', jumboData.mdtCdtRatio])
      ws_data.push(['Stretch', 'MD', '%', jumboData.stretchMD])
      ws_data.push(['*Wet Tensile Strength', 'MD', 'gf/50mm', jumboData.wetTensileMD])
      ws_data.push(['Wet / Dry Tensile', '%', jumboData.wetDryRatio])
      ws_data.push(['*ISO Brightness(Frank, PTI )', '% ISO', jumboData.brightness])
    }
  })
  
  ws_data.push([])
  ws_data.push(['', 'Napkin'])
  ws_data.push(['', '15'])
  ws_data.push(['Bulk at M/C', '7.1'])
  ws_data.push(['Bulk at Rewinders', '6.4'])
  ws_data.push(['Bulk Loss %', '10.22'])
  ws_data.push([])
  ws_data.push(['Remarks:'])
  ws_data.push(['Moisture content %', '4.69'])

  // Create worksheet from array
  const ws = XLSX.utils.aoa_to_sheet(ws_data)

  // Set column widths
  ws['!cols'] = [
    { wch: 30 }, // Metric names
    { wch: 15 }, // UOM
    { wch: 15 }, // Specs
    { wch: 10 }, // Min
    { wch: 10 }, // Max
    { wch: 10 }, // Avg
    { wch: 15 }, // Additional columns for multiple qualities
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
  ]

  // Merge cells for headers
  if (!ws['!merges']) ws['!merges'] = []
  ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }) // Company name
  ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }) // Address
  ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 9 } }) // Contact
  ws['!merges'].push({ s: { r: 4, c: 0 }, e: { r: 4, c: 5 } }) // Report title

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Daily Quality Report')

  // Generate filename with date
  const filename = `Daily_Quality_Report_${formatDate(selectedDate)}.xlsx`

  // Write the file
  XLSX.writeFile(wb, filename)
}