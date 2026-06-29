## ADDED Requirements

### Requirement: Enabled-gated runtime skill synchronization

When synchronizing skills from built-in, user, or configured sources into the runtime skills directory, the system MUST only create or refresh entries for skills whose `enabled` flag is `true` in `SkillsManager`, and MUST remove runtime entries for skills whose `enabled` flag is `false`.

#### Scenario: Disabled built-in skill not synced

- **WHEN** a built-in skill is disabled in Settings
- **THEN** built-in synchronization does not create or refresh that skill's runtime directory entry

#### Scenario: Runtime prune after disable

- **WHEN** a skill's runtime directory exists and the skill is disabled before an Agent run
- **THEN** synchronization removes that runtime entry before the SDK loads skills

## MODIFIED Requirements

### Requirement: Stable skills signature for session reuse

The Agent runtime skills signature used for pi session reuse MUST remain stable across consecutive Agent queries when skill sources, Teamcenter URL settings, and the set of enabled skills are unchanged. The signature MUST incorporate a canonical representation of enabled skill ids so that enabling or disabling a skill invalidates the cached pi session.

#### Scenario: No session rebuild on unchanged skills

- **WHEN** a user sends a second Agent message in the same session with unchanged skill sources, Teamcenter settings, and enabled skill list
- **THEN** the application does not recreate the cached pi session solely because runtime skills were re-synchronized

#### Scenario: Session rebuild when enabled list changes

- **WHEN** a user enables or disables any skill between two Agent messages in the same session
- **THEN** the skills signature changes and the application recreates the pi session before handling the next message
