# Slack GUI

Standalone Slack desktop client built with Go and Fyne.

This is an unofficial client and is not affiliated with, endorsed by, or
supported by Slack Technologies, LLC.

## Project Layout

- `api` - Slack API client (channels, history, threads, media)
- `gui` - Fyne UI (pane layout, message rendering, realtime updates)
- `cmd/slack-gui` - desktop app entrypoint and credential loading
- `packaging/linux` - Linux release packaging scripts and metadata

## Requirements

- Go 1.24+
- Linux desktop build dependencies required by Fyne (`gcc`, OpenGL, X11/Wayland headers)
- Slack token with scopes for conversations, history, posting, and users

Recommended Slack scopes:

- `channels:history`
- `channels:read`
- `groups:history`
- `groups:read`
- `im:history`
- `im:read`
- `mpim:history`
- `mpim:read`
- `chat:write`
- `users:read`
- `users:read.email` (optional)
- `emoji:read` (optional, enables workspace emoji/reaction mapping)

## Quick Start

```bash
cp .env.example .env
$EDITOR .env
set -a
. ./.env
set +a
go run ./cmd/slack-gui
```

## Configuration

Credential priority:

1. `SLACK_BOT_TOKEN`
2. `SLACK_TOKEN`
3. `.slack_config.json` in project root

Optional environment variables:

```bash
export SLACK_BOT_TOKEN="xoxb-..."
export SLACK_APP_TOKEN="xapp-..." # optional, enables Socket Mode
export SLACK_API_BASE_URL="https://slack.com/api" # optional
export SLACK_CONFIG_PATH="/path/to/.slack_config.json" # optional override
```

Auto-discovered config locations:

- `./.slack_config.json`
- `~/.slack_config.json`

Example config file:

```bash
cp .slack_config.example.json .slack_config.json
$EDITOR .slack_config.json
```

Never commit real Slack tokens. `.env` and `.slack_config.json` are ignored by
default.

## Build and Run

```bash
go mod tidy
go build -o slack-gui ./cmd/slack-gui
./slack-gui
```

Logs are written to `~/.slack-gui.log`.

## Development

```bash
go fmt ./...
go vet ./...
go test ./...
go build -o dist/slack-gui ./cmd/slack-gui
```

The tracked `package.json` exists for preview tooling and simply forwards
useful scripts to Go:

```bash
npm run test
npm run build
```

## Release Checklist

```bash
go fmt ./...
go vet ./...
go test ./...
go build -o dist/slack-gui ./cmd/slack-gui
./packaging/linux/build.sh --version 0.1.0
```

Before publishing a public release:

- Confirm `git status --short` only contains intentional changes.
- Confirm no real tokens are present in `.env`, `.slack_config.json`, logs, or release artifacts.
- Review `LICENSE`, `THIRD_PARTY_NOTICES.md`, and `SECURITY.md`.
- Attach artifacts from `dist/` plus `dist/checksums_<version>.txt`.

## Linux Packaging

Packaging assets and scripts are in `packaging/linux`.

Build release artifacts:

```bash
./packaging/linux/build.sh --version 0.1.0
```

This can produce:
- tar.gz bundle
- AppImage (if `appimagetool` is installed)
- `.deb` and `.rpm` (if `nfpm` is installed)

## Key Features

- Channel list with search and unread indicators
- Multi-pane layout (horizontal/vertical split)
- Threads and inline replies
- Media/file links and image previews
- Realtime updates (Socket Mode with RTM fallback)
- Persistent UI state (window size, layout, view preferences)

## Keyboard Shortcuts

- `Ctrl+H` split focused pane horizontally
- `Ctrl+J` split focused pane vertically
- `Ctrl+W` close focused pane
- `Ctrl+S` toggle channel list
- `Ctrl+N` open new window
- `Ctrl+K` open quick switcher
