<script lang="ts">
  import EntryHead from '../cv/EntryHead.svelte';

  export let title: string;
  export let index: number;
  export let total: number;
  export let onMove: (direction: -1 | 1) => void;
  export let onRemove: () => void;
</script>

<article class="entry-card">
  <EntryHead {title} {index} {total} {onMove} {onRemove} />
  <div class="form-grid">
    <slot />
  </div>
</article>
