# Figma LaunchDarkly Plugin

A Figma plugin that generates React components with LaunchDarkly feature flag integration. This plugin allows you to create feature flags directly from your Figma designs, making it easier to manage A/B tests and feature rollouts.

## Prerequisites

- Node.js v20 or higher
- A LaunchDarkly account with API access
- Figma desktop app

## Development Setup

1. Install dependencies:
```bash
npm install
cd server && npm install
```

2. Build the plugin:
```bash
npm run build
```

3. Load the plugin in Figma:
   - Open Figma
   - Go to Plugins > Development > Import plugin from manifest...
   - Select the `manifest.json` file

## Server Management

The plugin requires a local server to communicate with the LaunchDarkly API. Here's how to manage it:

### Starting the Server

1. Navigate to the server directory:
```bash
cd server
```

2. Start the server (default port: 3002):
```bash
PORT=3002 node index.js
```

If you get an "address already in use" error, you can:
- Use a different port: `PORT=3003 node index.js`
- Find and stop the existing process: `lsof -i :3002` then `kill <PID>`

### Stopping the Server

- Press `Ctrl+C` in the terminal where the server is running
- Or find and kill the process:
```bash
lsof -i :3002
kill <PID>
```

## Using the Plugin

1. **Select Components**:
   - Open your Figma design
   - Select the components you want to create feature flags for
   - Launch the plugin from Plugins > Development > Figma LaunchDarkly Plugin

2. **Configure Feature Flag**:
   - Enter your LaunchDarkly API key
   - Select the target project
   - Name your feature flag
   - Add an optional description
   - Choose whether to include metrics tracking

3. **Create Variations**:
   - The plugin automatically detects different variants of your selected components
   - Each variant will be created as a distinct variation in LaunchDarkly
   - You can modify variation names and values before creating the flag

4. **Review and Create**:
   - Review the confirmation dialog showing all flag details
   - Click "Create Flag" to generate the feature flag in LaunchDarkly
   - The plugin will provide feedback on the creation status

## Features

- Generate React components from Figma designs
- Automatic LaunchDarkly feature flag integration
- Consistent event tracking across variants
- A/B testing support
- Project selection and environment management
- Optional metrics tracking
- Distinct variation handling
- Error handling and user feedback

## Troubleshooting

1. **Server Connection Issues**:
   - Ensure the server is running on the correct port
   - Check that your API key is valid
   - Verify network connectivity

2. **Feature Flag Creation Errors**:
   - Ensure variations are distinct
   - Check that the flag key is unique
   - Verify project permissions

3. **Plugin Loading Issues**:
   - Rebuild the plugin: `npm run build`
   - Reload the plugin in Figma
   - Check the browser console for errors

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
