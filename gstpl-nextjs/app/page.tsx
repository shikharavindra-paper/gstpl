'use client'

import React, { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Controls from '@/components/Controls'
import Report from '@/components/Report'
import TrendPanel from '@/components/TrendPanel'
import { ProcessedRow, WorkbookData, TrendRows } from '@/lib/types'
import { prepareTrendRows } from '@/lib/trendUtils'

export default function Home() {
  const [workbook, setWorkbook] = useState<WorkbookData | null>(null)
  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([])
  const [trendRows, setTrendRows] = useState<TrendRows>({
    'Rewinder-1': [],
    'Rewinder-2': []
  })
  const [showTrends, setShowTrends] = useState(false)
  const [dateFormat, setDateFormat] = useState<string>('dd/mm/yyyy')
  const [sheetNames, setSheetNames] = useState({
    rew1: '',
    rew2: ''
  })

  const handleWorkbookChange = (newWorkbook: WorkbookData | null, format?: string, sheets?: { rew1: string, rew2: string }) => {
    setWorkbook(newWorkbook)
    if (format) {
      setDateFormat(format)
    }
    if (sheets) {
      setSheetNames(sheets)
    }
    if (newWorkbook && (sheets || sheetNames.rew1)) {
      // Prepare trend rows when workbook is loaded
      const currentFormat = format || dateFormat
      const currentSheets = sheets || sheetNames
      const r1Rows = prepareTrendRows(newWorkbook[currentSheets.rew1] || [], currentFormat, 'Rewinder-1')
      const r2Rows = prepareTrendRows(newWorkbook[currentSheets.rew2] || [], currentFormat, 'Rewinder-2')
      setTrendRows({
        'Rewinder-1': r1Rows,
        'Rewinder-2': r2Rows
      })
    }
  }

  const handleReportGenerated = (rows: ProcessedRow[], sheets?: { rew1: string, rew2: string }) => {
    setProcessedRows(rows)
    if (sheets) {
      setSheetNames(sheets)
    }
    
    // Re-process trend data when report is generated
    if (workbook && rows.length > 0 && (sheets || sheetNames.rew1)) {
      const currentSheets = sheets || sheetNames
      const r1Rows = prepareTrendRows(workbook[currentSheets.rew1] || [], dateFormat, 'Rewinder-1')
      const r2Rows = prepareTrendRows(workbook[currentSheets.rew2] || [], dateFormat, 'Rewinder-2')
      setTrendRows({
        'Rewinder-1': r1Rows,
        'Rewinder-2': r2Rows
      })
    }
  }

  return (
    <div className="wrap" id="pdfRoot">
      <Header />
      <div className="report-banner">Tissue Quality Control – Rewinder Daily Report</div>
      
      <Controls 
        onWorkbookChange={handleWorkbookChange}
        onReportGenerated={handleReportGenerated}
        onTrendsClick={() => setShowTrends(!showTrends)}
        workbook={workbook}
      />
      
      <Report rows={processedRows} />
      
      {showTrends && (
        <TrendPanel 
          trendRows={trendRows}
          onClose={() => setShowTrends(false)}
        />
      )}
    </div>
  )
}