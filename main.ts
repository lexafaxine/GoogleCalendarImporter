import { App, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface GoogleCalendarImporterSettings {
	calendarMarker: string;
	enabledForDailyNotes: boolean;
}

const DEFAULT_SETTINGS: GoogleCalendarImporterSettings = {
	calendarMarker: '<!-- google-calendar -->',
	enabledForDailyNotes: true
}

export default class GoogleCalendarImporter extends Plugin {
	settings: GoogleCalendarImporterSettings;

	async onload() {
		await this.loadSettings();
		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				if (file && this.isDailyNote(file)) {
					this.injectCalendarEvents(file);
				}
			})
		);

		this.addCommand({
			id: 'import-google-calendar',
			name: 'Import Google Calendar events and tasks',
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					this.injectCalendarEvents(activeFile);
				} else {
					new Notice('No active file to import events to');
				}
			}
		});
		this.addSettingTab(new GoogleCalendarSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	isDailyNote(file: TFile): boolean {
		const dailyNotesFormat = /\d{4}-\d{2}-\d{2}/;
		return dailyNotesFormat.test(file.basename);
	}

	async injectCalendarEvents(file: TFile) {
		if (!this.settings.enabledForDailyNotes && this.isDailyNote(file)) {
			return;
		}
		const content = await this.app.vault.read(file);
		if (content.includes(this.settings.calendarMarker)) {
			return;
		}
		const calendarBlock = `\n\n${this.settings.calendarMarker}\n## 📅 Today's Calendar Events\n\n- 🕘 9:00 AM - Team Standup Meeting\n- 🕐 1:00 PM - Project Review\n- 🕒 3:30 PM - Client Call\n\n**Tasks:**\n- [ ] Review quarterly reports\n- [ ] Update project timeline\n- [ ] Prepare presentation slides\n\n${this.settings.calendarMarker}\n`;

		const newContent = content + calendarBlock;
		await this.app.vault.modify(file, newContent);
		
		new Notice('Calendar events imported!');
	}
}

class GoogleCalendarSettingTab extends PluginSettingTab {
	plugin: GoogleCalendarImporter;

	constructor(app: App, plugin: GoogleCalendarImporter) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Enable for Daily Notes')
			.setDesc('Automatically inject calendar events when opening daily notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enabledForDailyNotes)
				.onChange(async (value) => {
					this.plugin.settings.enabledForDailyNotes = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Calendar Marker')
			.setDesc('HTML comment used to mark injected calendar content')
			.addText(text => text
				.setPlaceholder('<!-- google-calendar -->')
				.setValue(this.plugin.settings.calendarMarker)
				.onChange(async (value) => {
					this.plugin.settings.calendarMarker = value;
					await this.plugin.saveSettings();
				}));
	}
}
