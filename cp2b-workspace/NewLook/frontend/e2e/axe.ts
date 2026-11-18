/**
 * axe's WCAG 2.1 A and AA rules on the page as it is now. axe-core is injected
 * from node_modules (already a dependency), so no Playwright plugin is needed.
 */
import type { Page } from '@playwright/test';

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

export async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  return page.evaluate(async (tags) => {
    const axe = (window as unknown as { axe: { run: (context: Document, options: object) => Promise<any> } }).axe;
    const result = await axe.run(document, { runOnly: { type: 'tag', values: tags } });
    return result.violations.map(
      (v: { id: string; impact: string; nodes: { target: string[] }[] }) =>
        `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`
    );
  }, WCAG_21_AA);
}
