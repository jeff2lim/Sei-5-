# Progress

## Phase 1 — 완료

- 변경: Next.js 기반, 디자인 토큰, 반응형 앱 셸, 하단 탐색
- 구현: 430px 데스크톱 프레임, 실제 모바일 전체 폭, safe area, 키보드 포커스
- 위험: 원본 정적 캔버스의 모든 장식 요소를 그대로 복제하지 않음
- 테스트: 프로덕션 빌드와 390px 모바일 브라우저 검증 통과
- 다음: 도메인과 저장소

## Phase 2 — 완료

- 변경: 도메인 타입, `RecoveryRepository`, local 구현, Supabase 스켈레톤
- 구현: 시술·제품·체크·동의 영속화, 내보내기와 전체 삭제
- 위험: localStorage는 기기 동기화와 백업 없음
- 테스트: 저장소 경계는 핵심 흐름 E2E에서 검증
- 다음: 온보딩과 제품 CRUD

## Phase 3 — 완료

- 변경: 동의, 시술 입력, 제품 2단계 등록, 선택형 세안 느낌
- 구현: 제품 0개 진행, 제품 추가·삭제, 카테고리/속성 분기
- 위험: 제품 편집은 삭제 후 재등록 방식
- 테스트: 제품 등록과 삭제 E2E 확장 가능
- 다음: 룰팩과 판정

## Phase 4 — 완료

- 변경: Zod 스키마, JSON 검증·빌드 스크립트, 순수 판정 함수
- 구현: 보수적 롤업, 가장 늦은 재개일, unknown 보존, DRAFT 배너
- 위험: 샘플 룰 값은 실제 환자 안내용이 아님
- 테스트: 날짜, 롤업, unknown, 잘못된 룰팩 단위 테스트
- 다음: 체크인과 기록

## Phase 5–8 — 완료

- 변경: 체크인·결과, 달력 기록, 제품/속성별 보기, 추천, 마이, 약관
- 구현: 행동 직접 매핑, 룰팩 버전 보존, 광고·제휴 표시, 동의 분리
- 위험: 사진, 알림, Supabase는 비활성
- 테스트: 결과 매핑 단위 테스트와 모바일 E2E
- 다음: 접근성·CI·배포 문서

## Phase 9–10 — 완료

- 변경: focus-visible, 44px 탭 영역, reduced motion, 오류·빈 상태, GitHub Actions와 Dependabot
- 구현: 보안 헤더, manifest, robots, Open Graph, Vercel 배포 문서
- 위험: 실제 GitHub 원격과 Vercel 프로젝트는 아직 연결되지 않음
- 테스트: ESLint, TypeScript, 룰 검증, Vitest 16개, Playwright E2E 2개, 프로덕션 빌드 통과
- 다음: GitHub CLI 설치 및 원격 저장소 연결 후 게시

## Phase 11 — 룰테이블 v5 통합

- 변경: D+0~14 타임라인, 세 민감도 전개, 성분 이명, 제형·세정 결합, 2단 증상 모델
- 구현: 41개 원본 → 123개 민감도 타임라인 → 1,845개 일별 셀 자동 생성
- 제품 등록: 세안 토글, 스킨케어 성분군/대표 이명, 외출준비 제형 분기
- 위험: `team_provisional`, `extrapolated`, `needs_review` 값은 임상 확정 전 실제 환자 안내 금지
- 테스트: 룰 엔진 포함 Vitest 44개, 모바일 Playwright 3개, 프로덕션 빌드 통과
- 다음: `needs_review` 8개 전문의 스팟 검수와 근거 인용 보강

## Phase 12 — 판정 엔진 정합성 수정

- 변경: 증상 체크인을 제품 판정에 연결, 부분 unknown 보존, 카테고리 집계 초기값, 범위 밖 경과일 표시
- 구현: `evaluateProduct(…, symptoms)`와 `symptomsForDay`, `evaluationStatus`·`unknownAttributeIds`·`missingInputs`·`dayCoverage`·`symptomAdjustment` 필드, `resolveDayCoverage`
- 동작 변화: go + 룰 미연결 대상 → unknown / 전부 go인 카테고리 → go / 시술일 이전·잘못된 날짜 → unknown / D+14 이후는 D+14 판정 유지하되 `after_window`로 표시
- 위험: 성분 없이 제형만 판정한 제품은 판정을 바꾸지 않고 `partial`로만 표시함. 판정 자체를 내릴지는 임상 결정 필요
- 경고 증상(물집 등): 룰 미연결(unknown) 대상도 기능성·메이크업·오일 세안이면 stop으로 잠금. 한 단계 하향은 unknown 유지, 병원 제공(consult)은 증상과 무관하게 유지
- 테스트: Vitest 96개, 룰 검증기에 계약 3개 추가
- 다음: 제형만 판정한 제품의 처리 방침 확정, D+14 이후 안내 방침 확정
