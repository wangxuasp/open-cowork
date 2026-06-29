## 1. SkillsManager 持久化

- [x] 1.1 Add `loadSkillEnabledFromDb(skillId: string): boolean | undefined` and `mergeEnabledFromDb(skill: Skill): void` helpers in `skills-manager.ts`
- [x] 1.2 Update `loadBuiltinSkills` and `loadSkillsFromDirectory` to merge `enabled` from DB (default `true`, upsert row when missing)
- [x] 1.3 Update `setSkillEnabled` to call `saveSkill()` after updating memory
- [x] 1.4 Add `getEnabledSkillIds(): string[]` (sorted) for signature generation; ensure `getActiveSkills` stays consistent with `loadedSkills.enabled`

## 2. SkillsAdapter 实现与注入

- [x] 2.1 Extend `skills-adapter.ts` with `SkillSource`, `isSkillEnabled(source, directoryName)`, and `getEnabledSkillSignature()`
- [x] 2.2 Add `createSkillsAdapter(skillsManager: SkillsManager): SkillsAdapter` factory in `src/main/skills/skills-adapter.ts` (or adjacent file)
- [x] 2.3 Inject adapter in `SessionManager.createClaudeAgentRunner` instead of `undefined`
- [x] 2.4 Pass `SkillsAdapter` through `ClaudeAgentRunner` constructor and store on instance

## 3. Agent 运行时 enabled 过滤

- [x] 3.1 Update `syncBuiltinSkillsToRuntimeDir` to skip disabled skills and remove their runtime entries
- [x] 3.2 Update `syncUserSkillsToAppDir` with the same enabled-gated logic (`user` source mapping)
- [x] 3.3 Update `syncConfiguredSkillsToRuntimeDir` with the same enabled-gated logic (`configured` / `global` mapping)
- [x] 3.4 Add `pruneDisabledSkillsFromRuntimeDir(appSkillsDir)` after sync passes to remove stale enabled→disabled entries
- [x] 3.5 Include `enabledSignature` from adapter in `skillsSignature` JSON in `agent-runner.ts`

## 4. IPC 与失效

- [x] 4.1 Verify `skills.setEnabled` IPC path persists and calls `sessionManager.invalidateSkillsSetup()` (already present; adjust only if signature path changes)
- [x] 4.2 Confirm toggling a skill changes `skillsSignature` and recreates pi session on next query (manual or test)

## 5. 测试

- [x] 5.1 Add unit tests in `tests/skills-manager-enabled.test.ts`: `setSkillEnabled` persists to DB; reload restores `enabled: false`
- [x] 5.2 Add unit tests in `src/tests/skills/skill-enabled-sync.test.ts`: disabled builtin skill not present in runtime dir after sync; re-enable restores entry
- [x] 5.3 Add test that `skillsSignature` changes when enabled set changes but file content does not
- [x] 5.4 Update `tests/agent-runner-pi.test.ts` if static content assertions need `enabledSignature`

## 6. 验证

- [x] 6.1 Manual: disable `pdf` (or another builtin) in Settings, send Agent message, confirm skill not listed in SDK-loaded skills / model does not invoke it
- [x] 6.2 Manual: restart app, confirm toggle state persists and Agent behavior matches
- [x] 6.3 Run affected test suite and fix any regressions in `runtime-skills-sync` stability tests
