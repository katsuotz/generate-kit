<script lang="ts">
  export let active: 'editor' | 'preview';
  export let diagnosticsCount: number;
  export let onSelect: (pane: 'editor' | 'preview') => void;
</script>

<nav
  class="hidden grid-cols-2 border-b border-[rgba(62,48,38,0.25)] bg-[#e4ddd2] max-[800px]:grid"
  aria-label="Workspace panes">
  <button
    type="button"
    class={`relative border-0 bg-transparent font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#786c62] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#a65333] ${active === 'editor' ? 'bg-[#f2ece3] text-[#6f321f] after:absolute after:bottom-0 after:left-[22%] after:right-[22%] after:h-0.5 after:bg-[#a65333]' : ''}`}
    aria-pressed={active === 'editor'}
    on:click={() => onSelect('editor')}>
    Source
  </button>
  <button
    type="button"
    class={`relative border-0 bg-transparent font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#786c62] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#a65333] ${active === 'preview' ? 'bg-[#f2ece3] text-[#6f321f] after:absolute after:bottom-0 after:left-[22%] after:right-[22%] after:h-0.5 after:bg-[#a65333]' : ''}`}
    aria-pressed={active === 'preview'}
    on:click={() => onSelect('preview')}>
    Proof {#if diagnosticsCount}<span
        class="ml-[5px] inline-grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#a65333] text-[8px] text-[#fff7ef]">
        {diagnosticsCount}
      </span>{/if}
  </button>
</nav>
