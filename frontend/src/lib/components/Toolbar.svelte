<script lang="ts">
  export let status: 'idle' | 'loading' | 'success' | 'empty' | 'failure';
  export let dirty: boolean;
  export let onCompile: () => void;
</script>

<header
  class="relative z-[5] grid grid-cols-[minmax(210px,1fr)_minmax(260px,1.5fr)_minmax(300px,1fr)] items-center gap-6 border-b-[3px] border-b-double border-b-[rgba(221,196,169,0.25)] bg-[#28231f] px-[30px] text-[#eee7dd] shadow-[0_8px_30px_rgba(35,27,22,0.2)] max-[800px]:grid-cols-[1fr_auto] max-[800px]:gap-2.5 max-[800px]:px-[15px]"
  aria-label="Document toolbar"
>
  <div class="flex items-center gap-[13px]">
    <span
      class="grid h-[43px] w-9 rotate-[-2deg] place-items-center border border-[#b16a4d] text-[25px] leading-none text-[#d58c6d] shadow-[inset_0_0_0_3px_#28231f,inset_0_0_0_4px_rgba(177,106,77,0.45)] max-[800px]:h-9 max-[800px]:w-[30px] max-[800px]:text-[21px]"
      aria-hidden="true">L</span
    >
    <div>
      <p
        class="mb-[3px] font-mono text-[9px] font-medium uppercase leading-[1.2] tracking-[0.17em] max-[800px]:hidden"
      >
        Proofing desk · 01
      </p>
      <h1 class="m-0 text-2xl font-medium tracking-[0.015em] max-[800px]:text-xl">Marginalia</h1>
    </div>
  </div>

  <div
    class="flex items-center justify-self-center gap-[11px] max-[800px]:hidden"
    aria-label="Current document"
  >
    <span class="text-[19px] text-[#b76b4c]" aria-hidden="true">§</span>
    <div>
      <p class="m-0 text-[15px]">Notes on quiet systems</p>
      <p
        class="m-[3px_0_0] font-mono text-[9px] font-light leading-none tracking-[0.05em] text-[#a9a097]"
      >
        {dirty ? 'Unpreviewed changes' : 'Preview is current'}
      </p>
    </div>
  </div>

  <div class="flex items-center justify-end gap-[18px]">
    <div
      class={`flex items-center gap-2 font-mono text-[10px] uppercase leading-none tracking-[0.08em] text-[#bcb3aa] max-[800px]:hidden ${status === 'failure' ? 'text-[#d77a53]' : ''}`}
      role="status"
    >
      <span
        class={`h-2 w-2 rounded-full border border-[#bd795c] bg-[#9b593d] ${status === 'failure' ? 'bg-[#d77a53] shadow-[0_0_0_3px_rgba(215,122,83,0.15)]' : ''} ${status === 'loading' ? 'animate-[spin_700ms_linear_infinite] border-t-transparent bg-transparent' : ''}`}
        aria-hidden="true"
      ></span>
      <span
        >{status === 'loading'
          ? 'Setting type'
          : status === 'failure'
            ? 'Needs revision'
            : status === 'success'
              ? 'Proof ready'
              : 'Draft'}</span
      >
    </div>
    <button
      class="flex min-w-[142px] items-center justify-between gap-[18px] border border-[#c87a59] bg-[#9e4b2f] px-4 py-[11px] pb-[10px] font-mono text-[11px] font-medium uppercase leading-none tracking-[0.07em] text-[#fff8ef] shadow-[3px_3px_0_#171411] transition hover:-translate-x-px hover:-translate-y-px hover:bg-[#b15a39] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#c87a59] disabled:cursor-wait disabled:opacity-70 max-[800px]:min-w-[104px] max-[800px]:justify-center max-[800px]:px-[13px] max-[800px]:py-2.5"
      type="button"
      on:click={onCompile}
      disabled={status === 'loading'}
    >
      <span>{status === 'loading' ? 'Rendering…' : 'Preview'}</span>
      <kbd class="font-mono text-[10px] font-normal text-[#e3b9a7] max-[800px]:hidden">⌘ ↵</kbd>
    </button>
  </div>
</header>
