# AGENTS.md

Behavioral guidelines for this workspace. These rules are intentionally conservative: keep changes scoped, verify assumptions, and make the project context visible.

Product context, technical stack, and OpenSpec artifact rules live in `openspec/config.yaml`. Keep this file focused on agent behavior, workflow discipline, and workspace operating rules.

## 0. Context Marker

**Make workspace context visible.**

- Start every ordinary assistant response with `Maintainer.` including interim updates and final answers.
- The `Maintainer.` prefix is a lightweight signal that the assistant has loaded and is following this workspace's `AGENTS.md` context.
- If a response cannot naturally start with `Maintainer.` because it is a generated artifact, commit message, code block, or machine-readable output, keep the artifact format intact and mention `Maintainer.` in the surrounding assistant message.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Evidence, not guessing:
- Never guess values, behavior, architecture, configuration locations, API contracts, UI dimensions, dependency choices, or external facts.
- If the user asks for something specific, assume the required data exists or can be obtained from the workspace, official docs, command output, or the user.
- Before stating a concrete value or making an implementation decision, verify it from an authoritative source and mention the source when it matters.
- If the source is unavailable or ambiguous, stop and ask the maintainer for the missing data instead of inventing a plausible answer.
- Do not use phrases like "probably", "应该", "大概", or silent inference as a substitute for verification.
- When correcting a previous guess, explicitly replace it with the verified fact and identify how it was verified.

Before implementing:
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them instead of picking silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop, name what's confusing, and ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- Do not rebuild commodity functionality when a well-known, actively maintained library fits the scope. Before adding a dependency, verify community adoption, maintenance activity, package health, license, bundle/runtime impact, and fit with the existing stack.
- This is a long-lived product, not a speed-run prototype. Prefer stable, well-known, actively maintained dependencies over custom implementations for mature problem domains such as i18n, forms, validation, routing helpers, data fetching, tables, charts, date/time handling, accessibility primitives, and editor/runtime integrations.
- Do not avoid dependency installation just to move faster or reduce approval friction. If a dependency is the cleaner long-term solution, request the required package-manager approval and install it through the approved CLI workflow.
- Self-build only when the domain is project-specific, the dependency ecosystem is weak, the dependency would create unacceptable runtime/bundle/security risk, or the maintainer explicitly asks for an in-house implementation.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it instead of deleting it.

When your changes create orphans:
- Remove imports, variables, functions, files, and generated artifacts that your changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request or the approved OpenSpec change.

## 4. Code Organization

**Keep files small enough to review and maintain.**

- Do not let a source file grow into a mixed-responsibility module.
- Prefer layered code boundaries: UI components, state/hooks, server/runtime access, domain adapters, and parsing/validation logic should live in separate modules when they are distinct responsibilities.
- Aim to keep each code file under 1,000 lines. If a file approaches that size, split it by responsibility before adding more behavior.
- Avoid splitting by arbitrary line count alone. Split around stable concepts that make testing and ownership clearer.
- Large generated files, lockfiles, snapshots, and vendored artifacts are exempt, but do not hand-edit them unless the task explicitly requires it.

## 5. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" -> "Write tests for invalid inputs, then make them pass"
- "Fix the bug" -> "Write a test that reproduces it, then make it pass"
- "Refactor X" -> "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```text
1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]
```

Strong success criteria let you loop independently. Weak criteria such as "make it work" require clarification.

## 6. OpenSpec Discipline

**OpenSpec is the required planning and contract layer before implementation.**

This workspace currently uses a single root OpenSpec instance under `openspec/`. Do not invent layered OpenSpec directories unless the maintainer explicitly approves a repository structure change.

OpenSpec is required before changing:
- Product behavior, user-visible UI flows, interaction states, or information architecture.
- Spec format compatibility, parser behavior, adapters, import/export behavior, or realtime dashboard semantics.
- Architecture, runtime boundaries, packaging strategy, desktop packaging assumptions, or deployment assumptions.
- Technical stack choices, dependency strategy, test strategy, permissions, automation workflows, or contribution process.

Allowed exceptions are narrow:
- Purely mechanical formatting.
- Typos or wording edits that do not alter product/system behavior.
- Local test repairs that only restore intended behavior.
- Documentation cleanup that does not change the product contract, workflow contract, or contribution policy.

### Non-Negotiable OpenSpec Review Gate

Treat OpenSpec self-review as a separate manual gate, not as a synonym for validation.

- `pnpm spec:validate` only checks OpenSpec syntax and structural consistency. It does not count as self-review.
- After every OpenSpec create or update, manually review `proposal.md`, `design.md`, `tasks.md`, and every spec delta before saying the spec is done, reviewed, or ready for approval.
- The manual self-review must check scope classification, affected behavior, ownership boundaries, contradictions between artifacts, requirement wording, scenario observability, validation tasks, and the approval checkpoint.
- If any self-review pass finds a blocker, revise the OpenSpec artifacts yourself first, then run another self-review pass. Repeat this review -> fix -> review loop until a full pass finds no blockers.
- Do not say the spec is reviewed, complete, or ready while any known blocker remains. Report completion only after the final self-review pass finds no blockers.
- A spec-writing turn is not complete until both gates are reported to the user: `Self-review: completed` and `Validation: <command> passed/failed`.
- Do not start implementation until the maintainer explicitly approves the reviewed and validated spec, unless the exact scoped change was already approved.

Before creating or editing any OpenSpec change:
- State whether the request appears to be a small fix, a scoped feature, or a broad cross-cutting feature.
- Identify the affected product area, workflow, spec contract, or project policy.
- Ask the maintainer to confirm the scope before creating specs when the change is not obviously narrow.
- If the maintainer hints that more requirements may be coming, stop and ask whether to collect them into one feature spec before proceeding.

Required flow:
1. Confirm request classification, scope, affected areas, and whether to group related requirements.
2. Propose the change with the project OpenSpec workflow or equivalent files under `openspec/changes/<change-id>/`, written in English by default.
3. Self-review the OpenSpec artifacts manually, fix every blocking issue found, then self-review again.
4. Validate the change with `pnpm spec:validate`.
5. Present the spec summary, self-review status, and validation command/result to the maintainer, then wait for explicit approval before implementation.
6. Implement only the behavior covered by the approved change.
7. Update tasks and specs as implementation facts change.
8. Archive only after implementation and verification are complete.

If OpenSpec tooling is missing or broken, stop and surface the blocker instead of silently implementing without specs.

## 7. Dependency And Package Discipline

**Use pnpm and let package tooling write package metadata.**

- Use `pnpm` as the default package manager.
- Do not hand-write or directly edit `package.json` to add dependencies, scripts, or framework scaffolding.
- Add dependencies through CLI commands that resolve current package metadata, such as `pnpm add <package>@latest`, `pnpm add -D <package>@latest`, or official scaffolding commands run through `pnpm dlx`.
- Before adding a dependency, verify it fits the approved stack and check package health, maintenance, license, and runtime/bundle impact.
- For mature cross-cutting capabilities, prefer proven ecosystem libraries with strong maintenance and adoption over bespoke code. Do not use "simple enough to hand-roll" as the only justification for self-building.
- If the right dependency requires network or filesystem approval, request approval instead of silently falling back to a custom implementation.
- Treat network failures from package managers, scaffolding CLIs, registries, documentation fetches, or other required tooling as sandbox restrictions first. If a required command fails with DNS, connection, registry, or fetch errors, immediately retry it with the proper escalation request instead of assuming the machine has no network or implementing a local workaround.
- Lockfile and package metadata changes produced by approved package-manager commands are acceptable, but review them before committing.
- If a script or metadata change cannot be made through package tooling, ask the maintainer before editing package files manually.

## 8. Commit Discipline

**Commit only reviewed scope with explicit approval.**

When making git commits:
- Before every commit, show the maintainer the intended commit scope, changed-file summary, and exact commit message.
- Wait for maintainer approval of the commit scope and message before running `git commit`.
- Do not bundle a large feature, refactor, dependency change, UI polish, and documentation update into one vague commit.
- Split commits by logical layer and reviewability: specs, app behavior, tests, docs, dependency changes, and cleanup should be separate when they can stand alone.
- Use strict Conventional Commit names: `type(scope): concise imperative summary`.
- Prefer specific scopes and concrete verbs, for example `feat(parser): add adapter registry`, `fix(ui): preserve panel focus state`, or `docs(contributing): add pull request checklist`.
- Avoid generic messages like `feat: update`, `fix stuff`, or one giant `feat:` that hides unrelated changes.

## 9. Branch And Worktree Discipline

**Use feature branches and dedicated worktrees for feature work.**

Branch baseline:
- `main` is the primary branch.
- Do not introduce an additional long-lived integration branch unless the maintainer explicitly approves it.
- Do not implement new feature/spec work directly on `main`.
- New feature work must use a dedicated feature branch and a dedicated git worktree before implementation begins.
- Branch and worktree names should be tied to the OpenSpec `change-id`, issue id, ticket id, or concise feature name.
- Feature worktrees must live outside the repository checkout, preferably under a sibling worktree directory such as `../worktrees/<change-id>`.
- Do not create or run development servers from a nested worktree directory inside the project root, including `.worktrees/<change-id>`.
- `.worktrees/` is an ignore-only safety guard for accidental nested worktrees; it is not an approved worktree location for this project.
- Running Next.js, Turbopack, local runtime watchers, or editor/indexing tools from nested worktrees is prohibited because it can cause recursive file watching, duplicate dependency/cache scans, and severe memory growth.

When multiple Codex sessions may work on the same project at the same time:
- Prefer one worktree per feature, spec, or clearly named task.
- Each Codex session should be given one worktree path and one scope, and should not edit files outside that worktree unless explicitly asked.
- Do not let two Codex sessions edit the same file or the same OpenSpec change concurrently.
- Assign an owner for shared files such as `tasks.md`, `design.md`, `.env.example`, shared adapters, central UI components, and package metadata.
- Before starting work in a shared branch or non-isolated directory, run `git status --short` and identify likely overlap. If overlap is unclear, ask before editing.
- If a merge, rebase, cherry-pick, stash pop, worktree sync, or patch application creates conflicts, stop immediately. Do not resolve conflicts, do not continue editing, and do not run formatting over conflicted files unless the maintainer explicitly asks. Report the conflicted files and wait for the maintainer to handle them manually.

## 10. Repository Hygiene

**Keep tracked project files focused on this project.**

- Do not put unrelated local-only files, machine-specific paths, scratch notes, or external implementation text into tracked project files.
- Public docs, specs, code comments, tests, templates, and examples must describe only spec-ui's own behavior and workflow.

## 11. Handoff Summaries

**Make handoffs short, complete, and actionable.**

When pausing a substantial task, handing work to another Codex session, or finishing a phase, provide a handoff summary with:
- `Goal`: one sentence describing the intended outcome.
- `Current state`: what is complete and where the work stands.
- `Changed files`: files touched for this task.
- `Validation`: commands run and whether they passed; mention tests not run.
- `Open items`: remaining work, blockers, or decisions needed.
- `Risks`: known conflict hotspots, fragile assumptions, or release caveats.
- `Next step`: the single most useful next action.

Keep the handoff concise. Prefer concrete file paths, commands, and status over narrative.

---

**These guidelines are working if:** diffs stay focused, assumptions are verified before implementation, OpenSpec captures behavior before code changes, and the maintainer can review each commit as a coherent unit.

## Live Context

- This workspace is the early-stage home for `spec-ui`.
- Product and technical context belongs in `openspec/config.yaml`; update it in the same change set when stack, architecture, packaging, or product assumptions change.
- The project uses a single root OpenSpec instance at `openspec/`.
- Product-impacting changes must go through OpenSpec before implementation.
- The default package manager is `pnpm`.
- Dependencies and scaffolding must be added through CLI/package-manager commands that resolve current latest package metadata; do not hand-write package manifests.
- Network failures during required package, registry, docs, or scaffolding commands should be treated as sandbox restrictions and retried with escalation immediately.
- The branch model is `main` plus feature branches. New feature work requires a dedicated worktree outside the main checkout.
- Preferred worktree root: a sibling directory outside the repository checkout, such as `../worktrees/<change-id>`.
- Do not use `<repo>/.worktrees/` for active development; it is ignored only to prevent accidental commits and watcher recursion.
- Commit scope and commit message require maintainer approval before every commit.
- Tracked project files must not describe unrelated local-only workspace material.
