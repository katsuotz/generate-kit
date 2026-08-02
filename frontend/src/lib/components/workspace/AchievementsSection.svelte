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

{#each data.achievements as entry, index (entry.id)}
  <EntryCard
    title={entry.title || 'New achievement'}
    {index}
    total={data.achievements.length}
    onMove={(direction) => onMove(index, direction)}
    onRemove={() => onRemove(entry.id)}>
    <Field
      label="Title"
      required
      path={`achievements.${entry.id}.title`}
      error={fieldError(`achievements.${entry.id}.title`)}
      bind:value={entry.title} />
    <Field label="Category" bind:value={entry.category} />
    <Field label="Date" bind:value={entry.date} />
    <Field
      wide
      multiline
      label="Description"
      required
      path={`achievements.${entry.id}.description`}
      error={fieldError(`achievements.${entry.id}.description`)}
      bind:value={entry.description} />
  </EntryCard>
{/each}
<AddButton label="achievement" {onAdd} />
