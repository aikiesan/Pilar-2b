/**
 * Where large media (the home page videos) is served from. These files are not
 * in the repository: they live on the server, outside the app build.
 *
 *   production   /var/www/pilar2b/media, which Apache serves at /pilar2b/media
 *   development  frontend/public/media (gitignored), which Next serves at /media
 *
 * Both are `<base path>/media`, so no setting is needed. NEXT_PUBLIC_MEDIA_URL
 * (inlined at build time) points elsewhere, a CDN for instance, when set.
 *
 * A missing file degrades quietly: the video sections keep their petrol
 * background and show no picture.
 */
import { withBasePath } from '@/lib/basePath'

const MEDIA_BASE: string = (process.env.NEXT_PUBLIC_MEDIA_URL || withBasePath('/media')).replace(/\/$/, '')

/** `path` (starting with "/") under the media location, e.g. "/home/hero.mp4". */
export function mediaUrl(path: string): string {
  return `${MEDIA_BASE}${path}`
}
