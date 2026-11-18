/**
 * Skeleton loader primitives using the existing .skeleton shimmer class.
 * All components inherit from the shimmer animation defined in globals.css.
 */

interface SkeletonBaseProps {
  className?: string;
}

const base = 'skeleton rounded-md bg-gray-200 dark:bg-slate-700 animate-pulse';

/** A single line of text placeholder */
export function SkeletonLine({ width = 'w-full', height = 'h-4', className = '' }: {
  width?: string; height?: string; className?: string;
}) {
  return <div className={`${base} ${width} ${height} ${className}`} aria-hidden="true" />;
}

/** A rectangular block — for images, charts, maps */
export function SkeletonBlock({ width = 'w-full', height = 'h-32', className = '' }: {
  width?: string; height?: string; className?: string;
}) {
  return <div className={`${base} ${width} ${height} ${className}`} aria-hidden="true" />;
}

/** A stat card: big number + label */
export function SkeletonStat({ className = '' }: SkeletonBaseProps) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 ${className}`} aria-hidden="true">
      <SkeletonLine width="w-1/2" height="h-3" className="mb-3" />
      <SkeletonLine width="w-3/4" height="h-8" className="mb-2" />
      <SkeletonLine width="w-2/3" height="h-3" />
    </div>
  );
}

/** A feature card: icon area + title + description */
export function SkeletonCard({ className = '' }: SkeletonBaseProps) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 ${className}`} aria-hidden="true">
      <SkeletonBlock width="w-12" height="h-12" className="rounded-lg mb-4" />
      <SkeletonLine width="w-3/4" height="h-5" className="mb-3" />
      <SkeletonLine width="w-full" height="h-3" className="mb-2" />
      <SkeletonLine width="w-5/6" height="h-3" />
    </div>
  );
}

/** A full municipality profile skeleton */
export function SkeletonMunicipalityPage({ className = '' }: SkeletonBaseProps) {
  return (
    <div className={`max-w-5xl mx-auto px-4 py-8 space-y-6 ${className}`} aria-busy="true" aria-label="Loading municipality data">
      {/* Header */}
      <div className="space-y-3">
        <SkeletonLine width="w-1/4" height="h-4" />
        <SkeletonLine width="w-1/2" height="h-8" />
        <SkeletonLine width="w-1/3" height="h-4" />
      </div>
      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonStat key={i} />)}
      </div>
      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        <SkeletonBlock height="h-64" className="rounded-xl" />
        <SkeletonBlock height="h-64" className="rounded-xl" />
      </div>
      {/* Table area */}
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <SkeletonLine key={i} width="w-full" height="h-10" className="rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** Dashboard hub loading skeleton */
export function SkeletonDashboard({ className = '' }: SkeletonBaseProps) {
  return (
    <div className={`max-w-6xl mx-auto px-4 py-8 space-y-8 ${className}`} aria-busy="true" aria-label="Loading dashboard">
      {/* Welcome heading */}
      <div className="space-y-2">
        <SkeletonLine width="w-1/3" height="h-8" />
        <SkeletonLine width="w-1/2" height="h-4" />
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <SkeletonStat key={i} />)}
      </div>
      {/* Feature cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}
