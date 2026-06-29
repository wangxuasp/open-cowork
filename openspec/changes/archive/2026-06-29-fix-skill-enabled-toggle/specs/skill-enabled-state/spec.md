## ADDED Requirements

### Requirement: Persisted skill enabled state

The application MUST persist each skill's `enabled` flag in the SQLite `skills` table keyed by skill `id`, and MUST restore that flag when loading built-in, global, and custom skills into `SkillsManager`.

#### Scenario: Toggle persists across restart

- **WHEN** a user disables a built-in skill in Settings and restarts the application
- **THEN** the skill remains disabled in the Settings list and in `SkillsManager`

#### Scenario: Default enabled for new skills

- **WHEN** a skill directory is discovered and no row exists in the `skills` table for its `id`
- **THEN** the skill is treated as enabled and a row is created with `enabled = 1`

#### Scenario: setEnabled writes database

- **WHEN** the main process handles `skills.setEnabled` with `enabled: false`
- **THEN** the corresponding row in the `skills` table is updated and `loadedSkills` reflects the new value

### Requirement: UI toggle reflects authoritative enabled state

The Settings Skills list MUST display each skill's persisted `enabled` state from `SkillsManager.listSkills()`, and toggling MUST update both memory and database before returning success to the renderer.

#### Scenario: Successful toggle updates list

- **WHEN** a user toggles a custom skill off and `loadSkills` completes without error
- **THEN** the skill card shows the disabled indicator and `skill.enabled` is `false`

### Requirement: Agent respects enabled skills only

The Agent runtime MUST NOT expose disabled skills to the pi SDK `DefaultResourceLoader`. Disabled skills MUST be absent from the runtime skills working directory used as `additionalSkillPaths`.

#### Scenario: Disabled built-in skill excluded from Agent

- **WHEN** a built-in skill is disabled in Settings and the user sends an Agent message
- **THEN** the corresponding directory is not present under the runtime skills directory passed to the SDK

#### Scenario: Re-enabling restores skill to Agent

- **WHEN** a previously disabled skill is enabled again and the user sends an Agent message
- **THEN** the skill directory is synchronized back into the runtime skills directory and is available to the SDK

#### Scenario: Disabled skill removed from runtime

- **WHEN** a skill was previously enabled and its runtime directory exists, and the user disables it
- **THEN** the next Agent query removes that skill's entry from the runtime directory without deleting the source skill files

### Requirement: Session rebuild on enabled list change

The Agent `skillsSignature` used for pi session reuse MUST change when the set of enabled skills changes, even if skill source files and Teamcenter URL settings are unchanged.

#### Scenario: Session recreated after toggle

- **WHEN** a user disables a skill and sends another message in the same chat session without changing models or working directory
- **THEN** the application recreates the pi session so the SDK reloads skills without the disabled entry
