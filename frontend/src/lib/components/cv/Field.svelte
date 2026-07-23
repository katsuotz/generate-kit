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
  const classes =
    'w-full border-0 border-b border-[var(--rule)] bg-transparent px-0 py-2 text-[17px] text-[var(--ink)] outline-none transition-colors placeholder:text-[#9a8f84] focus:border-[var(--copper)] disabled:opacity-50';
</script>

<label class:col-span-2={wide}>
  <span>{label}</span>
  {#if multiline}
    <textarea
      class={`${classes} min-h-[86px] resize-y leading-[1.45]`}
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
