#!/bin/bash

# Find the server process
SERVER_PID=$(pgrep -f "node.*server/index.js")

if [ -z "$SERVER_PID" ]; then
    echo "Server is not running"
    exit 0
fi

echo "Stopping server (PID: $SERVER_PID)..."
kill $SERVER_PID

# Wait for the server to stop
for i in {1..5}; do
    if ! pgrep -f "node.*server/index.js" > /dev/null; then
        echo "Server stopped successfully"
        exit 0
    fi
    sleep 1
done

# If server is still running, force kill it
if pgrep -f "node.*server/index.js" > /dev/null; then
    echo "Server did not stop gracefully, forcing termination..."
    kill -9 $SERVER_PID
    echo "Server forcefully stopped"
fi 