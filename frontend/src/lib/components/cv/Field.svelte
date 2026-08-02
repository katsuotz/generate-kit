<script lang="ts">
  import { TextareaField, TextField } from '../base';

  export let label: string;
  export let value = '';
  export let path: string | undefined = undefined;
  export let error: string | undefined = undefined;
  export let multiline = false;
  export let wide = false;
  export let disabled = false;
  export let type = 'text';
  export let required = false;
  $: className = wide ? 'col-span-2 max-[560px]:col-span-1' : '';
</script>

{#if multiline}
  <TextareaField {label} {path} {error} {disabled} {required} {className} bind:value />
{:else}
  <TextField {label} {path} {error} {disabled} {required} {type} {className} bind:value />
{/if}
