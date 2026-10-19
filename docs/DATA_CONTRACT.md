# R0a data and migration contract

This is a design and fixture contract for PRD 1.1 R0a. No production storage path or user data is migrated by these files. `data/legacy-map.json` is frozen from commit `1aae4b714acd73fd6c6a6da4fb38f6e1d2fdb03f`; changing `topics` order must never recompute it in the app.

## Public content (D01–D03)

- Canonical term IDs are `term:<original numeric ID>`. All 161 original meanings remain distinct. Each of the 848 generated IDs resolves to one original term; its old title remains a lookup alias. Unknown IDs remain unresolved records, never silently deleted.
- A published catalog will declare `contentSchemaVersion: 3`, `contentVersion`, `generatedAt`, `minAppVersion`, and file hashes. Terms, situations, workflows, annual tasks, relations, roles, document sets, templates, sources and case questions use the fields listed in PRD section 4. This R0a map is a compatibility input, not yet a published v3 catalog.
- Validate unique IDs per namespace, referential integrity, real `YYYY-MM-DD` dates, question option/answer consistency, and required source title, publisher, URL, scope and checked date when marked reviewed. Validation failure blocks a future content release. Existing unreviewed content starts as **검토 필요**; a changed deploy date does not imply review.
- Scope and review state are common metadata, separate from prose. Moved or removed content needs a replacement ID or an end notice. Saved projects and question sessions retain their source version and creation snapshot.
- Annual task IDs in the frozen map are placeholders for stable IDs. Later task reordering must not change them. `legacyIcsUidPattern` records the old UID before any new UID policy is introduced.

## User records and writes (D04–D05)

- Proposed storage schema is `storageSchemaVersion: 4` in IndexedDB. Every new record has a UUID, `revision`, `createdAt`, and `updatedAt`. A legacy record without known times uses `createdAt: null`, `updatedAt: null`, and a separate `migratedAt`; no timestamp is invented.
- An unlocked vault has one editing tab. Other tabs may use public features. Handoff requires saving pending edits and locking the first tab. A save compares revision and queued write order, encrypts, commits an IndexedDB transaction, and only then reports **저장됨**. Failure reports failure and keeps recovery options. Without IndexedDB, private writing stops; public features may continue.
- `data/storage-map.json` is the owned-key inventory. Each full key uses one of two exact prefixes. Only allowlisted non-sensitive UI values may be recreated in localStorage after protected migration. Free text, school details, names, projects, drafts and counseling content belong in the encrypted vault.
- `bookmarks`, `recent_views`, `quiz_wrongs`, and `learned_cards` map via the frozen term table. Bookmarks deduplicate; recent views retain order and 15-item cap. Wrong-answer status wins over learned status while original history remains. Historical quiz scores are not recalculated.
- `checklist_1` through `checklist_12` have **unknown academic year** (`null`). `ics_year` is only a selected export year. A `year_task_dates` key supplies its explicitly encoded year. A saved board is determined by key presence, including a saved empty board; the app's display examples do not constitute saved data. Legacy `record_drafts` remain student-unassigned.

## Migration state machine (M01–M05)

1. **Detect and block private writes.** Load the public content and frozen map before a private route interprets old IDs. If owned legacy private keys exist, require vault setup and migration. Do not route around the gate.
2. **Inventory.** Read exact owned prefixes, key presence, raw strings, parse status, SHA-256 of each raw string, and counts. Keep current and legacy values separately. Valid current JSON is the preferred candidate; a valid legacy value can be a recovery candidate if current is damaged. Unknown owned keys are snapshot-only. Never inspect another app's keys. Require other old-version tabs to close; prevent concurrent migration and recheck raw hashes before commit.
3. **Protect and transform.** Encrypt a raw snapshot of both prefixes, including malformed JSON. Write converted records to a separate IndexedDB generation. Read it back, decrypt it, compare counts and references, and verify raw snapshot bytes and hashes. Do not use a successful in-memory conversion as proof of persistence.
4. **Activate and clean.** Atomically set the active generation and `cleanupPending` in IndexedDB. Remove only verified owned private plaintext keys from both prefixes. Verify removal before marking migration complete. A deletion failure remains `cleanupPending` and must be retryable.
5. **Resume.** Persist explicit stages (`detected`, `snapshotted`, `converted`, `verified`, `cleanupPending`, `complete`). An interruption resumes by stage. No source deletion precedes persisted verification. After completion, no hidden plaintext copy remains. Downgrade requires a version that reads the protected format.

## Backup adapters and limits

- `fixtures/r0a/synthetic.json` contains only invented data: a legacy flat object, general v3 envelope, and a decryptable counseling v1 envelope. The fixture password is intentionally public and must never be used for real data.
- General v3 is `{app, version:3, exportedAt, data}`. The older flat backup is an allowlisted object. Counseling v1 is `{app, type:'counsel-encrypted', v:1, kdf:'PBKDF2-SHA256', iterations:250000, salt, iv, data}`; its `data` is AES-GCM ciphertext with the authentication tag appended. The new v4 encrypted backup and restore adapter are **not implemented in R0a**.
- A future restore rejects unsupported app/version, dangerous object keys, malformed types, oversized files (20 MiB target) and excessive records (20,000 target) before changing storage. Preview conflicts; commit a verified encrypted generation. Repeated import must not duplicate IDs.

## Verification boundary

Run `node scripts/r0a-contract.mjs verify` from the repository root. It checks the full baseline map, embedded content against `terms.json`, all 24 annual tasks, synthetic storage cases and decryptable counseling backup. Q01/Q02 are **prepared and partially checked** here. Browser URL behavior, actual encrypted migration, crashes, concurrent tabs, quota failure, and plaintext cleanup require R0b–R0d and cannot be reported as passed yet.
