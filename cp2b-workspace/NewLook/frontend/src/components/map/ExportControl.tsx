/**
 * Export Control Component
 * Professional data export functionality for CSV, GeoJSON, and PNG
 */

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Download,
  FileText,
  Image as ImageIcon,
  Map as MapIcon,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import type { MunicipalityCollection, MunicipalityProperties } from '@/types/geospatial';
import html2canvas from 'html2canvas';
import { logger } from '@/lib/logger';
import { DATA_EXPORT_ENABLED } from '@/lib/featureFlags';
import { datedFilename, downloadBlob, downloadCsv, toCsv, type CsvValue } from '@/lib/download';
import { useFormat } from '@/hooks/useFormat';

/** Residue streams with a biogas column of their own, in export order; names: Map.residues.<key>. */
const RESIDUE_COLUMNS = [
  'sugarcane', 'soybean', 'corn', 'coffee', 'citrus', 'cattle', 'swine', 'poultry', 'aquaculture', 'rsu', 'rpo',
] as const;
const SECTOR_COLUMNS = ['agricultural', 'livestock', 'urban'] as const;

/** An export failure the user can be told about; the text is Map.exportPanel.errors.<code>. */
class ExportError extends Error {
  constructor(readonly code: 'no_data' | 'map_not_found' | 'image_failed') {
    super(code);
    this.name = 'ExportError';
  }
}

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
  const t = useTranslations('Map.exportPanel');
  const tCommon = useTranslations('common');
  const tResidues = useTranslations('Map.residues');
  const format = useFormat();

  // Beta: the dataset is still being validated, so no copy leaves the browser.
  // MapComponent and DesktopLeftPanel already withhold this control; this guard
  // is here so the component cannot export even if something renders it
  // directly. See lib/featureFlags for the reasoning and the re-enable switch.
  if (!DATA_EXPORT_ENABLED) return null;
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
      setErrorMessage(
        error instanceof ExportError
          ? t(`errors.${error.code}`)
          : error instanceof Error
            ? error.message
            : t('errors.unknown')
      );
      setTimeout(() => {
        setExportStatus('idle');
        setSelectedFormat(null);
        setErrorMessage('');
      }, 3000);
    }
  };

  const exportToCSV = async () => {
    if (!data || !data.features || data.features.length === 0) {
      throw new ExportError('no_data');
    }

    // Heading and value side by side, so the two cannot drift apart.
    const biogasOf = (source: string) => t('csv.biogas_of', { source });
    const columns: Array<[string, (p: MunicipalityProperties) => CsvValue]> = [
      [t('csv.ibge_code'), (p) => p.ibge_code],
      [t('csv.municipality'), (p) => p.name],
      [t('csv.region'), (p) => p.intermediate_region],
      [t('csv.population'), (p) => p.population || 0],
      [t('csv.area_km2'), (p) => p.area_km2 || 0],
      [t('csv.total_biogas'), (p) => p.total_biogas_m3_year || 0],
      ...SECTOR_COLUMNS.map((sector): [string, (p: MunicipalityProperties) => CsvValue] => [
        biogasOf(tCommon(`sectors.${sector}`)),
        (p) => p[`${sector}_biogas_m3_year`] || 0,
      ]),
      ...RESIDUE_COLUMNS.map((residue): [string, (p: MunicipalityProperties) => CsvValue] => [
        biogasOf(tResidues(residue)),
        (p) => p[`${residue}_biogas_m3_year`] || 0,
      ]),
    ];

    downloadCsv(
      toCsv([columns.map(([heading]) => heading), ...data.features.map((f) => columns.map(([, value]) => value(f.properties)))]),
      datedFilename('cp2b-biogas-data', 'csv')
    );
  };

  const exportToGeoJSON = async () => {
    if (!data) {
      throw new ExportError('no_data');
    }

    // Create GeoJSON content
    const geoJSONContent = JSON.stringify(data, null, 2);

    downloadBlob(new Blob([geoJSONContent], { type: 'application/geo+json' }), datedFilename('cp2b-biogas-geodata', 'geojson'));
  };

  const exportToPNG = async () => {
    // Find the map container
    const mapContainer = document.querySelector('.leaflet-container');
    if (!mapContainer) {
      throw new ExportError('map_not_found');
    }

    // Use html2canvas to capture the map
    const canvas = await html2canvas(mapContainer as HTMLElement, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    // Convert canvas to blob — promisified so the caller's try/catch and
    // success toast actually wait for (and see) the result; a throw inside
    // the raw toBlob callback would escape the surrounding try/catch and the
    // "Download iniciado!" toast would fire before anything was downloaded.
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));
    if (!blob) {
      throw new ExportError('image_failed');
    }

    downloadBlob(blob, datedFilename('cp2b-biogas-map', 'png'));
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
        return t('status.loading');
      case 'success':
        return t('status.success');
      case 'error':
        return t('status.error', { message: errorMessage });
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
        aria-hidden="true"
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
                  {t('title')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('subtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label={tCommon('actions.close')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
            </button>
          </div>

          {/* Export Options */}
          <div className="space-y-3 mb-6">
            <ExportButton
              icon={<FileText className="w-6 h-6" />}
              title={t('formats.csv.title')}
              description={t('formats.csv.description')}
              onClick={() => handleExport('csv')}
              disabled={exportStatus === 'loading'}
              statusIcon={getStatusIcon('csv')}
            />
            <ExportButton
              icon={<MapIcon className="w-6 h-6" />}
              title={t('formats.geojson.title')}
              description={t('formats.geojson.description')}
              onClick={() => handleExport('geojson')}
              disabled={exportStatus === 'loading'}
              statusIcon={getStatusIcon('geojson')}
            />
            <ExportButton
              icon={<ImageIcon className="w-6 h-6" />}
              title={t('formats.png.title')}
              description={t('formats.png.description')}
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
              <strong>{t('note_label')}</strong> {t('note')}
              {data && ` ${t('note_count', { count: data.features.length, formatted: format.number(data.features.length) })}`}
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
