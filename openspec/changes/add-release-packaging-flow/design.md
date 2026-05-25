# Design

## Decision: Start at version 0.0.1

The initial public release version SHALL be `0.0.1`. Release tags SHALL use the `vX.Y.Z` format, for example `v0.0.1`. Package metadata, Tauri metadata, and release artifact names SHALL stay synchronized with the tag.

The release workflow SHALL validate that the tag version matches the package metadata and Tauri metadata before packaging artifacts. A mismatch SHALL fail the workflow before artifacts are attached to a draft GitHub Release.

## Decision: GitHub Releases only

The release flow SHALL create a draft GitHub Release and attach built artifacts to it only after all required platform packaging jobs succeed. A maintainer SHALL manually publish the draft after reviewing the uploaded assets. It SHALL NOT publish to external package registries or platform stores in this change. This keeps the first release path small while preserving room for later distribution channels.

Platform jobs SHOULD upload intermediate Actions artifacts first. A final aggregation job SHOULD download those artifacts, verify the complete expected artifact set, create or update the draft GitHub Release, and attach the full artifact set in one step. This avoids leaving a half-filled GitHub Release when one platform fails.

The final aggregation job SHALL be idempotent for repeated runs of the same tag. It SHALL replace same-named draft assets before uploading new copies. If the aggregation job creates a draft release and then fails before completing the upload, it SHALL delete that newly created draft or remove the assets uploaded by the failed attempt.

The GitHub Release publishing job SHALL run only on the canonical upstream repository, currently `yuanzhidao/spec-ui`. Forks may run verification and desktop compile checks, but they SHALL NOT create or mutate upstream GitHub Releases.

## Decision: Build all desktop platforms

The release workflow SHALL build macOS, Windows, and Linux artifacts through a platform matrix. Platform-specific setup, including Linux WebView and bundler dependencies, SHALL be explicit in CI so a new maintainer can understand the required environment.

The initial artifact set SHALL be:

- macOS: DMG for `aarch64` and `x86_64`.
- Windows: NSIS `.exe` installer.
- Linux: AppImage and Debian package.

macOS universal binaries SHALL NOT be produced in this change. RPM packages SHALL NOT be produced in this change.

## Decision: Keep Next server packaging

The desktop production app SHALL keep the Next.js server model instead of using static export. Dynamic routes and local runtime behavior are part of the product model, so the packaged desktop app SHALL launch a local Next server and the local runtime server as managed processes.

The implementation SHALL embed the Node runtime pieces needed by the desktop app as sidecar or equivalent managed processes. Release builds SHALL use official Node runtime downloads for the target platform and architecture instead of copying the CI runner's current Node executable. Users SHALL NOT need to install Node.js before launching the packaged desktop app. The MVP SHALL NOT rewrite the runtime in Rust.

## Decision: Manual version update for 0.0.1

The first release SHALL update version metadata manually to `0.0.1`. A dedicated version bump command is out of scope until repeated releases make the automation valuable.

## Decision: Commit-generated draft release notes for 0.0.1

The first release SHALL generate draft release notes from git commit messages in the release range. The generator SHALL use the previous reachable tag as the start of the range when one exists, and SHALL use all commits reachable from the release tag for the first release. A maintainer SHALL review and edit those notes before publishing the draft. A structured changelog source and changelog page are intentionally deferred to a later change.

## Decision: Coordinate local ports at startup

The packaged desktop app SHALL avoid assuming that fixed ports are always free. Startup SHOULD allocate or validate loopback ports for the web server and runtime server, pass them through environment variables, and open the Tauri window only after the services are ready.

Runtime CORS rules SHALL remain explicit. The production desktop origin and loopback runtime origin SHALL be allowed without using a wildcard.

## Decision: Unsigned preview artifacts on every platform

The `0.0.1` release flow SHALL produce unsigned macOS, Windows, and Linux artifacts. Code signing, notarization, certificate handling, and release identity secrets SHALL be handled by a later change. Documentation SHALL make the unsigned preview status clear enough that testers know platform warnings are expected.

## Decision: Pull-request desktop compile workflow

In addition to the tag-triggered release workflow, the project SHOULD provide a pull-request desktop compile workflow. It SHALL prepare the desktop runtime and run Rust/Tauri compile checks across macOS, Windows, and Linux targets without producing installer artifacts, uploading Actions artifacts, or mutating a GitHub Release.

## Risks

- Packaging a Next.js server inside a desktop app is more complex than static export.
- Node sidecar packaging can increase artifact size and platform-specific edge cases.
- Cross-platform desktop builds can fail on native system dependencies even when web checks pass.
- Unsigned macOS and Windows artifacts can trigger expected platform warnings.
- Port coordination and process shutdown need careful handling to avoid orphaned local processes.
