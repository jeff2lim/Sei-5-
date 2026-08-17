# 회복노트 B2C MVP

피코토닝 시술 후 사용자가 등록한 제품 속성과 시술일을 결정론적 룰팩에 대입해 날짜별 사용 안내를 보여 주는 모바일 우선 웹앱입니다.

> 현재 v6 룰테이블의 D+0~~7은 `team_provisional`, D+8~~14와 준비기 D−7~~−1은 `extrapolated`입니다. 임상 검수 전 실제 환자 안내용으로 사용하면 안 됩니다.

## 실행

Node.js 22와 pnpm 10을 사용합니다. Vercel과 CI도 같은 메이저 버전으로 고정합니다.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

`http://localhost:3000`에서 확인할 수 있습니다.

## 검증

```bash
pnpm rules:validate
pnpm rules:build
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

전체 단위·정적·빌드 검증은 `pnpm check`로 실행합니다.

## 룰테이블 v6

- `data/`: 사람이 편집하는 회복기·준비기 타임라인, 성분 이명, 제형, 병용 규칙과 민감도 정책
- `schema/`: 원본 타임라인, 생성 룰테이블, 병용 규칙 JSON Schema
- `src/ruletable/`: 민감도 전개, 다음 시술 게이트, 병용 노출, 증상 하향, 선크림-세안 결합과 검증 로직
- `build/rules.generated.json`: D−7~D+14 판정을 자동 전개한 산출물
- `build/combinations.generated.json`: 민감도별 `active_from_d`를 자동 계산한 병용 산출물

두 생성 파일은 직접 편집하지 않습니다. 제품 등록은 제품명을 판정에 사용하지 않고 세안/스킨케어/외출준비 행동 카테고리와 사용자가 직접 선택한 제형·성분군만 사용합니다. 자세한 구조와 검수 대기 항목은 [ruletable-v6.md](docs/ruletable-v6.md)를 참고하세요.

## 환경 변수

| 변수                                   | 기본값    | 설명                                               |
| -------------------------------------- | --------- | -------------------------------------------------- |
| `NEXT_PUBLIC_DATA_MODE`                | `local`   | `hybrid`는 게스트 로컬·로그인 사용자 Supabase 저장 |
| `NEXT_PUBLIC_SUPABASE_URL`             | 없음      | `hybrid`/`supabase`에서 필요한 공개 프로젝트 URL   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 없음      | 브라우저에서 사용하는 Supabase 공개 키             |
| `SUPABASE_SECRET_KEY`                  | 없음      | 계정 삭제에만 사용하는 서버 전용 키                |
| `NEXT_PUBLIC_RULEPACK_SOURCE`          | `bundled` | 현재 번들 JSON 룰팩                                |
| `NEXT_PUBLIC_ENABLE_COMMERCE`          | `true`    | 추천 화면 노출                                     |
| `NEXT_PUBLIC_ENABLE_PHOTO`             | `false`   | MVP에서 사진 기능 비활성                           |

Kakao Auth, RLS와 Vercel 설정 순서는 [auth-setup.md](docs/auth-setup.md)를 참고하세요.

## 안전 경계

- 진단, 위험도 예측, 사진 판독, 치료 추천을 제공하지 않습니다.
- `unknown`을 `go`로 바꾸지 않습니다.
- 체크 결과는 점수나 위험 등급이 아니라 증상별 행동 안내와 일부 판정의 일시적 하향입니다.
- 제품명 원문과 증상 상세를 분석 이벤트 또는 커머스 URL에 포함하지 않습니다.
- local 모드의 정보는 사용 중인 브라우저에만 저장됩니다. hybrid 모드는 사용자가 카카오 연결을 선택한 뒤에만 계정 저장소로 이전합니다.

구조와 룰팩 작성법은 [architecture.md](docs/architecture.md), [rulepack-authoring.md](docs/rulepack-authoring.md)를 참고하세요.
