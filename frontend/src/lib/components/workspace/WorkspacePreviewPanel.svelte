<script lang="ts">
  import { Button } from '../base';
  import PreviewPane from '../PreviewPane.svelte';
  import type { PreviewState } from '$lib/workspace/previewController';

  export let state: PreviewState;
  export let advanced: boolean;
  export let dirty: boolean;
  export let lastGeneratedSource: string;
  export let hidden = false;
  export let onCopySource: () => void;
  export let onDownloadText: () => void;
  export let onDownloadPdf: () => void;
  export let onDiagnosticSelect: () => void;
</script>

<section class="preview-panel" class:mobile-hidden={hidden} aria-label="Rendered preview">
  {#if advanced}
    <div class="source-panel">
      <div class="source-header">
        <div>
          <p class="panel-kicker">Generated source</p>
          <h2>LaTeX source</h2>
        </div>
        <div class="source-actions">
          <Button
            variant="secondary"
            className="source-action"
            onClick={onCopySource}
            disabled={!lastGeneratedSource}>
            Copy
          </Button>
          <Button
            variant="secondary"
            className="source-action"
            onClick={onDownloadText}
            disabled={!lastGeneratedSource}>
            Download .tex
          </Button>
        </div>
      </div>
      <pre class="source-code">{lastGeneratedSource ||
          'Generate your CV to inspect its exact LaTeX source.'}</pre>
    </div>
  {:else}
    <div class="preview-header">
      <div>
        <p class="panel-kicker">Rendered proof</p>
        <h2>Preview</h2>
      </div>
      <div class="preview-actions">
        {#if state.lastSuccess && (dirty || state.status === 'failure')}
          <span class="proof-badge is-stale">Last successful proof</span>
        {/if}
        {#if state.lastSuccess?.representation === 'pdf'}
          <Button variant="text" onClick={onDownloadPdf}>Download PDF</Button>
        {/if}
      </div>
    </div>
    <div class="preview-body">
      <PreviewPane {state} {onDiagnosticSelect} />
    </div>
  {/if}
</section>

<style>
  .preview-panel {
    display: flex;
    min-height: 0;
    flex-direction: column;
    background: #e5eaf0;
  }

  .preview-header,
  .source-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid var(--rule);
    padding: 14px 20px;
    background: var(--surface-subtle);
  }

  .preview-header h2,
  .source-header h2,
  .preview-header p,
  .source-header p {
    margin: 0;
  }

  .preview-header h2,
  .source-header h2 {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .preview-actions,
  .source-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .proof-badge {
    border: 1px solid var(--rule-strong);
    border-radius: 5px;
    padding: 6px 8px;
    color: var(--muted-ink);
    font-family: var(--mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .proof-badge.is-stale {
    border-color: #e8c57f;
    background: var(--warning-soft);
    color: var(--warning);
  }

  .preview-body {
    min-height: 0;
    flex: 1;
  }

  .source-panel {
    display: flex;
    min-height: 0;
    height: 100%;
    flex-direction: column;
    background: #18222d;
    color: #f1f5f8;
  }

  .source-panel .source-header {
    border-color: #354554;
    background: #202d39;
  }

  .source-panel .panel-kicker {
    color: #9bbbe7;
  }

  .source-panel .source-header h2 {
    color: #fff;
  }

  :global(.source-panel .source-action) {
    border-color: #66798a;
    background: transparent;
    color: #e8f1ff;
  }

  .source-code {
    min-height: 0;
    flex: 1;
    margin: 0;
    overflow: auto;
    padding: 22px;
    color: #d5e2ee;
    font-family: var(--mono);
    font-size: 11px;
    line-height: 1.65;
    white-space: pre-wrap;
  }

  @media (max-width: 900px) {
    .mobile-hidden {
      display: none !important;
    }

    .preview-panel {
      height: 100%;
    }
  }

  @media (max-width: 560px) {
    .preview-header,
    .source-header {
      align-items: flex-start;
      flex-direction: column;
      padding: 13px 16px;
    }

    .preview-actions,
    .source-actions {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>
