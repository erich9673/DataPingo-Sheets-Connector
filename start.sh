#!/bin/bash

# DataPingo Sheets Connector - Startup Script
echo "🚀 Starting DataPingo Sheets Connector..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Change to project directory
cd "$(dirname "$0")"
PROJECT_DIR="$PWD"

echo -e "${BLUE}📁 Project directory: $PROJECT_DIR${NC}"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}❌ Port $port is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port $port is available${NC}"
        return 0
    fi
}

# Function to start backend
start_backend() {
    echo -e "${BLUE}🔧 Starting backend server on port 3001...${NC}"
    cd "$PROJECT_DIR"
    
    if check_port 3001; then
        nohup node server.js > backend.log 2>&1 &
        echo $! > backend.pid
        echo -e "${GREEN}✅ Backend started (PID: $(cat backend.pid))${NC}"
    else
        echo -e "${RED}❌ Cannot start backend - port 3001 in use${NC}"
    fi
}

# Function to start frontend
start_frontend() {
    echo -e "${BLUE}🎨 Building and starting frontend on port 3002...${NC}"
    cd "$PROJECT_DIR/sheets-connector-app"
    
    # Build the frontend
    npm run build:dev
    
    if [ $? -eq 0 ]; then
        if check_port 3002; then
            cd dist
            nohup python3 -m http.server 3002 > ../frontend.log 2>&1 &
            echo $! > ../frontend.pid
            echo -e "${GREEN}✅ Frontend started (PID: $(cat ../frontend.pid))${NC}"
        else
            echo -e "${RED}❌ Cannot start frontend - port 3002 in use${NC}"
        fi
    else
        echo -e "${RED}❌ Frontend build failed${NC}"
    fi
}

# Function to stop servers
stop_servers() {
    echo -e "${BLUE}🛑 Stopping servers...${NC}"
    
    if [ -f "$PROJECT_DIR/backend.pid" ]; then
        kill $(cat "$PROJECT_DIR/backend.pid") 2>/dev/null
        rm "$PROJECT_DIR/backend.pid"
        echo -e "${GREEN}✅ Backend stopped${NC}"
    fi
    
    if [ -f "$PROJECT_DIR/sheets-connector-app/frontend.pid" ]; then
        kill $(cat "$PROJECT_DIR/sheets-connector-app/frontend.pid") 2>/dev/null
        rm "$PROJECT_DIR/sheets-connector-app/frontend.pid"
        echo -e "${GREEN}✅ Frontend stopped${NC}"
    fi
    
    # Kill any remaining processes on the ports
    lsof -ti :3001 | xargs kill -9 2>/dev/null || true
    lsof -ti :3002 | xargs kill -9 2>/dev/null || true
}

# Function to show status
show_status() {
    echo -e "${BLUE}📊 Server Status:${NC}"
    
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${GREEN}✅ Backend: Running on port 3001${NC}"
    else
        echo -e "${RED}❌ Backend: Not running${NC}"
    fi
    
    if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${GREEN}✅ Frontend: Running on port 3002${NC}"
    else
        echo -e "${RED}❌ Frontend: Not running${NC}"
    fi
}

# Main script logic
case "$1" in
    start)
        stop_servers
        start_backend
        start_frontend
        echo ""
        echo -e "${GREEN}🎉 DataPingo Sheets Connector started!${NC}"
        echo -e "${BLUE}🌐 Frontend: http://localhost:3002${NC}"
        echo -e "${BLUE}🔧 Backend: http://localhost:3001${NC}"
        ;;
    stop)
        stop_servers
        ;;
    restart)
        stop_servers
        sleep 2
        start_backend
        start_frontend
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        echo ""
        echo "Commands:"
        echo "  start   - Start both backend and frontend servers"
        echo "  stop    - Stop both servers"
        echo "  restart - Restart both servers"
        echo "  status  - Show current server status"
        exit 1
        ;;
esac
