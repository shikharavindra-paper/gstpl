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

  const handleWorkbookChange = (newWorkbook: WorkbookData | null) => {
    setWorkbook(newWorkbook)
    if (newWorkbook) {
      // Prepare trend rows when workbook is loaded
      const dateFormat = '' // This will be passed from Controls
      const r1Rows = prepareTrendRows(newWorkbook['Rewinder-1'] || [], dateFormat, 'Rewinder-1')
      const r2Rows = prepareTrendRows(newWorkbook['Rewinder-2'] || [], dateFormat, 'Rewinder-2')
      setTrendRows({
        'Rewinder-1': r1Rows,
        'Rewinder-2': r2Rows
      })
    }
  }

  const handleReportGenerated = (rows: ProcessedRow[]) => {
    setProcessedRows(rows)
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