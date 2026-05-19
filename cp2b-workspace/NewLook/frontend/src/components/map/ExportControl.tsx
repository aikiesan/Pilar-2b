/**
 * Export Control Component
 * Professional data export functionality for CSV, GeoJSON, and PNG
 */

'use client';

import React, { useState } from 'react';
import {
  Download,
  FileText,
  Image,
  Map as MapIcon,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import type { MunicipalityCollection } from '@/types/geospatial';
import html2canvas from 'html2canvas';
import { logger } from '@/lib/logger';

interface ExportControlProps {
  data: MunicipalityCollection | null;
  visible?: boolean;
  onClose?: () => void;
}

type ExportFormat = 'csv' | 'geojson' | 'png';
type ExportStatus = 'idle' | 'loading' | 'success' | 'error';

export default function ExportControl({
  data,
  visible = false,
  onClose,
}: ExportControlProps) {
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!visible) return null;

  const handleExport = async (format: ExportFormat) => {
    setSelectedFormat(format);
    setExportStatus('loading');
    setErrorMessage('');

    try {
      switch (format) {
        case 'csv':
          await exportToCSV();
          break;
        case 'geojson':
          await exportToGeoJSON();
          break;
        case 'png':
          await exportToPNG();
          break;
      }
      setExportStatus('success');
      setTimeout(() => {
        setExportStatus('idle');
        setSelectedFormat(null);
      }, 2000);
    } catch (error) {
      logger.error('Export error:', error);
      setExportStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido');
      setTimeout(() => {
        setExportStatus('idle');
        setSelectedFormat(null);
        setErrorMessage('');
      }, 3000);
    }
  };

  const exportToCSV = async () => {
    if (!data || !data.features || data.features.length === 0) {
      throw new Error('Nenhum dado disponível para exportar');
    }

    // Prepare CSV headers
    const headers = [
      'IBGE Code',
      'Municipality',
      'Region',
      'Population',
      'Area (km²)',
      'Total Biogas (m³/year)',
      'Agricultural Biogas (m³/year)',
      'Livestock Biogas (m³/year)',
      'Urban Biogas (m³/year)',
      'Sugarcane Biogas (m³/year)',
      'Soybean Biogas (m³/year)',
      'Corn Biogas (m³/year)',
      'Coffee Biogas (m³/year)',
      'Citrus Biogas (m³/year)',
      'Cattle Biogas (m³/year)',
      'Swine Biogas (m³/year)',
      'Poultry Biogas (m³/year)',
      'Aquaculture Biogas (m³/year)',
      'RSU Biogas (m³/year)',
      'RPO Biogas (m³/year)',
    ];

    // Prepare CSV rows
    const rows = data.features.map((feature) => {
      const p = feature.properties;
      return [
        p.ibge_code,
        p.name,
        p.intermediate_region,
        p.population || 0,
        p.area_km2 || 0,
        p.total_biogas_m3_year || 0,
        p.agricultural_biogas_m3_year || 0,
        p.livestock_biogas_m3_year || 0,
        p.urban_biogas_m3_year || 0,
        p.sugarcane_biogas_m3_year || 0,
        p.soybean_biogas_m3_year || 0,
        p.corn_biogas_m3_year || 0,
        p.coffee_biogas_m3_year || 0,
        p.citrus_biogas_m3_year || 0,
        p.cattle_biogas_m3_year || 0,
        p.swine_biogas_m3_year || 0,
        p.poultry_biogas_m3_year || 0,
        p.aquaculture_biogas_m3_year || 0,
        p.rsu_biogas_m3_year || 0,
        p.rpo_biogas_m3_year || 0,
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cp2b-biogas-data-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToGeoJSON = async () => {
    if (!data) {
      throw new Error('Nenhum dado disponível para exportar');
    }

    // Create GeoJSON content
    const geoJSONContent = JSON.stringify(data, null, 2);

    // Create and download file
    const blob = new Blob([geoJSONContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cp2b-biogas-geodata-${new Date().toISOString().split('T')[0]}.geojson`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPNG = async () => {
    // Find the map container
    const mapContainer = document.querySelector('.leaflet-container');
    if (!mapContainer) {
      throw new Error('Mapa não encontrado');
    }

    // Use html2canvas to capture the map
    const canvas = await html2canvas(mapContainer as HTMLElement, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Falha ao gerar imagem');
      }

      // Create and download file
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `cp2b-biogas-map-${new Date().toISOString().split('T')[0]}.png`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const getStatusIcon = (format: ExportFormat) => {
    if (selectedFormat !== format) return null;

    switch (exportStatus) {
      case 'loading':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'success':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'error':
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (exportStatus) {
      case 'loading':
        return 'Exportando...';
      case 'success':
        return 'Download iniciado!';
      case 'error':
        return `Erro: ${errorMessage}`;
      default:
        return '';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[1050] transition-opacity"
        onClick={onClose}
      />

      {/* Export Panel */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1051]">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 p-6 w-[500px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Exportar Dados
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Escolha o formato para exportação
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Export Options */}
          <div className="space-y-3 mb-6">
            <ExportButton
              icon={<FileText className="w-6 h-6" />}
              title="CSV (Planilha)"
              description="Dados tabulares compatíveis com Excel"
              onClick={() => handleExport('csv')}
              disabled={exportStatus === 'loading'}
              statusIcon={getStatusIcon('csv')}
            />
            <ExportButton
              icon={<MapIcon className="w-6 h-6" />}
              title="GeoJSON (Geoespacial)"
              description="Formato padrão para dados geográficos"
              onClick={() => handleExport('geojson')}
              disabled={exportStatus === 'loading'}
              statusIcon={getStatusIcon('geojson')}
            />
            <ExportButton
              icon={<Image className="w-6 h-6" />}
              title="PNG (Imagem)"
              description="Captura visual do mapa atual"
              onClick={() => handleExport('png')}
              disabled={exportStatus === 'loading'}
              statusIcon={getStatusIcon('png')}
            />
          </div>

          {/* Status Message */}
          {exportStatus !== 'idle' && (
            <div
              className={`p-4 rounded-lg ${
                exportStatus === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : exportStatus === 'error'
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  exportStatus === 'success'
                    ? 'text-green-800 dark:text-green-200'
                    : exportStatus === 'error'
                    ? 'text-red-800 dark:text-red-200'
                    : 'text-blue-800 dark:text-blue-200'
                }`}
              >
                {getStatusText()}
              </p>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong>Nota:</strong> Os dados exportados incluem apenas os municípios
              visíveis com os filtros atuais aplicados.
              {data && ` ${data.features.length} municípios serão exportados.`}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

interface ExportButtonProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  statusIcon?: React.ReactNode;
}

function ExportButton({
  icon,
  title,
  description,
  onClick,
  disabled,
  statusIcon,
}: ExportButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center space-x-4 p-4 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
    >
      <div className="p-3 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      {statusIcon && <div>{statusIcon}</div>}
    </button>
  );
}
