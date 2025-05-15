#!/bin/bash

# Check if server is already running
if pgrep -f "node.*server/index.js" > /dev/null; then
    echo "Server is already running on port 3002"
    exit 0
fi

# Start the server
echo "Starting server on port 3002..."
cd server && PORT=3002 node index.js > server.log 2>&1 &

# Wait a moment to check if server started successfully
sleep 2
if pgrep -f "node.*server/index.js" > /dev/null; then
    echo "Server started successfully"
    echo "Logs are being written to server.log"
else
    echo "Failed to start server. Check server.log for details"
    exit 1
fi 