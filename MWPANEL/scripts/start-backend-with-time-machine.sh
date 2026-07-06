#!/bin/bash

echo "Starting MW Panel Backend with Time Machine..."

# Setup Time Machine (run in background)
if [ -f "/app/scripts/setup-time-machine.sh" ]; then
    echo "Initializing Time Machine backup system..."
    /app/scripts/setup-time-machine.sh &
else
    echo "Warning: Time Machine setup script not found"
fi

# Start the main Node.js application
echo "Starting NestJS application..."
exec node dist/main.js