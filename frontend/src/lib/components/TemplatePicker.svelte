<script lang="ts">
  import { onMount } from 'svelte';
  import type { CvTemplateSummary } from '$lib/api';
  import { RadioCard } from './base';
  import PdfPreview from './PdfPreview.svelte';

  export let templates: CvTemplateSummary[] = [];
  export let selectedId = '';
  export let loadPreview: (templateId: string, signal?: AbortSignal) => Promise<ArrayBuffer>;
  export let onSelect: (templateId: string) => void;

  type PreviewState = { status: 'loading' | 'ready' | 'error'; data?: ArrayBuffer };
  let previews: Record<string, PreviewState> = {};
  let mounted = false;
  const requested = new Set<string>();
  const requests = new Map<string, AbortController>();

  $: if (mounted) syncPreviews(templates);

  function syncPreviews(nextTemplates: CvTemplateSummary[]) {
    const ids = new Set(nextTemplates.map((template) => template.id));
    for (const [templateId, controller] of requests) {
      if (!ids.has(templateId)) {
        controller.abort();
        requests.delete(templateId);
        requested.delete(templateId);
      }
    }

    for (const template of nextTemplates) {
      if (!requested.has(template.id)) requestPreview(template.id);
    }
  }

  function requestPreview(templateId: string) {
    requested.add(templateId);
    const controller = new AbortController();
    requests.set(templateId, controller);
    previews = { ...previews, [templateId]: { status: 'loading' } };
    void loadPreview(templateId, controller.signal)
      .then((data) => {
        if (controller.signal.aborted || requests.get(templateId) !== controller) return;
        requests.delete(templateId);
        previews = { ...previews, [templateId]: { status: 'ready', data } };
      })
      .catch(() => {
        if (controller.signal.aborted || requests.get(templateId) !== controller) return;
        requests.delete(templateId);
        previews = { ...previews, [templateId]: { status: 'error' } };
      });
  }

  function retryPreview(templateId: string) {
    requested.delete(templateId);
    requestPreview(templateId);
  }

  onMount(() => {
    mounted = true;
    syncPreviews(templates);
    return () => {
      mounted = false;
      for (const controller of requests.values()) controller.abort();
      requests.clear();
    };
  });

  function handlePreviewError(templateId: string) {
    previews = { ...previews, [templateId]: { status: 'error' } };
  }
</script>

<fieldset class="template-picker" aria-describedby="template-picker-help">
  <legend>Choose a template</legend>
  <p id="template-picker-help" class="template-picker-help">
    Select the visual system for your CV. You can switch before generating again.
  </p>
  <div class="template-grid" role="radiogroup" aria-label="CV templates">
    {#each templates as template (template.id)}
      {@const preview = previews[template.id]}
      <div class="template-option">
        <RadioCard
          className="template-card"
          label={template.name}
          description={template.description}
          name="cv-template"
          value={template.id}
          checked={selectedId === template.id}
          aria-label={`Use ${template.name} template`}
          onChange={() => onSelect(template.id)}>
          <span class="template-preview">
            {#if preview?.status === 'ready' && preview.data}
              <PdfPreview
                data={preview.data.slice(0)}
                firstPageOnly
                compact
                onError={() => handlePreviewError(template.id)} />
            {:else if preview?.status === 'loading'}
              <span class="template-loading">Loading preview…</span>
            {:else}
              <span class="template-fallback">
                <span class="fallback-mark">{template.name.slice(0, 1).toUpperCase()}</span>
                <span>Preview unavailable</span>
              </span>
            {/if}
          </span>
        </RadioCard>
        {#if preview?.status === 'error'}
          <button
            class="template-retry"
            type="button"
            aria-label={`Retry ${template.name} preview`}
            on:click={() => retryPreview(template.id)}>
            Retry preview
          </button>
        {/if}
      </div>
    {/each}
  </div>
</fieldset>

<style>
  .template-picker {
    min-width: 0;
    margin: 0 0 28px;
    border: 0;
    padding: 0;
  }

  legend {
    margin-bottom: 7px;
    color: var(--ink);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .template-picker-help {
    margin: 0 0 14px;
    color: var(--muted-ink);
    font-size: 13px;
    line-height: 1.45;
  }

  .template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  :global(.template-card) {
    position: relative;
    display: grid;
    min-width: 0;
    border: 1px solid var(--rule-strong);
    border-radius: 8px;
    padding: 8px;
    background: var(--surface-raised);
    color: var(--ink);
    cursor: pointer;
    text-align: left;
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease,
      transform 180ms ease;
  }

  :global(.template-card:hover) {
    border-color: var(--blue);
    transform: translateY(-1px);
  }

  :global(.template-card:focus-within) {
    border-color: var(--blue);
    box-shadow: 0 0 0 3px rgb(23 105 210 / 14%);
  }

  :global(.template-card.selected) {
    border-color: var(--blue);
    box-shadow: 0 0 0 3px rgb(23 105 210 / 14%);
  }

  .template-preview {
    display: grid;
    min-height: 184px;
    place-items: center;
    overflow: hidden;
    border: 1px solid var(--rule);
    background: #e5eaf0;
  }

  .template-option {
    min-width: 0;
  }

  .template-retry {
    display: block;
    margin: 7px auto 0;
    border: 0;
    background: transparent;
    color: var(--blue-dark);
    cursor: pointer;
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .template-retry:hover {
    color: var(--blue);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .template-preview :global(.pdf-pages) {
    align-self: stretch;
  }

  .template-preview :global(canvas) {
    width: 100%;
    box-shadow: 0 5px 14px rgb(23 33 43 / 15%);
  }

  .template-loading,
  .template-fallback {
    color: var(--muted-ink);
    font-family: var(--mono);
    font-size: 9px;
    letter-spacing: 0.05em;
    text-align: center;
    text-transform: uppercase;
  }

  .template-fallback {
    display: grid;
    justify-items: center;
    gap: 10px;
  }

  .fallback-mark {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border: 1px solid var(--rule-strong);
    color: var(--blue-dark);
    font-size: 19px;
    font-weight: 700;
  }

  @media (max-width: 560px) {
    .template-grid {
      grid-template-columns: 1fr;
    }

    :global(.template-card) {
      grid-template-columns: 108px minmax(0, 1fr);
      column-gap: 12px;
    }

    :global(.template-card .radio-card-content) {
      display: contents;
    }

    .template-preview {
      grid-row: span 3;
      min-height: 148px;
    }
  }
</style>
