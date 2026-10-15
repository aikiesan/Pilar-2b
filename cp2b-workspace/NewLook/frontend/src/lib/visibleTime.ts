/**
 * How long each page stays visible, for the anonymous time-on-page totals
 * (lib/analytics: sendVisibleTime). Only time with the tab in the foreground
 * counts. Nothing is stored: the running total lives in this closure.
 *
 * A page's time is sent when the route changes, and whenever the tab is
 * hidden (switching tabs, locking the phone, closing the page): a hidden tab
 * may never come back, and mobile browsers can discard it without another
 * event. Coming back starts a new measurement of the same page, so the server
 * sums the parts.
 */
export interface VisibleTimer {
  /** A new page is on screen: send the previous one's time and start over. */
  start(path: string): void
  /** The tab was hidden or the page is going away: send what was measured. */
  hidden(): void
  /** The tab is visible again: keep measuring the same page. */
  visible(): void
}

export function createVisibleTimer(
  send: (path: string, seconds: number) => void,
  now: () => number = () => performance.now(),
  isVisible: () => boolean = () => document.visibilityState === 'visible',
): VisibleTimer {
  let path: string | null = null
  let visibleSince: number | null = null
  let measuredMs = 0

  function flush() {
    if (visibleSince !== null) measuredMs += now() - visibleSince
    visibleSince = null
    if (path !== null && measuredMs >= 1000) send(path, measuredMs / 1000)
    measuredMs = 0
  }

  return {
    start(next) {
      flush()
      path = next
      visibleSince = isVisible() ? now() : null
    },
    hidden() {
      flush()
    },
    visible() {
      if (path !== null && visibleSince === null) visibleSince = now()
    },
  }
}
