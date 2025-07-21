import { App, Plugin, PluginSettingTab, Setting, TFile, Notice, MarkdownView } from 'obsidian';
import { GoogleCalendarAPI, GoogleCalendarCredentials } from './googleCalendarAPI';
import { Credentials } from "google-auth-library";
import { createCodeBlockProcessor } from './codeBlockProcessor';

interface GoogleCalendarImporterSettings {
	enabledForDailyNotes: boolean;
	googleClientId: string;
	googleClientSecret: string;
	googleAccessToken: string;
	googleRefreshToken: string;
}

const DEFAULT_SETTINGS: GoogleCalendarImporterSettings = {
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
				if (file && this.settings.enabledForDailyNotes && this.isDailyNote(file)) {
					this.insertCalendarBlock(file);
				}
			})
		);

		// TODO: add param for dates
		this.addCommand({
			id: 'insert-google-calendar-block',
			name: 'Insert Google Calendar Block',
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					this.insertCalendarBlock(activeFile);
				} else {
					new Notice('No active file to insert calendar block');
				}
			}
		});

		this.registerMarkdownCodeBlockProcessor(
			"google-calendar", // for already-exist check
			createCodeBlockProcessor(this.googleCalendarAPI)
		);

		this.addSettingTab(new GoogleCalendarSettingTab(this.app, this));
	}

	onunload() {
		if (this.googleCalendarAPI) {
			this.googleCalendarAPI.cleanup();
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.initializeGoogleCalendarAPI(); // TODO: reload authenticate info real time rather than after loadSettings.
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

	async insertCalendarBlock(file: TFile) {
		const content = await this.app.vault.read(file);
		
		// Check if google-calendar block already exists
		if (content.includes('```google-calendar')) {
			return; // Don't insert duplicate blocks
		}

		const dateString = this.extractDateFromFilename(file);
		const calendarBlock = `\`\`\`google-calendar
{
  "date": "${dateString || 'today'}",
  "refreshInterval": 60,
  "showEvents": true,
  "showTasks": true,
  "title": "📅 Calendar for ${dateString || 'Today'}"
}
\`\`\`

`;
		const newContent = calendarBlock + content;
		await this.app.vault.modify(file, newContent);

		// Position cursor after the calendar block
		const leaf = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (leaf && leaf.editor) {
			const lines = calendarBlock.split('\n');
			leaf.editor.setCursor(lines.length - 1, 0);
		}
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
			.setDesc('Automatically insert calendar block when opening daily notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enabledForDailyNotes)
				.onChange(async (value) => {
					this.plugin.settings.enabledForDailyNotes = value;
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
