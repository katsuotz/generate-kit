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

{#each data.education as entry, index (entry.id)}
  <EntryCard
    title={entry.qualification || 'New education'}
    {index}
    total={data.education.length}
    onMove={(direction) => onMove(index, direction)}
    onRemove={() => onRemove(entry.id)}>
    <Field
      label="Institution"
      required
      path={`education.${entry.id}.institution`}
      error={fieldError(`education.${entry.id}.institution`)}
      bind:value={entry.institution} />
    <Field
      label="Qualification"
      required
      path={`education.${entry.id}.qualification`}
      error={fieldError(`education.${entry.id}.qualification`)}
      bind:value={entry.qualification} />
    <Field label="Location" bind:value={entry.location} />
    <Field label="Start date" bind:value={entry.start} />
    <Field label="End date" bind:value={entry.end} />
    <Field label="GPA" bind:value={entry.gpa} />
  </EntryCard>
{/each}
<AddButton label="education" {onAdd} />
