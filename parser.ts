import { CalendarData } from './googleCalendarAPI';

export function parseCalendarDataToMarkdown(calendarData: CalendarData, date: string): string {
  const sections: string[] = [];
  
  // Parse events
  if (calendarData.events?.items?.length) {
    calendarData.events.items.forEach(event => {
      if (event.start?.dateTime && event.end?.dateTime && event.summary) {
        const startTime = formatTime(event.start.dateTime);
        const endTime = formatTime(event.end.dateTime);
        sections.push(`- **${startTime} - ${endTime}**: ${event.summary}`);
      }
    });
  }
  
  // Parse tasks
  if (calendarData.tasks?.items?.length) {
    sections.push('---');
    calendarData.tasks.items.forEach(task => {
      if (task.title) {
        const dueDate = task.due ? ` (Due: ${formatDate(task.due)})` : '';
        sections.push(`- [ ] ${task.title}${dueDate}`);
      }
    });
  }
  
  return sections.join('\n');
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