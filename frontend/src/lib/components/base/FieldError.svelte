<script lang="ts">
  export let id: string;
  export let message: string | undefined = undefined;
</script>

{#if message}
  <small class="field-error" {id}>{message}</small>
{/if}

<style>
  .field-error {
    display: block;
    margin-top: 6px;
    color: var(--danger);
    font-family: var(--mono);
    font-size: 10px;
    line-height: 1.4;
  }
</style>
