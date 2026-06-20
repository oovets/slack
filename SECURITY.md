# Security

## Supported Versions

Security fixes are provided for the latest release on `main`.

## Reporting a Vulnerability

Please report security issues privately before opening a public issue. If this
repository is hosted on GitHub, use GitHub's private vulnerability reporting
feature when available.

Do not include live Slack tokens, workspace exports, or private message content
in public issues.

## Credential Handling

The app reads Slack credentials from environment variables or a local
`.slack_config.json` file. Keep that file out of source control. The repository
ignore rules exclude `.slack_config.json`, `.env`, and generated release
artifacts by default.
