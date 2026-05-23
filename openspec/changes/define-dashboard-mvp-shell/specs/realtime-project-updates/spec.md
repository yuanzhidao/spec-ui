## ADDED Requirements

### Requirement: WebSocket realtime transport
The system SHALL use WebSocket transport for realtime project update notifications across the project collection.

#### Scenario: Project collection starts realtime connection
- **WHEN** at least one valid local project is added
- **THEN** the client opens or reuses a WebSocket connection for the local project runtime

#### Scenario: Project collection changes
- **WHEN** the user adds or removes a valid project directory
- **THEN** the system updates runtime subscriptions for the changed project collection

#### Scenario: Runtime server provides WebSocket endpoint
- **WHEN** the local runtime server starts
- **THEN** it exposes the WebSocket endpoint used by the dashboard for project update notifications

#### Scenario: Browser app connects to separate runtime process
- **WHEN** the Next.js app and local runtime run as separate MVP development processes
- **THEN** the browser app uses configured local HTTP and WebSocket endpoints to communicate with the runtime

#### Scenario: Browser origin is not trusted
- **WHEN** a browser request to the local runtime includes an Origin header outside the configured local allowlist
- **THEN** the runtime rejects the request before exposing project data or mutating runtime state

#### Scenario: Browser origin is trusted
- **WHEN** a browser request to the local runtime includes an allowed local Origin header
- **THEN** the runtime includes CORS headers for that origin and processes the request normally

### Requirement: Local watcher emits normalized project events
The system SHALL watch relevant local project files outside React components and emit normalized realtime events.

Each normalized project update event SHALL include `projectPath`, `dialect`, `eventType`, `filePath`, `timestamp`, and an optional `entityId`. When the runtime can map the file to a detected scope, the event SHALL also include `scopeId`, `scopeLabel`, and `scopePath`.

#### Scenario: OpenSpec change file updates
- **WHEN** a file under an added project's OpenSpec changes area is created, updated, moved, or deleted
- **THEN** the runtime emits a normalized project update event over WebSocket

#### Scenario: OpenSpec spec file updates
- **WHEN** a file under an added project's OpenSpec specs area is created, updated, moved, or deleted
- **THEN** the runtime emits a normalized project update event over WebSocket

#### Scenario: Event fields are present
- **WHEN** the runtime emits a normalized project update event
- **THEN** the event includes the affected project path, detected dialect, event type, changed file path, timestamp, scope identity when it can be derived, and entity id when it can be derived

#### Scenario: Removed project stops watching
- **WHEN** a project is removed from the project collection
- **THEN** the runtime stops watching that project and no longer emits realtime events for it

#### Scenario: OpenSpec scope is added or removed
- **WHEN** an `openspec/` directory is created, moved, or removed under a watched project root
- **THEN** the runtime refreshes scope discovery for that project and emits an update that lets the dashboard refresh scoped projections

#### Scenario: Ignored directory changes
- **WHEN** files change under ignored dependency, build, hidden, worktree, or `.gitignore`-ignored directories
- **THEN** the runtime does not emit user-visible scoped project update events for those files

### Requirement: Realtime connection state is visible
The system SHALL display realtime connection and watcher state in the dashboard shell.

#### Scenario: Realtime connected
- **WHEN** the WebSocket connection is open and the watcher is active
- **THEN** the shell displays a connected realtime status

#### Scenario: Realtime degraded
- **WHEN** the WebSocket connection is disconnected, reconnecting, or watcher initialization fails
- **THEN** the shell displays the degraded status and keeps the last loaded project data visible when possible

### Requirement: Realtime updates refresh dashboard projection
The system SHALL refresh affected dashboard data after receiving relevant realtime project events.

#### Scenario: Relevant file update arrives
- **WHEN** the client receives a realtime event for a file that affects a project adapter projection
- **THEN** the dashboard refreshes the affected project's normalized data and updates visible unified boards or detail panels

#### Scenario: Scoped file update arrives
- **WHEN** the client receives a realtime event with scope identity
- **THEN** the dashboard refreshes the affected project projection and preserves scope-aware board context for visible focused-project views

#### Scenario: Irrelevant file update arrives
- **WHEN** the runtime observes a file update that does not affect supported spec data
- **THEN** the dashboard does not trigger a user-visible refresh for that event
