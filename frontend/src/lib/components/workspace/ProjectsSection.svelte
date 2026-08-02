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

{#each data.projects as entry, index (entry.id)}
  <EntryCard
    title={entry.name || 'New project'}
    {index}
    total={data.projects.length}
    onMove={(direction) => onMove(index, direction)}
    onRemove={() => onRemove(entry.id)}>
    <Field
      label="Project name"
      required
      path={`projects.${entry.id}.name`}
      error={fieldError(`projects.${entry.id}.name`)}
      bind:value={entry.name} />
    <Field label="Role" bind:value={entry.role} />
    <Field label="Dates" bind:value={entry.dates} />
    <Field
      label="URL"
      type="url"
      path={`projects.${entry.id}.url`}
      error={fieldError(`projects.${entry.id}.url`)}
      bind:value={entry.url} />
    <Field
      wide
      multiline
      label="Description"
      path={`projects.${entry.id}.description`}
      required
      error={fieldError(`projects.${entry.id}.description`)}
      bind:value={entry.description} />
    <Field wide multiline label="Highlights (one per line)" bind:value={entry.highlights} />
    <Field wide label="Tools" bind:value={entry.tools} />
  </EntryCard>
{/each}
<AddButton label="project" {onAdd} />
