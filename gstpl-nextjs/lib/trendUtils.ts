import { TrendRow } from './types'
import { METRICS } from './constants'
import { 
  normalizeHeader, 
  bindHeaders, 
  parseDate, 
  ymdUTC, 
  firstNumber,
  normGsmPlyLabel,
  num
} from './utils'

let headerBinding: { [key: string]: string } = {}

function val(row: any, logicalKey: string): any {
  const actual = headerBinding[logicalKey]
  return actual ? row[actual] : null
}

export function prepareTrendRows(
  rows: any[], 
  dateFmt: string, 
  rewLabel: string
): TrendRow[] {
  if (!rows || !rows.length) return []
  
  const headers = Object.keys(rows[0]).map(normalizeHeader)
  headerBinding = bindHeaders(headers)
  
  const out: TrendRow[] = []
  
  for (const r0 of rows) {
    const r: any = {}
    for (const [k, v] of Object.entries(r0)) {
      r[normalizeHeader(k)] = v
    }
    
    const d = parseDate(val(r, "date"), dateFmt)
    if (!d) continue
    const dateKey = ymdUTC(d)
    
    const q = val(r, "quality")
    const quality = (q == null || q === "") ? "NA" : String(q).trim()
    
    let gpCell = val(r, "gsm_ply")
    if (gpCell == null || gpCell === "") gpCell = val(r, "gsm")
    const gsmLabel = gpCell != null ? String(gpCell).trim() : ""
    const gsmNorm = normGsmPlyLabel(gsmLabel)
    const gsmNum = firstNumber(gpCell)
    if (gsmNum == null) continue
    
    const rec: TrendRow = {
      Date: dateKey,
      Rewinder: rewLabel,
      Quality: quality,
      GSMLabel: gsmLabel,
      GSMNorm: gsmNorm,
      GSMNum: gsmNum
    }
    
    METRICS.forEach(m => {
      const src = headerBinding[m.key] || m.key
      let v = firstNumber(r[src])
      
      if (v == null && m.compute) {
        const wrap = (k: string) => {
          const kk = headerBinding[k] || k
          return firstNumber(r[kk])
        }
        v = m.compute({
          [headerBinding['dry_md'] || 'dry_md']: wrap('dry_md'),
          [headerBinding['dry_cd'] || 'dry_cd']: wrap('dry_cd'),
          [headerBinding['wet_strength'] || 'wet_strength']: wrap('wet_strength')
        })
      }
      
      rec[m.label] = num(v)
    })
    
    out.push(rec)
  }
  
  return out
}

export function parseDMY(s: string): Date | null {
  if (!s) return null
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const d = parseInt(m[1], 10)
  const mo = parseInt(m[2], 10) - 1
  const y = parseInt(m[3], 10)
  const dt = new Date(Date.UTC(y, mo, d))
  return isNaN(dt.getTime()) ? null : dt
}

export function fmtDMY(dt: Date): string {
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${dt.getUTCFullYear()}`
}

export function ymdToDate(s: string): Date {
  const [y, m, d] = s.split("-").map(n => parseInt(n, 10))
  return new Date(Date.UTC(y, m - 1, d))
}

export function startOfWeekISO(d: Date): Date {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dow = (day.getUTCDay() || 7)
  day.setUTCDate(day.getUTCDate() - (dow - 1))
  return day
}

export function weekKey(d: Date): string {
  const start = startOfWeekISO(d)
  const y = start.getUTCFullYear()
  const m = String(start.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(start.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
}

export function weekOfMonthLabelFromYMD(ymd: string): string {
  const d = ymdToDate(ymd)
  const monthName = d.toLocaleString('en-US', { month: 'long' })
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
  const firstWeekStart = startOfWeekISO(first)
  const currWeekStart = startOfWeekISO(d)
  const diffDays = Math.round((currWeekStart.getTime() - firstWeekStart.getTime()) / 86400000)
  const weekIdx = Math.floor(diffDays / 7) + 1
  return `${monthName}-W${weekIdx}`
}

export function friendlyLabel(ymd: string, period: string): string {
  if (period === 'weekly') return weekOfMonthLabelFromYMD(ymd)
  if (period === 'monthly') {
    const d = ymdToDate(ymd)
    return d.toLocaleString('en-US', { month: 'long' })
  }
  const d = ymdToDate(ymd)
  return d.toLocaleDateString('en-GB')
}

export function inRangeByDMYLabel(ymd: string, startDMY: string, endDMY: string): boolean {
  const d = ymdToDate(ymd)
  const s = parseDMY(startDMY)
  const e = parseDMY(endDMY)
  if (s && d < s) return false
  if (e && d > e) return false
  return true
}

export function periodKeyFor(dateYMD: string, period: string): string {
  const d = ymdToDate(dateYMD)
  if (period === 'weekly') return weekKey(d)
  if (period === 'monthly') return monthKey(d)
  return dateYMD
}