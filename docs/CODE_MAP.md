# R0a code map

Baseline: `1aae4b714acd73fd6c6a6da4fb38f6e1d2fdb03f`. At R0a start, `main` equaled this commit and the worktree was clean. There was no applicable `AGENTS.md`. The app remains one static `index.html` plus `terms.json`, `sw.js`, manifest and assets.

| Concern | Current code | R0a contract / next integration |
| --- | --- | --- |
| Embedded and fetched content | `index.html:291` `DEFAULT_DATA`, `:304` `buildData`, `:370` `loadData`; `terms.json` | `data/legacy-map.json` freezes 1,009 numeric IDs and legacy titles; `scripts/r0a-contract.mjs` checks both full data sources. Content v3 validation belongs to R1. |
| ID routing | `index.html:385` `findItemByKeyword`, `:406` `buildHash` / `parseHash`, `:419` router, `:1258` / `:1279` detail handlers | Resolve old IDs and keywords through the frozen map before private routes consume them. Keep old hashes, single decode and back/forward behavior; Q01 runtime check is pending. |
| Existing storage | `index.html:217` `Storage.get/set/ownKeys/clearAll` | `data/storage-map.json` inventories 35 owned suffixes under both exact prefixes. `Storage.get` currently falls back on a falsey value or parse error and `set` suppresses errors. R0b must provide explicit success/failure before any protected cutover. |
| Home / annual tasks | `index.html:629` home checklist, `:1450` year screen, `:1524` checklist write, `:1531` year/date keys, `:1541` ICS | Frozen 24-entry `yearTaskMap` binds month and original index to stable task IDs and records legacy ICS UID. Checklist academic year stays `null`; `ics_year` is not evidence of its year. |
| Board | `index.html:1025` default examples, `:1050` title, `:1059` preset, `:1083` task writes | Key presence determines a real saved board. Preserve an explicitly saved empty board; do not migrate display examples. Fixture covers both. |
| Student drafts / counseling | `index.html:2213` drafts, `:2275` draft write, `:2318` counseling store, `:2408` counseling edit | Protect all free text; old drafts stay student-unassigned. No real student data is used by R0a fixtures. |
| General backup | `index.html:1873` exclude list, `:1875` export, `:1883` import | Existing general v3 backup and flat legacy format are in the synthetic fixture. Current general backup excludes only counseling; R0c/R0d must prevent plaintext private exports. |
| Counseling backup | `index.html:2467` PBKDF2/AES-GCM helpers, `:2475` encrypted export, `:2489` import | Synthetic v1 envelope is decryptable and checked. Future restore must validate allowed KDF parameters and sizes before key derivation. |
| Startup / offline | `index.html:2523` `boot`, `:2511` service worker registration; `sw.js` | Insert migration gate after content/map load and before private routing in R0d. R0a adds no runtime asset and does not alter service worker caching. |

`docs/DATA_CONTRACT.md` defines D01–D05 and M01–M05 decisions. `fixtures/r0a/synthetic.json` carries dual-prefix raw strings, malformed JSON, unrelated-app key, unsaved/saved-empty boards, unassigned draft and backup formats. `scripts/r0a-contract.mjs verify` validates the frozen baseline and fixture inventory, including SHA-256 of raw values. It does not perform migration.
