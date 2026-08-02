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
});
