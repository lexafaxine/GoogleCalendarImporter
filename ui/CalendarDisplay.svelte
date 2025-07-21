<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { GoogleCalendarAPI } from "../googleCalendarAPI";
  import type { Query } from "../Injector/Query";
  export let api: GoogleCalendarAPI;
  export let query: Query;

  let loading = false;
  let error: string | null = null;
  let events: any[] = [];
  let tasks: any[] = [];
  let autoRefreshInterval: number | null = null;

  // Default values
  $: displayDate = query.date || getTodayString();
  $: refreshInterval = query.refreshInterval ?? 60;
  $: showEvents = query.showEvents ?? true;
  $: showTasks = query.showTasks ?? true;
  $: title = query.title || `📅 Calendar for ${displayDate}`;

  $: if (api) {
    fetchCalendarData();
  }

  onMount(() => {
    if (refreshInterval > 0) {
      autoRefreshInterval = window.setInterval(
        fetchCalendarData,
        refreshInterval * 1000
      );
    }
  });

  onDestroy(() => {
    if (autoRefreshInterval !== null) {
      clearInterval(autoRefreshInterval);
    }
  });

  function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  function formatTime(dateTimeString: string): string {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  async function fetchCalendarData() {
    if (loading) return;
    
    loading = true;
    error = null;

    try {
      if (!api) {
        throw new Error("Google Calendar API not initialized");
      }
      
      const calendarData = await api.getEventsAndTasksForDate(displayDate);
      if (!calendarData) {
        throw new Error("Failed to fetch calendar data. Please check your credentials.");
      }
      events = showEvents && calendarData.events ? calendarData.events.items || [] : [];
      tasks = showTasks && calendarData.tasks ? calendarData.tasks.items || [] : [];
    } catch (err) {
      //TODO: integrate error handling of API in component to show detail error message
      error = err instanceof Error ? err.message : "Unknown error occurred";
      events = [];
      tasks = [];
    } finally {
      loading = false;
    }
  }
</script>

<div class="google-calendar-display">
  <div class="calendar-header">
    <h4>{title}</h4>
    <button 
      class="refresh-button" 
      on:click={fetchCalendarData}
      disabled={loading}
      title="Refresh calendar data"
    >
      {loading ? 'Loading...' : 'Refresh'}
    </button>
  </div>

  {#if error}
    <div class="calendar-error">
      <strong>Error:</strong> {error}
    </div>
  {:else if events.length > 0 || tasks.length > 0}
    <div class="calendar-content">
      {#if events.length > 0}
        <h5>📅 Events</h5>
        <ul class="events-list">
          {#each events as event}
            {#if event.start?.dateTime && event.end?.dateTime && event.summary}
              <li class="event-item">
                <strong>{formatTime(event.start.dateTime)} - {formatTime(event.end.dateTime)}</strong>: {event.summary}
              </li>
            {/if}
          {/each}
        </ul>
      {/if}

      {#if tasks.length > 0}
        <h5>✅ Tasks</h5>
        <ul class="tasks-list">
          {#each tasks as task}
            {#if task.title}
              <li class="task-item">
                <input type="checkbox" disabled /> 
                {task.title}
                {#if task.due}
                  <span class="task-due">(Due: {formatDate(task.due)})</span>
                {/if}
              </li>
            {/if}
          {/each}
        </ul>
      {/if}
    </div>
  {:else if !loading}
    <div class="calendar-empty">
      No events or tasks found for {displayDate}
    </div>
  {/if}

  {#if loading}
    <div class="calendar-loading">
      Loading calendar data...
    </div>
  {/if}
</div>

<style>
  .google-calendar-display {
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    padding: 12px;
    margin: 8px 0;
    background: var(--background-secondary);
  }

  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .calendar-header h4 {
    margin: 0;
    color: var(--text-normal);
  }

  .refresh-button {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border: none;
    border-radius: 4px;
    padding: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .refresh-button:hover {
    background: var(--interactive-accent-hover);
  }

  .refresh-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .calendar-content {
    color: var(--text-normal);
    line-height: 1.5;
  }

  .calendar-content h5 {
    margin: 12px 0 8px 0;
    color: var(--text-accent);
    font-weight: 600;
  }

  .events-list, .tasks-list {
    margin: 0 0 16px 0;
    padding-left: 16px;
  }

  .event-item, .task-item {
    margin-bottom: 4px;
    color: var(--text-normal);
  }

  .task-item input[type="checkbox"] {
    margin-right: 6px;
  }

  .task-due {
    color: var(--text-muted);
    font-size: 0.9em;
    margin-left: 8px;
  }

  .calendar-error {
    color: var(--text-error);
    background: var(--background-modifier-error);
    padding: 8px;
    border-radius: 4px;
  }

  .calendar-empty {
    color: var(--text-muted);
    font-style: italic;
    text-align: center;
    padding: 16px;
  }

  .calendar-loading {
    color: var(--text-muted);
    text-align: center;
    padding: 8px;
  }
</style>