import { App, Plugin, PluginSettingTab, Setting, TFile, MarkdownView } from 'obsidian';
import { GoogleCalendarAPI, GoogleCalendarCredentials } from './googleCalendarAPI';
import { Credentials } from "google-auth-library";
import { createCodeBlockProcessor } from './codeBlockProcessor';
import { DateInputModal } from './dateInputModal';

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
			this.app.workspace.on('file-open', async (file) => {
				if (file && this.settings.enabledForDailyNotes && this.isDailyNote(file)) {
					// Wait for the view to switch to the new file before inserting
					setTimeout(async () => {
						await this.insertCalendarBlock(file);
					}, 100);
				}
			})
		);

		this.addCommand({
			id: 'insert-google-calendar-block',
			name: 'Insert Google Calendar block',
			checkCallback: (checking) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					if (!checking) {
						new DateInputModal(this.app, (date: string) => {
							this.insertCalendarBlock(activeFile, date, true);
						}).open();
					}
					return true;
				}
				return false;
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
			const tokens = await this.googleCalendarAPI.startOAuthFlow();
			if (tokens.access_token && tokens.refresh_token) {
				this.settings.googleAccessToken = tokens.access_token;
				this.settings.googleRefreshToken = tokens.refresh_token || '';
				await this.saveSettings();
				this.initializeGoogleCalendarAPI();
				this.registerMarkdownCodeBlockProcessor(
					"google-calendar",
					createCodeBlockProcessor(this.googleCalendarAPI)
				);
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

	async insertCalendarBlock(file: TFile, customDate?: string, isFromCommand?: boolean) {
		const dateString = customDate || this.extractDateFromFilename(file);
		const todayDate = window.moment().format('YYYY-MM-DD');
		const displayDate = dateString || todayDate;

		const calendarBlock = `
\`\`\`google-calendar
{
  "date": "${displayDate}",
  "refreshInterval": 60,
  "showEvents": true,
  "showTasks": true,
  "title": "📅 Calendar for ${displayDate}"
}
\`\`\``;

		const leaf = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (leaf && leaf.editor && leaf.file === file) {
			const content = leaf.editor.getValue();

			// Check if google-calendar block already exists
			if (content.includes('```google-calendar') && !isFromCommand) {
				return; // Don't insert duplicate blocks
			}

			leaf.editor.setValue(content + calendarBlock);
			leaf.editor.setCursor(leaf.editor.lastLine(), 0);
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
			.setName('Enable for daily notes')
			.setDesc('Automatically insert calendar block when opening daily notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enabledForDailyNotes)
				.onChange(async (value) => {
					this.plugin.settings.enabledForDailyNotes = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', {text: 'Google Calendar API'});

		new Setting(containerEl)
			.setName('Google client ID')
			.setDesc('OAuth 2.0 client ID from Google Cloud console')
			.addText(text => text
				.setPlaceholder('Enter your Google client ID')
				.setValue(this.plugin.settings.googleClientId)
				.onChange(async (value) => {
					this.plugin.settings.googleClientId = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Google client secret')
			.setDesc('OAuth 2.0 client secret from Google Cloud Console')
			.addText(text => text
				.setPlaceholder('Enter your Google client secret')
				.setValue(this.plugin.settings.googleClientSecret)
				.onChange(async (value) => {
					this.plugin.settings.googleClientSecret = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Google authorization')
			.setDesc('Click to authorize access to your Google Calendar')
			.addButton(button => button
				.setButtonText('Authorize Google Calendar')
				.onClick(async () => {
					await this.plugin.handleGoogleAuth();
				}));

		const authStatus = this.plugin.settings.googleAccessToken ? 'Authorized ✓' : 'Not authorized';
		new Setting(containerEl)
			.setName('Authorization status')
			.setDesc(`Current status: ${authStatus}`);
	}
}
