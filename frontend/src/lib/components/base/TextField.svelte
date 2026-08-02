<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
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
  export let type: HTMLInputAttributes['type'] = 'text';
  export let name: string | undefined = undefined;
  export let placeholder: string | undefined = undefined;
  export let autocomplete: HTMLInputAttributes['autocomplete'] = undefined;
  export let inputmode:
    | 'none'
    | 'text'
    | 'decimal'
    | 'numeric'
    | 'tel'
    | 'search'
    | 'email'
    | 'url'
    | undefined = undefined;
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
  $: inputClass = ['cv-input', $$restProps.class].filter(Boolean).join(' ');
</script>

<label class:col-span-2={wide} class={className}>
  <span>
    {label}{#if required}<b aria-hidden="true">*</b>
      <span class="sr-only">(required)</span>{/if}
  </span>
  {#if help}<small class="field-help" id={helpId}>{help}</small>{/if}
  <input
    {...$$restProps}
    class={inputClass}
    id={fieldId}
    data-path={path}
    bind:value
    {disabled}
    {readonly}
    {required}
    {type}
    {name}
    {placeholder}
    {autocomplete}
    {inputmode}
    aria-required={required ? 'true' : undefined}
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={ariaDescribedBy}
    aria-errormessage={error ? errorId : undefined}
    on:input
    on:change
    on:blur />
  <FieldError id={errorId} message={error} />
</label>

<style>
  :global(label > span),
  :global(.form-label) {
    display: block;
    margin-bottom: 7px;
    color: var(--muted-ink);
    font-family: var(--mono);
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.08em;
    line-height: 1.3;
    text-transform: uppercase;
  }

  :global(label > span b) {
    color: var(--blue);
  }

  :global(.cv-input) {
    width: 100%;
    min-height: 42px;
    border: 1px solid var(--rule-strong);
    border-radius: 6px;
    padding: 9px 11px;
    background: var(--surface);
    color: var(--ink);
    font-size: 15px;
    line-height: 1.4;
    outline: none;
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease,
      background-color 180ms ease;
  }

  :global(.cv-input::placeholder) {
    color: #8b98a4;
  }

  :global(.cv-input:focus) {
    border-color: var(--blue);
    box-shadow: 0 0 0 3px rgb(23 105 210 / 14%);
  }

  :global(.cv-input:disabled) {
    background: var(--surface-subtle);
    color: var(--quiet-ink);
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

  :global(.field-error) {
    display: block;
  }
</style>
