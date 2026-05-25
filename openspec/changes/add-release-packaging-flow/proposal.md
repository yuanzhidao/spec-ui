# Add Release Packaging Flow

## Why

spec-ui can run as a web MVP and has a lightweight Tauri development shell, but production desktop packaging is still intentionally deferred. The project now needs a release flow that can publish initial desktop artifacts for `0.0.1` without locking the product into a static web build or a Rust runtime rewrite.

## What Changes

- Add a tag-driven GitHub Release workflow for `vX.Y.Z`, starting with `v0.0.1`.
- Build release artifacts for macOS, Windows, and Linux.
- Create a draft GitHub Release and upload artifacts for maintainer review before publishing.
- Do not publish the release automatically; attach artifacts only to the draft GitHub Release.
- Keep the desktop app backed by a bundled Next.js server and the local runtime server.
- Package the existing Node-based web/runtime process as an embedded managed desktop runtime for the MVP.
- Keep macOS, Windows, and Linux artifacts unsigned for this initial release flow.
- Add a pull-request desktop compile workflow that checks the desktop runtime and Tauri crate without producing release artifacts.
- Generate draft release notes from commit messages for maintainer review before publishing.
- Document release commands, artifact expectations, commit-based release-note review expectations, and the unsigned preview status.

## Non-Goals

- Do not add code signing, notarization, certificate management, or signing CI secrets in this change.
- Do not add an auto-updater, updater manifest, updater signing key, or update signatures.
- Do not publish to package managers, app stores, Homebrew, winget, Scoop, Snapcraft, AUR, or npm.
- Do not rewrite the runtime in Rust.
- Do not switch the desktop app to static export.
- Do not add cloud deployment or hosted release infrastructure.
- Do not add a structured changelog page or changelog data model in this change.
