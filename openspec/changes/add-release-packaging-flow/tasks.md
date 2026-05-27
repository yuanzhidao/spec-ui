## 1. OpenSpec

- [x] 1.1 Review this change for release scope, platform targets, and non-goals.
- [x] 1.2 Validate `add-release-packaging-flow`.

## 2. Version Metadata

- [x] 2.1 Set the initial release version to `0.0.1`.
- [x] 2.2 Synchronize web package metadata, Tauri metadata, and artifact naming.
- [x] 2.3 Update version metadata manually for this first release.
- [x] 2.4 Add release verification that the tag version matches package metadata and Tauri metadata.
- [x] 2.5 Keep dependency changes installed through the package manager or official project CLIs.

## 3. Desktop Production Packaging

- [x] 3.1 Replace the production desktop build placeholder with a real packaging path.
- [x] 3.2 Build static desktop renderer assets for Tauri production use.
- [x] 3.3 Remove Node sidecar embedding from the desktop release startup path.
- [x] 3.4 Use Rust-owned Tauri commands/events for packaged desktop runtime behavior.
- [x] 3.5 Ensure users do not need a preinstalled Node.js runtime.
- [x] 3.6 Configure macOS DMG artifacts for `aarch64` and `x86_64` without universal binaries.
- [x] 3.7 Configure Windows NSIS `.exe` artifacts.
- [x] 3.8 Defer Linux release packaging while retaining Linux desktop compile checks.
- [x] 3.9 Do not configure RPM artifacts in this change.
- [x] 3.10 Remove managed web/runtime server startup from the packaged desktop app.
- [x] 3.11 Avoid desktop startup dependency on loopback web/runtime ports.
- [x] 3.12 Keep Web runtime CORS rules explicit outside the desktop startup path.
- [x] 3.13 Ensure terminal child processes shut down when the desktop app exits.
- [x] 3.14 Ensure packaged desktop startup does not require a preinstalled Node.js runtime.

## 4. CI Release Flow

- [x] 4.1 Add a tag-triggered GitHub Release workflow for `vX.Y.Z`.
- [x] 4.2 Validate strict semver tags before release artifact packaging.
- [x] 4.3 Run web, runtime, OpenSpec, and Rust verification before release packaging.
- [x] 4.4 Build macOS and Windows desktop release artifacts, with Linux compile checks retained separately.
- [x] 4.5 Upload platform build outputs as intermediate Actions artifacts.
- [x] 4.6 Add a final aggregation job that verifies the complete expected artifact set before creating or updating the draft GitHub Release.
- [x] 4.7 Make draft release aggregation idempotent by replacing same-named assets on repeated tag runs.
- [x] 4.8 Clean up newly created draft releases or partially uploaded assets if aggregation fails.
- [x] 4.9 Restrict GitHub Release creation and mutation to `yuanzhidao/spec-ui`.
- [x] 4.10 Add a pull-request desktop package workflow that builds release-equivalent macOS and Windows artifacts without publishing release artifacts.
- [x] 4.11 Retain Linux desktop compile coverage without requiring Linux release artifacts.

## 5. Documentation

- [x] 5.1 Document the release tag flow.
- [x] 5.2 Document generated artifact expectations by platform.
- [x] 5.3 Document that all `0.0.1` desktop artifacts are unsigned preview builds.
- [x] 5.4 Document that package-manager publishing and auto-updates are out of scope.
- [x] 5.5 Document that draft release notes are generated from commit messages and reviewed before publishing.
- [x] 5.6 Document that structured changelog rendering is deferred to a later change.
- [x] 5.7 Document that updater manifests, updater signing keys, and update signatures are out of scope.

## 6. Verification

- [x] 6.1 Run TypeScript typecheck and lint.
- [x] 6.2 Run unit tests.
- [x] 6.3 Run `openspec validate --all`.
- [x] 6.4 Run Rust format/check for `src-tauri`.
- [x] 6.5 Run desktop compile and packaging checks where the host platform supports them.
