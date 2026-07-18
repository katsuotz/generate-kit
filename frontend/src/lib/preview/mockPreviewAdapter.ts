import type { PreviewAdapter, PreviewResult } from './types';

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const extract = (source: string, command: string) => {
  const match = source.match(new RegExp(`\\\\${command}\\{([^}]*)\\}`));
  return match?.[1]?.trim();
};

const renderInline = (value: string) => {
  let output = escapeHtml(value);
  output = output.replace(/\\textbf\{([^}]*)\}/g, '<strong class="font-semibold">$1</strong>');
  output = output.replace(/\\emph\{([^}]*)\}/g, '<em class="italic">$1</em>');
  output = output.replace(
    /\$([^$]+)\$/g,
    '<span class="inline-block px-1 font-serif italic text-[#6b3d2c]" aria-label="mathematical expression">$1</span>'
  );
  return output;
};

const renderDocument = (source: string) => {
  const title = extract(source, 'title') ?? 'Untitled manuscript';
  const author = extract(source, 'author');
  const body = source
    .replace(/^[\s\S]*?\\begin\{document\}/, '')
    .replace(/\\end\{document\}[\s\S]*$/, '')
    .replace(/\\maketitle/g, '')
    .trim();

  const blocks = body
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((block) => {
      const section = block.match(/^\\section\{([^}]*)\}\s*([\s\S]*)$/);
      if (section) {
        const content = section[2]?.trim();
        return `<section class="mt-[35px] max-[800px]:mt-7"><h2 class="mb-3 mt-0 text-[21px] font-medium text-[#81462f] max-[800px]:text-[19px]">${escapeHtml(section[1] ?? '')}</h2>${content ? `<p class="mb-[18px] text-[17px] leading-[1.68] max-[800px]:text-[15px]">${renderInline(content.replaceAll('\n', ' '))}</p>` : ''}</section>`;
      }
      return `<p class="mb-[18px] text-[17px] leading-[1.68] max-[800px]:text-[15px]">${renderInline(block.replaceAll('\n', ' '))}</p>`;
    })
    .join('');

  return `<article class="mx-auto max-w-[44rem] text-[#28231f]"><header class="mb-[42px] border-b border-[#b9aa9b] pb-[38px] text-center max-[800px]:mb-[30px] max-[800px]:pb-[26px]"><p class="mb-7 font-mono text-[8px] font-medium uppercase tracking-[0.22em] text-[#9c5b40]">Typeset proof</p><h1 class="m-0 text-[clamp(34px,4vw,50px)] font-medium leading-[1.04] tracking-[-0.025em]">${escapeHtml(title)}</h1>${author ? `<p class="mt-[15px] text-[15px] italic text-[#74685e]">${escapeHtml(author)}</p>` : ''}</header>${blocks || '<p class="mb-[18px] text-[17px] leading-[1.68]">The manuscript has no body text.</p>'}</article>`;
};

export class MockPreviewAdapter implements PreviewAdapter {
  constructor(private readonly delay = 360) {}

  async render(source: string, signal?: AbortSignal): Promise<PreviewResult> {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(resolve, this.delay);
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timeout);
          reject(new DOMException('Preview cancelled', 'AbortError'));
        },
        { once: true }
      );
    });

    if (!source.trim()) return { kind: 'empty' };

    const lines = source.split('\n');
    const errorIndex = lines.findIndex((line) => line.includes('% mock:error'));
    if (errorIndex >= 0) {
      return {
        kind: 'failure',
        diagnostics: [
          {
            severity: 'error',
            message: 'Mock compiler directive requested a structured failure.',
            line: errorIndex + 1,
            column: Math.max(1, lines[errorIndex].indexOf('% mock:error') + 1),
            code: 'MOCK_DIRECTIVE'
          }
        ]
      };
    }

    return { kind: 'success', representation: 'html', source, html: renderDocument(source) };
  }
}
