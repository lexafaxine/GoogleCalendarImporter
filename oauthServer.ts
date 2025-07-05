import * as http from "http";
import * as url from "url";
import { google } from "googleapis";
import { Credentials } from "google-auth-library";
export interface OAuthCredentials {
	clientId: string;
	clientSecret: string;
}

export class OAuthServer {
	private server: http.Server | null = null;
	private port = 8080;

	private createOAuth2Client(credentials: OAuthCredentials) {
		return new google.auth.OAuth2(
			credentials.clientId,
			credentials.clientSecret,
			`http://localhost:${this.port}/callback`
		);
	}

	async startOAuthFlow(credentials: OAuthCredentials): Promise<Credentials> {
		return new Promise((resolve, reject) => {
			this.server = this.createServer(credentials, resolve, reject);
			this.startServer(credentials);
		});
	}
	private createServer(
		credentials: OAuthCredentials,
		resolve: (tokens: Credentials) => void,
		reject: (reason?: Error) => void
	): http.Server {
		return http.createServer((req, res) => {
			req.url &&
				url.parse(req.url, true).pathname === "/callback" &&
				this.handleCallback(req, res, credentials, resolve, reject);
		});
	}
	private handleCallback(
		req: http.IncomingMessage,
		res: http.ServerResponse,
		credentials: OAuthCredentials,
		resolve: (tokens: Credentials) => void,
		reject: (reason?: Error) => void
	): void {
		if (!req.url) return;
		const reqUrl = url.parse(req.url, true);
		const code = reqUrl.query.code as string;
		const error = reqUrl.query.error as string;

		if (error) {
			this.sendErrorResponse(res, `Authorization failed: ${error}`);
			this.closeServer();
			reject(new Error(`Authorization failed: ${error}`));
			return;
		}

		if (code) {
			this.sendSuccessResponse(res);
			this.closeServer();
			this.exchangeCodeForTokens(code, credentials)
				.then(resolve)
				.catch(reject);
		} else {
			this.sendErrorResponse(res, "No authorization code received");
			this.closeServer();
			reject(new Error("No authorization code received"));
		}
	}
	private sendSuccessResponse(res: http.ServerResponse): void {
		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(`
			<html>
				<body>
					<h1>Authorization successful!</h1>
					<p>You can close this window and return to Obsidian.</p>
					<script>setTimeout(() => window.close(), 2000);</script>
				</body>
			</html>
		`);
	}
	private sendErrorResponse(res: http.ServerResponse, message: string): void {
		res.writeHead(400, { "Content-Type": "text/html" });
		res.end(`
			<html>
				<body>
					<h1>Authorization failed</h1>
					<p>${message}</p>
					<p>You can close this window and return to Obsidian.</p>
					<script>setTimeout(() => window.close(), 3000);</script>
				</body>
			</html>
		`);
	}

	private startServer(credentials: OAuthCredentials): void {
		this.server?.listen(this.port, () => {
			const authUrl = this.generateAuthUrl(credentials);
			window.open(authUrl, "_blank");
		});

		this.server?.on("error", (err) => {
			this.closeServer();
			throw err;
		});
	}

	private generateAuthUrl(credentials: OAuthCredentials): string {
		const auth = this.createOAuth2Client(credentials);

		const scopes = [
			"https://www.googleapis.com/auth/calendar.readonly",
			"https://www.googleapis.com/auth/tasks.readonly",
		];

		return auth.generateAuthUrl({
			access_type: "offline",
			scope: scopes,
			prompt: "consent",
		});
	}

	private async exchangeCodeForTokens(
		code: string,
		credentials: OAuthCredentials
	): Promise<Credentials> {
		const auth = this.createOAuth2Client(credentials);
		const { tokens } = await auth.getToken(code);
		return tokens;
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
