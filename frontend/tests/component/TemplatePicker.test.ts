import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import TemplatePicker from '../../src/lib/components/TemplatePicker.svelte';

const templates = [
  { id: 'editorial-v1', name: 'Editorial dossier', description: 'Quiet' },
  { id: 'compact-v1', name: 'Compact signal', description: 'Dense' }
];

describe('TemplatePicker', () => {
  it('exposes native radio selection and an accessible preview fallback', async () => {
    const onSelect = vi.fn();
    render(TemplatePicker, {
      templates,
      selectedId: 'editorial-v1',
      loadPreview: vi.fn().mockRejectedValue(new Error('preview unavailable')),
      onSelect
    });

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[0]).toBeChecked();
    await fireEvent.click(radios[1]);
    expect(onSelect).toHaveBeenCalledWith('compact-v1');
    await waitFor(() => expect(screen.getAllByText('Preview unavailable')).toHaveLength(2));
  });

  it('loads previews when templates arrive after mount and only requests each template once', async () => {
    const loadPreview = vi.fn().mockResolvedValue(new ArrayBuffer(8));
    const { rerender } = render(TemplatePicker, {
      templates: [],
      selectedId: '',
      loadPreview,
      onSelect: vi.fn()
    });

    await rerender({ templates });

    await waitFor(() => expect(loadPreview).toHaveBeenCalledTimes(2));
    expect(loadPreview).toHaveBeenNthCalledWith(1, 'editorial-v1', expect.any(AbortSignal));
    expect(loadPreview).toHaveBeenNthCalledWith(2, 'compact-v1', expect.any(AbortSignal));
    await rerender({ templates: [...templates] });
    expect(loadPreview).toHaveBeenCalledTimes(2);
  });

  it('allows a failed preview to be retried without stale request state winning', async () => {
    let rejectPreview!: (error: Error) => void;
    const loadPreview = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise<ArrayBuffer>((_, reject) => (rejectPreview = reject))
      )
      .mockResolvedValueOnce(new ArrayBuffer(8));
    render(TemplatePicker, {
      templates: [templates[0]],
      selectedId: '',
      loadPreview,
      onSelect: vi.fn()
    });

    rejectPreview(new Error('preview unavailable'));
    await waitFor(() => expect(screen.getByText('Preview unavailable')).toBeVisible());
    await fireEvent.click(screen.getByRole('button', { name: 'Retry Editorial dossier preview' }));
    await waitFor(() => expect(loadPreview).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('Preview unavailable')).not.toBeInTheDocument());
  });
});
