<script lang="ts">
  export let active: 'editor' | 'preview';
  export let diagnosticsCount: number;
  export let onSelect: (pane: 'editor' | 'preview') => void;
</script>

<nav class="mobile-nav" aria-label="Workspace panes">
  <button
    type="button"
    class:active={active === 'editor'}
    aria-pressed={active === 'editor'}
    on:click={() => onSelect('editor')}>
    Form
  </button>
  <button
    type="button"
    class:active={active === 'preview'}
    aria-pressed={active === 'preview'}
    on:click={() => onSelect('preview')}>
    Preview
    {#if diagnosticsCount}<span>{diagnosticsCount}</span>{/if}
  </button>
</nav>

<style>
  .mobile-nav {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    border-bottom: 1px solid var(--rule);
    background: var(--surface-subtle);
  }

  button {
    position: relative;
    min-height: 44px;
    border: 0;
    background: transparent;
    color: var(--muted-ink);
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  button.active {
    color: var(--blue-dark);
  }

  button.active::after {
    position: absolute;
    right: 24%;
    bottom: -1px;
    left: 24%;
    height: 2px;
    background: var(--blue);
    content: '';
  }

  span {
    display: inline-grid;
    min-width: 17px;
    height: 17px;
    margin-left: 5px;
    place-items: center;
    border-radius: 50%;
    background: var(--danger);
    color: #fff;
    font-size: 9px;
  }
</style>
