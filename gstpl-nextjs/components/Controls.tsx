'use client'

import React, { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { WorkbookData, ProcessedRow, UIPreferences } from '@/lib/types'
import { loadPrefs, savePrefs } from '@/lib/utils'
import { LOGO_KEY } from '@/lib/constants'
import { prepareRows, aggregate, buildSpecsMap, attachSpecs } from '@/lib/dataProcessing'

interface ControlsProps {
  onWorkbookChange: (workbook: WorkbookData | null) => void
  onReportGenerated: (rows: ProcessedRow[]) => void
  onTrendsClick: () => void
  workbook: WorkbookData | null
}

export default function Controls({ 
  onWorkbookChange, 
  onReportGenerated, 
  onTrendsClick,
  workbook 
}: ControlsProps) {
  const [status, setStatus] = useState('idle')
  const [sheets, setSheets] = useState<string[]>([])
  const [showSelectors, setShowSelectors] = useState(false)
  const [headerPreview, setHeaderPreview] = useState('(will show after you generate)')
  const [hasData, setHasData] = useState(false)
  
  const [rew1Sel, setRew1Sel] = useState('')
  const [rew2Sel, setRew2Sel] = useState('')
  const [specSel, setSpecSel] = useState('')
  const [dateFormat, setDateFormat] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const prefs = loadPrefs()
    if (prefs.rew1Sel) setRew1Sel(prefs.rew1Sel)
    if (prefs.rew2Sel) setRew2Sel(prefs.rew2Sel)
    if (prefs.specSel) setSpecSel(prefs.specSel)
    if (prefs.dateFormat) setDateFormat(prefs.dateFormat)
    if (prefs.fromDate) setFromDate(prefs.fromDate)
    if (prefs.toDate) setToDate(prefs.toDate)
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatus('loading...')
    const file = e.target.files?.[0]
    if (!file) return

    const badExt = /\.(html?|htm|txt|csv|json)$/i.test(file.name)
    if (badExt) {
      setStatus('error')
      alert(`This is not an Excel file: ${file.name}\nPlease select your .xlsx or .xlsm workbook.`)
      return
    }

    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: "array" })
      
      const sheetNames = wb.SheetNames || []
      setSheets(sheetNames)
      setShowSelectors(true)
      
      // Convert workbook to format for other components
      const workbookData: WorkbookData = {}
      sheetNames.forEach(name => {
        const ws = wb.Sheets[name]
        if (ws) {
          workbookData[name] = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true })
        }
      })
      
      onWorkbookChange(workbookData)
      
      // Auto-detect sheets
      const guess = (subs: string[]) => sheetNames.find(n => 
        subs.some(s => n.toLowerCase().includes(s))
      )
      
      const r1 = guess(["rewinder 1", "rewinder-1", "rew1", "rw1", "rewinder1"])
      const r2 = guess(["rewinder 2", "rewinder-2", "rew2", "rw2", "rewinder2"])
      const sp = guess(["spec", "specs", "specification"])
      
      if (r1) setRew1Sel(r1)
      if (r2) setRew2Sel(r2)
      if (sp) setSpecSel(sp)
      
      setStatus('ready')
    } catch (err) {
      setStatus('error')
      alert(`The selected file is not a valid Excel workbook.\nSelected: ${file.name}`)
      console.error(err)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const dataUrl = reader.result as string
        localStorage.setItem(LOGO_KEY, dataUrl)
        // Update the logo in header
        const logoImg = document.getElementById('logoImg') as HTMLImageElement
        if (logoImg) {
          logoImg.src = dataUrl
        }
      } catch (err) {
        console.error(err)
        alert('Could not save logo in this browser.')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleGenerate = () => {
    try {
      if (!workbook) {
        alert("Upload an Excel workbook first.")
        return
      }
      
      setStatus('processing...')
      
      if (!rew1Sel || !rew2Sel || !specSel) {
        alert("Select all required sheets.")
        setStatus('error')
        return
      }
      
      savePrefs({
        rew1Sel,
        rew2Sel,
        specSel,
        dateFormat,
        fromDate,
        toDate
      })
      
      const r1 = prepareRows(workbook[rew1Sel] || [], dateFormat, "Rewinder-1", fromDate, toDate)
      const r2 = prepareRows(workbook[rew2Sel] || [], dateFormat, "Rewinder-2", fromDate, toDate)
      const combined = [...r1, ...r2]
      
      if (!combined.length) {
        onReportGenerated([])
        setStatus('done')
        return
      }
      
      const agg = aggregate(combined)
      const specObj = buildSpecsMap(workbook[specSel] || [])
      const withSpecs = attachSpecs(agg, specObj)
      
      onReportGenerated(withSpecs)
      setHasData(withSpecs.length > 0)
      setStatus('done')
    } catch (err: any) {
      console.error(err)
      setStatus('error')
      alert(`Error while generating report:\n${err.message}`)
    }
  }

  const handleDownloadCSV = () => {
    // Implementation will be added in Report component
    alert('CSV download will be implemented in Report component')
  }

  const handleDownloadExcel = () => {
    // Implementation will be added in Report component
    alert('Excel download will be implemented in Report component')
  }

  const handleDownloadPDF = () => {
    // Implementation will be added in Report component
    alert('PDF download will be implemented in Report component')
  }

  return (
    <div className="card no-print no-export">
      <div className="row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <label><strong>Upload Excel (.xlsx / .xlsm)</strong></label><br />
          <input 
            ref={fileInputRef}
            id="fileInput" 
            type="file" 
            accept=".xlsx,.xlsm,.xls"
            onChange={handleFileUpload}
          />
          <div className="muted">Pick your Excel workbook here (not this HTML file).</div>
        </div>
        <div>
          <label><strong>Detected Sheets</strong></label>
          <div id="sheetHint" className="muted">
            {sheets.length ? `Found ${sheets.length} sheets` : "Load a file to populate…"}
          </div>
        </div>
      </div>

      {showSelectors && (
        <div id="sheetSelectors" className="grid2" style={{ marginTop: '10px' }}>
          <div>
            <label>Rewinder-1 Sheet</label>
            <select id="rew1Sel" value={rew1Sel} onChange={(e) => setRew1Sel(e.target.value)}>
              {sheets.map(sheet => (
                <option key={sheet} value={sheet}>{sheet}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Rewinder-2 Sheet</label>
            <select id="rew2Sel" value={rew2Sel} onChange={(e) => setRew2Sel(e.target.value)}>
              {sheets.map(sheet => (
                <option key={sheet} value={sheet}>{sheet}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Specs Sheet</label>
            <select id="specSel" value={specSel} onChange={(e) => setSpecSel(e.target.value)}>
              {sheets.map(sheet => (
                <option key={sheet} value={sheet}>{sheet}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Date Parse (optional)</label>
            <select id="dateFormat" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
              <option value="">Auto</option>
              <option value="dd/mm/yyyy">dd/mm/yyyy</option>
              <option value="mm/dd/yyyy">mm/dd/yyyy</option>
              <option value="yyyy-mm-dd">yyyy-mm-dd</option>
            </select>
          </div>
        </div>
      )}

      <div className="grid2" style={{ marginTop: '10px' }}>
        <div>
          <label><strong>Filter by Date</strong> (for Report section)</label>
          <div className="row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label className="muted">From</label>
              <input 
                id="fromDate" 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <label className="muted">To</label>
              <input 
                id="toDate" 
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div>
          <label className="muted">Header detection (for your sheets)</label>
          <pre id="headerPreview">{headerPreview}</pre>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: '10px' }}>
        <div>
          <label><strong>Logo</strong></label><br />
          <input 
            ref={logoInputRef}
            id="logoInput" 
            type="file" 
            accept=".png,.jpg,.jpeg,.svg,.webp"
            onChange={handleLogoUpload}
          />
          <div className="muted">If not selected, it loads <code>./GSTPL_logo.jpg</code>.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
          <button id="genBtn" onClick={handleGenerate}>Generate Report</button>
          <span id="status" className="pill" aria-live="polite">{status}</span>
          <button id="dlCsvBtn" disabled={!hasData} onClick={handleDownloadCSV}>
            Download CSV
          </button>
          <button id="dlXlsxBtn" disabled={!hasData} onClick={handleDownloadExcel}>
            Download Excel
          </button>
          <button id="dlCoaPdfBtn" disabled={!hasData} onClick={handleDownloadPDF}>
            COA (PDF)
          </button>
          <button 
            id="trendsBtn" 
            type="button" 
            disabled={!workbook}
            onClick={onTrendsClick}
          >
            Trends
          </button>
        </div>
      </div>
    </div>
  )
}