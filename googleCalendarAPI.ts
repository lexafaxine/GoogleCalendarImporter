import { google } from 'googleapis';
import { Notice } from 'obsidian';
import { OAuthServer, OAuthCredentials } from './oauthServer';

export interface GoogleCalendarCredentials {
    clientId: string;
    clientSecret: string;
    accessToken?: string;
    refreshToken?: string;
}

export class GoogleCalendarAPI {
    private credentials: GoogleCalendarCredentials;
    private calendar: any;
    private tasks: any;
    private oauthServer: OAuthServer;

    constructor(credentials: GoogleCalendarCredentials) {
        this.credentials = credentials;
        this.oauthServer = new OAuthServer();
        this.initializeAPI();
    }

    private initializeAPI() {
        const auth = new google.auth.OAuth2(
            this.credentials.clientId,
            this.credentials.clientSecret,
            'http://localhost:8080/callback'
        );

        if (this.credentials.accessToken) {
            auth.setCredentials({
                access_token: this.credentials.accessToken,
                refresh_token: this.credentials.refreshToken
            });
        }

        this.calendar = google.calendar({ version: 'v3', auth });
        this.tasks = google.tasks({ version: 'v1', auth });
    }

    async getEventsForDate(date: string): Promise<any> {
        try {
            if (!this.credentials.clientId || !this.credentials.clientSecret) {
                throw new Error('Google Calendar API credentials not configured');
            }

            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const response = await this.calendar.events.list({
                calendarId: 'primary',
                timeMin: startOfDay.toISOString(),
                timeMax: endOfDay.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching calendar events:', error);
            new Notice('Failed to fetch calendar events. Check your API credentials.');
            return null;
        }
    }

    async getTasksForDate(date: string): Promise<any> {
        try {
            if (!this.credentials.clientId || !this.credentials.clientSecret) {
                throw new Error('Google Calendar API credentials not configured');
            }

            const targetDate = new Date(date);
            const dateString = targetDate.toISOString().split('T')[0];

            const response = await this.tasks.tasks.list({
                tasklist: '@default',
                dueMax: `${dateString}T23:59:59.000Z`,
                dueMin: `${dateString}T00:00:00.000Z`,
                showCompleted: true,
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching tasks:', error);
            new Notice('Failed to fetch tasks. Check your API credentials.');
            new Notice(error)
            return null;
        }
    }

    async getEventsAndTasksForDate(date: string): Promise<any> {
        try {
            const [events, tasks] = await Promise.all([
                this.getEventsForDate(date),
                this.getTasksForDate(date)
            ]);

            return {
                events: events,
                tasks: tasks
            };
        } catch (error) {
            console.error('Error fetching events and tasks:', error);
            new Notice('Failed to fetch calendar data. Check your API credentials.');
            return null;
        }
    }

    async startOAuthFlow(): Promise<any> {
        try {
            const oauthCredentials: OAuthCredentials = {
                clientId: this.credentials.clientId,
                clientSecret: this.credentials.clientSecret
            };
            
            const tokens = await this.oauthServer.startOAuthFlow(oauthCredentials);
            return tokens;
        } catch (error) {
            console.error('OAuth flow error:', error);
            throw error;
        }
    }

    cleanup(): void {
        this.oauthServer.cleanup();
    }
}