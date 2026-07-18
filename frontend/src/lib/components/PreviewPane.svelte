<script lang="ts">
  import Diagnostics from './Diagnostics.svelte';
  import PdfPreview from './PdfPreview.svelte';
  import type { PreviewState } from '$lib/workspace/previewController';

  export let state: PreviewState;
  export let dirty: boolean;
  export let onDiagnosticSelect: (line: number) => void;
</script>

<div class="flex h-full min-h-0 flex-col" aria-label="Rendered document preview">
  <div
    class="flex h-[68px] shrink-0 items-center justify-between border-b border-[var(--rule)] bg-[rgba(238,231,220,0.46)] px-6 max-[800px]:h-[58px] max-[800px]:basis-[58px] max-[800px]:px-[17px]"
  >
    <div>
      <p
        class="mb-[3px] font-mono text-[9px] font-medium uppercase leading-[1.2] tracking-[0.17em] text-[#684d3d]"
      >
        Output / proof
      </p>
      <h2 class="m-0 text-2xl font-medium leading-none max-[800px]:text-[21px]">Preview</h2>
    </div>
    {#if dirty && state.lastSuccess}<span
        class="border border-[#a77560] bg-[rgba(247,237,226,0.5)] px-2 py-[5px] font-mono text-[8px] font-medium uppercase leading-none tracking-[0.1em] text-[#81513d]"
        >Last successful proof</span
      >{/if}
  </div>

  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="relative flex min-h-0 flex-1 items-start justify-center overflow-auto p-[clamp(24px,4vw,54px)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#a65333] max-[800px]:p-3.5"
    tabindex="0"
    role="region"
    aria-label="Preview scroll area"
  >
    {#if state.status === 'loading'}
      {#if state.lastSuccess}
        {#if state.lastSuccess.representation === 'pdf'}
          <PdfPreview data={state.lastSuccess.data} pageCount={state.lastSuccess.pageCount} />
        {:else}
          <div
            class="relative min-h-full w-[min(100%,670px)] border border-[rgba(74,58,45,0.14)] bg-[#f8f4ec] px-[clamp(38px,7vw,92px)] py-[clamp(44px,6vw,82px)] opacity-[0.58] shadow-[0_2px_2px_rgba(48,38,30,0.12),0_15px_38px_rgba(48,38,30,0.14)] sepia-[0.12] after:pointer-events-none after:absolute after:inset-0 after:bg-[image:radial-gradient(#7a6d61_0.45px,transparent_0.45px)] after:bg-[length:4px_4px] after:opacity-25 after:mix-blend-multiply max-[800px]:px-7 max-[800px]:py-10"
            aria-label="Last successful document preview"
          >
            {@html state.lastSuccess.html}
          </div>
        {/if}
      {/if}
      <div
        class="absolute inset-0 z-[3] grid place-content-center justify-items-center gap-[15px] bg-[rgba(205,196,183,0.8)] text-[#564a40] backdrop-blur-[2px]"
        role="status"
        aria-live="polite"
      >
        <span
          class="grid h-[53px] w-[53px] place-items-center rounded-full border border-[#a45a3b] text-[#91472c] animate-[breathe_1.2s_ease-in-out_infinite]"
          aria-hidden="true">∴</span
        >
        <p class="m-0 text-[17px] italic">Setting the type…</p>
      </div>
    {:else if state.status === 'failure'}
      {#if state.lastSuccess}
        {#if state.lastSuccess.representation === 'pdf'}
          <PdfPreview data={state.lastSuccess.data} pageCount={state.lastSuccess.pageCount} />
        {:else}
          <div
            class="relative min-h-full w-[min(100%,670px)] border border-[rgba(74,58,45,0.14)] bg-[#f8f4ec] px-[clamp(38px,7vw,92px)] py-[clamp(44px,6vw,82px)] opacity-[0.58] shadow-[0_2px_2px_rgba(48,38,30,0.12),0_15px_38px_rgba(48,38,30,0.14)] sepia-[0.12] after:pointer-events-none after:absolute after:inset-0 after:bg-[image:radial-gradient(#7a6d61_0.45px,transparent_0.45px)] after:bg-[length:4px_4px] after:opacity-25 after:mix-blend-multiply max-[800px]:px-7 max-[800px]:py-10"
            aria-label="Last successful document preview"
          >
            {@html state.lastSuccess.html}
          </div>
        {/if}
      {:else}
        <div class="m-auto max-w-[300px] self-center text-center text-[#6e6258]" role="status">
          <span class="mb-4 block text-5xl text-[#9e5134] opacity-70" aria-hidden="true">!</span>
          <h3 class="mb-2 mt-0 text-[25px] font-medium text-[#3c332c]">Proof paused.</h3>
          <p class="m-0 leading-[1.5]">Resolve the note below, then preview again.</p>
        </div>
      {/if}
    {:else if state.status === 'empty'}
      <div class="m-auto max-w-[300px] self-center text-center text-[#6e6258]" role="status">
        <span class="mb-4 block text-5xl text-[#9e5134] opacity-70" aria-hidden="true">∅</span>
        <h3 class="mb-2 mt-0 text-[25px] font-medium text-[#3c332c]">Your page is waiting.</h3>
        <p class="m-0 leading-[1.5]">
          Write a few lines in the source, then press <kbd class="font-mono text-[10px] font-normal"
            >⌘ ↵</kbd
          > to make the first proof.
        </p>
      </div>
    {:else if state.lastSuccess}
      {#if state.lastSuccess.representation === 'pdf'}
        <PdfPreview data={state.lastSuccess.data} pageCount={state.lastSuccess.pageCount} />
      {:else}
        <div
          class="relative min-h-full w-[min(100%,670px)] border border-[rgba(74,58,45,0.14)] bg-[#f8f4ec] px-[clamp(38px,7vw,92px)] py-[clamp(44px,6vw,82px)] shadow-[0_2px_2px_rgba(48,38,30,0.12),0_15px_38px_rgba(48,38,30,0.14)] after:pointer-events-none after:absolute after:inset-0 after:bg-[image:radial-gradient(#7a6d61_0.45px,transparent_0.45px)] after:bg-[length:4px_4px] after:opacity-25 after:mix-blend-multiply max-[800px]:px-7 max-[800px]:py-10"
          aria-label="Rendered document preview"
        >
          {@html state.lastSuccess.html}
        </div>
      {/if}
    {:else}
      <div class="m-auto max-w-[300px] self-center text-center text-[#6e6258]" role="status">
        <span class="mb-4 block text-5xl text-[#9e5134] opacity-70" aria-hidden="true">∅</span>
        <h3 class="mb-2 mt-0 text-[25px] font-medium text-[#3c332c]">Your page is waiting.</h3>
        <p class="m-0 leading-[1.5]">
          Write a few lines in the source, then press <kbd class="font-mono text-[10px] font-normal"
            >⌘ ↵</kbd
          > to make the first proof.
        </p>
      </div>
    {/if}
  </div>

  <Diagnostics diagnostics={state.diagnostics} onSelect={onDiagnosticSelect} />
</div>
