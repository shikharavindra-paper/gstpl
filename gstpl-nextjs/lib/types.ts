export interface WorkbookData {
  [sheetName: string]: any[]
}

export interface ProcessedRow {
  Date: string
  Rewinder: string
  Quality: string
  'GSM/Ply': number | null
  'GSM/Ply Label': string
  [key: string]: any
}

export interface TrendRow {
  Date: string
  Rewinder: string
  Quality: string
  GSMLabel: string
  GSMNorm: string
  GSMNum: number
  [metricName: string]: any
}

export interface TrendRows {
  'Rewinder-1': TrendRow[]
  'Rewinder-2': TrendRow[]
}

export interface Metric {
  key: string
  label: string
  unit?: string
  compute?: (row: any) => number | null
}

export interface SpecObject {
  maps: {
    qual_label: Map<string, any>
    qual_num: Map<string, any>
    label_only: Map<string, any>
    num_only: Map<string, any>
  }
  list: any[]
}

export interface UIPreferences {
  rew1Sel?: string
  rew2Sel?: string
  specSel?: string
  dateFormat?: string
  fromDate?: string
  toDate?: string
}