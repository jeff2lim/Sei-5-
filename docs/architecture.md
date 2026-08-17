# Architecture

## 경계

- `src/domain`: 제품, 시술, 체크인, 판정, 동의 타입
- `rules`: 사람이 편집하는 JSON 룰팩과 커머스 fixture
- `src/rules/engine`: React와 저장소에 의존하지 않는 순수 함수
- `src/repositories`: 저장 방식 추상화
- `src/store`: UI가 사용하는 상태와 저장소 명령
- `src/components`, `src/app`: 표시와 사용자 흐름

UI는 `localStorage` 또는 Supabase를 직접 호출하지 않습니다. `RecoveryRepository` 인터페이스 뒤에서 저장 방식을 교체합니다.

## 판정

제품 속성마다 현재 D+n에 해당하는 구간을 찾습니다. 제품 판정은 `stop > care > go`로 롤업하고, 같은 `care`가 여러 개면 가장 늦은 `resumeDay`를 선택합니다. 룰 또는 속성이 비어 있으면 `unknown`을 유지합니다.

체크인은 입력과 `contact-rules.json`을 직접 매핑하며, `EMERGENCY_GUIDANCE > CONTACT_CLINIC_PROMPTLY > CONTACT_CLINIC > CONTINUE_GUIDE` 순서로 행동 하나를 반환합니다. 이는 위험 점수가 아닙니다.

## Supabase 전환

`hybrid` 모드는 비로그인 사용자에게 `LocalRecoveryRepository`, Supabase Auth 사용자에게 `SupabaseRecoveryRepository`를 선택합니다. 로그인 직후 이전 화면이 로컬 세션과 클라우드 세션을 비교하며, 클라우드가 비어 있을 때만 자동으로 이전합니다. 양쪽에 데이터가 있으면 사용자가 선택하기 전까지 덮어쓰지 않습니다.

클라우드 저장은 `recovery_sessions`의 사용자별 JSONB 한 행을 사용합니다. 현재 도메인 세션을 손실 없이 옮기는 MVP 경계이며, 제품 카탈로그 검색이나 다중 시술 지원이 필요해질 때 별도 테이블로 정규화합니다. 모든 접근은 RLS의 `auth.uid() = user_id` 정책을 통과해야 합니다.
