import { MarkdownRenderChild, MarkdownPostProcessorContext } from 'obsidian';
import type { GoogleCalendarAPI } from './googleCalendarAPI';
import { parseQuery } from './Injector/Parser';
// @ts-ignore
import CalendarDisplay from './ui/CalendarDisplay.svelte';
// @ts-ignore  
import ErrorDisplay from './ui/ErrorDisplay.svelte';

export function createCodeBlockProcessor(api: GoogleCalendarAPI) {
  return (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
    const child = new CalendarCodeBlock(el, source, api);
    ctx.addChild(child);
  };
}

class CalendarCodeBlock extends MarkdownRenderChild {
  private component: any;
  private source: string;
  private api: GoogleCalendarAPI;

  constructor(containerEl: HTMLElement, source: string, api: GoogleCalendarAPI) {
    super(containerEl);
    this.source = source;
    this.api = api;
  }

  onload() {
    try {
      const query = parseQuery(this.source);
      
      this.component = new CalendarDisplay({
        target: this.containerEl,
        props: {
          api: this.api,
          query: query,
        },
      });
    } catch (error) {
      this.component = new ErrorDisplay({
        target: this.containerEl,
        props: {
          error: error
        },
      });
    }
  }

  onunload() {
    if (this.component) {
      this.component.$destroy();
    }
  }
}