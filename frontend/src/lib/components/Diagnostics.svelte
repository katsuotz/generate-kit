<script lang="ts">
  import type { PreviewDiagnostic } from '$lib/preview/types';

  export let diagnostics: PreviewDiagnostic[];
  export let onSelect: (line: number) => void;
</script>

{#if diagnostics.length > 0}
  <section class="diagnostics" aria-label="Compiler notes">
    <div class="diagnostics-heading">
      <span class="diagnostics-mark" aria-hidden="true">!</span>
      <div>
        <p>Compiler notes</p>
        <h3>
          Resolve {diagnostics.length === 1 ? 'this issue' : 'these issues'} before the next proof
        </h3>
      </div>
    </div>
    <ol>
      {#each diagnostics as diagnostic}
        <li>
          <button type="button" on:click={() => onSelect(diagnostic.line)}>
            <span class="diagnostic-location">Ln {diagnostic.line}:{diagnostic.column}</span>
            <span class="diagnostic-message">{diagnostic.message}</span>
            <code>{diagnostic.code}</code>
          </button>
        </li>
      {/each}
    </ol>
  </section>
{/if}

<style>
  .diagnostics {
    max-height: 220px;
    flex: 0 0 auto;
    overflow: auto;
    border-top: 1px solid #efc3bf;
    padding: 15px 18px 18px;
    background: var(--danger-soft);
    color: var(--ink);
  }

  .diagnostics-heading {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .diagnostics-mark {
    display: grid;
    width: 25px;
    height: 25px;
    flex: 0 0 auto;
    place-items: center;
    border: 1px solid #e29a94;
    border-radius: 50%;
    color: var(--danger);
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 700;
  }

  .diagnostics-heading p,
  .diagnostics-heading h3 {
    margin: 0;
  }

  .diagnostics-heading p {
    color: var(--danger);
    font-family: var(--mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .diagnostics-heading h3 {
    margin-top: 3px;
    font-size: 14px;
    font-weight: 700;
  }

  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li + li {
    margin-top: 6px;
  }

  button {
    display: grid;
    width: 100%;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    border: 1px solid #efc3bf;
    border-radius: 6px;
    padding: 9px 10px;
    background: rgb(255 255 255 / 62%);
    color: var(--ink);
    cursor: pointer;
    text-align: left;
  }

  button:hover {
    border-color: #d8867f;
    background: #fff;
  }

  .diagnostic-location,
  code {
    color: var(--danger);
    font-family: var(--mono);
    font-size: 9px;
    white-space: nowrap;
  }

  .diagnostic-message {
    min-width: 0;
    font-size: 13px;
  }

  @media (max-width: 800px) {
    button {
      grid-template-columns: auto minmax(0, 1fr);
    }

    code {
      display: none;
    }
  }
</style>
