import { Metric } from './types'

export const COLUMN_MAP = {
  date: ["Date", "Production Date", "Prod Date", "DT", "Date of Production"],
  quality: ["Quality", "Grade", "A/B/C Grade", "Qly", "Product", "Paper Quality", "QUALITY"],
  gsm_ply: ["GSM/Ply", "GSM per Ply", "Ply GSM", "GSM_Ply", "GSM-Ply", "GSM / Ply", "Gsm Ply", "GSMPly", "GSM x Ply"],
  gsm: ["GSM", "Basis Weight", "BW"],
  thickness: ["Thickness", "Thicness", "Caliper", "Caliper (µm)", "Caliper um", "Caliper micro", "Caliper (um)"],
  bulk: ["Bulk", "BULK"],
  dry_md: ["Dry Tensile MD", "Tensile MD", "MD Tensile", "Dry_MD", "Tensile_MD", "MD", "DRY TS(MD)", "Dry TS (MD)", "Dry TS- MD"],
  dry_cd: ["Dry Tensile CD", "Tensile CD", "CD Tensile", "Dry_CD", "Tensile_CD", "CD", "DRY TS(CD)", "Dry TS (CD)", "Dry TS- CD"],
  dry_md_cd_ratio: ["MD/CD", "MD /CD Ratio", "MD_CD Ratio", "Dry MD/CD", "MDCD", "MD to CD Ratio"],
  stretch: ["Stretch", "Elongation", "Stretch/Elongation", "Stretch / Elongation %", "Elongation %", "% Elongation"],
  wet_strength: ["Wet Tensile", "Wet Strength", "Wet MD", "Wet_Tensile_MD", "Wet Tensile MD"],
  wet_dry_ratio: ["Wet/Dry Ratio", "Wet/Dry", "Wet MD/Dry MD", "WetMD/DryMD", "Wet_MD/Dry_MD", "Wet to Dry"],
  brightness: ["Brightness", "ISO Brightness", "Brightness %", "ISO %", "Brightness  "],
  length: ["Length", "Reel Length", "Roll Length", "Length (m)"],
  rewinder: ["Rewinder", "RW", "RW No", "Machine", "Rewinder ID"]
}

export const METRICS: Metric[] = [
  { key: "gsm", label: "Substance (1 Ply)", unit: "g/m2" },
  { key: "thickness", label: "Thickness (1 PLY)", unit: "Micron" },
  { key: "bulk", label: "*Bulk", unit: "CC/gm" },
  { key: "dry_md", label: "*Dry Tensile Strength MD", unit: "gf/25mm" },
  { key: "dry_cd", label: "CD", unit: "gf/25mm" },
  { 
    key: "dry_md_cd_ratio", 
    label: "MDT/CDT RATIO",
    unit: "",
    compute: (r: any) => {
      const md = r.dry_md || r['Dry Tensile MD']
      const cd = r.dry_cd || r['Dry Tensile CD']
      return md && cd && cd !== 0 ? md / cd : null
    }
  },
  { key: "stretch", label: "Stretch MD", unit: "%" },
  { key: "wet_strength", label: "*Wet Tensile Strength MD", unit: "gf/50mm" },
  { 
    key: "wet_dry_ratio", 
    label: "Wet / Dry Tensile",
    unit: "%",
    compute: (r: any) => {
      const wet = r.wet_strength || r['Wet Tensile']
      const dry = r.dry_md || r['Dry Tensile MD']
      return wet && dry && dry !== 0 ? (wet / dry * 100) : null
    }
  },
  { key: "brightness", label: "*ISO Brightness(Frank, PTI )", unit: "% ISO" },
  { key: "length", label: "Reel Length Meter", unit: "" }
]

export const PREFS_KEY = 'gstpl_ui_prefs_v7'
export const LOGO_KEY = 'gstpl_logo_dataurl'

export const RIGHT_AXIS_METRICS = new Set([
  'MD/CD (Dry)', 'Bulk', 'GSM', 'Thickness', 'Stretch / Elongation %', 'Brightness', 'Length'
])

export const CHART_COLORS = ['#e53935', '#43a047', '#fdd835', '#1e88e5']