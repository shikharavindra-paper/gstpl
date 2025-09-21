import { ProcessedRow, SpecObject } from './types'
import { COLUMN_MAP, METRICS } from './constants'
import { 
  normKey, 
  normalizeHeader, 
  firstNumber, 
  parseDate, 
  inDateRange, 
  ymdUTC, 
  normGsmPlyLabel,
  bindHeaders,
  num,
  fmt1
} from './utils'

let headerBinding: { [key: string]: string } = {}

function val(row: any, logicalKey: string): any {
  const actual = headerBinding[logicalKey]
  return actual ? row[actual] : null
}

export function prepareRows(
  rows: any[], 
  dateFmt: string, 
  rewLabel: string, 
  fromStr: string, 
  toStr: string
): any[] {
  if (!rows || !rows.length) return []
  
  const headers = Object.keys(rows[0]).map(normalizeHeader)
  headerBinding = bindHeaders(headers)
  
  const out: any[] = []
  
  for (const r0 of rows) {
    const r: any = {}
    for (const [k, v] of Object.entries(r0)) {
      r[normalizeHeader(k)] = v
    }
    
    const d = parseDate(val(r, "date"), dateFmt)
    if (!d) continue
    if (!inDateRange(d, fromStr, toStr)) continue
    
    const dateKey = ymdUTC(d)
    
    const q = val(r, "quality")
    const quality = (q == null || q === "") ? "NA" : String(q).trim()
    
    let gpCell = val(r, "gsm_ply")
    if (gpCell == null || gpCell === "") gpCell = val(r, "gsm")
    const gsmPlyLabel = gpCell != null ? String(gpCell).trim() : ""
    const gsmPlyLabelNorm = normGsmPlyLabel(gsmPlyLabel)
    const gsmPlyNum = firstNumber(gpCell)
    if (gsmPlyNum == null) continue
    
    // Compute derived metrics
    METRICS.forEach(m => {
      if (!m.compute) return
      const actual = headerBinding[m.key] || m.key
      const curr = r[actual]
      if (curr == null || curr === "") {
        const c = m.compute(r)
        if (c != null) r[actual] = c
      }
    })
    
    const metrics: any = {}
    METRICS.forEach(m => {
      const src = headerBinding[m.key] || m.key
      metrics[m.key] = num(firstNumber(r[src]))
    })
    
    out.push({
      _date: dateKey,
      _quality: quality,
      _gsm_ply_num: gsmPlyNum,
      _gsm_ply_label: gsmPlyLabel,
      _gsm_ply_label_norm: gsmPlyLabelNorm,
      _rew: rewLabel,
      ...metrics
    })
  }
  
  return out
}

export function aggregate(rows: any[]): ProcessedRow[] {
  const groups = new Map()
  
  for (const r of rows) {
    const lab = (r._gsm_ply_label_norm || '').trim()
    const gsKey = lab || String(r._gsm_ply_num)
    const key = `${r._date}||${r._rew}||${r._quality}||${gsKey}`
    
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(r)
  }
  
  const out: ProcessedRow[] = []
  
  for (const [key, arr] of groups) {
    const [date, rew, quality, _gsKey] = key.split("||")
    
    const label = arr.map((a: any) => a._gsm_ply_label)
      .find((s: string) => s != null && String(s).trim() !== "") || ""
    const gsmNum = Number.isFinite(arr[0]._gsm_ply_num) ? arr[0]._gsm_ply_num : null
    
    const row: ProcessedRow = {
      Date: date,
      Rewinder: rew,
      Quality: quality,
      "GSM/Ply": gsmNum,
      "GSM/Ply Label": label || _gsKey
    }
    
    METRICS.forEach(m => {
      const vals = arr
        .map((a: any) => a[m.key])
        .map((v: any) => (v === "" || v == null ? null : Number(v)))
        .filter((v: any) => Number.isFinite(v) && v !== 0)
      
      if (!vals.length) {
        row[`${m.label} (Min)`] = ""
        row[`${m.label} (Max)`] = ""
        row[`${m.label} (Avg)`] = ""
      } else {
        const min = Math.min(...vals)
        const max = Math.max(...vals)
        const avg = vals.reduce((a: number, b: number) => a + b, 0) / vals.length
        row[`${m.label} (Min)`] = fmt1(min)
        row[`${m.label} (Max)`] = fmt1(max)
        row[`${m.label} (Avg)`] = fmt1(avg)
      }
    })
    
    out.push(row)
  }
  
  // Sort
  out.sort((a, b) => {
    if (a.Date !== b.Date) return a.Date < b.Date ? -1 : 1
    if (a.Rewinder !== b.Rewinder) return String(a.Rewinder).localeCompare(String(b.Rewinder))
    if (a.Quality !== b.Quality) return String(a.Quality).localeCompare(String(b.Quality))
    const numCmp = (a["GSM/Ply"] ?? Infinity) - (b["GSM/Ply"] ?? Infinity)
    if (numCmp !== 0) return numCmp
    return String(a["GSM/Ply Label"] || "").localeCompare(String(b["GSM/Ply Label"] || ""), undefined, { numeric: true })
  })
  
  return out
}

export function buildSpecsMap(specRows: any[]): SpecObject {
  const empty = () => new Map()
  
  if (!specRows || !specRows.length) {
    return {
      maps: {
        qual_label: empty(),
        qual_num: empty(),
        label_only: empty(),
        num_only: empty()
      },
      list: []
    }
  }
  
  const headers = Object.keys(specRows[0] || {}).map(h => String(h ?? "").trim())
  const bind = bindHeaders(headers)
  const qCol = bind.quality
  const gpCol = bind.gsm_ply || bind.gsm
  
  if (!gpCol) {
    return {
      maps: {
        qual_label: empty(),
        qual_num: empty(),
        label_only: empty(),
        num_only: empty()
      },
      list: []
    }
  }
  
  const findHeaderForMetric = (metricKey: string) => {
    const aliases = COLUMN_MAP[metricKey as keyof typeof COLUMN_MAP] || []
    for (const a of aliases) {
      const ak = normKey(a)
      for (const h of headers) {
        if (normKey(h) === ak) return String(h).trim()
      }
    }
    if (metricKey === "brightness") {
      const cand = headers.find(h => /bright/i.test(String(h)))
      if (cand) return String(cand).trim()
    }
    return null
  }
  
  const findTolHeader = (metricKey: string) => {
    const aliases = COLUMN_MAP[metricKey as keyof typeof COLUMN_MAP] || []
    const candNames: string[] = []
    aliases.forEach(a => {
      candNames.push(`${a} Tolerance`, `${a} Tol`)
    })
    const metric = METRICS.find(m => m.key === metricKey)
    if (metric) {
      candNames.push(`${metric.label} Tolerance`, `${metric.label} Tol`)
    }
    for (const tryName of candNames) {
      const ak = normKey(tryName)
      for (const h of headers) {
        if (normKey(h) === ak) return String(h).trim()
      }
    }
    return null
  }
  
  const metricKeys = ["gsm", "thickness", "bulk", "dry_md", "dry_cd", "dry_md_cd_ratio", "stretch", "wet_strength", "wet_dry_ratio", "brightness", "length"]
  const colByMetric: any = {}
  const tolByMetric: any = {}
  
  metricKeys.forEach(k => {
    colByMetric[k] = findHeaderForMetric(k)
    tolByMetric[k] = findTolHeader(k)
  })
  
  const maps = {
    qual_label: new Map(),
    qual_num: new Map(),
    label_only: new Map(),
    num_only: new Map()
  }
  const list: any[] = []
  const round2 = (x: number) => Math.round(Number(x) * 100) / 100
  
  for (const r of specRows) {
    const qRaw = qCol ? String(r[qCol] ?? "").trim() : "NA"
    const qNorm = normKey(qRaw)
    const labelRaw = r[gpCol]
    const labelNorm = normGsmPlyLabel(labelRaw)
    const m = String(labelRaw ?? "").replace(",", ".").match(/[-+]?\d*\.?\d+/)
    const gsmNum = m ? round2(parseFloat(m[0])) : null
    
    const obj: any = {
      __q: qRaw,
      __qNorm: qNorm,
      __label: String(labelRaw ?? "").trim(),
      __labelNorm: labelNorm,
      __gsmNum: gsmNum
    }
    
    for (const [k, col] of Object.entries(colByMetric)) {
      if (!col) continue
      const v = r[col]
      if (v == null || String(v).trim() === "") continue
      obj[k] = String(v).trim()
    }
    
    for (const [k, colTol] of Object.entries(tolByMetric)) {
      if (!colTol) continue
      const v = r[colTol]
      if (v == null || String(v).trim() === "") continue
      obj[k + "_tol"] = String(v).trim()
    }
    
    list.push(obj)
    
    if (labelNorm) maps.qual_label.set(`${qNorm}||${labelNorm}`, obj)
    if (gsmNum != null) maps.qual_num.set(`${qNorm}||${gsmNum}`, obj)
    if (labelNorm && !maps.label_only.has(labelNorm)) maps.label_only.set(labelNorm, obj)
    if (gsmNum != null && !maps.num_only.has(gsmNum)) maps.num_only.set(gsmNum, obj)
  }
  
  return { maps, list }
}

export function attachSpecs(rows: ProcessedRow[], specObj: SpecObject): ProcessedRow[] {
  const { maps } = specObj
  const round2 = (x: number) => Math.round(Number(x) * 100) / 100
  
  return rows.map(r => {
    const qNorm = normKey(r.Quality)
    const labelStr = r["GSM/Ply Label"] || r["GSM/Ply"]
    const labelNorm = normGsmPlyLabel(labelStr)
    const gsmNum = round2(r["GSM/Ply"] || 0)
    
    const hit = maps.qual_label.get(`${qNorm}||${labelNorm}`)
      || maps.qual_num.get(`${qNorm}||${gsmNum}`)
      || maps.label_only.get(labelNorm)
      || maps.num_only.get(gsmNum)
    
    if (!hit) return r
    
    const out = { ...r }
    for (const m of METRICS) {
      const sv = hit[m.key]
      if (sv != null) out[`${m.label} (Spec)`] = sv
      const tv = hit[m.key + "_tol"]
      if (tv != null) out[`${m.label} (Tol)`] = tv
    }
    
    return out
  })
}