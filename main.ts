import { App, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { GoogleCalendarAPI, GoogleCalendarCredentials } from './googleCalendarAPI';
import { Credentials } from "google-auth-library";

interface GoogleCalendarImporterSettings {
	calendarMarker: string;
	enabledForDailyNotes: boolean;
	googleClientId: string;
	googleClientSecret: string;
	googleAccessToken: string;
	googleRefreshToken: string;
}

const DEFAULT_SETTINGS: GoogleCalendarImporterSettings = {
	calendarMarker: '<!-- google-calendar -->',
	enabledForDailyNotes: true,
	googleClientId: '',
	googleClientSecret: '',
	googleAccessToken: '',
	googleRefreshToken: ''
}

export default class GoogleCalendarImporter extends Plugin {
	settings: GoogleCalendarImporterSettings;
	private googleCalendarAPI: GoogleCalendarAPI;

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
		if (this.googleCalendarAPI) {
			this.googleCalendarAPI.cleanup();
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.initializeGoogleCalendarAPI();
	}

	private initializeGoogleCalendarAPI() {
		const credentials: GoogleCalendarCredentials = {
			clientId: this.settings.googleClientId,
			clientSecret: this.settings.googleClientSecret,
			accessToken: this.settings.googleAccessToken,
			refreshToken: this.settings.googleRefreshToken
		};

		const onTokensUpdated = async (tokens: Credentials) => {
			console.log('Tokens updated automatically');
			if (tokens.access_token) {
				this.settings.googleAccessToken = tokens.access_token;
			}
			if (tokens.refresh_token) {
				this.settings.googleRefreshToken = tokens.refresh_token;
			}
			await this.saveSettings();
		};

		this.googleCalendarAPI = new GoogleCalendarAPI(credentials, onTokensUpdated);
	}

	async handleGoogleAuth() {
		if (!this.settings.googleClientId || !this.settings.googleClientSecret) {
			return;
		}

		try {
			console.log('Starting Google OAuth flow...');
			const tokens = await this.googleCalendarAPI.startOAuthFlow();
			if (tokens.access_token && tokens.refresh_token) {
				this.settings.googleAccessToken = tokens.access_token;
				this.settings.googleRefreshToken = tokens.refresh_token || '';
				await this.saveSettings();
				this.initializeGoogleCalendarAPI();
				console.log('OAuth flow completed successfully');
			}
		} catch (error) {
			console.error('Error during OAuth flow:', error);
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	isDailyNote(file: TFile): boolean {
		const dailyNotesFormat = /\d{4}-\d{2}-\d{2}/;
		return dailyNotesFormat.test(file.basename);
	}

	private extractDateFromFilename(file: TFile): string {
		const dateMatch = file.basename.match(/\d{4}-\d{2}-\d{2}/);
		return dateMatch ? dateMatch[0] : '';
	}

	async injectCalendarEvents(file: TFile) {
		if (!this.settings.enabledForDailyNotes && this.isDailyNote(file)) {
			return;
		}

		const dateString = this.extractDateFromFilename(file);
		if (!dateString) {
			new Notice('Could not extract date from filename');
			return;
		}

		const calendarData = await this.googleCalendarAPI.getEventsAndTasksForDate(dateString);
		if (!calendarData) {
			new Notice('Failed to fetch calendar data. Please check your credentials.');
			return;
		}

		const newCalendarBlock = `\n\n${this.settings.calendarMarker}\n## 📅 Calendar Data for ${dateString}\n\n\`\`\`json\n${JSON.stringify(calendarData, null, 2)}\n\`\`\`\n\n${this.settings.calendarMarker}\n`;

		const content = await this.app.vault.read(file);
		let newContent: string;

		if (content.includes(this.settings.calendarMarker)) {
			// Replace existing calendar block with latest data
			const regex = new RegExp(
				`\\n\\n${this.settings.calendarMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${this.settings.calendarMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n`,
				'g'
			);
			newContent = content.replace(regex, newCalendarBlock);
		} else {
			newContent = newCalendarBlock + content;
		}
		await this.app.vault.modify(file, newContent);
		new Notice('Calendar events and tasks updated!');
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

		containerEl.createEl('h3', {text: 'Google Calendar API Settings'});

		new Setting(containerEl)
			.setName('Google Client ID')
			.setDesc('OAuth 2.0 client ID from Google Cloud Console')
			.addText(text => text
				.setPlaceholder('Enter your Google Client ID')
				.setValue(this.plugin.settings.googleClientId)
				.onChange(async (value) => {
					this.plugin.settings.googleClientId = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Google Client Secret')
			.setDesc('OAuth 2.0 client secret from Google Cloud Console')
			.addText(text => text
				.setPlaceholder('Enter your Google Client Secret')
				.setValue(this.plugin.settings.googleClientSecret)
				.onChange(async (value) => {
					this.plugin.settings.googleClientSecret = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Google Authorization')
			.setDesc('Click to authorize access to your Google Calendar')
			.addButton(button => button
				.setButtonText('Authorize Google Calendar')
				.onClick(async () => {
					await this.plugin.handleGoogleAuth();
				}));

		const authStatus = this.plugin.settings.googleAccessToken ? 'Authorized ✓' : 'Not authorized';
		new Setting(containerEl)
			.setName('Authorization Status')
			.setDesc(`Current status: ${authStatus}`);
	}
}
