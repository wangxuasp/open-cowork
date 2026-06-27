## 1. Skill sync helpers

- [x] 1.1 Add shared helper to compute a skill directory signature (e.g. `SKILL.md` size + mtime, or lightweight hash) for source/target comparison
- [x] 1.2 Refactor `shouldRefreshRuntimeSkill` in `agent-runner.ts` to accept source path and compare content signatures instead of treating `.open-cowork-skill-template` as a refresh trigger
- [x] 1.3 Update `syncBuiltinSkillsToRuntimeDir` to pass builtin source path into the refresh check and skip unchanged targets

## 2. Incremental sync for all sources

- [x] 2.1 Make `syncConfiguredSkillsToRuntimeDir` incremental: skip when runtime entry already matches configured source realpath/signature; only remove/recreate on actual change or corruption
- [x] 2.2 Review `syncUserSkillsToAppDir` for the same incremental behavior when target is a materialized directory
- [x] 2.3 Ensure dangling symlink cleanup still runs before sync without forcing full rebuild

## 3. Teamcenter materialize idempotency

- [x] 3.1 Update `applyTeamcenterBaseUrlToSkillDescriptions` to skip `SKILL.md` writes when rendered content is unchanged
- [x] 3.2 Only write `.open-cowork-skill-template` on first materialize or when template source content changes
- [x] 3.3 Keep materialize-on-symlink behavior; do not re-materialize already-copied directories

## 4. Session signature stability

- [x] 4.1 Verify `computeRuntimeSkillsContentSignature` remains stable after two consecutive sync+apply cycles (adjust ignores if needed)
- [x] 4.2 Confirm pi session is not recreated on second query when skills and Teamcenter URLs are unchanged

## 5. Tests

- [x] 5.1 Add `src/tests/skills/runtime-skills-sync.test.ts` covering: consecutive builtin sync stability, template marker no longer triggers refresh, configured path incremental sync
- [x] 5.2 Add tests for Teamcenter idempotent apply (same URLs → no second write)
- [x] 5.3 Update `tests/agent-runner-pi.test.ts` expectations if helper signatures or call patterns change

## 6. Documentation

- [x] 6.1 Document skills directory roles in README or build docs: `.claude/skills` → `resources/skills`, runtime `%AppData%/omni-worker/claude/skills`, user `~/.claude/skills`
- [x] 6.2 Note that users should not manually edit runtime skills directory; custom skills belong in project or global paths
