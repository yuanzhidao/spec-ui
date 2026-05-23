## Purpose
Define user preferences for theme and language selection.

## Requirements

### Requirement: Theme preference
The system SHALL provide Light, Dark, and System theme preferences.

#### Scenario: User selects Light
- **WHEN** the user selects Light theme
- **THEN** the app renders light semantic tokens and persists the preference

#### Scenario: User selects Dark
- **WHEN** the user selects Dark theme
- **THEN** the app renders dark semantic tokens and persists the preference

#### Scenario: User selects System
- **WHEN** the user selects System theme
- **THEN** the app follows the operating system color scheme while preserving System as the saved preference

### Requirement: Language preference
The system SHALL provide English as the primary language and Chinese as a secondary language.

#### Scenario: User selects English
- **WHEN** the user selects English
- **THEN** supported shell copy renders in English without requiring a reload

#### Scenario: User selects Chinese
- **WHEN** the user selects Chinese
- **THEN** supported shell copy renders in Chinese without requiring a reload

#### Scenario: App restarts
- **WHEN** the app reloads after a language change
- **THEN** the saved language preference remains active
