'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTranslations } from 'next-intl';
import { Municipality } from '@/services/analysisApi';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TopMunicipalitiesChartProps {
  data: Municipality[];
  title?: string;
  loading?: boolean;
  maxItems?: number;
}

export default function TopMunicipalitiesChart({
  data,
  title,
  loading = false,
  maxItems = 10
}: TopMunicipalitiesChartProps) {
  const t = useTranslations('charts');

  // Prepare chart data
  const chartData: ChartData<'bar'> = {
    labels: data.slice(0, maxItems).map(m => m.municipality_name),
    datasets: [
      {
        label: t('top_municipalities_dataset'),
        data: data.slice(0, maxItems).map(m => m.biogas_m3_year),
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  };

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: title ?? t('top_municipalities_title'),
        font: {
          size: 14,
          weight: 'bold'
        },
        color: '#374151'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.x;
            if (value == null) return '0 m³/year';
            if (value >= 1000000) {
              return `${(value / 1000000).toFixed(2)}M m³/year`;
            } else if (value >= 1000) {
              return `${(value / 1000).toFixed(2)}k m³/year`;
            }
            return `${value.toFixed(2)} m³/year`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: t('top_municipalities_xaxis'),
          color: '#6B7280',
          font: {
            size: 11
          }
        },
        ticks: {
          callback: (value) => {
            const num = Number(value);
            if (num >= 1000000) {
              return `${(num / 1000000).toFixed(1)}M`;
            } else if (num >= 1000) {
              return `${(num / 1000).toFixed(0)}k`;
            }
            return num.toString();
          },
          color: '#6B7280',
          font: {
            size: 10
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      y: {
        ticks: {
          color: '#374151',
          font: {
            size: 11
          }
        },
        grid: {
          display: false
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 h-[450px] flex items-center justify-center border border-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-600 font-medium">{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 h-[450px] flex items-center justify-center border border-gray-100">
        <div className="text-center">
          <div className="text-4xl mb-3">📊</div>
          <span className="text-sm text-gray-500">{t('no_data')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
      <div className="h-[450px]" role="img" aria-label={t('top_municipalities_title')}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
