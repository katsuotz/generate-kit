import { describe, expect, it } from 'vitest';
import { MockPreviewAdapter } from './mockPreviewAdapter';

describe('MockPreviewAdapter', () => {
  const adapter = new MockPreviewAdapter(0);

  it('returns an empty result for whitespace', async () => {
    await expect(adapter.render('  \n')).resolves.toEqual({ kind: 'empty' });
  });

  it('returns a structured diagnostic for the mock error directive', async () => {
    const result = await adapter.render('first\n% mock:error');
    expect(result).toEqual({
      kind: 'failure',
      diagnostics: [
        {
          severity: 'error',
          message: 'Mock compiler directive requested a structured failure.',
          line: 2,
          column: 1,
          code: 'MOCK_DIRECTIVE'
        }
      ]
    });
  });

  it('escapes source content before producing deterministic HTML', async () => {
    const source =
      '\\title{<script>alert(1)</script>}\n\\begin{document}\nSafe & sound\n\\end{document}';
    const first = await adapter.render(source);
    const second = await adapter.render(source);
    expect(first).toEqual(second);
    expect(first.kind).toBe('success');
    if (first.kind === 'success' && first.representation === 'html') {
      expect(first.html).not.toContain('<script>');
      expect(first.html).toContain('&lt;script&gt;');
      expect(first.html).toContain('Safe &amp; sound');
    }
  });
});
