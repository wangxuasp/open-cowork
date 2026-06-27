# agent-trial-expiration Specification

## Purpose

TBD - created by archiving change add-agent-trial-expiration. Update Purpose after archive.

## Requirements

### Requirement: Build-time trial expiration configuration

The build system SHALL accept an optional environment variable `AGENT_TRIAL_EXPIRATION` with format `YYYY-MM-DD`. When set, the value MUST be compiled into the application bundle as a constant. When unset or empty, the application MUST behave as if no trial expiration exists.

#### Scenario: Trial build with valid expiration date

- **WHEN** the application is built with `AGENT_TRIAL_EXPIRATION=2026-12-31`
- **THEN** the compiled main process contains the expiration date `2026-12-31` as a build-time constant

#### Scenario: Standard build without expiration

- **WHEN** the application is built without `AGENT_TRIAL_EXPIRATION`
- **THEN** no trial expiration limit is enforced at runtime

#### Scenario: Invalid expiration date at build time

- **WHEN** the build runs with `AGENT_TRIAL_EXPIRATION` set to an invalid value (e.g. `2026-13-40` or `not-a-date`)
- **THEN** the pre-build check MUST fail and abort the build

### Requirement: Runtime expiration check before agent session

Before each Agent session run, the system MUST compare the current local date against the compiled expiration date. If the current local date is after the expiration date (i.e. the day after expiration has begun), the Agent session MUST NOT start.

#### Scenario: Session allowed on expiration date

- **WHEN** the compiled expiration date is `2026-06-30` and the local date is `2026-06-30`
- **THEN** the Agent session run proceeds normally

#### Scenario: Session blocked after expiration date

- **WHEN** the compiled expiration date is `2026-06-30` and the local date is `2026-07-01` or later
- **THEN** the Agent session run is blocked before any model request is sent

#### Scenario: No expiration configured

- **WHEN** no expiration date was compiled into the build
- **THEN** the Agent session run proceeds without expiration checks

### Requirement: User notification on trial expiration

When an Agent session is blocked due to trial expiration, the system MUST inform the user with a clear message that includes the expiration date and indicates the trial has ended.

#### Scenario: User sees expiration message in chat

- **WHEN** a user attempts to run the Agent after the trial expiration date
- **THEN** an error message is displayed in the session chat explaining that the trial expired on the configured date

#### Scenario: Error event emitted to renderer

- **WHEN** a user attempts to run the Agent after the trial expiration date
- **THEN** an `error` server event is sent to the renderer with the expiration message

### Requirement: Extension-based blocking mechanism

The Agent runtime extension hook `beforeSessionRun` SHALL support returning a blocked result. When any registered extension returns `blocked: true`, subsequent extensions MUST NOT run and the Agent session MUST NOT proceed.

#### Scenario: Trial extension blocks expired session

- **WHEN** `TrialExpirationExtension.beforeSessionRun` detects an expired trial
- **THEN** it returns `{ blocked: true, blockReason: "<message>" }` and the agent runner stops before executing the session
