# desktop-shell Specification

## ADDED Requirements

### Requirement: Tauri desktop shell

The system SHALL provide a Tauri v2 desktop shell for local development without replacing the existing web UI or runtime architecture.

#### Scenario: Desktop shell opens the web app in development

- **WHEN** the developer starts the desktop shell in development mode
- **THEN** Tauri loads the existing local Next.js app from `http://localhost:3000`
- **AND** the existing local runtime remains available to the web UI

#### Scenario: Desktop shell uses spec-ui identity

- **WHEN** the desktop shell starts
- **THEN** the app uses the spec-ui product name, desktop identifier, window title, and desktop-oriented initial window size

### Requirement: Existing Web technology stack remains

The system SHALL keep the existing Next.js, React, TypeScript, shadcn/ui, next-intl, and pnpm Web stack available while Desktop runtime responsibilities move toward Tauri-native commands and events.

#### Scenario: Tauri is added

- **WHEN** Tauri is introduced
- **THEN** the Web target is not removed
- **AND** shared product UI remains available for Desktop and Web targets
- **AND** Hono is not required to remain the packaged Desktop runtime after `migrate-to-desktop-first-tauri-renderer`

### Requirement: Production packaging is deferred

The system SHALL treat production desktop packaging as a follow-up specification until the static Desktop renderer, runtime command/event boundary, and URL-backed route semantics are designed.

#### Scenario: Developer inspects desktop commands

- **WHEN** the developer reads the project scripts
- **THEN** development and inspection commands are available
- **AND** no production installer workflow is implied as complete by this change
