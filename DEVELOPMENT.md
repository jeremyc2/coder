# Development

## Setup

1. Install Bun: `curl -fsSL https://bun.sh/install | bash`
2. Install dependencies: `bun install`
3. Global install portless: `bun add -g portless`
4. Global install qmd: `bun add -g @tobilu/qmd`

## Raycast Dev Scripts

The Vault dev server can be controlled from Raycast by adding the following Raycast scripts:

- `vault-dev-start.sh`
- `vault-dev-stop.sh`

They are designed for Raycast's stripped-down shell environment, so the start script bootstraps `PATH`, loads `fnm` if available, and then launches `portless` directly instead of relying on `bun run dev`.

### Start Script

File: `~/.config/raycast/vault-dev-start.sh`

```bash
#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Vault Dev Start
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 📦

# Documentation:
# @raycast.author Jeremy Chandler

ROOT="$HOME/Documents/personal/vault"
BUN="$HOME/.bun/bin/bun"
PORTLESS="$HOME/.bun/bin/portless"
PID_FILE="/tmp/vault-dev-server.pid"
LOG_FILE="/tmp/vault-dev-server.log"

# Raycast does not inherit the interactive shell PATH, so bootstrap Node first.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.bun/bin:$PATH"

if [[ -x "/opt/homebrew/bin/fnm" ]]; then
	eval "$(/opt/homebrew/bin/fnm env --shell bash)"
fi

if [[ -f "$PID_FILE" ]]; then
	PID="$(cat "$PID_FILE")"

	if kill -0 "$PID" 2>/dev/null; then
		echo "Vault dev server is already running (PID $PID)."
		echo "Log: $LOG_FILE"
		exit 0
	fi

	rm -f "$PID_FILE"
fi

cd "$ROOT" || exit 1

nohup "$PORTLESS" run "$BUN" --bun vite dev >"$LOG_FILE" 2>&1 &
PID=$!
echo "$PID" >"$PID_FILE"

sleep 2

if kill -0 "$PID" 2>/dev/null; then
	echo "Started Vault dev server (PID $PID)."
	echo "Log: $LOG_FILE"
	exit 0
fi

echo "Vault dev server failed to start."
tail -n 20 "$LOG_FILE"
rm -f "$PID_FILE"
exit 1
```

What it does:

- Ensures Raycast can resolve `node`, `bun`, and `portless`.
- Starts the Vault dev server through `portless`, which sets `PORT`, `HOST`, and the local HTTPS URL.
- Writes the active process ID to `/tmp/vault-dev-server.pid`.
- Sends server output to `/tmp/vault-dev-server.log`.

### Stop Script

File: `~/.config/raycast/vault-dev-stop.sh`

```bash
#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Vault Dev Stop
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 🛑

# Documentation:
# @raycast.author Jeremy Chandler

PID_FILE="/tmp/vault-dev-server.pid"

if [[ ! -f "$PID_FILE" ]]; then
	echo "Vault dev server is not running."
	exit 0
fi

PID="$(cat "$PID_FILE")"

if ! kill -0 "$PID" 2>/dev/null; then
	echo "Removed stale PID file for Vault dev server."
	rm -f "$PID_FILE"
	exit 0
fi

kill "$PID"

for _ in 1 2 3 4 5; do
	if ! kill -0 "$PID" 2>/dev/null; then
		rm -f "$PID_FILE"
		echo "Stopped Vault dev server (PID $PID)."
		exit 0
	fi

	sleep 1
done

kill -9 "$PID" 2>/dev/null
rm -f "$PID_FILE"
echo "Stopped Vault dev server (PID $PID) after a forced shutdown."
```

What it does:

- Reads the PID written by the start script.
- Stops the long-lived `portless` process that owns the Vault dev server.
- Cleans up stale PID state if the process is already gone.
- Falls back to a forced shutdown if the process does not exit after several seconds.

### Usage Notes

- Start from Raycast with `Vault Dev Start`.
- Open `https://vault.localhost`.
- Stop from Raycast with `Vault Dev Stop`.
- If startup fails, inspect `/tmp/vault-dev-server.log`.
- If Raycast ever reports the server is already running when it is not, remove `/tmp/vault-dev-server.pid`.

## Core Tenets

- [Deep modules](https://youtu.be/uC44zFz7JSM?si=lvVDQRhhbZfnzOvv). Interfaces between modules are carefully authored and thoroughly reviewed by a real person. The AI is tasked with writing code inside the modules (implementation), but does not "own" the main interfaces.
- Secure. The AI can make suggestions, but all major security decisions should be made by a real person. This includes:
    - Adding new dependencies (the AI should not change package.json).
    - I/O (network connections, file system operations, data at application boundaries should be validated by Effect Schema).
