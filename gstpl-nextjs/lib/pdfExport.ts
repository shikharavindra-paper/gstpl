import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { ProcessedRow } from './types'
import { METRICS } from './constants'

interface GroupedData {
  quality: string
  gsmLabel: string
  gsmNorm: string
  byRew: {
    [rewinder: string]: ProcessedRow
  }
}

export function groupCoaByQG(rows: ProcessedRow[], dateYMD: string): GroupedData[] {
  const filtered = rows.filter(r => r.Date === dateYMD)
  const map = new Map<string, GroupedData>()
  
  filtered.forEach(r => {
    const q = r.Quality || 'NA'
    const qNorm = q.trim().toLowerCase()
    const gsmLabel = r["GSM/Ply Label"] || r["GSM/Ply"] || ''
    const gsmNorm = gsmLabel.trim().toLowerCase()
    const key = `${qNorm}||${gsmNorm}`
    
    if (!map.has(key)) {
      map.set(key, { quality: q, gsmLabel, gsmNorm, byRew: {} })
    }
    map.get(key)!.byRew[r.Rewinder] = r
  })
  
  return [...map.values()].sort((a, b) => {
    if (a.quality !== b.quality) return String(a.quality).localeCompare(String(b.quality))
    return String(a.gsmLabel).localeCompare(String(b.gsmLabel), undefined, { numeric: true })
  })
}

export async function exportCoaPdfForDate(rows: ProcessedRow[], dateYMD: string): Promise<void> {
  if (!window.jspdf || !window.html2canvas) {
    alert('PDF libraries not loaded.')
    return
  }
  
  const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' })
  
  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '-99999px'
  host.style.top = '0'
  document.body.appendChild(host)
  
  const groups = groupCoaByQG(rows, dateYMD)
  
  if (!groups.length) {
    alert('No data found for that date.')
    host.remove()
    return
  }
  
  const PAGE_W = 595
  const PAGE_H = 842
  const MARGIN = 14
  
  let first = true
  
  for (const g of groups) {
    const r1 = g.byRew['Rewinder-1'] || null
    const r2 = g.byRew['Rewinder-2'] || null
    const pageDom = buildCoaPage(g.quality, g.gsmLabel, dateYMD, r1, r2)
    host.appendChild(pageDom)
    
    // Handle autoscale
    const reset = { 
      transform: pageDom.style.transform, 
      transformOrigin: pageDom.style.transformOrigin 
    }
    const clientW = pageDom.clientWidth || 794
    const scrollW = pageDom.scrollWidth || clientW
    if (scrollW > clientW) {
      const s = Math.min(1, (clientW - 2) / scrollW)
      pageDom.style.transformOrigin = 'left top'
      pageDom.style.transform = `scale(${s})`
    }
    
    const canvas = await html2canvas(pageDom, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true
    })
    
    pageDom.style.transform = reset.transform || ''
    pageDom.style.transformOrigin = reset.transformOrigin || ''
    
    const imgData = canvas.toDataURL('image/jpeg', 1.0)
    
    // Fit into PDF
    const innerW = PAGE_W - MARGIN * 2
    const innerH = PAGE_H - MARGIN * 2
    const ratio = Math.min(innerW / canvas.width, innerH / canvas.height)
    const drawW = canvas.width * ratio
    const drawH = canvas.height * ratio
    const x = (PAGE_W - drawW) / 2
    const y = (PAGE_H - drawH) / 2
    
    if (!first) pdf.addPage()
    first = false
    pdf.addImage(imgData, 'JPEG', x, y, drawW, drawH)
    
    host.removeChild(pageDom)
  }
  
  pdf.save(`COA_${dateYMD}.pdf`)
  document.body.removeChild(host)
}

function buildCoaPage(
  quality: string, 
  gsmLabel: string, 
  dateYMD: string, 
  r1: ProcessedRow | null, 
  r2: ProcessedRow | null
): HTMLDivElement {
  const page = document.createElement('div')
  page.className = 'coa-page'
  
  // Header
  const header = document.createElement('div')
  header.style.display = 'grid'
  header.style.gridTemplateColumns = '150px 1fr 170px'
  header.style.alignItems = 'center'
  header.style.columnGap = '20px'
  header.style.borderBottom = '3px solid #111'
  header.style.paddingBottom = '8px'
  
  const logoImg = document.getElementById('logoImg') as HTMLImageElement
  if (logoImg) {
    const logo = logoImg.cloneNode(true) as HTMLImageElement
    logo.style.width = '150px'
    logo.style.height = '150px'
    logo.style.objectFit = 'contain'
    header.appendChild(logo)
  }
  
  const mid = document.createElement('div')
  mid.style.textAlign = 'center'
  
  const title = document.createElement('div')
  title.textContent = 'GAYATRISHAKTI TISSUE'
  title.style.fontWeight = '900'
  title.style.fontSize = '25px'
  
  const addr = document.createElement('div')
  addr.textContent = 'Plot no.808/D, 3rd Phase,GIDC\\n Vapi-396195, Gujarat INDIA'
  addr.style.fontSize = '14px'
  addr.style.fontWeight = '600'
  addr.style.marginTop = '2px'
  addr.style.whiteSpace = 'pre-line'
  
  const sub = document.createElement('div')
  sub.textContent = 'TISSUE QUALITY CONTROL'
  sub.style.fontWeight = '750'
  sub.style.marginTop = '8px'
  
  const line = document.createElement('div')
  line.innerHTML = `
    <div><strong>Quality:</strong> ${quality}</div>
    <div><strong>GSM/Ply:</strong> ${gsmLabel}</div>
  `
  line.style.marginTop = '50px'
  line.style.fontWeight = '600'
  line.style.fontSize = '14px'
  line.style.lineHeight = '1.4'
  
  mid.appendChild(title)
  mid.appendChild(addr)
  mid.appendChild(sub)
  mid.appendChild(line)
  header.appendChild(mid)
  
  const right = document.createElement('div')
  right.style.textAlign = 'right'
  right.innerHTML = `Date: <b>${dateYMD}</b><br/>Rewinders: 1 & 2`
  header.appendChild(right)
  
  page.appendChild(header)
  
  // Table
  const table = document.createElement('table')
  table.style.borderCollapse = 'collapse'
  table.style.width = '100%'
  table.style.fontSize = '16px'
  table.style.marginTop = '130px'
  table.style.border = '3px solid #111'
  
  const thead = document.createElement('thead')
  const htr = document.createElement('tr')
  
  const headers = ['Metric', 'Spec', 'RW-1 Min', 'RW-1 Max', 'RW-1 Avg', 
                   'RW-2 Min', 'RW-2 Max', 'RW-2 Avg', 'Overall Avg']
  
  headers.forEach((h, idx) => {
    const th = document.createElement('th')
    th.textContent = h
    th.style.border = '1px solid #222'
    th.style.padding = '6px 8px'
    th.style.background = '#f3f3f3'
    th.style.fontWeight = '700'
    th.style.borderBottom = '2px solid #111'
    th.style.textAlign = idx >= 2 ? 'right' : 'left'
    htr.appendChild(th)
  })
  
  thead.appendChild(htr)
  table.appendChild(thead)
  
  const tbody = document.createElement('tbody')
  
  const toNum = (v: any) => {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : null
  }
  
  const fmt1 = (x: number | null) => 
    Number.isFinite(x) ? (Math.round(x! * 10) / 10).toFixed(1) : ''
  
  METRICS.forEach(m => {
    const tr = document.createElement('tr')
    
    const spec = (r1?.[`${m.label} (Spec)`] ?? r2?.[`${m.label} (Spec)`] ?? '')
    const r1min = r1?.[`${m.label} (Min)`] ?? ''
    const r1max = r1?.[`${m.label} (Max)`] ?? ''
    const r1avg = r1?.[`${m.label} (Avg)`] ?? ''
    const r2min = r2?.[`${m.label} (Min)`] ?? ''
    const r2max = r2?.[`${m.label} (Max)`] ?? ''
    const r2avg = r2?.[`${m.label} (Avg)`] ?? ''
    
    const a1 = toNum(r1avg)
    const a2 = toNum(r2avg)
    let overall = ''
    if (a1 != null || a2 != null) {
      const vals = [a1, a2].filter(v => v != null)
      overall = fmt1(vals.reduce((s, v) => s + v!, 0) / vals.length)
    }
    
    const cells = [m.label, spec, r1min, r1max, r1avg, r2min, r2max, r2avg, overall]
    cells.forEach((text, idx) => {
      const td = document.createElement('td')
      td.textContent = text
      td.style.border = '1px solid #222'
      td.style.padding = '6px 8px'
      td.style.textAlign = idx >= 2 ? 'right' : 'left'
      tr.appendChild(td)
    })
    
    tbody.appendChild(tr)
  })
  
  table.appendChild(tbody)
  page.appendChild(table)
  
  return page
}