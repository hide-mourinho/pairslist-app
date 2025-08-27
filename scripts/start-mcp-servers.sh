#!/bin/bash

# MCP Servers Startup Script
# This script starts all MCP servers for development

set -e

# Load environment variables
if [ -f ".env.mcp" ]; then
  export $(cat .env.mcp | grep -v '^#' | xargs)
else
  echo "Warning: .env.mcp file not found. Copy .env.mcp.example and configure it."
  exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting MCP Servers...${NC}"

# Function to start a server in background
start_server() {
  local name=$1
  local package=$2
  shift 2
  
  echo -e "${YELLOW}Starting $name server...${NC}"
  npx -y $package "$@" &
  local pid=$!
  echo "$name server started with PID: $pid"
  echo $pid >> .mcp-pids
}

# Clean up previous PIDs file
rm -f .mcp-pids

# Start GitHub MCP Server
if [ -n "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
  start_server "GitHub" "@modelcontextprotocol/server-github"
else
  echo -e "${RED}Skipping GitHub server (GITHUB_PERSONAL_ACCESS_TOKEN not set)${NC}"
fi

# Start Firebase MCP Server
if [ -n "$FIREBASE_PROJECT_ID" ] && [ -n "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  start_server "Firebase" "@modelcontextprotocol/server-firebase"
else
  echo -e "${RED}Skipping Firebase server (FIREBASE_PROJECT_ID or GOOGLE_APPLICATION_CREDENTIALS not set)${NC}"
fi

# Start Playwright MCP Server
start_server "Playwright" "@modelcontextprotocol/server-playwright"

# Start Filesystem MCP Server
start_server "Filesystem" "@modelcontextprotocol/server-filesystem" "/home/mohri/work"

echo -e "${GREEN}All MCP servers started successfully!${NC}"
echo "PIDs saved to .mcp-pids"
echo ""
echo "To stop all servers, run: ./scripts/stop-mcp-servers.sh"
echo "To view logs, check the terminal output"

# Wait for all background processes
wait