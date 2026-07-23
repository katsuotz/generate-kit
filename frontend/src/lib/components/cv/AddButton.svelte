<script lang="ts">
  export let label: string;
  export let onAdd: () => void;
</script>

<button
  class="mb-6 w-full border border-dashed border-[#a88f7e] bg-[rgba(255,255,255,.18)] px-5 py-4 font-mono text-[10px] uppercase tracking-[.12em] text-[var(--copper-dark)] hover:bg-[rgba(255,255,255,.45)]"
  type="button"
  on:click={onAdd}>
  + Add {label}
</button>
