# release-packaging Specification

## ADDED Requirements

### Requirement: Semver tag release trigger

The system SHALL provide a GitHub Release workflow that starts from strict semver tags using the `vX.Y.Z` format.

#### Scenario: Valid release tag starts packaging

- **WHEN** a maintainer pushes tag `v0.0.1`
- **THEN** the release workflow validates the tag as strict semver
- **AND** the workflow starts release verification and desktop packaging

#### Scenario: Release tag matches project metadata

- **WHEN** the release workflow runs for tag `v0.0.1`
- **THEN** it verifies that package metadata version is `0.0.1`
- **AND** it verifies that Tauri metadata version is `0.0.1`
- **AND** artifact names use version `0.0.1`

#### Scenario: Version mismatch fails before packaging

- **WHEN** the release tag version does not match package metadata or Tauri metadata
- **THEN** the release workflow fails before packaging artifacts
- **AND** no draft GitHub Release is created or modified

#### Scenario: Invalid release tag fails before publishing

- **WHEN** a maintainer pushes a tag that does not match `vX.Y.Z`
- **THEN** the release workflow fails before publishing artifacts
- **AND** no GitHub Release artifacts are uploaded

### Requirement: Cross-platform desktop release artifacts

The system SHALL build desktop release artifacts for macOS and Windows. Linux desktop compile checks SHALL remain available, but Linux release artifacts are deferred in this change.

#### Scenario: Platform jobs upload intermediate artifacts

- **WHEN** a platform packaging job completes successfully
- **THEN** it uploads its desktop artifacts as Actions artifacts
- **AND** it does not create or mutate the GitHub Release directly

#### Scenario: Release artifacts are attached to draft GitHub Release

- **WHEN** all required platform packaging jobs complete successfully
- **THEN** the final aggregation job verifies the complete expected artifact set
- **AND** macOS and Windows artifacts are attached to a draft GitHub Release
- **AND** artifact names include the app name, release version, platform, and architecture where available
- **AND** a maintainer can review the draft before publishing it

#### Scenario: Re-running the same tag is idempotent

- **WHEN** the release workflow is re-run for the same release tag
- **THEN** the final aggregation job replaces same-named draft assets before uploading new copies
- **AND** the draft GitHub Release does not keep stale duplicate assets

#### Scenario: Platform failure leaves no half-filled draft

- **WHEN** one required platform packaging job fails
- **THEN** the final release aggregation job does not attach artifacts to a GitHub Release
- **AND** the workflow does not leave a partially populated release for that tag

#### Scenario: Aggregation failure cleans partial draft output

- **WHEN** the final aggregation job creates a draft GitHub Release and then fails before completing all uploads
- **THEN** it deletes the newly created draft release or removes assets uploaded by the failed attempt
- **AND** maintainers are not left with a partially populated draft from the failed run

#### Scenario: No external registry publish occurs

- **WHEN** the release workflow completes successfully
- **THEN** artifacts are available through a GitHub Release after a maintainer publishes the draft
- **AND** the workflow does not publish to app stores, package managers, or npm

#### Scenario: Initial artifact formats are produced

- **WHEN** the release workflow completes successfully
- **THEN** macOS DMG artifacts exist for `aarch64` and `x86_64`
- **AND** no macOS universal artifact is required
- **AND** a Windows NSIS `.exe` artifact exists
- **AND** Linux release artifacts are not required in this change
- **AND** no AppImage, Debian, or RPM artifact is required

#### Scenario: Forks do not publish releases

- **WHEN** the release workflow runs in a fork or non-canonical repository
- **THEN** verification and desktop compile checks may run
- **AND** no GitHub Release is created or modified

#### Scenario: Canonical repository may publish draft release

- **WHEN** the release workflow runs in `yuanzhidao/spec-ui`
- **THEN** the final aggregation job may create or update a draft GitHub Release after all required checks pass

### Requirement: Static Tauri desktop runtime

For the `0.0.1` release path captured by this change, the packaged desktop app SHALL load static renderer assets through Tauri and SHALL NOT require a bundled Next.js server, Hono runtime server, Node sidecar, or npm staging `node_modules` for desktop startup.

#### Scenario: Desktop app opens static renderer

- **WHEN** a user launches the packaged desktop app
- **THEN** the Tauri window loads local static renderer assets
- **AND** no bundled Next.js server is started for desktop UI rendering
- **AND** no Hono runtime server or Node sidecar is started for desktop runtime behavior
- **AND** the user does not need Node.js installed to launch the packaged desktop app

#### Scenario: Desktop runtime uses native bridge

- **WHEN** the desktop renderer needs local project, settings, watcher, validation, or terminal behavior
- **THEN** it invokes Tauri commands or listens to Tauri events
- **AND** it does not call a local Hono HTTP or WebSocket endpoint for desktop runtime behavior

### Requirement: No desktop startup ports

For the `0.0.1` release path captured by this change, the packaged desktop app SHALL not require local web or runtime ports for app startup.

#### Scenario: Startup avoids loopback server dependency

- **WHEN** the packaged desktop app starts
- **THEN** it does not bind a loopback port for UI rendering
- **AND** it does not bind a loopback port for desktop runtime APIs

#### Scenario: Web runtime remains separate

- **WHEN** the Web target runs with its local runtime server
- **THEN** runtime CORS rules remain explicit for the Web runtime path
- **AND** those Web runtime CORS rules are not required for desktop startup

### Requirement: Unsigned preview release

The initial release flow SHALL produce unsigned preview artifacts for macOS and Windows.

#### Scenario: Unsigned artifacts are documented

- **WHEN** a maintainer reads the release documentation
- **THEN** the documentation states that all `0.0.1` desktop artifacts are unsigned preview builds
- **AND** expected macOS and Windows platform warnings are not presented as packaging failures

#### Scenario: Signing credentials are not required

- **WHEN** the release workflow runs for `0.0.1`
- **THEN** it does not require Apple, Windows certificate, notarization, or signing secrets
- **AND** signing failures cannot block the release because signing is not part of this release flow

### Requirement: No updater artifacts

The initial release flow SHALL NOT configure an auto-updater or update-signing pipeline.

#### Scenario: Updater output is not generated

- **WHEN** the release workflow completes successfully
- **THEN** it does not generate updater manifests
- **AND** it does not generate updater signatures
- **AND** it does not require updater signing keys

### Requirement: Draft release notes

The release flow SHALL provide draft release notes generated from commit messages for maintainer review without requiring a project-maintained changelog source in this change.

#### Scenario: Draft release has commit-generated notes

- **WHEN** the release workflow creates or updates the draft GitHub Release
- **THEN** the draft release has release notes generated from git commit messages in the release range
- **AND** commit messages are grouped into readable sections where possible
- **AND** the workflow does not require a structured changelog entry

#### Scenario: First release has commit-generated notes

- **WHEN** no previous reachable tag exists for the release tag
- **THEN** the release-note generator uses commits reachable from the release tag
- **AND** the draft release still receives generated notes for maintainer review

### Requirement: Pull-request desktop package workflow

The system SHALL provide a pull-request desktop package workflow that checks release-equivalent desktop packaging readiness without publishing artifacts.

#### Scenario: Pull request checks release-equivalent desktop packaging

- **WHEN** a pull request opens or updates
- **THEN** the desktop package workflow builds unsigned macOS DMG artifacts for `aarch64` and `x86_64`
- **AND** it builds the unsigned Windows NSIS `.exe` artifact
- **AND** it verifies the expected packaged artifact exists for each release platform job
- **AND** it does not upload release artifacts as Actions artifacts
- **AND** no GitHub Release is created or modified

#### Scenario: Pull request retains Linux compile coverage

- **WHEN** a pull request opens or updates
- **THEN** the desktop package workflow prepares the desktop renderer for the Linux target
- **AND** it runs a Linux Rust/Tauri compile check
- **AND** it does not require Linux release artifacts in this change

### Requirement: Release verification gate

The release workflow SHALL run project verification before release artifact packaging and draft attachment.

#### Scenario: Verification fails

- **WHEN** typecheck, lint, tests, OpenSpec validation, Rust format, Rust check, or web build fails
- **THEN** release packaging does not attach artifacts to a draft GitHub Release

#### Scenario: Verification passes

- **WHEN** all required verification steps pass
- **THEN** the release workflow may package desktop artifacts
- **AND** the final aggregation job may attach the full artifact set to a draft GitHub Release after required platform jobs succeed
