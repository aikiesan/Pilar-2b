'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTranslations } from 'next-intl';
import { StatisticsByCategoryResponse } from '@/services/analysisApi';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface CategoryComparisonChartProps {
  data: StatisticsByCategoryResponse | null;
  loading?: boolean;
}

export default function CategoryComparisonChart({
  data,
  loading = false
}: CategoryComparisonChartProps) {
  const t = useTranslations('charts');
  const tMap = useTranslations('Map');

  if (loading || !data) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 h-[400px] flex items-center justify-center border border-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-600 font-medium">{t('loading')}</span>
        </div>
      </div>
    );
  }

  const chartData: ChartData<'bar'> = {
    labels: [
      tMap('categories.agricultural'),
      tMap('categories.livestock'),
      tMap('categories.urban')
    ],
    datasets: [
      {
        label: t('category_comparison_dataset'),
        data: [
          (data.categories.agricultural?.total ?? 0) / 1000000000,
          (data.categories.livestock?.total ?? 0) / 1000000000,
          (data.categories.urban?.total ?? 0) / 1000000000
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(59, 130, 246, 0.8)'
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(249, 115, 22, 1)',
          'rgba(59, 130, 246, 1)'
        ],
        borderWidth: 2,
        borderRadius: 8,
      }
    ]
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: t('category_comparison_title'),
        font: {
          size: 16,
          weight: 'bold'
        },
        color: '#374151',
        padding: {
          bottom: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return t('category_comparison_tooltip', { value: value?.toFixed(2) ?? '0.00' });
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: t('category_comparison_yaxis'),
          color: '#6B7280',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        ticks: {
          callback: (value) => `${value}B`,
          color: '#6B7280',
          font: {
            size: 11
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        ticks: {
          color: '#374151',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
      <div className="h-[320px]">
        <Bar data={chartData} options={options} />
      </div>

      {/* Comparison Stats */}
      <div className="mt-5 pt-5 border-t border-gray-200">
        <h4 className="text-xs font-semibold text-gray-600 mb-3 uppercase flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
          {t('category_comparison_heading')}
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-green-50 to-white rounded-lg p-3 border border-green-100">
            <div className="text-xs text-gray-600 mb-1">{tMap('categories.agricultural')}</div>
            <div className="font-bold text-green-900 text-sm">
              {data.categories.agricultural?.count ?? 0} municípios
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Média: {((data.categories.agricultural?.average ?? 0) / 1000000).toFixed(2)}M m³/ano
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg p-3 border border-orange-100">
            <div className="text-xs text-gray-600 mb-1">{tMap('categories.livestock')}</div>
            <div className="font-bold text-orange-900 text-sm">
              {data.categories.livestock?.count ?? 0} municípios
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Média: {((data.categories.livestock?.average ?? 0) / 1000000).toFixed(2)}M m³/ano
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 border border-blue-100">
            <div className="text-xs text-gray-600 mb-1">{tMap('categories.urban')}</div>
            <div className="font-bold text-blue-900 text-sm">
              {data.categories.urban?.count ?? 0} municípios
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Média: {((data.categories.urban?.average ?? 0) / 1000000).toFixed(2)}M m³/ano
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
