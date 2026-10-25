# 파일 구성과 고치는 법

| 파일 | 내용 |
| --- | --- |
| `index.html` | 화면 뼈대(머리글, 메뉴, 빈 화면 틀, 공통 창)와 QR 접속 버튼 |
| `css/app.css` | 앱 전용 스타일 (Tailwind 외 직접 쓴 CSS) |
| `js/data.js` | 내장 콘텐츠 데이터: `DEFAULT_DATA`(terms.json을 못 불러올 때 쓰는 기본값), `CATEGORY_PLAYBOOKS`, `TERM_VS_GROUPS`, `TERM_ENRICH_MAP` |
| `js/app.js` | 앱 동작 코드 전체 (화면 그리기, 저장, 도구 기능) — `js/data.js` 다음에 불러옴 |
| `terms.json`, `data/*.json` | 용어·상황·업무 순서·연간 업무, 공개 ID, 검수 기록 |
| `sw.js` | 오프라인 저장. 파일을 새로 만들거나 이름을 바꾸면 `CORE` 목록에 넣고 `VERSION` 숫자를 올립니다 |

- 화면 문구나 기능을 고칠 때는 대부분 `js/app.js`를 고칩니다. 깃허브 웹에서 파일을 열고 연필 버튼으로 편집하면 됩니다.
- 용어 내용은 `terms.json`, 검수 기록은 `scripts/content-review.mjs`(→ `docs/CONTENT_REVIEW.md`)로 고칩니다.

## 자동 점검

PR을 열거나 main에 올리면 GitHub Actions(**자동 점검**)가 돌아갑니다. 빨간 X가 뜨면 Actions 탭에서 어떤 줄이 실패했는지 볼 수 있습니다.

| 점검 | 직접 실행 |
| --- | --- |
| JSON 형식, 자바스크립트 문법(인라인 포함), 파일 참조, 오프라인 저장 목록 | `node scripts/static-check.mjs` |
| 저장·백업·검색·공개 ID 규칙 | `node scripts/usability-check.mjs` |
| 저장 키 계약과 옛 ID 대응표 | `node scripts/r0a-contract.mjs verify` |
| 모든 화면을 PC·휴대폰 크기로 열어 오류 확인 | `npm i --no-save playwright && npx playwright install chromium && node scripts/smoke-test.mjs` |
