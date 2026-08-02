<script lang="ts">
  import { Button } from '../base';

  export let title: string;
  export let index: number;
  export let total: number;
  export let onMove: (direction: -1 | 1) => void;
  export let onRemove: () => void;
</script>

<header class="entry-head">
  <h3>{title}</h3>
  <div class="flex gap-1">
    <Button
      variant="text"
      aria-label={`Move ${title} up`}
      disabled={index === 0}
      onClick={() => onMove(-1)}>
      ↑
    </Button>
    <Button
      variant="text"
      aria-label={`Move ${title} down`}
      disabled={index === total - 1}
      onClick={() => onMove(1)}>
      ↓
    </Button>
    <Button variant="text" aria-label={`Remove ${title}`} onClick={onRemove}>Remove</Button>
  </div>
</header>
