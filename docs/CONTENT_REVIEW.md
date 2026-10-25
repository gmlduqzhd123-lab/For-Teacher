# 내용 검수 기록 남기는 법

앱의 용어·상황 가이드·업무 순서 화면에는 **내용 확인 정보**(검수 상태, 최종 확인일, 내용 기준일, 대조한 근거)가 표시됩니다. 기록은 `data/content-meta.json`에 있고, 아래 도구로만 고칩니다.

| 상태 | 앱 표시 | 조건 |
| --- | --- | --- |
| `needs-review` | 📝 검수 전 · 실무 경험 기반 정리 | 기본값 |
| `reviewed` | ✅ 공식 근거와 대조 완료 | 근거(`sourceIds`)와 확인일(`checkedAt`)이 **모두** 있어야 함. 하나라도 없으면 앱이 검수 전으로 표시 |
| `needs-update` | ⚠️ 지침 변경 확인 중 | 개정 소식 등으로 다시 확인이 필요할 때 |

## 순서

1. 상세 화면 내용을 공식 근거(법령·훈령·고시, 교육청 지침)와 한 줄씩 대조합니다.
2. 근거 목록 확인: `node scripts/content-review.mjs sources`
   목록에 없는 근거는 `data/content-meta.json`의 `sources`에 `id`, `title`, `kind`, `url`(law.go.kr 주소)로 먼저 추가합니다.
3. 대조 완료 기록:
   `node scripts/content-review.mjs mark term:4 --source law-school-violence --date 2026-10-25 --scope "전국 공통"`
4. 개정 등으로 다시 봐야 하면 `flag`, 기록을 지우려면 `reset`.
5. `node scripts/usability-check.mjs`로 기록 형식을 점검한 뒤 커밋합니다.

항목 ID는 `term:<번호>`, `situation:<id>`, `workflow:<id>` 형식이며 `data/content-meta.json`의 `items`에서 찾을 수 있습니다. 전체 현황은 `node scripts/content-review.mjs status`, 앱에서는 **나의 교직함 › 내용 검수 현황**에서 볼 수 있습니다.
