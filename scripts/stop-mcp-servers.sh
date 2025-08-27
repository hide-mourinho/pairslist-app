#!/bin/bash

# MCP Servers Stop Script
# This script stops all running MCP servers

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping MCP Servers...${NC}"

if [ -f .mcp-pids ]; then
  while read pid; do
    if kill -0 $pid 2>/dev/null; then
      echo "Stopping process $pid..."
      kill $pid
      echo -e "${GREEN}Process $pid stopped${NC}"
    else
      echo -e "${YELLOW}Process $pid not found (already stopped)${NC}"
    fi
  done < .mcp-pids
  
  rm -f .mcp-pids
  echo -e "${GREEN}All MCP servers stopped${NC}"
else
  echo -e "${RED}No .mcp-pids file found. No servers to stop.${NC}"
fi