import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('starts blank, validates, and generates only on request', async ({ page }) => {
  await expect(page.getByText('Not generated')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download PDF' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Generate CV' })).toBeEnabled();
  await page.getByRole('button', { name: 'Generate CV' }).click();
  await expect(page.getByRole('alert')).toContainText('Full name is required.');
  await page.getByLabel(/Full name/).fill('Ada Lovelace');
  await page.getByLabel('Email').fill('ada@example.com');
  await expect(page.getByText('Not generated')).toBeVisible();
  await page.getByRole('button', { name: 'Generate CV' }).click();
  await expect(page.getByLabel('PDF page 1')).toBeVisible();
  await expect(page.getByText('CV generated and proof ready.')).toBeVisible();
  await page.getByLabel(/Full name/).fill('Ada King');
  await expect(page.getByText('Proof outdated')).toBeVisible();
});

test('downloads the backend artifact bytes with the CV filename', async ({ page }) => {
  await page.getByLabel(/Full name/).fill('Ada Lovelace');
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByRole('button', { name: 'Generate CV' }).click();
  await expect(page.getByLabel('PDF page 1')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('ada-lovelace-cv.pdf');
  const path = await download.path();
  expect(path).not.toBeNull();
  const bytes = await readFile(path!);
  expect(bytes.subarray(0, 4).toString('ascii')).toBe('%PDF');
});

test('keeps the last backend PDF visible when compilation fails', async ({ page }) => {
  await page.getByLabel(/Full name/).fill('Ada Lovelace');
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByRole('button', { name: 'Generate CV' }).click();
  await expect(page.getByLabel('PDF page 1')).toBeVisible();

  await page.getByLabel(/Full name/).fill('E2E COMPILE FAILURE');
  await page.getByRole('button', { name: 'Generate CV' }).click();
  await expect(page.getByRole('region', { name: 'Compiler notes' })).toContainText(
    'Fixture compiler rejected this source.'
  );
  await expect(page.getByLabel('PDF page 1')).toBeVisible();
  await expect(page.getByText('Last successful proof')).toBeVisible();
});

test('moves between form sections and exposes exact source actions', async ({ page }) => {
  await page.getByLabel(/Full name/).fill('Ada Lovelace');
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByRole('button', { name: 'Generate CV' }).click();
  await page.getByRole('button', { name: 'Source' }).click();
  await expect(page.getByRole('heading', { name: 'LaTeX source' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download .tex' })).toBeEnabled();
});

test('keeps form and preview navigation usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Rendered preview' })).toBeVisible();
  await page.getByRole('button', { name: 'Form', exact: true }).click();
  await expect(page.getByRole('region', { name: 'CV form builder' })).toBeVisible();
  await page.getByRole('button', { name: /Next/ }).click();
  await expect(page.getByRole('heading', { name: 'Experience' })).toBeVisible();
});

test('switches to the single-pane layout before desktop columns can overflow', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 900 });
  await expect(page.getByRole('button', { name: 'Preview', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(820);
  await page.getByRole('button', { name: 'Source' }).click();
  await expect(page.getByRole('heading', { name: 'LaTeX source' })).toBeVisible();
});

test('continues editing when autosave storage is unavailable', async ({ page }) => {
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'latex-renderer.cv-builder.v1') {
        throw new DOMException('full', 'QuotaExceededError');
      }
      return setItem.call(this, key, value);
    };
  });
  await page.getByLabel(/Full name/).fill('Ada Lovelace');
  await expect(page.getByText(/Autosave is unavailable/)).toBeVisible();
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByRole('button', { name: 'Generate CV' }).click();
  await expect(page.getByLabel('PDF page 1')).toBeVisible();
});
