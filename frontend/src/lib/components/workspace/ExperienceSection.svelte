<script lang="ts">
  import type { CvData } from '$lib/cv/model';
  import { CheckboxField } from '../base';
  import Field from '../cv/Field.svelte';
  import AddButton from '../cv/AddButton.svelte';
  import EntryCard from './EntryCard.svelte';

  export let data: CvData;
  export let fieldError: (path: string) => string | undefined;
  export let onMove: (index: number, direction: -1 | 1) => void;
  export let onRemove: (id: string) => void;
  export let onAdd: () => void;
</script>

{#each data.experience as entry, index (entry.id)}
  <EntryCard
    title={entry.role || 'New experience'}
    {index}
    total={data.experience.length}
    onMove={(direction) => onMove(index, direction)}
    onRemove={() => onRemove(entry.id)}>
    <Field
      label="Role"
      required
      path={`experience.${entry.id}.role`}
      error={fieldError(`experience.${entry.id}.role`)}
      bind:value={entry.role} />
    <Field
      label="Organization"
      required
      path={`experience.${entry.id}.organization`}
      error={fieldError(`experience.${entry.id}.organization`)}
      bind:value={entry.organization} />
    <Field label="Location" bind:value={entry.location} />
    <Field label="Start date" bind:value={entry.start} />
    <Field label="End date" bind:value={entry.end} disabled={entry.current} />
    <CheckboxField className="check" label="Current role" bind:checked={entry.current} />
    <Field wide multiline label="Description" bind:value={entry.description} />
    <Field wide multiline label="Highlights (one per line)" bind:value={entry.highlights} />
    <Field wide label="Tools" bind:value={entry.tools} />
  </EntryCard>
{/each}
<AddButton label="experience" {onAdd} />
