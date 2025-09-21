'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
  registerables
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { TrendRows, TrendRow } from '@/lib/types'
import { METRICS, CHART_COLORS, RIGHT_AXIS_METRICS } from '@/lib/constants'
import {
  parseDMY,
  fmtDMY,
  periodKeyFor,
  friendlyLabel,
  inRangeByDMYLabel
} from '@/lib/trendUtils'
import { normGsmPlyLabel } from '@/lib/utils'

Chart.register(...registerables, ChartDataLabels)

interface TrendPanelProps {
  trendRows: TrendRows
  onClose: () => void
}

export default function TrendPanel({ trendRows, onClose }: TrendPanelProps) {
  const [period, setPeriod] = useState('weekly')
  const [chartType, setChartType] = useState('line')
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['Dry Tensile MD'])
  const [rewinder, setRewinder] = useState('Rewinder-2')
  const [quality, setQuality] = useState('')
  const [gsmLabel, setGsmLabel] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [summary, setSummary] = useState('Analyzing 0 records.')
  
  const chartRef = useRef<Chart | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const uniq = (arr: string[]) => [...new Set(arr)]
  
  // Initialize with last 30 days
  useEffect(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29)
    setStartDate(fmtDMY(thirtyDaysAgo))
    setEndDate(fmtDMY(today))
  }, [])

  // Get current rows based on selection
  const getCurrentRows = (): TrendRow[] => {
    if (rewinder === 'All Rewinders') {
      return [...trendRows['Rewinder-1'], ...trendRows['Rewinder-2']]
    }
    return trendRows[rewinder as keyof TrendRows] || []
  }

  // Update quality options when rewinder changes
  useEffect(() => {
    const rows = getCurrentRows()
    const qualities = uniq(rows.map(r => r.Quality)).sort()
    if (qualities.length > 0 && !qualities.includes(quality)) {
      setQuality(qualities[0])
    }
  }, [rewinder, trendRows])

  // Update GSM options when quality changes
  useEffect(() => {
    const rows = getCurrentRows().filter(r => r.Quality === quality)
    const byNorm = new Map<string, string>()
    rows.forEach(r => {
      const n = r.GSMNorm
      if (n && !byNorm.has(n)) byNorm.set(n, r.GSMLabel)
    })
    const gsms = Array.from(byNorm.entries())
      .sort((a, b) => String(a[1]).localeCompare(String(b[1]), undefined, { numeric: true }))
    
    if (gsms.length > 0 && !gsms.find(g => g[1] === gsmLabel)) {
      setGsmLabel(gsms[0][1])
    }
  }, [quality, rewinder, trendRows])

  // Get filtered rows for current selection
  const getFilteredRows = (): TrendRow[] => {
    const all = getCurrentRows()
    const gsmNorm = normGsmPlyLabel(gsmLabel)
    
    return all.filter(r => 
      r.Quality === quality &&
      r.GSMNorm === gsmNorm &&
      inRangeByDMYLabel(r.Date, startDate, endDate)
    )
  }

  // Update summary
  useEffect(() => {
    const rows = getFilteredRows()
    const rwText = rewinder === "All Rewinders" ? "" : " on " + rewinder
    setSummary(`Analyzing ${rows.length} records with quality: ${quality} with GSM: ${gsmLabel}${rwText}`)
  }, [rewinder, quality, gsmLabel, startDate, endDate, trendRows])

  const handleMetricToggle = (metricLabel: string) => {
    if (selectedMetrics.includes(metricLabel)) {
      setSelectedMetrics(selectedMetrics.filter(m => m !== metricLabel))
    } else {
      if (selectedMetrics.length >= 4) {
        alert('You can compare up to 4 metrics at once.')
        return
      }
      setSelectedMetrics([...selectedMetrics, metricLabel])
    }
  }

  const handleQuickDate = (type: string) => {
    const now = new Date()
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    let s: Date, e: Date
    
    switch (type) {
      case 'today':
        s = e = today
        break
      case 'yesterday':
        e = new Date(today)
        e.setUTCDate(e.getUTCDate() - 1)
        s = e
        break
      case '7':
        e = today
        s = new Date(today)
        s.setUTCDate(s.getUTCDate() - 6)
        break
      case '30':
        e = today
        s = new Date(today)
        s.setUTCDate(s.getUTCDate() - 29)
        break
      case 'thisMonth':
        e = today
        s = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
        break
      case 'lastMonth':
        const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
        e = new Date(first)
        e.setUTCDate(e.getUTCDate() - 1)
        s = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), 1))
        break
      default:
        return
    }
    
    setStartDate(fmtDMY(s))
    setEndDate(fmtDMY(e))
  }

  const plotChart = () => {
    const baseRows = getFilteredRows()
    if (!baseRows.length) {
      alert('No data for that selection / date range.')
      return
    }

    const bucketKeysAsc = [...new Set(baseRows.map(r => periodKeyFor(r.Date, period)))]
      .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))

    const series = selectedMetrics.map(metricLabel => {
      const avgByBucket = bucketKeysAsc.map(bucket => {
        const rowsHere = baseRows.filter(r => periodKeyFor(r.Date, period) === bucket)
        const vals = rowsHere
          .map(r => parseFloat(r[metricLabel] || ""))
          .filter(Number.isFinite)
        if (!vals.length) return null
        return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
      })
      return { label: metricLabel, data: avgByBucket }
    })

    const N = 10
    const labelsPrettyAsc = bucketKeysAsc.map(k => friendlyLabel(k, period))
    const labels = labelsPrettyAsc.slice(-N).reverse()

    const datasets = series.map((s, idx) => {
      const color = CHART_COLORS[idx % CHART_COLORS.length]
      const isRight = RIGHT_AXIS_METRICS.has(s.label)

      return {
        label: s.label,
        data: s.data.slice(-N).reverse(),
        borderColor: color,
        backgroundColor: chartType === 'bar' ? color + 'cc' : color,
        borderWidth: 2,
        tension: 0.3,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 5,
        pointBackgroundColor: color,
        yAxisID: isRight ? 'y2' : 'y'
      }
    })

    const flatVals = datasets.flatMap(d => d.data).filter(v => v != null)
    const sugMax = Math.max((Math.max(...flatVals) || 0) + 1, 5)

    const todayStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    
    const chartData: ChartData = {
      labels,
      datasets
    }

    const chartOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `Trend Analysis - ${todayStr}`,
          padding: { bottom: 8 },
          font: { size: 16, weight: 'bold' },
          color: '#111'
        },
        legend: {
          position: 'bottom',
          labels: { color: '#111', font: { weight: '600' } }
        },
        tooltip: { mode: 'index', intersect: false },
        datalabels: {
          display: true,
          anchor: 'end',
          align: 'start',
          offset: 2,
          color: '#222',
          font: { weight: 700 },
          formatter: (v: any) => (v == null ? '' : (typeof v === 'number' ? v.toFixed(1) : v)),
          clip: false
        }
      },
      scales: {
        x: {
          stacked: false,
          ticks: { color: '#111' },
          grid: { color: '#ddd' }
        },
        y: {
          beginAtZero: true,
          suggestedMax: sugMax,
          ticks: { color: '#111' },
          grid: { color: '#e0e0e0' },
          title: { display: true, text: 'High-range metrics', color: '#111', font: { weight: '600' } }
        },
        y2: {
          position: 'right',
          beginAtZero: true,
          suggestedMax: (() => {
            const rightVals = datasets
              .filter(d => d.yAxisID === 'y2')
              .flatMap(d => d.data)
              .filter(v => v != null)
            if (!rightVals.length) return 10
            const m = Math.max(...rightVals)
            return Math.ceil(m * 1.2)
          })(),
          grid: { drawOnChartArea: false },
          ticks: { color: '#111' },
          title: { display: true, text: 'Low-range metrics', color: '#111', font: { weight: '600' } }
        }
      }
    }

    if (chartRef.current) {
      chartRef.current.destroy()
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        chartRef.current = new Chart(ctx, {
          type: chartType as any,
          data: chartData,
          options: chartOptions
        })
      }
    }
  }

  // Get unique values for selectors
  const rows = getCurrentRows()
  const qualities = uniq(rows.map(r => r.Quality)).sort()
  const gsmOptions = (() => {
    const filtered = rows.filter(r => r.Quality === quality)
    const byNorm = new Map<string, string>()
    filtered.forEach(r => {
      const n = r.GSMNorm
      if (n && !byNorm.has(n)) byNorm.set(n, r.GSMLabel)
    })
    return Array.from(byNorm.entries())
      .sort((a, b) => String(a[1]).localeCompare(String(b[1]), undefined, { numeric: true }))
      .map(([_, label]) => label)
  })()

  return (
    <div id="trendPanel" className="card no-print">
      <div className="trend-toolbar">
        <div className="seg" id="trendPeriodSeg">
          <button 
            data-p="daily" 
            className={period === 'daily' ? 'active' : ''}
            onClick={() => setPeriod('daily')}
          >
            DAILY
          </button>
          <button 
            data-p="weekly" 
            className={period === 'weekly' ? 'active' : ''}
            onClick={() => setPeriod('weekly')}
          >
            WEEKLY
          </button>
          <button 
            data-p="monthly" 
            className={period === 'monthly' ? 'active' : ''}
            onClick={() => setPeriod('monthly')}
          >
            MONTHLY
          </button>
        </div>

        <div className="seg" id="trendTypeSeg">
          <button 
            data-t="line" 
            className={chartType === 'line' ? 'active' : ''}
            onClick={() => setChartType('line')}
          >
            LINE
          </button>
          <button 
            data-t="bar" 
            className={chartType === 'bar' ? 'active' : ''}
            onClick={() => setChartType('bar')}
          >
            BAR
          </button>
        </div>

        <div className="right inputs-inline">
          <div>
            <label>Rewinder</label><br />
            <select id="trendRew" value={rewinder} onChange={(e) => setRewinder(e.target.value)}>
              <option>Rewinder-1</option>
              <option>Rewinder-2</option>
              <option>All Rewinders</option>
            </select>
          </div>
          <div>
            <label>Quality</label><br />
            <select id="trendQuality" value={quality} onChange={(e) => setQuality(e.target.value)}>
              {qualities.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          <div>
            <label>GSM</label><br />
            <select id="trendGsm" value={gsmLabel} onChange={(e) => setGsmLabel(e.target.value)}>
              {gsmOptions.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="inputs-inline" style={{ marginTop: '10px' }}>
        <div className="trend-quick">
          <span className="muted">Quick select:</span>
          <button data-q="today" onClick={() => handleQuickDate('today')}>Today</button>
          <button data-q="yesterday" onClick={() => handleQuickDate('yesterday')}>Yesterday</button>
          <button data-q="7" onClick={() => handleQuickDate('7')}>Last 7 Days</button>
          <button data-q="30" onClick={() => handleQuickDate('30')}>Last 30 Days</button>
          <button data-q="thisMonth" onClick={() => handleQuickDate('thisMonth')}>This Month</button>
          <button data-q="lastMonth" onClick={() => handleQuickDate('lastMonth')}>Last Month</button>
        </div>
        <div className="inputs-inline" style={{ marginLeft: 'auto' }}>
          <div>
            <label>Start Date</label><br />
            <input 
              id="trendStart" 
              type="text" 
              placeholder="dd/mm/yyyy"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label>End Date</label><br />
            <input 
              id="trendEnd" 
              type="text" 
              placeholder="dd/mm/yyyy"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button id="plotTrendBtn" type="button" style={{ height: '36px' }} onClick={plotChart}>
            Plot
          </button>
        </div>
      </div>

      <div id="trendSummary" className="pill-blue" style={{ marginTop: '10px' }}>
        {summary}
      </div>

      <div style={{ marginTop: '14px' }}>
        <div className="muted">
          Select Metrics (compare up to 4): <span id="metricCount">{selectedMetrics.length}/4</span> selected
        </div>
        <div id="metricChips" className="chip-row" style={{ marginTop: '6px' }}>
          {METRICS.map(m => (
            <button
              key={m.key}
              className={`chip ${selectedMetrics.includes(m.label) ? 'active' : ''}`}
              onClick={() => handleMetricToggle(m.label)}
            >
              {m.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '12px' }}>
        <canvas ref={canvasRef} id="trendCanvas" height="260"></canvas>
      </div>

      <button 
        onClick={onClose} 
        style={{ position: 'absolute', top: '10px', right: '10px' }}
      >
        Close
      </button>
    </div>
  )
}