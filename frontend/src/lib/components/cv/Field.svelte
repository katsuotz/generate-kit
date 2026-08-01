<script lang="ts">
  export let label: string;
  export let value = '';
  export let path: string | undefined = undefined;
  export let error: string | undefined = undefined;
  export let multiline = false;
  export let wide = false;
  export let disabled = false;
  export let type = 'text';
  export let required = false;
  $: fieldId = `cv-${(path ?? label).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  $: errorId = `${fieldId}-error`;
  const classes = 'cv-input';
</script>

<label class:col-span-2={wide}>
  <span>{label}</span>
  {#if multiline}
    <textarea
      class={`${classes} cv-textarea`}
      id={fieldId}
      data-path={path}
      bind:value
      {disabled}
      {required}
      aria-required={required}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? errorId : undefined}
      aria-errormessage={error ? errorId : undefined}>
    </textarea>
  {:else}
    <input
      class={classes}
      id={fieldId}
      data-path={path}
      bind:value
      {disabled}
      {type}
      {required}
      aria-required={required}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? errorId : undefined}
      aria-errormessage={error ? errorId : undefined} />
  {/if}
  {#if error}<small class="field-error" id={errorId}>{error}</small>{/if}
</label>
