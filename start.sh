#!/bin/bash

SESSION_NAME="dev-stack"

tmux new-session -d -s $SESSION_NAME -n "services" "cd client && pnpm run build && pnpm run preview"
tmux split-window -h -t $SESSION_NAME:1 "cd server && uv run main.py"
tmux split-window -v -t $SESSION_NAME:1.2 "sleep 2 && ngrok http 4173 --url=monkey-obliging-cleanly.ngrok-free.app"
tmux select-layout -t $SESSION_NAME:1 tiled
tmux attach-session -t $SESSION_NAME
