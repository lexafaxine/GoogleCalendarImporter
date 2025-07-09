import { calendar_v3, google, tasks_v1 } from "googleapis";
import { OAuthServer, OAuthCredentials } from "./oauthServer";
import { Credentials } from "google-auth-library";
export interface GoogleCalendarCredentials {
	clientId: string;
	clientSecret: string;
	accessToken?: string;
	refreshToken?: string;
}

export interface CalendarData {
	events: calendar_v3.Schema$Events | null;
	tasks: tasks_v1.Schema$Tasks | null;
}

export class GoogleCalendarAPI {
	private credentials: GoogleCalendarCredentials;
	private calendar: calendar_v3.Calendar;
	private tasks: tasks_v1.Tasks;
	private oauthServer: OAuthServer;
	private onTokensUpdated?: (tokens: Credentials) => void;

	constructor(
		credentials: GoogleCalendarCredentials,
		onTokensUpdated?: (tokens: Credentials) => void
	) {
		this.credentials = credentials;
		this.oauthServer = new OAuthServer();
		this.onTokensUpdated = onTokensUpdated;
		this.initializeAPI();
	}

	private initializeAPI() {
		const auth = new google.auth.OAuth2(
			this.credentials.clientId,
			this.credentials.clientSecret,
			"http://localhost:8080/callback"
		);

		if (this.credentials.accessToken) {
			auth.setCredentials({
				access_token: this.credentials.accessToken,
				refresh_token: this.credentials.refreshToken,
			});

			// Set up automatic token refresh
			auth.on("tokens", (tokens) => {
				if (tokens.refresh_token) {
					this.credentials.refreshToken = tokens.refresh_token;
				}
				if (tokens.access_token) {
					this.credentials.accessToken = tokens.access_token;
				}
				// Notify that tokens have been updated
				this.onTokensUpdated?.(tokens);
			});
		}

		this.calendar = google.calendar({ version: "v3", auth });
		this.tasks = google.tasks({ version: "v1", auth });
	}

	async getEventsForDate(
		date: string
	): Promise<calendar_v3.Schema$Events | null> {
		try {
			if (!this.credentials.clientId || !this.credentials.clientSecret) {
				throw new Error(
					"Google Calendar API credentials not configured"
				);
			}

			const startOfDay = new Date(date);
			startOfDay.setHours(0, 0, 0, 0);

			const endOfDay = new Date(date);
			endOfDay.setHours(23, 59, 59, 999);

			const response = await this.calendar.events.list({
				calendarId: "primary",
				timeMin: startOfDay.toISOString(),
				timeMax: endOfDay.toISOString(),
				singleEvents: true,
				orderBy: "startTime",
			});

			return response.data;
		} catch (error) {
			console.error("Error fetching calendar events:", error);
			return null;
		}
	}

	async getTasksForDate(date: string): Promise<tasks_v1.Schema$Tasks | null> {
		try {
			if (!this.credentials.clientId || !this.credentials.clientSecret) {
				throw new Error(
					"Google Calendar API credentials not configured"
				);
			}
			const taskListsResponse = await this.tasks.tasklists.list();
			const taskLists = taskListsResponse.data.items || [];
			
			const targetDate = new Date(date);
			targetDate.setHours(23, 59, 59, 999); 

			const oneYearAgo = new Date(targetDate);
			oneYearAgo.setDate(oneYearAgo.getDate() - 365);
			
			const taskPromises = taskLists.map(async (taskList) => {
				if (!taskList.id) return [];
				try {
					const response = await this.tasks.tasks.list({
						tasklist: taskList.id,
						showCompleted: false, 
						maxResults: 100,
					});
					const tasks = response.data.items || [];
					const filteredTasks = tasks.filter(task => {
						if (!task.due) return true;
						const taskDueDate = new Date(task.due);
						return taskDueDate >= oneYearAgo && taskDueDate <= targetDate; // align with google calendar behavior
					});
					return filteredTasks;
				} catch (error) {
					console.error(
						`Error fetching tasks from list ${taskList.title}:`,
						error
					);
					return [];
				}
			});
			const taskResults = await Promise.all(taskPromises);
			const allTasks = taskResults.flat();
			return {
				kind: "tasks#tasks",
				items: allTasks,
			};
		} catch (error) {
			console.error("Error fetching tasks:", error);
			return null;
		}
	}

	async getEventsAndTasksForDate(date: string): Promise<CalendarData | null> {
		try {
			const [events, tasks] = await Promise.all([
				this.getEventsForDate(date),
				this.getTasksForDate(date),
			]);

			return {
				events: events,
				tasks: tasks,
			};
		} catch (error) {
			return null;
		}
	}

	async startOAuthFlow(): Promise<Credentials> {
		try {
			const oauthCredentials: OAuthCredentials = {
				clientId: this.credentials.clientId,
				clientSecret: this.credentials.clientSecret,
			};

			const tokens = await this.oauthServer.startOAuthFlow(
				oauthCredentials
			);
			return tokens;
		} catch (error) {
			console.error("OAuth flow error:", error);
			throw error;
		}
	}

	cleanup(): void {
		this.oauthServer.cleanup();
	}
}
