import { COLUMN_MAP } from './constants'

export function normKey(s: string): string {
  return String(s || "")
    .replace(/\u00A0/g, " ")
    .toLowerCase()
    .replace(/[,\s\-\_\/\\\(\)\[\]\.\%]+/g, "")
    .replace(/µ/g, "u")
}

export function normalizeHeader(h: string | null | undefined): string {
  return String(h ?? "").trim()
}

export function num(v: any): number | null {
  const x = Number(v)
  return isFinite(x) ? x : null
}

export function firstNumber(v: any): number | null {
  if (v == null || v === "") return null
  if (typeof v === "number") return isFinite(v) ? v : null
  const s = String(v).replace(",", ".")
  const m = s.match(/[-+]?\d*\.?\d+/)
  return m ? parseFloat(m[0]) : null
}

export function safeDiv(a: any, b: any): number | null {
  const numA = num(a)
  const numB = num(b)
  return (numA == null || numB == null || numB === 0) ? null : numA / numB
}

export function fmt1(x: number | null): string {
  return Number.isFinite(x) ? (Math.round(x! * 10) / 10).toFixed(1) : ""
}

export function ymdUTC(d: Date): string {
  if (!(d instanceof Date) || isNaN(d.getTime())) return ""
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${dd}`
}

export function parseDate(v: any, fmt: string = ""): Date | null {
  if (v == null || v === "") return null
  if (typeof v === "number") {
    const ms = Math.round((v - 25569) * 86400 * 1000)
    const d = new Date(ms)
    if (!isNaN(d.getTime())) return d
  }
  const s = String(v).trim()
  if (!s) return null
  try {
    if (fmt === "dd/mm/yyyy") {
      const [dd, mm, yyyy] = s.split(/[\/\-\.]/).map(n => parseInt(n, 10))
      if (yyyy && mm && dd) return new Date(Date.UTC(yyyy, mm - 1, dd))
    }
    else if (fmt === "mm/dd/yyyy") {
      const [mm, dd, yyyy] = s.split(/[\/\-\.]/).map(n => parseInt(n, 10))
      if (yyyy && mm && dd) return new Date(Date.UTC(yyyy, mm - 1, dd))
    }
    else if (fmt === "yyyy-mm-dd") {
      const [yyyy, mm, dd] = s.split(/[\/\-\.]/).map(n => parseInt(n, 10))
      if (yyyy && mm && dd) return new Date(Date.UTC(yyyy, mm - 1, dd))
    }
    else {
      const d = new Date(s)
      if (!isNaN(d.getTime())) return d
    }
  } catch (e) {}
  return null
}

export function inDateRange(d: Date, fromStr: string, toStr: string): boolean {
  if (!(d instanceof Date) || isNaN(d.getTime())) return false
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  
  if (fromStr) {
    const [y, m, dd] = fromStr.split("-").map(n => parseInt(n, 10))
    if (day < new Date(Date.UTC(y, m - 1, dd))) return false
  }
  
  if (toStr) {
    const [y, m, dd] = toStr.split("-").map(n => parseInt(n, 10))
    if (day > new Date(Date.UTC(y, m - 1, dd))) return false
  }
  
  return true
}

export function normGsmPlyLabel(s: string): string {
  let t = String(s ?? "").replace(/\u00A0/g, " ").trim().toLowerCase()
  t = t.replace(/\\|-/g, "/")
  t = t.replace(/\s*x\s*/g, "/")
  t = t.replace(/\s+/g, "")
  return t
}

export function bindHeaders(headers: string[]): { [key: string]: string } {
  const binding: { [key: string]: string } = {}
  const norm: { [key: string]: string } = {}
  
  headers.forEach(h => {
    const clean = String(h ?? "").trim()
    norm[normKey(clean)] = clean
  })
  
  const pick = (aliases: string[]) => {
    for (const a of aliases) {
      const k = normKey(a)
      if (k in norm) return norm[k]
    }
    return null
  }
  
  for (const [logical, aliases] of Object.entries(COLUMN_MAP)) {
    const chosen = pick(aliases)
    if (chosen) binding[logical] = chosen
  }
  
  if (!binding.brightness) {
    const cand = headers.map(normalizeHeader).find(h => /bright/i.test(String(h)))
    if (cand) binding.brightness = String(cand).trim()
  }
  
  return binding
}

export function loadPrefs(): any {
  try {
    const stored = localStorage.getItem('gstpl_ui_prefs_v7')
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

export function savePrefs(prefs: any): void {
  try {
    localStorage.setItem('gstpl_ui_prefs_v7', JSON.stringify(prefs || {}))
  } catch (e) {
    console.error('Failed to save preferences:', e)
  }
}