## ADDED Requirements

### Requirement: WebSocket realtime transport
The system SHALL use WebSocket transport for realtime project update notifications.

#### Scenario: Project binding starts realtime connection
- **WHEN** a valid local project is bound
- **THEN** the client opens or reuses a WebSocket connection for that project runtime

#### Scenario: Project binding changes
- **WHEN** the user switches to another valid project directory
- **THEN** the system stops or detaches the previous project subscription and subscribes to updates for the new project

#### Scenario: Runtime server provides WebSocket endpoint
- **WHEN** the local runtime server starts
- **THEN** it exposes the WebSocket endpoint used by the dashboard for project update notifications

#### Scenario: Browser app connects to separate runtime process
- **WHEN** the Next.js app and local runtime run as separate MVP development processes
- **THEN** the browser app uses configured local HTTP and WebSocket endpoints to communicate with the runtime

### Requirement: Local watcher emits normalized project events
The system SHALL watch relevant local project files outside React components and emit normalized realtime events.

Each normalized project update event SHALL include `projectPath`, `dialect`, `eventType`, `filePath`, `timestamp`, and an optional `entityId`.

#### Scenario: OpenSpec change file updates
- **WHEN** a file under the selected project's OpenSpec changes area is created, updated, moved, or deleted
- **THEN** the runtime emits a normalized project update event over WebSocket

#### Scenario: OpenSpec spec file updates
- **WHEN** a file under the selected project's OpenSpec specs area is created, updated, moved, or deleted
- **THEN** the runtime emits a normalized project update event over WebSocket

#### Scenario: Event fields are present
- **WHEN** the runtime emits a normalized project update event
- **THEN** the event includes the active project path, detected dialect, event type, changed file path, timestamp, and entity id when it can be derived

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
- **WHEN** the client receives a realtime event for a file that affects the active adapter projection
- **THEN** the dashboard refreshes the affected normalized data and updates visible lists or detail panels

#### Scenario: Irrelevant file update arrives
- **WHEN** the runtime observes a file update that does not affect supported spec data
- **THEN** the dashboard does not trigger a user-visible refresh for that event
