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

{#each data.skills as entry, index (entry.id)}
  <EntryCard
    title={entry.category || 'New skill category'}
    {index}
    total={data.skills.length}
    onMove={(direction) => onMove(index, direction)}
    onRemove={() => onRemove(entry.id)}>
    <Field
      label="Category"
      required
      path={`skills.${entry.id}.category`}
      error={fieldError(`skills.${entry.id}.category`)}
      bind:value={entry.category} />
    <Field
      label="Skills"
      required
      path={`skills.${entry.id}.skills`}
      error={fieldError(`skills.${entry.id}.skills`)}
      bind:value={entry.skills} />
  </EntryCard>
{/each}
<AddButton label="skill category" {onAdd} />
