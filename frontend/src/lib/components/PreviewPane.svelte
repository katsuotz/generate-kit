<script lang="ts">
  import Diagnostics from './Diagnostics.svelte';
  import PdfPreview from './PdfPreview.svelte';
  import type { PreviewState } from '$lib/workspace/previewController';

  export let state: PreviewState;
  export let onDiagnosticSelect: (line: number) => void;
</script>

<div class="flex h-full min-h-0 flex-col" aria-label="Rendered document preview">
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="relative flex min-h-0 flex-1 items-start justify-center overflow-auto p-[clamp(24px,4vw,54px)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#a65333] max-[800px]:p-3.5"
    tabindex="0"
    role="region"
    aria-label="Preview scroll area">
    {#if state.status === 'loading'}
      {#if state.lastSuccess}
        <PdfPreview
          data={state.lastSuccess.data.slice(0)}
          pageCount={state.lastSuccess.pageCount} />
      {/if}
      <div
        class="absolute inset-0 z-[3] grid place-content-center justify-items-center gap-[15px] bg-[rgba(205,196,183,0.8)] text-[#564a40] backdrop-blur-[2px]"
        role="status"
        aria-live="polite">
        <span
          class="grid h-[53px] w-[53px] place-items-center rounded-full border border-[#a45a3b] text-[#91472c] animate-[breathe_1.2s_ease-in-out_infinite]"
          aria-hidden="true">
          ∴
        </span>
        <p class="m-0 text-[17px] italic">Setting the type…</p>
      </div>
    {:else if state.status === 'failure'}
      {#if state.lastSuccess}
        <PdfPreview
          data={state.lastSuccess.data.slice(0)}
          pageCount={state.lastSuccess.pageCount} />
      {:else}
        <div class="m-auto max-w-[300px] self-center text-center text-[#51473f]" role="status">
          <span class="mb-4 block text-5xl text-[#9e5134] opacity-70" aria-hidden="true">!</span>
          <h3 class="mb-2 mt-0 text-[25px] font-medium text-[#3c332c]">Proof paused.</h3>
          <p class="m-0 leading-[1.5]">Resolve the note below, then preview again.</p>
        </div>
      {/if}
    {:else if state.status === 'empty'}
      <div class="m-auto max-w-[300px] self-center text-center text-[#51473f]" role="status">
        <span class="mb-4 block text-5xl text-[#9e5134] opacity-70" aria-hidden="true">∅</span>
        <h3 class="mb-2 mt-0 text-[25px] font-medium text-[#3c332c]">No proof yet.</h3>
        <p class="m-0 leading-[1.5]">
          Complete the required identity fields, then choose Generate CV to make the first proof.
        </p>
      </div>
    {:else if state.lastSuccess}
      <PdfPreview data={state.lastSuccess.data.slice(0)} pageCount={state.lastSuccess.pageCount} />
    {:else}
      <div class="m-auto max-w-[300px] self-center text-center text-[#51473f]" role="status">
        <span class="mb-4 block text-5xl text-[#9e5134] opacity-70" aria-hidden="true">∅</span>
        <h3 class="mb-2 mt-0 text-[25px] font-medium text-[#3c332c]">No proof yet.</h3>
        <p class="m-0 leading-[1.5]">
          Complete the required identity fields, then choose Generate CV to make the first proof.
        </p>
      </div>
    {/if}
  </div>

  <Diagnostics diagnostics={state.diagnostics} onSelect={onDiagnosticSelect} />
</div>
