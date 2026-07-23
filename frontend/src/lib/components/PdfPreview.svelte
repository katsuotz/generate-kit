<script lang="ts">
  import { onDestroy } from 'svelte';

  type PdfModule = typeof import('pdfjs-dist');
  type PdfLoadingTask = ReturnType<PdfModule['getDocument']>;
  type PdfDocument = Awaited<PdfLoadingTask['promise']>;

  export let data: ArrayBuffer;
  export let pageCount: number | null = null;

  let host: HTMLDivElement;
  let renderId = 0;
  let document: PdfDocument | undefined;
  let loadingTask: PdfLoadingTask | undefined;
  let renderError = '';

  $: if (data) queueRender(data);

  function queueRender(source: ArrayBuffer) {
    const currentRender = ++renderId;
    renderError = '';
    void renderPdf(source, currentRender).catch((error) => {
      if (currentRender !== renderId || isCancellation(error)) return;
      renderError =
        error instanceof Error ? error.message : 'The PDF proof could not be displayed.';
    });
  }

  async function renderPdf(source: ArrayBuffer, currentRender: number) {
    const pdfjs = await import('pdfjs-dist');
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    if (currentRender !== renderId) return;
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    await loadingTask?.destroy();
    await document?.cleanup();
    if (currentRender !== renderId) return;
    document = undefined;
    loadingTask = undefined;
    host?.replaceChildren();

    loadingTask = pdfjs.getDocument({ data: new Uint8Array(source) });
    const loaded = await loadingTask.promise;
    if (currentRender !== renderId) {
      await loaded.cleanup();
      return;
    }
    document = loaded;

    for (let pageNumber = 1; pageNumber <= loaded.numPages; pageNumber += 1) {
      if (currentRender !== renderId) return;
      const page = await loaded.getPage(pageNumber);
      const initialViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(280, (host?.clientWidth ?? 760) - 32);
      const scale = Math.min(1.75, availableWidth / initialViewport.width);
      const viewport = page.getViewport({ scale });
      const canvas = window.document.createElement('canvas');
      canvas.className =
        'block h-auto max-w-full bg-white shadow-[0_2px_2px_rgba(48,38,30,0.12),0_15px_38px_rgba(48,38,30,0.14)]';
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.setAttribute('aria-label', `PDF page ${pageNumber}`);
      host.appendChild(canvas);
      await page.render({ canvas, viewport }).promise;
    }
  }

  function isCancellation(error: unknown) {
    if (!(error instanceof Error)) return false;
    return /abort|cancel|destroy/i.test(`${error.name} ${error.message}`);
  }

  onDestroy(() => {
    renderId += 1;
    void loadingTask?.destroy().catch(() => undefined);
    void document?.cleanup().catch(() => undefined);
  });
</script>

<div
  class="grid w-[min(100%,820px)] justify-items-center gap-6"
  bind:this={host}
  aria-label={pageCount ? `PDF preview, ${pageCount} pages` : 'PDF preview'}>
  <div
    class="p-[18px] font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-[#74685e]"
    aria-live="polite">
    {renderError || 'Loading proof…'}
  </div>
</div>
