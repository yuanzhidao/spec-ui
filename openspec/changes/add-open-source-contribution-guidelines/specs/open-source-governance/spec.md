# open-source-governance Specification

## ADDED Requirements

### Requirement: Public README

The repository SHALL provide a lightweight `README.md` that introduces spec-ui, states the current project status, explains local setup, lists development and verification commands, links to contribution guidance, notes OpenSpec-driven changes, and identifies the project license.

#### Scenario: Visitor opens the repository

- **WHEN** a visitor opens the repository
- **THEN** the README provides enough context to understand what spec-ui is, how to run it locally, and where to find contribution guidance

### Requirement: Contribution guide

The repository SHALL provide a public `CONTRIBUTING.md` that explains how contributors should set up the project, choose a branch/worktree, write scoped Conventional Commit messages, plan changes, install dependencies, verify changes, and open pull requests.

#### Scenario: Contributor reads setup instructions

- **WHEN** a new contributor opens `CONTRIBUTING.md`
- **THEN** they can identify the required package manager, development commands, verification commands, and desktop prerequisites

#### Scenario: Contributor plans a substantial change

- **WHEN** a contribution changes behavior, UI flow, architecture, parser behavior, runtime boundaries, packaging, dependencies, automation, or contribution policy
- **THEN** the guide requires an OpenSpec change before implementation

#### Scenario: Contributor prepares branch and commits

- **WHEN** a contributor prepares local work for review
- **THEN** the guide recommends descriptive lowercase branch names tied to an issue, OpenSpec change ID, or concise feature name
- **AND** it requires Conventional Commit style messages for commits
- **AND** it recommends logically scoped commits that split specs, app behavior, CI, documentation, dependencies, and cleanup when independently reviewable

#### Scenario: Contributor changes dependencies

- **WHEN** a contribution adds or updates dependencies
- **THEN** the guide requires package-manager or official CLI installation, PR disclosure, and justification for stability, maintenance, license, and stack fit

### Requirement: Pull request template

The repository SHALL provide a pull request template that asks for summary, related issue, change type, user-visible behavior, OpenSpec status, verification evidence, screenshots or recordings when relevant, dependency disclosure, breaking-change disclosure, and lightweight AI assistance disclosure.

#### Scenario: Contributor opens a pull request

- **WHEN** a pull request is created
- **THEN** the template prompts the author to provide enough context for maintainer review
- **AND** the template includes a concise checklist for tests, documentation, dependency changes, OpenSpec status, and UI evidence when applicable

### Requirement: Issue templates

The repository SHALL provide GitHub issue templates for bug reports and feature requests.

#### Scenario: User reports a bug

- **WHEN** a bug report issue is opened
- **THEN** the template asks for environment, app mode or build source, steps to reproduce, expected behavior, actual behavior, logs or screenshots, and affected project type

#### Scenario: User requests a feature

- **WHEN** a feature request issue is opened
- **THEN** the template asks for problem statement, proposed behavior, alternatives, affected workflows, and additional context
- **AND** maintainers remain responsible for deciding whether the request needs an OpenSpec change

### Requirement: Project license

The repository SHALL provide an Apache-2.0 `LICENSE` file.

#### Scenario: Contributor reviews licensing

- **WHEN** a contributor opens the repository license
- **THEN** they can identify Apache License 2.0 as the project license

### Requirement: Public documents stay project-focused

Public open-source documents SHALL describe spec-ui's own workflow and SHALL NOT include machine-specific paths, scratch notes, or unrelated local-only context.

#### Scenario: Public docs are reviewed

- **WHEN** maintainers review the generated public governance files
- **THEN** the files describe only spec-ui contribution, issue reporting, pull request, and licensing workflows
