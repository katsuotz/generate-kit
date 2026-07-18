<script lang="ts">
  import type { PreviewDiagnostic } from '$lib/preview/types';

  export let diagnostics: PreviewDiagnostic[];
  export let onSelect: (line: number) => void;
</script>

{#if diagnostics.length > 0}
  <section
    class="max-h-[180px] shrink-0 overflow-auto border-t border-[#9f6f5a] bg-[#674234] px-5 pb-[18px] pt-4 text-[#f4e8dd]"
    aria-label="Compiler notes"
  >
    <div class="mb-2.5 flex items-center gap-3">
      <span
        class="grid h-6 w-6 place-items-center rounded-full border border-[#d69c83] font-mono text-xs font-medium"
        aria-hidden="true">!</span
      >
      <div>
        <p
          class="mb-[3px] font-mono text-[9px] font-medium uppercase leading-[1.2] tracking-[0.17em] text-[#d6a48e]"
        >
          Compiler notes
        </p>
        <h3 id="diagnostics-title" class="m-0 text-base font-medium">
          One passage needs attention
        </h3>
      </div>
    </div>
    <ol class="m-0 list-none p-0">
      {#each diagnostics as diagnostic}
        <li>
          <button
            class="grid w-full grid-cols-[auto_1fr_auto] items-center gap-[11px] border-0 bg-[rgba(28,17,12,0.2)] px-2.5 py-[9px] text-left text-[#f0e4da] hover:bg-[rgba(28,17,12,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#d69c83] max-[800px]:grid-cols-[auto_1fr]"
            type="button"
            on:click={() => onSelect(diagnostic.line)}
          >
            <span class="font-mono text-[9px] font-normal leading-none text-[#dcb09d]"
              >Ln {diagnostic.line}:{diagnostic.column}</span
            >
            <span>{diagnostic.message}</span>
            <code
              class="font-mono text-[9px] font-normal leading-none text-[#dcb09d] max-[800px]:hidden"
              >{diagnostic.code}</code
            >
          </button>
        </li>
      {/each}
    </ol>
  </section>
{/if}
