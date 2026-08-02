<script lang="ts">
  import { Button } from '../base';

  export let active: 'form' | 'preview';
  export let diagnosticsCount = 0;
  export let onSelect: (pane: 'form' | 'preview') => void;
</script>

<nav class="mobile-pane-nav" aria-label="Workspace view">
  <Button
    variant="text"
    className={active === 'form' ? 'active-tab' : ''}
    aria-pressed={active === 'form'}
    onClick={() => onSelect('form')}>
    Form
  </Button>
  <Button
    variant="text"
    className={active === 'preview' ? 'active-tab' : ''}
    aria-pressed={active === 'preview'}
    onClick={() => onSelect('preview')}>
    Preview
    {#if diagnosticsCount}<span class="tab-count">{diagnosticsCount}</span>{/if}
  </Button>
</nav>

<style>
  .mobile-pane-nav {
    display: none;
    grid-template-columns: repeat(2, 1fr);
    border-bottom: 1px solid var(--rule);
    background: var(--surface-subtle);
  }

  :global(.mobile-pane-nav > button) {
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

  :global(.mobile-pane-nav > button.text-button) {
    min-height: 44px;
    padding: 0;
  }

  :global(.mobile-pane-nav > button.active-tab) {
    color: var(--blue-dark);
  }

  :global(.mobile-pane-nav > button.active-tab::after) {
    position: absolute;
    right: 24%;
    bottom: -1px;
    left: 24%;
    height: 2px;
    background: var(--blue);
    content: '';
  }

  .tab-count {
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

  @media (max-width: 900px) {
    .mobile-pane-nav {
      display: grid;
    }
  }
</style>
