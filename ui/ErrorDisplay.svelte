<script lang="ts">
  export let error: Error | string;
  
  $: errorMessage = error instanceof Error ? error.message : error;
</script>

<div class="error-display">
  <div class="error-icon">⚠️</div>
  <div class="error-content">
    <strong>Error in google-calendar block:</strong>
    <div class="error-message">{errorMessage}</div>
  </div>
</div>

<style>
  .error-display {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px;
    background: var(--background-modifier-error);
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    margin: 8px 0;
  }

  .error-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .error-content {
    flex: 1;
  }

  .error-content strong {
    color: var(--text-error);
    display: block;
    margin-bottom: 4px;
  }

  .error-message {
    color: var(--text-normal);
    font-family: var(--font-monospace);
    font-size: 0.9em;
    background: var(--background-primary);
    padding: 4px 6px;
    border-radius: 3px;
    margin-top: 4px;
  }
</style>