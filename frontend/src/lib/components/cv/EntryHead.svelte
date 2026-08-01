<script lang="ts">
  export let title: string;
  export let index: number;
  export let total: number;
  export let onMove: (direction: -1 | 1) => void;
  export let onRemove: () => void;
</script>

<header class="entry-head">
  <h3>{title}</h3>
  <div class="flex gap-1">
    <button
      class="text-button"
      type="button"
      aria-label={`Move ${title} up`}
      disabled={index === 0}
      on:click={() => onMove(-1)}>
      ↑
    </button>
    <button
      class="text-button"
      type="button"
      aria-label={`Move ${title} down`}
      disabled={index === total - 1}
      on:click={() => onMove(1)}>
      ↓
    </button>
    <button class="text-button" type="button" aria-label={`Remove ${title}`} on:click={onRemove}>
      Remove
    </button>
  </div>
</header>
