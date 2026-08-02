<script lang="ts">
  export let href: string;
  export let variant: 'primary' | 'secondary' | 'text' = 'secondary';
  export let disabled = false;
  export let className = '';
  export let onClick: (event: MouseEvent) => void = () => undefined;

  $: linkClass = [
    variant === 'text' ? 'text-button' : 'button',
    variant !== 'text' ? `button-${variant}` : '',
    className,
    $$restProps.class
  ]
    .filter(Boolean)
    .join(' ');

  function handleClick(event: MouseEvent) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick(event);
  }
</script>

<a
  {...$$restProps}
  class={linkClass}
  {href}
  aria-disabled={disabled ? 'true' : undefined}
  tabindex={disabled ? -1 : undefined}
  on:click={handleClick}
  on:click>
  <slot />
</a>
