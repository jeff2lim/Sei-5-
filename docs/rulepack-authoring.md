# Rulepack authoring

## 파일

- `rules/meta.json`: 버전, 상태, 출처와 검수 정보
- `rules/attributes.json`: 제품 카테고리별 속성 사전
- `rules/verdict-rules.json`: 속성별 날짜 구간과 안내
- `rules/contact-rules.json`: 체크 입력과 행동 안내의 직접 매핑

수정 후 `pnpm rules:validate`와 `pnpm rules:build`를 실행합니다.

## 검증 규칙

- 속성 ID와 판정 룰 ID는 중복될 수 없습니다.
- 모든 판정 룰은 존재하는 속성을 참조해야 합니다.
- 날짜 구간은 겹치거나 빠질 수 없습니다.
- 허용된 판정은 `go`, `care`, `stop`입니다.
- `PILOT` 또는 `APPROVED`는 `reviewedBy`, `reviewedAt`이 없으면 빌드에 실패합니다.
- `DRAFT_NOT_FOR_PATIENTS`는 앱 셸에서 경고 배너를 강제로 표시합니다.

임상적으로 검수되지 않은 값을 임의로 채우지 마세요. 근거가 없으면 룰을 추가하지 않고 앱에서 `unknown`으로 표시합니다.
