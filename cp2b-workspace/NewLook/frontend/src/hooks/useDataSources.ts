'use client';

/**
 * The source registry (lib/dataSources) in the browser: read once per page
 * load and shared by every component that shows a source button. Until it
 * arrives, or if the API cannot be reached, the catalog is null and the
 * buttons are simply not drawn; nothing else on the page waits on it.
 */

import { useCallback, useEffect, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import {
  SOURCES_PATH,
  describeSource,
  type DataSource,
  type SourceCatalog,
} from '@/lib/dataSources';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

let loaded: SourceCatalog | null = null;
let pending: Promise<SourceCatalog | null> | null = null;

async function fetchCatalog(): Promise<SourceCatalog | null> {
  if (typeof fetch !== 'function') return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1${SOURCES_PATH}`);
    return res.ok ? ((await res.json()) as SourceCatalog) : null;
  } catch {
    return null;
  }
}

function loadCatalog(): Promise<SourceCatalog | null> {
  pending ??= fetchCatalog().then((catalog) => {
    loaded = catalog;
    // A failed read is retried by the next component that mounts.
    if (!catalog) pending = null;
    return catalog;
  });
  return pending;
}

export function useDataSources(): SourceCatalog | null {
  const [catalog, setCatalog] = useState<SourceCatalog | null>(loaded);
  useEffect(() => {
    if (loaded) return;
    let live = true;
    loadCatalog().then((c) => {
      if (live && c) setCatalog(c);
    });
    return () => {
      live = false;
    };
  }, []);
  return catalog;
}

/** The accessible name and hover text of a source button. */
export function useDescribeSource(): (source: DataSource) => string {
  const t = useTranslations('dataSources');
  const format = useFormatter();
  return useCallback(
    (s: DataSource) => describeSource(s, t, (kind) => t(`kinds.${kind}`), format),
    [t, format],
  );
}
