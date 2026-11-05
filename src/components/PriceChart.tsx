import { Chart as ChartJS, LinearScale, LineController, LineElement, PointElement, Tooltip, type ChartOptions } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { CHART_INK } from '../lib/chartColours'
import type { Scan } from '../lib/db'
import { formatPrice, formatScanTime, formatUnitPrice } from '../lib/format'
import type { Currency } from '../lib/region'

ChartJS.register(LineController, LineElement, PointElement, LinearScale, Tooltip)

export type ChartSeries = { key: string; label: string; colour: string; scans: Scan[]; hidden: boolean }

const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

// Price over time, one line per shop.
export function PriceChart({ series, dark, currency = 'EUR' }: { series: ChartSeries[]; dark: boolean; currency?: Currency }) {
  const ink = dark ? CHART_INK.dark : CHART_INK.light

  const data = {
    datasets: series.map((s) => ({
      label: s.label,
      hidden: s.hidden,
      data: [...s.scans].sort((a, b) => a.timestamp - b.timestamp).map((scan) => ({ x: scan.timestamp, y: scan.price, scan })),
      borderColor: s.colour,
      backgroundColor: s.colour,
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointHitRadius: 14,
      // A ring in the card colour keeps overlapping points apart.
      pointBorderColor: ink.surface,
      pointBorderWidth: 2,
      tension: 0,
    })),
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'nearest', intersect: false },
    layout: { padding: { top: 8, right: 8 } },
    scales: {
      x: {
        type: 'linear',
        grid: { display: false },
        border: { color: ink.axis },
        ticks: { color: ink.muted, maxTicksLimit: 4, maxRotation: 0, callback: (value) => dayMonth.format(Number(value)) },
      },
      y: {
        grace: '15%',
        grid: { color: ink.grid },
        border: { display: false },
        ticks: { color: ink.muted, maxTicksLimit: 5, callback: (value) => formatPrice(Number(value), currency) },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: ink.text,
        titleColor: ink.surface,
        bodyColor: ink.surface,
        displayColors: true,
        boxPadding: 4,
        callbacks: {
          title: (items) => formatScanTime(Number(items[0].parsed.x)),
          label: (item) => `${item.dataset.label}: ${formatPrice(Number(item.parsed.y), currency)}`,
          afterLabel: (item) => {
            const scan = (item.raw as { scan: Scan }).scan
            return scan.unitPrice !== undefined && scan.unitBasis ? formatUnitPrice(scan.unitPrice, scan.unitBasis, currency) : ''
          },
        },
      },
    },
  }

  return (
    <div className="chart-box">
      <Line data={data} options={options} aria-label="Line chart of the price over time, one line per shop" role="img" />
    </div>
  )
}
