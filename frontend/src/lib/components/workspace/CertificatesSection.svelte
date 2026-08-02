<script lang="ts">
  import type { CvData } from '$lib/cv/model';
  import Field from '../cv/Field.svelte';
  import AddButton from '../cv/AddButton.svelte';
  import EntryCard from './EntryCard.svelte';

  export let data: CvData;
  export let fieldError: (path: string) => string | undefined;
  export let onMove: (index: number, direction: -1 | 1) => void;
  export let onRemove: (id: string) => void;
  export let onAdd: () => void;
</script>

{#each data.certificates as entry, index (entry.id)}
  <EntryCard
    title={entry.name || 'New certificate'}
    {index}
    total={data.certificates.length}
    onMove={(direction) => onMove(index, direction)}
    onRemove={() => onRemove(entry.id)}>
    <Field
      label="Certificate"
      required
      path={`certificates.${entry.id}.name`}
      error={fieldError(`certificates.${entry.id}.name`)}
      bind:value={entry.name} />
    <Field
      label="Issuer"
      required
      path={`certificates.${entry.id}.issuer`}
      error={fieldError(`certificates.${entry.id}.issuer`)}
      bind:value={entry.issuer} />
    <Field label="Date" bind:value={entry.date} />
    <Field
      label="Credential URL"
      type="url"
      path={`certificates.${entry.id}.credentialUrl`}
      error={fieldError(`certificates.${entry.id}.credentialUrl`)}
      bind:value={entry.credentialUrl} />
  </EntryCard>
{/each}
<AddButton label="certificate" {onAdd} />
