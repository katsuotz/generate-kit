<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'text' = 'primary';
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let disabled = false;
  export let loading = false;
  export let className = '';
  export let onClick: (event: MouseEvent) => void = () => undefined;

  $: buttonClass = [
    variant === 'text' ? 'text-button' : 'button',
    variant !== 'text' ? `button-${variant}` : '',
    className,
    $$restProps.class
  ]
    .filter(Boolean)
    .join(' ');
</script>

<button
  {...$$restProps}
  class={buttonClass}
  {type}
  disabled={disabled || loading}
  aria-busy={loading ? 'true' : undefined}
  on:click={onClick}
  on:click>
  {#if loading}<span class="button-loading" aria-hidden="true">…</span>{/if}
  <slot />
</button>

<style>
  :global(.button) {
    display: inline-flex;
    min-height: 36px;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px solid transparent;
    border-radius: 7px;
    padding: 0 14px;
    cursor: pointer;
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    line-height: 1;
    text-transform: uppercase;
    transition:
      background-color 180ms ease,
      border-color 180ms ease,
      color 180ms ease,
      transform 180ms ease;
  }

  :global(.button-primary) {
    background: var(--blue);
    color: #fff;
  }

  :global(.button-primary:hover:not(:disabled)) {
    background: var(--blue-dark);
    transform: translateY(-1px);
  }

  :global(.button-secondary) {
    border-color: var(--rule-strong);
    background: var(--surface);
    color: var(--ink);
  }

  :global(.button-secondary:hover:not(:disabled)) {
    border-color: var(--blue);
    color: var(--blue-dark);
  }

  :global(.text-button) {
    border: 0;
    background: transparent;
    padding: 7px 8px;
    color: var(--blue-dark);
    cursor: pointer;
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  :global(.text-button:hover:not(:disabled)) {
    color: var(--blue);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  :global(.button:disabled),
  :global(.text-button:disabled) {
    cursor: not-allowed;
    opacity: 0.45;
  }

  :global(.add-button) {
    width: 100%;
    margin-bottom: 18px;
    border: 1px dashed var(--rule-strong);
    border-radius: 7px;
    padding: 13px 16px;
    background: transparent;
    color: var(--blue-dark);
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  :global(.add-button:hover:not(:disabled)) {
    border-color: var(--blue);
    background: var(--blue-soft);
  }

  .button-loading {
    display: inline-block;
    margin-right: 0.35em;
  }
</style>
