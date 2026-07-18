import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Toolbar from '../../src/lib/components/Toolbar.svelte';

describe('Toolbar', () => {
  it('exposes draft state and invokes preview', async () => {
    const onCompile = vi.fn();
    render(Toolbar, { status: 'idle', dirty: true, onCompile });

    expect(screen.getByText('Unpreviewed changes')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: /preview/i }));
    expect(onCompile).toHaveBeenCalledOnce();
  });

  it('disables duplicate preview requests while loading', () => {
    render(Toolbar, { status: 'loading', dirty: false, onCompile: vi.fn() });
    expect(screen.getByRole('button', { name: /rendering/i })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Setting type');
  });
});
