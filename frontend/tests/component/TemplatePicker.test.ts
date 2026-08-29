import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import TemplatePicker from '../../src/lib/components/TemplatePicker.svelte';

const templates = [
  { id: 'editorial-v1', name: 'Editorial dossier', description: 'Quiet' },
  { id: 'compact-v1', name: 'Compact signal', description: 'Dense' }
];

describe('TemplatePicker', () => {
  it('uses static image previews without requesting PDFs', async () => {
    const onSelect = vi.fn();
    render(TemplatePicker, {
      templates,
      selectedId: 'editorial-v1',
      onSelect
    });

    expect(screen.getByAltText('Editorial dossier CV template preview')).toHaveAttribute(
      'src',
      '/templates/editorial-v1.webp'
    );
    expect(screen.getByAltText('Compact signal CV template preview')).toHaveAttribute(
      'src',
      '/templates/compact-v1.webp'
    );
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[0]).toBeChecked();
    await fireEvent.click(radios[1]);
    expect(onSelect).toHaveBeenCalledWith('compact-v1');
  });

  it('opens and closes a larger static preview', async () => {
    render(TemplatePicker, {
      templates,
      selectedId: 'editorial-v1',
      onSelect: vi.fn()
    });

    await fireEvent.click(
      screen.getByRole('button', { name: 'View larger preview of Editorial dossier' })
    );
    const dialog = await waitFor(() => screen.getByRole('dialog', { name: 'Editorial dossier' }));
    expect(dialog).toBeVisible();
    expect(dialog.querySelector('img')).toHaveAttribute('src', '/templates/editorial-v1.webp');

    await fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'Editorial dossier' })).not.toBeInTheDocument();
  });

  it('keeps unknown templates selectable without inventing an image', () => {
    render(TemplatePicker, {
      templates: [{ id: 'unknown-v1', name: 'Unknown', description: 'Fallback' }],
      selectedId: '',
      onSelect: vi.fn()
    });

    expect(screen.getByText('No preview available')).toBeVisible();
    expect(screen.queryByRole('button', { name: /View larger preview/ })).not.toBeInTheDocument();
  });
});
