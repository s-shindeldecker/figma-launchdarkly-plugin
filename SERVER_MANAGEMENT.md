# Server Management Scripts

This document explains the server management scripts available in this project to help you start, stop, and manage the LaunchDarkly proxy server.

## Available Scripts

The following npm scripts are available for server management:

### `npm run start-server`

Starts the LaunchDarkly proxy server on port 3002. This server handles API requests to LaunchDarkly.

### `npm run dev-server`

Starts the LaunchDarkly proxy server in development mode with nodemon, which automatically restarts the server when changes are detected.

### `npm run stop-server`

Interactively stops any process running on port 3002. This script will:
1. Check if any process is using port 3002
2. Display information about the process if found
3. Ask for confirmation before terminating the process
4. Attempt to gracefully terminate the process first
5. Force kill the process if graceful termination fails

### `npm run stop-server-auto`

Automatically stops any process running on port 3002 without requiring user confirmation. This is useful for automation and scripts.

### `npm run restart-server`

Automatically stops any running server on port 3002 and then starts a new server. This is a convenient way to ensure you have a fresh server instance.

### `npm run safe-start-server`

Same as `restart-server` - stops any existing server and starts a new one. This is the recommended way to start the server to avoid port conflicts.

## Usage Examples

### Starting the server safely

```bash
npm run safe-start-server
```

This will automatically check if port 3002 is in use, stop any process using it, and then start a new server.

### Stopping the server interactively

```bash
npm run stop-server
```

This will show you what process is using port 3002 and ask for confirmation before stopping it.

### Stopping the server automatically

```bash
npm run stop-server-auto
```

This will automatically stop any process using port 3002 without asking for confirmation.

## Troubleshooting

If you encounter issues with the server:

1. Try stopping and restarting the server:
   ```bash
   npm run restart-server
   ```

2. Check if multiple server instances are running:
   ```bash
   npm run stop-server
   ```
   This will show you any processes using port 3002.

3. If the server won't stop, you can force kill it:
   ```bash
   npm run stop-server-auto
   ```
   This will attempt to force kill any process using port 3002.
