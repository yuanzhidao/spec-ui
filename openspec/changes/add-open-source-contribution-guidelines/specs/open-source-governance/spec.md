# open-source-governance Specification

## ADDED Requirements

### Requirement: Public README

The repository SHALL provide a lightweight `README.md` that introduces spec-ui, states the current project status, explains local setup, lists development and verification commands, links to contribution guidance, notes OpenSpec-driven changes, and identifies the project license.

#### Scenario: Visitor opens the repository

- **WHEN** a visitor opens the repository
- **THEN** the README provides enough context to understand what spec-ui is, how to run it locally, and where to find contribution guidance

### Requirement: Contribution guide

The repository SHALL provide a public `CONTRIBUTING.md` that explains how contributors should set up the project, choose a branch/worktree, plan changes, install dependencies, verify changes, and open pull requests.

#### Scenario: Contributor reads setup instructions

- **WHEN** a new contributor opens `CONTRIBUTING.md`
- **THEN** they can identify the required package manager, development commands, verification commands, and desktop prerequisites

#### Scenario: Contributor plans a substantial change

- **WHEN** a contribution changes behavior, UI flow, architecture, parser behavior, runtime boundaries, packaging, dependencies, automation, or contribution policy
- **THEN** the guide requires an OpenSpec change before implementation

#### Scenario: Contributor changes dependencies

- **WHEN** a contribution adds or updates dependencies
- **THEN** the guide requires package-manager or official CLI installation, PR disclosure, and justification for stability, maintenance, license, and stack fit

### Requirement: Pull request template

The repository SHALL provide a pull request template that asks for motivation, scope, user-visible behavior, verification evidence, screenshots or logs when relevant, dependency disclosure, breaking-change disclosure, and OpenSpec status.

#### Scenario: Contributor opens a pull request

- **WHEN** a pull request is created
- **THEN** the template prompts the author to provide enough context for maintainer review
- **AND** the template includes a concise checklist for tests, documentation, dependency changes, and OpenSpec status

### Requirement: Issue templates

The repository SHALL provide GitHub issue templates for bug reports and feature requests.

#### Scenario: User reports a bug

- **WHEN** a bug report issue is opened
- **THEN** the template asks for environment, steps to reproduce, expected behavior, actual behavior, logs or screenshots, and affected project type

#### Scenario: User requests a feature

- **WHEN** a feature request issue is opened
- **THEN** the template asks for problem statement, proposed behavior, alternatives, affected workflows, and whether OpenSpec is expected

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
