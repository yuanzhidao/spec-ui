# Design

## Decision: English-first public documents

Public repository documents SHALL be written in English by default. Chinese may be added later through an explicit localization documentation change, but this initial open-source policy set SHALL avoid mixed-language templates so external contributors see one consistent primary language.

## Decision: Keep public files project-focused

Public contribution documents SHALL describe spec-ui's own workflow and standards. They SHALL avoid machine-specific paths, scratch notes, and unrelated local-only context.

## Decision: OpenSpec before substantial changes

Contribution guidance SHALL make OpenSpec the required planning layer for behavior, UI flow, architecture, parser, runtime, packaging, dependency, automation, and contribution process changes. Small typo fixes, purely mechanical formatting, and narrowly scoped test repairs may bypass OpenSpec when they do not change behavior or policy.

## Decision: Verification evidence is required

Pull requests SHALL require explicit verification commands and evidence appropriate to the change. UI-visible changes should include screenshots or short recordings when practical. Runtime, parser, adapter, and settings changes should include tests or command output.

## Decision: Dependency changes need disclosure

Contribution guidance SHALL require dependency changes to be added through package manager or official CLI commands, disclosed in the PR, and justified against stability, maintenance, license, and fit with the approved stack.

## Decision: Defer community governance and automation

The initial public documentation set SHALL stay lightweight. Code of conduct, security policy, dependency update automation, release workflows, labels, and assignment bots are deferred until the project has enough public contribution volume to justify them.

## Risks

- Overly strict contribution rules can discourage early contributors; keep checklists concrete and short.
- Deferring security and conduct documents means maintainers may need to add them quickly once public reports or community interactions increase.
- Deferring dependency automation means maintainers need to update dependencies manually until automation is introduced.
