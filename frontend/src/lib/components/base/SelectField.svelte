<script lang="ts">
  import FieldError from './FieldError.svelte';
  import { describedBy, fieldErrorId, toFieldId, type SelectOption } from './field';

  export let label: string;
  export let value = '';
  export let options: SelectOption[] = [];
  export let id: string | undefined = undefined;
  export let path: string | undefined = undefined;
  export let error: string | undefined = undefined;
  export let help: string | undefined = undefined;
  export let placeholder: string | undefined = undefined;
  export let wide = false;
  export let disabled = false;
  export let required = false;
  export let name: string | undefined = undefined;
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
  $: selectClass = ['cv-input', $$restProps.class].filter(Boolean).join(' ');
</script>

<label class:col-span-2={wide} class={className}>
  <span>
    {label}{#if required}<b aria-hidden="true">*</b>
      <span class="sr-only">(required)</span>{/if}
  </span>
  {#if help}<small class="field-help" id={helpId}>{help}</small>{/if}
  <select
    {...$$restProps}
    class={selectClass}
    id={fieldId}
    data-path={path}
    bind:value
    {disabled}
    {required}
    {name}
    aria-required={required ? 'true' : undefined}
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={ariaDescribedBy}
    aria-errormessage={error ? errorId : undefined}
    on:change>
    {#if placeholder}<option value="" disabled>{placeholder}</option>{/if}
    {#each options as option (option.value)}
      <option value={option.value} disabled={option.disabled}>{option.label}</option>
    {/each}
    <slot />
  </select>
  <FieldError id={errorId} message={error} />
</label>

<style>
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
