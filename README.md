# 회복노트 B2C MVP

피코토닝 시술 후 사용자가 등록한 제품 속성과 시술일을 결정론적 룰팩에 대입해 날짜별 사용 안내를 보여 주는 모바일 우선 웹앱입니다.

> 현재 번들 룰팩은 `DRAFT_NOT_FOR_PATIENTS` 상태의 샘플 fixture입니다. 실제 환자 안내용으로 사용하면 안 됩니다.

## 실행

Node.js 22 이상과 pnpm 11을 권장합니다.

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

## 환경 변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `NEXT_PUBLIC_DATA_MODE` | `local` | `local`만 구현됨. `supabase`는 명시적 실패 스켈레톤 |
| `NEXT_PUBLIC_RULEPACK_SOURCE` | `bundled` | 현재 번들 JSON 룰팩 |
| `NEXT_PUBLIC_ENABLE_COMMERCE` | `true` | 추천 화면 노출 |
| `NEXT_PUBLIC_ENABLE_PHOTO` | `false` | MVP에서 사진 기능 비활성 |

## 안전 경계

- 진단, 위험도 예측, 사진 판독, 치료 추천을 제공하지 않습니다.
- `unknown`을 `go`로 바꾸지 않습니다.
- 체크 결과는 점수나 위험 등급이 아니라 룰팩에 직접 매핑된 행동 안내입니다.
- 제품명 원문과 증상 상세를 분석 이벤트 또는 커머스 URL에 포함하지 않습니다.
- local 모드의 정보는 사용 중인 브라우저에만 저장됩니다.

구조와 룰팩 작성법은 [architecture.md](docs/architecture.md), [rulepack-authoring.md](docs/rulepack-authoring.md)를 참고하세요.
