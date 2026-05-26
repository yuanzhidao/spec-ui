# Design

## Decision: Start at version 0.0.1

The initial public release version SHALL be `0.0.1`. Release tags SHALL use the `vX.Y.Z` format, for example `v0.0.1`. Package metadata, Tauri metadata, and release artifact names SHALL stay synchronized with the tag.

The release workflow SHALL validate that the tag version matches the package metadata and Tauri metadata before packaging artifacts. A mismatch SHALL fail the workflow before artifacts are attached to a draft GitHub Release.

## Decision: GitHub Releases only

The release flow SHALL create a draft GitHub Release and attach built artifacts to it only after all required platform packaging jobs succeed. A maintainer SHALL manually publish the draft after reviewing the uploaded assets. It SHALL NOT publish to external package registries or platform stores in this change. This keeps the first release path small while preserving room for later distribution channels.

Platform jobs SHOULD upload intermediate Actions artifacts first. A final aggregation job SHOULD download those artifacts, verify the complete expected artifact set, create or update the draft GitHub Release, and attach the full artifact set in one step. This avoids leaving a half-filled GitHub Release when one platform fails.

The final aggregation job SHALL be idempotent for repeated runs of the same tag. It SHALL replace same-named draft assets before uploading new copies. If the aggregation job creates a draft release and then fails before completing the upload, it SHALL delete that newly created draft or remove the assets uploaded by the failed attempt.

The GitHub Release publishing job SHALL run only on the canonical upstream repository, currently `yuanzhidao/spec-ui`. Forks may run verification and desktop compile checks, but they SHALL NOT create or mutate upstream GitHub Releases.

## Decision: Build releasable desktop platforms

The release workflow SHALL build macOS and Windows artifacts through a platform matrix. Linux desktop compile checks SHALL remain in pull-request CI, but Linux release packaging SHALL stay disabled until the AppImage/Deb bundling path is stable enough for the project to support.

The initial artifact set SHALL be:

- macOS: DMG for `aarch64` and `x86_64`.
- Windows: NSIS `.exe` installer.

macOS universal binaries SHALL NOT be produced in this change. Linux AppImage, Debian, and RPM packages SHALL NOT be produced in this change.

## Decision: Use static Tauri renderer packaging for 0.0.1

The `0.0.1` desktop production app SHALL use Tauri static renderer packaging. The packaged app SHALL load local renderer assets through `frontendDist` and SHALL NOT launch a bundled Next.js server for desktop UI startup.

Desktop-local runtime behavior SHALL be owned by the Tauri Rust process through commands and events. Release builds SHALL NOT embed Node runtime pieces, npm staging `node_modules`, a Hono runtime server, or other managed local server processes for desktop startup. Users SHALL NOT need to install Node.js before launching the packaged desktop app.

## Decision: Manual version update for 0.0.1

The first release SHALL update version metadata manually to `0.0.1`. A dedicated version bump command is out of scope until repeated releases make the automation valuable.

## Decision: Commit-generated draft release notes for 0.0.1

The first release SHALL generate draft release notes from git commit messages in the release range. The generator SHALL use the previous reachable tag as the start of the range when one exists, and SHALL use all commits reachable from the release tag for the first release. A maintainer SHALL review and edit those notes before publishing the draft. A structured changelog source and changelog page are intentionally deferred to a later change.

## Decision: Avoid desktop startup ports

The packaged desktop app SHALL avoid local web/runtime startup ports. It SHALL open the static Tauri renderer directly and use Tauri commands/events for local project, settings, watcher, validation, and terminal behavior.

Runtime CORS rules remain relevant to the Web target's local runtime server, but they SHALL NOT be required for desktop app startup.

## Decision: Unsigned preview artifacts on every platform

The `0.0.1` release flow SHALL produce unsigned macOS and Windows artifacts. Code signing, notarization, certificate handling, and release identity secrets SHALL be handled by a later change. Documentation SHALL make the unsigned preview status clear enough that testers know platform warnings are expected.

## Decision: Pull-request desktop compile workflow

In addition to the tag-triggered release workflow, the project SHOULD provide a pull-request desktop compile workflow. It SHALL prepare the desktop renderer and run Rust/Tauri compile checks across macOS, Windows, and Linux targets without producing installer artifacts, uploading Actions artifacts, or mutating a GitHub Release.

## Risks

- Static desktop routing and shared UI boundaries need careful regression testing because the Web target still uses Next.js routing.
- Rust-owned runtime command coverage must stay aligned with the Web runtime contract.
- Cross-platform desktop builds can fail on native system dependencies even when web checks pass.
- Unsigned macOS and Windows artifacts can trigger expected platform warnings.
- Linux packaging remains deferred until the bundling path is stable.
