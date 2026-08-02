<script lang="ts">
  import { Button } from '../base';

  export let label: string;
  export let onAdd: () => void;
</script>

<Button variant="text" className="add-button" onClick={onAdd}>
  + Add {label}
</Button>
