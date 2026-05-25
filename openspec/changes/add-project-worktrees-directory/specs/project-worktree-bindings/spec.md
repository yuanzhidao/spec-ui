## ADDED Requirements

### Requirement: Project worktrees directory binding
The system SHALL let each saved project bind one optional worktrees directory and zero or more manual orphan worktree paths.

#### Scenario: Worktrees directory is saved
- **WHEN** the user saves a readable local directory as a project's worktrees directory
- **THEN** the runtime persists the directory path on that project setting, refreshes project discovery, and starts watching direct child entry changes for automatic rediscovery

#### Scenario: Worktrees directory is cleared
- **WHEN** the user clears a project's saved worktrees directory
- **THEN** the runtime removes the saved path, detaches directory-derived worktree realtime subscriptions, and refreshes the project with the primary checkout plus any valid manually bound orphan worktrees

#### Scenario: Orphan worktree path is saved
- **WHEN** the user saves a readable local directory as a manual orphan worktree path
- **THEN** the runtime persists the path on that project setting and validates it as a checkout for the owning project

#### Scenario: Orphan worktree path is removed
- **WHEN** the user removes a saved manual orphan worktree path
- **THEN** the runtime removes the saved path, detaches that checkout's realtime subscription, and refreshes the project

#### Scenario: Settings are restored
- **WHEN** the runtime starts with a project that has a saved worktrees directory or manual orphan worktree paths
- **THEN** the runtime restores the settings, discovers valid worktree checkouts before projecting dashboard data, and starts watching the saved worktrees directory when present

### Requirement: Worktree directory discovery
The runtime SHALL discover project worktree checkouts by scanning only the direct child directories of the saved worktrees directory and by validating manually bound orphan worktree paths.

#### Scenario: Valid child worktree exists
- **WHEN** a direct child directory is a git worktree with the same git common directory as the primary project checkout
- **THEN** the runtime includes it as a worktree checkout for the owning project

#### Scenario: Nested child contains a worktree
- **WHEN** a worktree exists below a grandchild or deeper path of the saved worktrees directory
- **THEN** the runtime does not discover it during worktrees directory scanning

#### Scenario: Unrelated repository exists
- **WHEN** a direct child directory is a git working tree for a different repository
- **THEN** the runtime does not include it as a project checkout

#### Scenario: Invalid child exists
- **WHEN** a direct child is unreadable, missing, not a directory, or not a git working tree
- **THEN** the runtime skips that child without failing the owning project

#### Scenario: Worktrees directory cannot be read
- **WHEN** the saved worktrees directory is missing or unreadable
- **THEN** the runtime reports a recoverable worktree discovery issue and keeps the saved path editable

#### Scenario: Directory-derived worktree is added
- **WHEN** a direct child directory is added under the saved worktrees directory and validates as a worktree for the same git repository
- **THEN** the runtime rediscovers the owning project and projects the new checkout without a manual refresh

#### Scenario: Directory-derived worktree is removed
- **WHEN** a previously detected directory-derived worktree is removed from the saved worktrees directory
- **THEN** the runtime rediscovers the owning project and removes that checkout's projected data without a manual refresh

#### Scenario: Invalid orphan worktree path exists
- **WHEN** a saved manual orphan worktree path is unreadable, missing, not a directory, not a git working tree, or belongs to another repository
- **THEN** the runtime keeps the saved path recoverable, reports a worktree discovery issue, and does not project it as a valid checkout

### Requirement: Project checkout projection
The system SHALL model the primary project directory and valid worktree directories as checkouts under one project.

#### Scenario: Project has only primary checkout
- **WHEN** a project has no valid worktree checkouts
- **THEN** Specs, Changes, Validation, and Activity render with the same project behavior as before this change

#### Scenario: Project has valid worktree checkouts
- **WHEN** a project has one or more valid worktree checkouts
- **THEN** Specs, Changes, Validation, and Activity include data from the primary checkout and each valid worktree checkout under the owning project

#### Scenario: Same change id appears in multiple checkouts
- **WHEN** the same active Change ID exists in more than one checkout
- **THEN** the dashboard displays one merged Change item, uses the most recently updated checkout version as the visible primary, and exposes checkout source tags for every contributing checkout

#### Scenario: Worktree checkout changes
- **WHEN** files change inside a valid worktree checkout
- **THEN** the owning project refreshes and the changed checkout's projected data updates without requiring the worktree to be added as a separate project

### Requirement: Worktrees settings UI
The system SHALL expose worktrees directory management in each project's settings surface.

#### Scenario: User opens project settings
- **WHEN** the user opens a project's settings
- **THEN** the UI shows the primary project path, the saved worktrees directory if present, manual orphan worktree paths, detected checkout count, and recoverable worktree discovery issues

#### Scenario: User updates worktrees directory
- **WHEN** the user saves a new worktrees directory path
- **THEN** the UI requests the runtime to persist the path, refresh discovery, start automatic directory-change watching, and update visible checkout data

#### Scenario: User adds orphan worktree path
- **WHEN** the user saves a manual orphan worktree path
- **THEN** the UI requests the runtime to persist the path, refresh discovery, and update visible checkout data

#### Scenario: Project has multiple checkouts
- **WHEN** a projected Spec or Change belongs to a worktree checkout
- **THEN** the UI labels the card with the checkout label or branch so the source directory is visible

#### Scenario: Project item uses OpenSpec
- **WHEN** a projected Spec or Change belongs to an OpenSpec checkout
- **THEN** the UI labels the card with an OpenSpec protocol tag

#### Scenario: Merged Change has worktree sources
- **WHEN** a Change card merges sources from one or more worktree checkouts
- **THEN** the UI shows worktree source tags on the Change card
