# Figma LaunchDarkly Plugin

This plugin allows you to export Figma components to LaunchDarkly as feature flags and metrics. It provides a simple interface for connecting to your LaunchDarkly account and exporting components with their variants.

## Features

- Connect to your LaunchDarkly account using an API key
- Select a project and environment
- Export Figma components to LaunchDarkly as feature flags
- Create metrics for each component variant
- Generate React code for using the feature flags
- Confirmation dialog before exporting to LaunchDarkly
- Debug mode for troubleshooting

## Setup

1. Install the plugin in Figma:
   - Go to Plugins > Development > Import plugin from manifest
   - Select the `manifest.json` file from this directory

2. Start the server:
   ```bash
   npm run safe-start-server
   ```
   This will automatically stop any existing server and start a new one.

3. Open the plugin in Figma:
   - Select a component or component set in Figma
   - Right-click > Plugins > LaunchDarkly Plugin

## Usage

1. Enter your LaunchDarkly API key
   - You can find your API key in LaunchDarkly under Account Settings > Authorization
   - The key should start with "api-"

2. Select a project and environment

3. Select a component or component set in Figma
   - Components are shown with a diamond icon in the Assets panel
   - Component sets contain multiple variants

4. Click "Export to LaunchDarkly"

5. Review the confirmation dialog
   - The dialog shows what will be created in LaunchDarkly
   - You can select which metrics to create
   - Click "Confirm Export" to proceed or "Cancel" to abort

6. View the results
   - The plugin will show a success message when the export is complete
   - You can view the generated code and download it for use in your project

## Server Management

The plugin includes scripts for managing the server:

- `npm run start-server`: Start the server
- `npm run stop-server`: Stop the server interactively
- `npm run stop-server-auto`: Stop the server automatically
- `npm run restart-server`: Restart the server
- `npm run safe-start-server`: Stop any existing server and start a new one

For more details, see [SERVER_MANAGEMENT.md](./SERVER_MANAGEMENT.md).

## Troubleshooting

If you encounter issues:

1. Enable Debug Mode in the plugin UI to see detailed logs
2. Check if the server is running (`npm run safe-start-server`)
3. Make sure your LaunchDarkly API key is correct
4. Ensure you have selected a valid component or component set
5. Check the browser console for any JavaScript errors

## Development

This plugin consists of:

- `code.js`: The main plugin code that runs in Figma
- `ui.html`: The UI code that runs in the plugin window
- `server/`: The proxy server that handles API requests to LaunchDarkly

To modify the plugin:

1. Edit the files as needed
2. Restart the server if you made changes to the server code
3. Reload the plugin in Figma (Right-click > Plugins > Development > Reload Plugin)

## License

ISC
