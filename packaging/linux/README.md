# Linux Packaging

This directory contains minimal release packaging assets for Slack GUI.

## Targets
- AppImage (portable)
- deb (Debian/Ubuntu)
- rpm (Fedora/openSUSE/RHEL)

## Requirements
- Go 1.24+
- `tar`
- Optional for AppImage: `appimagetool`
- Optional for deb/rpm: `nfpm`

## Quick Start

Build all available targets:

```bash
./packaging/linux/build.sh --version 0.1.0
```

Build only portable AppImage bundle:

```bash
./packaging/linux/build.sh --version 0.1.0 --appimage-only
```

## Icons
Place your icon files here before release:

- `packaging/linux/icons/256x256/slack-gui.png`
- `packaging/linux/icons/512x512/slack-gui.png`

Release tarballs include the binary, `README.md`, and `LICENSE`. Checksums are written to `dist/checksums_<version>.txt`.
