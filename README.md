# Google Calendar Importer

A simple and light-weighted google calendar importer, allow injecting the events / tasks of a day automatically to your daily notes, or import it to anywhere with a command.

## Features

- 🗓️ **Automatic Daily Notes Integration**: Automatically inject calendar events when opening daily notes
- 📝 **Manual Import Command**: Insert calendar blocks anywhere in your notes with a simple command
- 🎯 **Date-Specific Imports**: Choose any date to import events for that specific day
- 🔄 **Live Calendar Blocks**: Uses markdown code blocks as configuration that render your calendar events as you want
- 🔐 **Secure OAuth Integration**: Secure authentication with Google Calendar using OAuth 2.0

## Requirements

- Obsidian v0.15.0 or later
- Desktop version of Obsidian (plugin is desktop-only)
- Google Calendar account
- Google Cloud Project with Calendar API enabled

## Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API and task API
4. Create OAuth 2.0 credentials 
5. Add yourself as test account
6. Note down your Client ID and Client Secret

TODO: add detail explanation with screenshot

### 2. Plugin Configuration

1. Open Obsidian Settings
2. Navigate to Community Plugins → Google Calendar Importer
3. Enter your Google Client ID and Client Secret
4. Click "Authenticate with Google" to complete the OAuth flow
5. Configure your preferences:
   - **Enable for Daily Notes**: Automatically add calendar blocks when opening daily notes


## Installation

### From Obsidian Community Plugins (Recommended)
*[When available in the community plugin directory]*

1. Open Obsidian Settings
2. Go to Community Plugins and disable Safe Mode
3. Click Browse and search for "Google Calendar Importer"
4. Install and enable the plugin

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/lexafaxine/google-calendar-importer/releases)
2. Extract the files to `VaultFolder/.obsidian/plugins/google-calendar-importer/`
3. Reload Obsidian and enable the plugin in settings

### Development Installation

1. Clone this repository into your `.obsidian/plugins/` folder:
   ```bash
   git clone https://github.com/lexafaxine/google-calendar-importer.git
   ```
2. Navigate to the plugin folder and install dependencies:
   ```bash
   cd google-calendar-importer
   npm install
   ```
3. Build the plugin:
   ```bash
   npm run build
   ```
4. Enable the plugin in Obsidian settings

## Development

### Prerequisites

- Node.js v16 or later
- npm or yarn

### Building

```bash
# Install dependencies
npm install

# Development build (watch mode)
npm run dev

# Production build
npm run build
```

### Code Structure

- `main.ts` - Main plugin class and core functionality
- `googleCalendarAPI.ts` - Google Calendar API integration
- `codeBlockProcessor.ts` - Markdown code block processor for rendering
- `dateInputModal.ts` - Modal for selecting dates
- `oauthServer.ts` - OAuth authentication server

## Privacy & Security

- All authentication is handled through Google's official OAuth 2.0 flow
- No calendar data is stored permanently; it's fetched on-demand
- Access tokens are stored locally in Obsidian's plugin data
- The plugin only requests read access to your calendar events

## Troubleshooting

### Authentication Issues

- Ensure your Google Cloud Project has the Calendar and Task API enabled
- Verify your Client ID and Client Secret are entered correctly
- Make sure your OAuth consent screen is properly configured

### Calendar Not Loading

- Check if you have internet connectivity
- Verify your Google account has access to the calendars you want to import
- Try re-authenticating by clearing the stored tokens in plugin settings

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you find this plugin useful, consider supporting the development:

- ⭐ Star this repository
- 🐛 Report issues on [GitHub](https://github.com/lexafaxine/google-calendar-importer/issues)
- 💡 Suggest new features

## Changelog

### v1.0.0
- Initial release
- Basic Google Calendar integration
- Daily notes automation
- Manual calendar block insertion
- OAuth 2.0 authentication

---

**Author**: [lexafaxine](https://github.com/lexafaxine)