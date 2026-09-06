#!/bin/bash
echo "Starting test sequence..."

# 1. Start server in background
node dist/server.cjs &
SERVER_PID=$!
echo "Server started with PID: $SERVER_PID"

# 2. Wait for server to boot
sleep 5

# 3. Test main endpoint
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
echo ""
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "Health endpoint not found"
echo ""

# 4. Kill server
kill $SERVER_PID
echo "Server stopped."
