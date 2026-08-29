import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Diagnostics from '../../src/lib/components/Diagnostics.svelte';

describe('Diagnostics', () => {
  it('preserves the exact diagnostic line and column when selected', async () => {
    const onSelect = vi.fn();
    render(Diagnostics, {
      diagnostics: [
        {
          severity: 'error',
          message: 'Missing closing brace.',
          line: 12,
          column: 7,
          code: 'PARSE_ERROR'
        }
      ],
      onSelect
    });

    await fireEvent.click(screen.getByRole('button', { name: /Missing closing brace/ }));

    expect(onSelect).toHaveBeenCalledWith(12, 7);
  });
});
