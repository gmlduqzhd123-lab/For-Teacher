# Development status

## Private records vault (R0b/R0c partial) — 2026-10-25

- Opt-in **개인 기록 잠금** (나의 교직함). Protects `counsel_records`, `counsel_schedule_opts`, `record_drafts` only: AES-GCM with a PBKDF2-SHA256 (250,000) passphrase key, stored in IndexedDB `gb1000-vault` (`meta`, `items`, `snapshots`). Records carry `revision` and `updatedAt`.
- Migration follows M01–M05 for these keys: stages `detected → snapshotted → converted → verified → cleanupPending → complete` persisted in `meta`; an encrypted raw snapshot of both prefixes (malformed JSON included) is read back before any deletion; plaintext is removed from both prefixes only after the converted copy is decrypted and compared; removal is re-checked and an interrupted run resumes on next unlock. Plaintext that reappears later (e.g. an old tab) is added to the snapshot before cleanup.
- One editing tab: Web Locks (`gb1000-vault-edit`) plus a BroadcastChannel handoff that saves and locks the other tab. Auto-lock after 15 minutes idle; reload starts locked. Locked counsel/record screens ask for the passphrase.
- Plain general backup excludes protected keys while the vault is on; the full encrypted backup requires unlocking and includes them. Turning protection off writes decrypted values back, re-checks them, restores unconverted raw values from the snapshot, then deletes the database. Full reset deletes the vault.
- Browser-tested (Chromium, synthetic data): enable, no plaintext in IndexedDB, wrong passphrase, lock screens, two-tab handoff, resume from `cleanupPending`, backups, disable, reset.
- **Not done (keep pending):** other private keys (`class_names`, `seat_*`, `board_*`, `settings`, `timetable`, `year_task_dates`, `situation_runs`) are still plaintext; no UUID/`createdAt` record schema or `storageSchemaVersion: 4`; save status is reported when the write is queued, with an error toast and unload guard on failure rather than a per-save commit confirmation; quota-failure and crash tests, Safari/Firefox, and the v4 encrypted backup format are not done. Do not mark R0b–R0d complete.

## Usability improvement pass — 2026-10-19

- Implemented current-path storage success/failure reporting, damaged-current-value protection, record draft capture before navigation, validated legacy/v3 backup import preview and partial-failure reporting, and clear local-storage/backup guidance.
- Search now groups variants by the frozen `legacy-map.json` mapping, preserves numeric bookmark storage while comparing representative IDs, supports the eight specified phrases, and shows related situation/workflow results. Public situation/workflow IDs are frozen in `data/public-links.json`; old numeric links remain readable.
- Added `data/content-meta.json` with every current item marked `needs-review`. This is a review queue, **not** a claim of official-source validation. Added status labels in content views, keyboard focus handling for the detail dialog, zoom support, and explicit offline readiness text.
- `node scripts/usability-check.mjs`, `node scripts/r0a-contract.mjs verify`, JavaScript syntax checks, and `git diff --check` pass. Local `file://` UI inspection was blocked by browser URL policy. Device/browser acceptance tests have not been run.
- Remaining: official-source editorial review of the priority topics and student injury flow; full content hash/version validation; R0b–R0d encrypted storage, migration, atomic restore and their interruption/two-tab tests; real device accessibility, PWA, and sharing verification. Do not mark these complete from this pass.

## Code state

- PRD: version 1.1, 2026-10-18. Scope selected from its R0a work package, with the supplied start note used as context.
- Baseline and starting HEAD: `1aae4b714acd73fd6c6a6da4fb38f6e1d2fdb03f`; `git diff baseline..HEAD` and starting `git status --porcelain` were empty. No applicable `AGENTS.md`.
- R0a files: `data/legacy-map.json`, `data/storage-map.json`, `fixtures/r0a/synthetic.json`, `scripts/r0a-contract.mjs`, `docs/DATA_CONTRACT.md`, `docs/CODE_MAP.md`, `docs/STATUS.md`. App runtime files remain unchanged. Check `git status` and `git log` for the current commit and any later uncommitted changes.

## Requirements and contract

- R0a contract **completed**: frozen original/generated term IDs and titles (161 + 848), 24 old annual task positions, 35 owned storage suffixes and both prefixes, data/write/migration state rules, invented backup and localStorage fixtures. Covers contract design for D01–D05 and M01–M05; it does **not** implement their runtime behavior.
- Q01 and Q02 **partially checked**: all baseline IDs, map targets, keyword uniqueness, both content copies, and synthetic URL strings, inventory/raw hashes and backups. Browser URL navigation, duplicate migration, interrupted migration, quota failure, multiple tabs, activation, cleanup and real-world data are **not** passed.
- F01–F10, A01–A30, Q03–Q08 and complete R0 remain pending. R0b–R0d retain the PRD's dependency order and protection gates. Do not report R0 or F09 complete from this contract work.
- Important decisions: unknown academic year is `null`; saved boards require actual key presence; record drafts are student-unassigned; malformed JSON is preserved as raw text; valid current value is preferred while valid legacy value remains a recovery candidate; unrelated-app keys are excluded. No old numeric ID is reused for new content.

## Verification

- 2026-10-19: `node scripts/r0a-contract.mjs generate` — PASS, generated frozen map and synthetic fixtures from baseline.
- 2026-10-19: `node scripts/r0a-contract.mjs verify` — PASS: 1,009 IDs map to 161 originals, 848 generated, 24 annual tasks, 35 owned storage keys; complete `terms.json` content matches embedded baseline after excluding its descriptive `_설명` field; fixture inventories, one malformed JSON value, foreign-key exclusion, URL string decoding and counseling v1 decryption checked.
- `git diff --check` was clean before final status. No app runtime or migration test was run because R0a adds no runtime path.

## Remaining work

1. R0b: implement IndexedDB transaction and explicit save success/failure, revision and write ordering. Test rapid edits and quota failure with invented data; keep existing private writes on the old path until vault integration.
2. R0c: implement encryption, single editing tab, lock/failure handling and adapters for every private tool. Verify no bypass or plaintext backup.
3. R0d: implement the staged migration in `DATA_CONTRACT.md`, read-back verification and exact owned-key cleanup. Run complete Q01/Q02 in a browser with two tabs, damaged JSON, crashes and quota failure before any operational switch.
