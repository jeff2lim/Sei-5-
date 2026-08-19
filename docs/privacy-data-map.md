# Privacy data map

| 데이터 | 목적 | 저장 위치 | 분석 이벤트 | 삭제 |
| --- | --- | --- | --- | --- |
| 카카오 계정 식별자 | 로그인·계정 구분 | Supabase Auth | 전송 안 함 | 계정 삭제 |
| 시술일 | D+n 계산 | 게스트: 브라우저 localStorage / 로그인: Supabase | D+n만 전송 가능 | 전체/계정 삭제 |
| 민감도 선택 | 안내 문맥 | 게스트: 브라우저 localStorage / 로그인: Supabase | 전송 안 함 | 전체/계정 삭제 |
| 제품명 | 사용자 식별 | 게스트: 브라우저 localStorage / 로그인: Supabase | 원문 전송 금지 | 제품/전체/계정 삭제 |
| 제품 속성 | 룰 평가 | 게스트: 브라우저 localStorage / 로그인: Supabase | 속성 개수만 | 제품/전체/계정 삭제 |
| 체크 답변 | 행동 안내, 기록 | 게스트: 브라우저 localStorage / 로그인: Supabase | 선택 개수와 행동만 | 전체/계정 삭제 |
| 사진 | 현재 비활성 | 저장 안 함 | 전송 안 함 | 해당 없음 |

로그인 데이터는 `recovery_sessions`의 사용자별 한 행에 저장하며 RLS의 `auth.uid() = user_id` 정책을 적용합니다. 카카오 친구·메시지 권한은 요청하지 않습니다. 운영 전 보유 기간과 개인정보 처리방침 문구는 별도 검토가 필요합니다.

## 로그·관측성 정책

- 저장 관측 이벤트에는 작업 종류, 성공/실패, 소요 시간, 오류 코드만 기록합니다.
- 제품명, 시술일, 민감도, 세안 느낌, 체크 답변, 자유 입력, 계정 식별자는 로그에 기록하지 않습니다.
- 오류 객체의 메시지·stack·응답 body를 그대로 기록하지 않습니다.
- 실패율은 `session_write_failed / (session_write_completed + session_write_failed)`로 계산하고, 지연은 작업 종류별 `durationMs` 분위수로 확인합니다.
- 브라우저의 `recovery:analytics` 이벤트를 외부 수집기에 연결할 때도 위 필드 allowlist를 유지합니다.
