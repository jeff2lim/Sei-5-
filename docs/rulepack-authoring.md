# Rule table v5 authoring

## 원본과 생성물

사람이 수정하는 원본은 `data/*.json`과 `schema/*.json`입니다. `build/rules.generated.json`은 `pnpm rules:build`로 만들며 직접 편집하지 않습니다. 기존 `rules/*.json`은 v0.1 브라우저 데이터 호환과 앱 메타데이터를 위해 남겨 둔 레거시 어댑터입니다.

## 변경 절차

1. `data/timelines.json` 또는 해당 마스터 데이터를 수정합니다.
2. `pnpm rules:validate`로 D+0~14 커버리지, 단조성, 민감도 정책과 클램프를 검사합니다.
3. `pnpm rules:build`로 세 민감도와 15일 셀을 전개합니다.
4. `pnpm test`에서 타임라인·커플링·증상 하향 회귀 테스트를 실행합니다.

## 강제 규칙

- `consult`는 severity 순서에 포함하지 않습니다.
- `advisory`와 `warning_text_only`는 제품 판정 롤업에서 제외합니다.
- `restorative`는 민감도나 증상으로 하향하지 않습니다.
- `pigment_rail`은 낮은 민감도에서 재개일을 당기지 않습니다.
- D+14를 넘는 재개일은 `deferred: true`, `reopen_d_day: null`로 유지합니다.
- `care`에는 조건 문구가 필요합니다.
- `confirmed`에는 근거 인용이 필요합니다.
- `징크옥사이드`, `산화아연`, `Zinc Oxide`는 징크 성분군에서 제외합니다.

현재 데이터는 임상 확정본이 아닙니다. `needs_review`와 `extrapolated` 항목을 전문의 검수 없이 `confirmed`로 바꾸지 마세요.
