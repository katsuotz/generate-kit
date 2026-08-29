<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import FieldError from './FieldError.svelte';
  import { describedBy, fieldErrorId, toFieldId } from './field';

  export let label: string;
  export let value = '';
  export let id: string | undefined = undefined;
  export let path: string | undefined = undefined;
  export let error: string | undefined = undefined;
  export let help: string | undefined = undefined;
  export let wide = false;
  export let disabled = false;
  export let required = false;
  export let readonly = false;
  export let rows = 4;
  export let name: string | undefined = undefined;
  export let placeholder: string | undefined = undefined;
  export let autocomplete: HTMLTextareaAttributes['autocomplete'] = undefined;
  export let describedById: string | undefined = undefined;
  export let className = '';

  $: fieldId = id ?? toFieldId(path ?? label, 'field');
  $: errorId = fieldErrorId(fieldId);
  $: helpId = help ? `${fieldId}-help` : undefined;
  $: ariaDescribedBy = describedBy(
    fieldId,
    Boolean(error),
    [describedById, helpId].filter(Boolean).join(' ') || undefined
  );
  $: inputClass = ['cv-input', 'cv-textarea', $$restProps.class].filter(Boolean).join(' ');
</script>

<label class:col-span-2={wide} class={className}>
  <span class="field-label">
    {label}{#if required}<b aria-hidden="true">*</b>
      <span class="sr-only">(required)</span>{/if}
  </span>
  {#if help}<small class="field-help" id={helpId}>{help}</small>{/if}
  <textarea
    {...$$restProps}
    class={inputClass}
    id={fieldId}
    data-path={path}
    bind:value
    {disabled}
    {readonly}
    {required}
    {rows}
    {name}
    {placeholder}
    {autocomplete}
    aria-required={required ? 'true' : undefined}
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={ariaDescribedBy}
    aria-errormessage={error ? errorId : undefined}
    on:input
    on:change
    on:blur>
  </textarea>
  <FieldError id={errorId} message={error} />
</label>

<style>
  :global(.cv-textarea) {
    min-height: 96px;
    resize: vertical;
  }

  label {
    display: block;
  }

  .field-help {
    display: block;
    margin: -2px 0 7px;
    color: var(--muted-ink);
    font-size: 12px;
    line-height: 1.4;
  }
</style>
