<script lang="ts">
  import FieldError from './FieldError.svelte';
  import { describedBy, fieldErrorId, toFieldId } from './field';

  export let label: string;
  export let value: string;
  export let checked = false;
  export let name: string;
  export let id: string | undefined = undefined;
  export let description: string | undefined = undefined;
  export let error: string | undefined = undefined;
  export let disabled = false;
  export let required = false;
  export let className = '';
  export let onChange: (value: string) => void = () => undefined;

  $: fieldId = id ?? toFieldId(`${name}-${value}`, 'radio');
  $: errorId = fieldErrorId(fieldId);
  $: descriptionId = description ? `${fieldId}-description` : undefined;
  $: ariaDescribedBy = describedBy(fieldId, Boolean(error), descriptionId);
  let ariaErrorAttributes: { 'aria-invalid'?: 'true'; 'aria-errormessage'?: string } = {};
  $: ariaErrorAttributes = error ? { 'aria-invalid': 'true', 'aria-errormessage': errorId } : {};

  function handleChange() {
    onChange(value);
  }
</script>

<label class:selected={checked} class="radio-card {className}" class:disabled>
  <input
    {...$$restProps}
    class="radio-card-input"
    id={fieldId}
    type="radio"
    {name}
    {value}
    {checked}
    {disabled}
    {required}
    aria-describedby={ariaDescribedBy}
    {...ariaErrorAttributes}
    on:change={handleChange}
    on:change />
  <span class="radio-card-content">
    <slot />
    <strong>{label}</strong>
    {#if description}<span id={descriptionId}>{description}</span>{/if}
    <span class="radio-card-state" aria-hidden="true">{checked ? 'Selected' : 'Select'}</span>
  </span>
  <FieldError id={errorId} message={error} />
</label>

<style>
  .radio-card {
    position: relative;
    display: block;
    border: 1px solid var(--rule-strong);
    border-radius: 8px;
    padding: 14px;
    background: var(--surface-raised);
    color: var(--ink);
    cursor: pointer;
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease,
      background-color 180ms ease;
  }

  .radio-card:hover {
    border-color: var(--blue);
  }

  .radio-card:focus-within,
  .radio-card.selected {
    border-color: var(--blue);
    box-shadow: 0 0 0 3px rgb(23 105 210 / 14%);
  }

  .radio-card.disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .radio-card-input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    cursor: inherit;
    opacity: 0;
  }

  .radio-card-content {
    display: grid;
    gap: 5px;
  }

  .radio-card-content strong {
    font-size: 14px;
  }

  .radio-card-content > span:not(.radio-card-state) {
    color: var(--muted-ink);
    font-size: 12px;
    line-height: 1.4;
  }

  .radio-card-state {
    color: var(--blue-dark);
    font-family: var(--mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }
</style>
