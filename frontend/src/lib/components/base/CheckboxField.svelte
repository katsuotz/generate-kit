<script lang="ts">
  import FieldError from './FieldError.svelte';
  import { describedBy, fieldErrorId, toFieldId } from './field';

  export let label: string;
  export let checked = false;
  export let value: string | undefined = undefined;
  export let id: string | undefined = undefined;
  export let path: string | undefined = undefined;
  export let error: string | undefined = undefined;
  export let help: string | undefined = undefined;
  export let disabled = false;
  export let required = false;
  export let name: string | undefined = undefined;
  export let className = '';

  $: fieldId = id ?? toFieldId(path ?? label, 'field');
  $: errorId = fieldErrorId(fieldId);
  $: helpId = help ? `${fieldId}-help` : undefined;
  $: ariaDescribedBy = describedBy(fieldId, Boolean(error), helpId);
</script>

<label class={`check-field ${className}`}>
  <input
    {...$$restProps}
    id={fieldId}
    type="checkbox"
    bind:checked
    {value}
    {disabled}
    {required}
    {name}
    data-path={path}
    aria-required={required ? 'true' : undefined}
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={ariaDescribedBy}
    aria-errormessage={error ? errorId : undefined}
    on:change />
  <span class="check-field-copy">
    <span class="form-label">
      {label}{#if required}<b aria-hidden="true">*</b>{/if}
    </span>
    {#if help}<small class="field-help" id={helpId}>{help}</small>{/if}
  </span>
  <FieldError id={errorId} message={error} />
</label>

<style>
  .check-field {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    color: var(--muted-ink);
  }

  .check-field input {
    width: 16px;
    height: 16px;
    margin-top: 1px;
    accent-color: var(--blue);
  }

  .check-field-copy {
    min-width: 0;
  }

  .form-label {
    margin: 0;
  }

  .field-help {
    display: block;
    margin-top: 4px;
    color: var(--muted-ink);
    font-size: 12px;
    line-height: 1.4;
  }

  :global(.check-field > .field-error) {
    flex-basis: 100%;
  }
</style>
