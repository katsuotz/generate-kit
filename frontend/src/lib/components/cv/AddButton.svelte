<script lang="ts">
  export let label: string;
  export let onAdd: () => void;
</script>

<button class="add-button" type="button" on:click={onAdd}>
  + Add {label}
</button>
