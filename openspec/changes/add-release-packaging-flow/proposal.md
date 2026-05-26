# Add Release Packaging Flow

## Why

spec-ui can run as a web MVP and now has a desktop-first Tauri renderer path. The project needs a release flow that can publish initial unsigned desktop artifacts for `0.0.1` without requiring local Node server sidecars in the packaged app.

## What Changes

- Add a tag-driven GitHub Release workflow for `vX.Y.Z`, starting with `v0.0.1`.
- Build release artifacts for macOS and Windows, while keeping Linux desktop compile checks in CI until Linux packaging is stable enough to enable.
- Create a draft GitHub Release and upload artifacts for maintainer review before publishing.
- Do not publish the release automatically; attach artifacts only to the draft GitHub Release.
- Package the Tauri desktop app with static renderer assets and Rust-owned local runtime commands/events.
- Do not package a bundled Next.js server, Hono runtime server, or Node sidecar for desktop startup.
- Keep macOS and Windows artifacts unsigned for this initial release flow.
- Add a pull-request desktop compile workflow that checks the desktop renderer and Tauri crate without producing release artifacts.
- Generate draft release notes from commit messages for maintainer review before publishing.
- Document release commands, artifact expectations, commit-based release-note review expectations, and the unsigned preview status.

## Non-Goals

- Do not add code signing, notarization, certificate management, or signing CI secrets in this change.
- Do not add an auto-updater, updater manifest, updater signing key, or update signatures.
- Do not publish to package managers, app stores, Homebrew, winget, Scoop, Snapcraft, AUR, or npm.
- Do not remove Next.js from the Web target.
- Do not add cloud deployment or hosted release infrastructure.
- Do not add a structured changelog page or changelog data model in this change.
