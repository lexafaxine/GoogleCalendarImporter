import * as http from 'http';
import * as url from 'url';
import { google } from 'googleapis';

export interface OAuthCredentials {
    clientId: string;
    clientSecret: string;
}

export class OAuthServer {
    private server: http.Server | null = null;
    private port: number = 8080;

    async startOAuthFlow(credentials: OAuthCredentials): Promise<any> {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                const reqUrl = url.parse(req.url!, true);
                
                if (reqUrl.pathname === '/callback') {
                    const code = reqUrl.query.code as string;
                    const error = reqUrl.query.error as string;
                    
                    if (error) {
                        res.writeHead(400, {'Content-Type': 'text/html'});
                        res.end(`
                            <html>
                                <body>
                                    <h1>Authorization failed</h1>
                                    <p>Error: ${error}</p>
                                    <p>You can close this window and return to Obsidian.</p>
                                    <script>setTimeout(() => window.close(), 3000);</script>
                                </body>
                            </html>
                        `);
                        this.closeServer();
                        reject(new Error(`Authorization failed: ${error}`));
                        return;
                    }
                    
                    if (code) {
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        res.end(`
                            <html>
                                <body>
                                    <h1>Authorization successful!</h1>
                                    <p>You can close this window and return to Obsidian.</p>
                                    <script>setTimeout(() => window.close(), 2000);</script>
                                </body>
                            </html>
                        `);
                        
                        this.closeServer();
                        this.exchangeCodeForTokens(code, credentials).then(resolve).catch(reject);
                    } else {
                        res.writeHead(400, {'Content-Type': 'text/html'});
                        res.end(`
                            <html>
                                <body>
                                    <h1>Authorization failed</h1>
                                    <p>No authorization code received.</p>
                                    <p>You can close this window and return to Obsidian.</p>
                                    <script>setTimeout(() => window.close(), 3000);</script>
                                </body>
                            </html>
                        `);
                        this.closeServer();
                        reject(new Error('No authorization code received'));
                    }
                }
            });

            this.server.listen(this.port, () => {
                console.log(`OAuth server started on port ${this.port}`);
                const authUrl = this.generateAuthUrl(credentials);
                console.log('Generated auth URL:', authUrl);
                this.openBrowser(authUrl);
            });

            this.server.on('error', (err) => {
                this.closeServer();
                reject(err);
            });
        });
    }

    private generateAuthUrl(credentials: OAuthCredentials): string {
        const auth = new google.auth.OAuth2(
            credentials.clientId,
            credentials.clientSecret,
            `http://localhost:${this.port}/callback`
        );

        const scopes = [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/tasks.readonly'
        ];
        
        return auth.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent'
        });
    }

    private async exchangeCodeForTokens(code: string, credentials: OAuthCredentials): Promise<any> {
        const auth = new google.auth.OAuth2(
            credentials.clientId,
            credentials.clientSecret,
            `http://localhost:${this.port}/callback`
        );

        const { tokens } = await auth.getToken(code);
        return tokens;
    }

    private openBrowser(url: string): void {
        try {
            const { shell } = require('electron');
            shell.openExternal(url);
            console.log('Browser opened with URL:', url);
        } catch (error) {
            console.error('Failed to open browser:', error);
            // Don't throw error, just log it and continue
            console.log('Please manually open this URL:', url);
        }
    }

    private closeServer(): void {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }

    cleanup(): void {
        this.closeServer();
    }
}