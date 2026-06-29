# runtime-skills-sync Specification

## Purpose

Define how built-in, user, and configured skills are synchronized into the Agent runtime skills directory, including enabled-gated sync so disabled skills are excluded from the SDK load path.

## Requirements

### Requirement: Runtime skills directory roles

The application MUST treat `process.resourcesPath/skills` (packaged built-in skills) as the read-only source of bundled skills and `%AppData%/omni-worker/claude/skills` (or the configured global skills path when set) as the Agent SDK runtime working directory. The runtime directory MAY contain symlinks, materialized copies, and Teamcenter-rendered `SKILL.md` files managed by the application.

#### Scenario: Packaged built-in skills location

- **WHEN** the application runs from an installed production build
- **THEN** built-in skills shipped with the app are read from `resources/skills` under the installation directory

#### Scenario: Agent SDK loads runtime directory

- **WHEN** an Agent session starts
- **THEN** the SDK skills path resolves to the runtime skills directory under application user data unless a valid alternate global skills path is configured

### Requirement: Idempotent built-in skill synchronization

When synchronizing built-in skills from `resources/skills` into the runtime skills directory, the system MUST only create, replace, or refresh a skill entry when the target is missing, dangling, unreadable, or its content is older or different from the built-in source.

#### Scenario: Stable runtime after consecutive Agent queries

- **WHEN** a user-copied bundled skill exists in both `resources/skills` and the runtime skills directory and the user sends two consecutive Agent messages without changing skill sources or Teamcenter URL settings
- **THEN** the runtime skill directory entry and its `SKILL.md` content remain unchanged after the second query

#### Scenario: Built-in skill refresh on package update

- **WHEN** a bundled skill's source content in `resources/skills` changes after an application upgrade
- **THEN** the corresponding runtime skill entry is refreshed to match the new source

#### Scenario: Materialized skill is not rolled back by template marker

- **WHEN** a runtime skill directory contains `.open-cowork-skill-template` from Teamcenter materialization
- **THEN** built-in synchronization MUST NOT delete and re-symlink that skill solely because the template file exists

### Requirement: Idempotent configured and user skill synchronization

When synchronizing skills from `~/.claude/skills` or a configured global skills path into the runtime directory, the system MUST skip entries that already point to the same source content and MUST NOT unconditionally delete and recreate entries on every Agent run.

#### Scenario: Configured path sync is stable

- **WHEN** a skill exists in the configured global skills path and an equivalent entry already exists in the runtime directory
- **THEN** a subsequent Agent run does not remove and recreate that entry without a detected source change

#### Scenario: User skill import preserves existing materialized copy

- **WHEN** a runtime skill entry is a materialized directory (not a symlink) and the corresponding user or configured source has not changed
- **THEN** synchronization does not replace it with a new symlink

### Requirement: Idempotent Teamcenter URL substitution

Teamcenter URL placeholder substitution in runtime skills MUST be idempotent. The system MUST materialize symlinked skill directories only when needed for substitution and MUST avoid rewriting `SKILL.md` when the rendered content is unchanged.

#### Scenario: Repeated substitution with same URLs

- **WHEN** a skill contains Teamcenter URL placeholders and the configured Teamcenter URLs are unchanged across two consecutive Agent runs
- **THEN** the second run does not modify `SKILL.md` mtime or content

#### Scenario: Substitution after URL configuration change

- **WHEN** a Teamcenter URL setting changes between Agent runs
- **THEN** affected runtime `SKILL.md` files are updated from the preserved template to reflect the new URLs

### Requirement: Enabled-gated runtime skill synchronization

When synchronizing skills from built-in, user, or configured sources into the runtime skills directory, the system MUST only create or refresh entries for skills whose `enabled` flag is `true` in `SkillsManager`, and MUST remove runtime entries for skills whose `enabled` flag is `false`.

#### Scenario: Disabled built-in skill not synced

- **WHEN** a built-in skill is disabled in Settings
- **THEN** built-in synchronization does not create or refresh that skill's runtime directory entry

#### Scenario: Runtime prune after disable

- **WHEN** a skill's runtime directory exists and the skill is disabled before an Agent run
- **THEN** synchronization removes that runtime entry before the SDK loads skills

### Requirement: Stable skills signature for session reuse

The Agent runtime skills signature used for pi session reuse MUST remain stable across consecutive Agent queries when skill sources, Teamcenter URL settings, and the set of enabled skills are unchanged. The signature MUST incorporate a canonical representation of enabled skill ids so that enabling or disabling a skill invalidates the cached pi session.

#### Scenario: No session rebuild on unchanged skills

- **WHEN** a user sends a second Agent message in the same session with unchanged skill sources, Teamcenter settings, and enabled skill list
- **THEN** the application does not recreate the cached pi session solely because runtime skills were re-synchronized

#### Scenario: Session rebuild when enabled list changes

- **WHEN** a user enables or disables any skill between two Agent messages in the same session
- **THEN** the skills signature changes and the application recreates the pi session before handling the next message
