import { expect, test } from '@playwright/test';

test('renders the starter document and recovers from a mock compiler error', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.locator('[role="status"][aria-live="polite"][aria-atomic="true"]')
  ).toContainText('Preview rendering complete.');
  await expect(page.getByRole('heading', { name: 'Notes on quiet systems' })).toBeVisible();

  const editor = page.getByRole('textbox', { name: 'LaTeX source editor' });
  await editor.fill('first% mock:error');
  await page.getByRole('button', { name: /Preview/ }).click();

  await expect(page.getByText('Needs revision')).toBeVisible();
  await expect(page.getByText('Last successful proof')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Compiler notes' })).toContainText(
    'Mock compiler directive'
  );
});

test('keeps pane navigation usable on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.getByRole('button', { name: 'Proof' }).click();
  await expect(page.getByRole('region', { name: 'Rendered preview' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Proof' })).toHaveAttribute('aria-pressed', 'true');
});

test('scrolls long source with the mouse wheel', async ({ page }) => {
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'LaTeX source editor' });
  await editor.fill(Array.from({ length: 100 }, (_, index) => `Line ${index}`).join('\n'));

  const scroller = page.locator('.cm-scroller');
  await expect
    .poll(async () => scroller.evaluate((element) => element.scrollHeight > element.clientHeight))
    .toBe(true);
  await scroller.hover();
  const before = await scroller.evaluate((element) => element.scrollTop);
  await page.mouse.wheel(0, 500);
  await expect
    .poll(async () => scroller.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(before);
});
