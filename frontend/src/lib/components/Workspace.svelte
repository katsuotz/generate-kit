<script lang="ts">
  import { onMount } from 'svelte';
  import { PUBLIC_PREVIEW_MODE } from '$env/static/public';
  import { BackendApiError, BackendClient } from '$lib/api/backendClient';
  import { BackendPreviewAdapter } from '$lib/preview/backendPreviewAdapter';
  import CodeEditor from './CodeEditor.svelte';
  import MobilePaneNav from './MobilePaneNav.svelte';
  import PreviewPane from './PreviewPane.svelte';
  import Toolbar from './Toolbar.svelte';
  import { MockPreviewAdapter } from '$lib/preview/mockPreviewAdapter';
  import { PreviewController, type PreviewState } from '$lib/workspace/previewController';

  const initialSource = `\\documentclass{article}
\\title{Notes on quiet systems}
\\author{The Marginalia Press}

\\begin{document}
\\maketitle

\\section{A small beginning}
Good tools make room for thought. They keep the machinery close at hand, but never let it crowd the page.

The first proof is not a verdict; it is an invitation to look again. Here, even $e^{i\\pi} + 1 = 0$ can sit quietly in the margin.

\\section{Working notes}
Write with care, preview with patience, and leave enough white space for the next idea.
\\end{document}`;

  let source = initialSource;
  let state: PreviewState = {
    status: 'idle',
    requestedSource: '',
    lastSuccess: null,
    diagnostics: []
  };
  let split = 51;
  let mobilePane: 'editor' | 'preview' = 'editor';
  let diagnosticLine: number | null = null;
  let workspace: HTMLDivElement;
  let dragging = false;

  const mockMode = PUBLIC_PREVIEW_MODE === 'mock';
  const backendAdapter = mockMode ? null : new BackendPreviewAdapter(new BackendClient());
  let controller: PreviewController | null = null;
  $: dirty = source !== state.lastSuccess?.source;

  const compile = () => {
    if (!controller) return;
    diagnosticLine = null;
    void controller.compile(source);
  };

  const selectDiagnostic = (line: number) => {
    diagnosticLine = null;
    requestAnimationFrame(() => (diagnosticLine = line));
    mobilePane = 'editor';
  };

  const setSplit = (value: number) => (split = Math.max(34, Math.min(66, value)));

  const beginResize = (event: PointerEvent) => {
    dragging = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const resize = (event: PointerEvent) => {
    if (!dragging || !workspace) return;
    const bounds = workspace.getBoundingClientRect();
    setSplit(((event.clientX - bounds.left) / bounds.width) * 100);
  };

  const endResize = () => (dragging = false);

  const resizeWithKeyboard = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') setSplit(split - (event.shiftKey ? 10 : 3));
    else if (event.key === 'ArrowRight') setSplit(split + (event.shiftKey ? 10 : 3));
    else if (event.key === 'Home') setSplit(34);
    else if (event.key === 'End') setSplit(66);
    else return;
    event.preventDefault();
  };

  const globalShortcut = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      compile();
    }
  };

  onMount(() => {
    let active = true;

    void (async () => {
      try {
        if (mockMode) {
          controller = new PreviewController(new MockPreviewAdapter(), (next) => (state = next));
        } else {
          state = { ...state, status: 'loading', requestedSource: source };
          await backendAdapter?.initialize(source);
          if (!active) return;
          source = backendAdapter?.documentSource ?? source;
          controller = new PreviewController(backendAdapter!, (next) => (state = next));
        }
        compile();
      } catch (error) {
        if (!active) return;
        state = {
          ...state,
          status: 'failure',
          diagnostics: [
            {
              severity: 'error',
              message:
                error instanceof BackendApiError
                  ? error.message
                  : 'The backend workspace could not be loaded.',
              line: 1,
              column: 1,
              code: error instanceof BackendApiError ? error.code : 'BACKEND_UNAVAILABLE'
            }
          ]
        };
      }
    })();

    return () => {
      active = false;
      controller?.dispose();
      void backendAdapter?.cancel();
    };
  });
</script>

<svelte:window on:keydown={globalShortcut} />

<main
  class="grid h-screen min-h-0 grid-rows-[82px_minmax(0,1fr)] bg-[#d7cfc3] bg-[image:var(--workspace-texture)] bg-[length:5px_5px,100%_100%] max-[800px]:grid-rows-[70px_48px_minmax(0,1fr)]"
>
  <Toolbar status={state.status} {dirty} onCompile={compile} />
  <MobilePaneNav
    active={mobilePane}
    diagnosticsCount={state.diagnostics.length}
    onSelect={(pane) => (mobilePane = pane)}
  />

  <div
    class="grid min-h-0 grid-cols-[var(--editor-size)_13px_minmax(0,1fr)] gap-0 p-4 max-[800px]:block max-[800px]:p-2"
    bind:this={workspace}
    style={`--editor-size: ${split}%`}
  >
    <section
      class={`flex min-h-0 min-w-0 flex-col border border-[rgba(63,48,38,0.22)] bg-[rgba(242,236,226,0.86)] shadow-[-8px_10px_30px_rgba(47,36,28,0.09)] max-[800px]:h-full ${mobilePane !== 'editor' ? 'max-[800px]:hidden' : ''}`}
      aria-labelledby="source-title"
    >
      <div
        class="flex h-[68px] shrink-0 items-center justify-between border-b border-[var(--rule)] px-6 max-[800px]:h-[58px] max-[800px]:basis-[58px] max-[800px]:px-[17px]"
      >
        <div>
          <p
            class="mb-[3px] font-mono text-[9px] font-medium uppercase leading-[1.2] tracking-[0.17em] text-[#8c7666]"
          >
            Manuscript / .tex
          </p>
          <h2
            id="source-title"
            class="m-0 text-2xl font-medium leading-none max-[800px]:text-[21px]"
          >
            Source
          </h2>
        </div>
        <div
          class="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.08em] text-[#887d73]"
        >
          <span class="h-[5px] w-[5px] rounded-full bg-[#6f8773]" aria-hidden="true"
          ></span>{source.split('\n').length} lines
        </div>
      </div>
      <p id="editor-help" class="sr-only">
        LaTeX source editor. Press Control or Command plus Enter to preview.
      </p>
      <div class="flex min-h-0 flex-1 overflow-hidden">
        <CodeEditor
          value={source}
          onChange={(value) => (source = value)}
          onCompile={compile}
          {diagnosticLine}
        />
      </div>
    </section>

    <!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_noninteractive_element_interactions -->
    <div
      class={`group relative grid cursor-col-resize place-items-center touch-none border-y border-[rgba(63,48,38,0.22)] bg-[rgba(51,41,34,0.08)] hover:bg-[rgba(158,75,47,0.16)] max-[800px]:hidden ${dragging ? 'bg-[rgba(158,75,47,0.16)]' : ''}`}
      role="separator"
      aria-label="Resize source and preview panes"
      aria-orientation="vertical"
      aria-valuemin="34"
      aria-valuemax="66"
      aria-valuenow={Math.round(split)}
      tabindex="0"
      on:pointerdown={beginResize}
      on:pointermove={resize}
      on:pointerup={endResize}
      on:pointercancel={endResize}
      on:dblclick={() => setSplit(51)}
      on:keydown={resizeWithKeyboard}
    >
      <span class="h-[42px] w-[3px] border-x border-[#89796c] opacity-70" aria-hidden="true"></span>
      <span
        class="pointer-events-none absolute left-[22px] top-1/2 z-[8] w-max -translate-y-1/2 bg-[#302923] px-2.5 py-2 font-mono text-[9px] font-normal leading-none text-[#f5eee5] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >Drag · arrows resize · double-click resets</span
      >
    </div>

    <section
      class={`flex min-h-0 min-w-0 flex-col border border-[rgba(63,48,38,0.22)] bg-[#c8bfb2] shadow-[8px_10px_30px_rgba(47,36,28,0.12)] max-[800px]:h-full ${mobilePane !== 'preview' ? 'max-[800px]:hidden' : ''}`}
      aria-labelledby="preview-title"
    >
      <div id="preview-title" class="sr-only">Rendered preview</div>
      <PreviewPane {state} {dirty} onDiagnosticSelect={selectDiagnostic} />
    </section>
  </div>

  <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
    {state.status === 'loading'
      ? 'Preview rendering started.'
      : state.status === 'success'
        ? 'Preview rendering complete.'
        : state.status === 'failure'
          ? `Preview failed with ${state.diagnostics.length} diagnostic.`
          : state.status === 'empty'
            ? 'Preview is empty.'
            : ''}
  </div>
</main>
