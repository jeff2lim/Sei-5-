# 회복노트 MVP · 프론트엔드 기능 명세

> 기존 통합 기획서(2026-08-07)와 PR #11 피드백 반영 추가 기획서(2026-08-09)를 기능 단위로 통합한 기준 문서(canonical spec)

기준일: 2026-08-09
담당: P4 Frontend · Recovery Note MVP

**통합 원칙:** 서로 다른 시점의 문서가 같은 영역을 다르게 설명하는 경우, 더 최신인 PR #11 반영 내용을 우선한다.

## 0. 문서 목적과 범위

이 문서는 기존 12개 기획 자료를 합친 통합본과 PR #11 피드백 반영 추가 기획서를 기능 단위로 다시 통합한 기준 문서다. 화면이나 파일의 소유권보다 사용자가 실제로 경험하는 흐름과 상태 변화가 하나의 기능 안에서 어떻게 연결되는지를 중심으로 정리한다.

통합 대상에는 앱 진입, 동의, 온보딩, 제품 등록·판정 조회, 제품 삭제, 행동안내, D+7 회복 완료, 기록/달력, 다음 시술 일정, 공통 Topbar, 전역 스타일 변경이 포함된다.

### 0.1 통합 시 우선 적용한 기준

- 기존 문서와 이후 보완 기획서가 같은 UI를 다르게 설명하는 경우, 가장 최신 문서인 PR #11 반영 내용과 현재 활성 구현을 우선한다.

- JSX 주석으로 남아 있는 대체 시안·실험 코드는 현재 활성 기능으로 보지 않는다.

- 프론트엔드는 룰 엔진의 판정 결과를 표시하며 새로운 의료적 판단을 생성하지 않는다.

- unknown은 “안전/가능”으로 간주하지 않으며 정보 부족 상태로 유지한다.

- Loading은 실제 오류/empty state와 비동기 작업 중 상태를 구분하기 위한 공통 UX 원칙으로 사용한다.

### 0.2 기능 묶음

| 기능 묶음 | 핵심 변화 |
| --- | --- |
| 1. 앱 진입·동의·내비게이션 | 자동 이동과 명시적 복귀를 분리하고, 온보딩/편집 모드 및 공통 Topbar 이동 규칙을 정리 |
| 2. 온보딩 입력 연속성·제품 등록 상태 | 저장된 시술 정보 복원, 제품 draft 수명주기 분리, 온보딩 제품 삭제 |
| 3. 비동기 저장·삭제 상태 안정화 | 저장/삭제 직후 잘못된 empty state가 보이지 않도록 Loading 우선 처리 |
| 4. 내 제품 판정 정보 구조 | 상태별 제품 그룹, 성분 detail 기준 대표 판정, 걸린 성분/문제 없는 성분 분리 |
| 5. 행동안내 3단계 탐색 | 세안→스킨케어→외출준비 순서, 화살표·단계 번호·하단 점 이동 |
| 6. D+7 회복 완료 경험 | D+7 이상 전용 홈, 제품별 회복 상태, 자외선 차단, 일정/기록 CTA |
| 7. 기록·달력·다음 시술 일정 | 월 이동, 6주 고정, 복수 마커, 일정 상세/삭제, addSchedule 딥링크 |
| 8. 공통 시각·접근성 체계 | 판정 상태색, 달력 상태 표현, 포커스/aria, 페이저·제품 카드 전용 스타일 |
| 9. PR #11 안정화·문서 관리 | Suspense 빌드 안정화, 과거 체크인 연결, 앱 내부 삭제 dialog, 로컬 폰트, canonical spec 정리 |

## 1. 앱 진입·동의·내비게이션 흐름 재설계

이 기능 묶음의 목적은 “어디에서 들어왔는지”와 “사용자가 무엇을 하려는지”를 화면 이동에 반영하는 것이다. 자동 리다이렉트, 온보딩, 마이페이지 편집, X 닫기, 뒤로가기를 서로 다른 의도로 구분한다.

### 1.1 앱 진입과 랜딩 강제 표시

- 일반 `/` 진입에서 저장된 동의가 있으면 다음 단계로 자동 이동한다. 시술 정보가 있으면 홈, 없으면 시술 정보 입력 화면으로 이동한다.

- `showLanding=1`은 저장된 동의 상태와 관계없이 랜딩 화면을 강제로 보여주기 위한 **데모 전용** URL 플래그다.

- `/?showLanding=1`에서는 기존 동의 상태가 있어도 자동 리다이렉트를 막고 랜딩을 유지한다.

- 브라우저 저장 상태와 URL 플래그가 준비되기 전에는 Loading 화면을 사용해 랜딩이 잠깐 보였다가 이동하는 현상을 줄인다.

- 랜딩의 “시작하기”는 동의 이력이 없으면 동의 화면, 이미 동의한 사용자는 시술 정보 입력 화면으로 분기한다.

- “시작하기”를 새 온보딩의 시작점으로 보고, 클릭 시 `sessionStorage`의 `recovery-note:consent-draft`를 제거한다.

연동 코드  src/app/page.tsx

### 1.2 동의 화면의 온보딩/편집 모드 분리

- URL의 `mode`를 사용해 `onboarding`과 `edit` 목적을 구분한다.

- edit 모드는 마이페이지의 “동의 내역”에서 `/consent?mode=edit`로 진입한다. 저장 또는 X 닫기 후 `/profile`로 돌아간다.

- onboarding 모드 저장 후에는 `/onboarding/procedure`로 진행하고, X 닫기는 `/?showLanding=1`로 이동한다.

- 저장된 consent는 Recovery Store hydration 이후 폼에 복원한다. 작성 중 체크값은 `sessionStorage`의 `recovery-note:consent-draft`로 분리한다.

- consent draft는 **onboarding 모드에서만** 읽고 쓴다. edit 모드는 `session.consent`를 기준으로 화면을 구성해 미완료 온보딩 초안이 프로필 편집에 섞이지 않도록 한다.

- 같은 onboarding 흐름에서 약관 상세 화면을 오갔다 돌아오는 경우에는 draft를 유지한다.

- 동의 화면 자체에서 X를 누르면 미저장 draft를 폐기하고 실제 저장된 consent는 변경하지 않는다.

- 스토어 hydration, draft 로딩, 모드 판별이 끝나기 전에는 Loading을 표시해 저장값과 임시값의 순간적인 불일치를 줄인다. 초기화 완료 여부는 nullable 상태인 `consentMode === null`을 기준으로 판단한다.

- 버튼 문구는 edit에서 “동의 내역 저장”, onboarding에서 “동의하고 계속”으로 구분한다.

연동 코드  src/app/consent/page.tsx · src/app/profile/page.tsx

### 1.3 공통 Topbar의 명시적 이동 규칙

| 조건 | 실행 | 의도 |
| --- | --- | --- |
| closeHref 존재 | onClose 실행 → router.push(closeHref) | X 닫기 전에 draft 정리 등 화면별 정리 수행 |
| closeHref 없음 + backHref 존재 | router.push(backHref) | 브라우저 history와 무관하게 지정된 이전 단계로 이동 |
| 둘 다 없음 | router.back() | 기존 history 기반 기본 동작 유지 |

- Topbar는 화면 데이터 구조를 직접 알지 않고, 화면별 정리 로직을 `onClose` 콜백으로 전달받는다.

- `TopbarProps`는 TypeScript 유니온 타입으로 정의해 `closeHref`와 `backHref`를 동시에 전달할 수 없게 한다. `closeHref` 경로에서는 기존 `onClose` 의미를 유지하고, `backHref` 경로에는 임의로 `onClose`를 추가하지 않는다.

- 온보딩 제품 목록은 `backHref="/onboarding/procedure"`를 사용한다.

- 시술 정보 입력 화면은 동의 화면의 onboarding 흐름으로 되돌아가도록 경로를 명시한다.

연동 코드  src/components/common/topbar.tsx · src/app/onboarding/procedure/page.tsx · src/app/onboarding/products/page.tsx

### 1.4 대표 사용자 흐름

1. 최초 사용자: 랜딩 → 동의(onboarding) → 시술 정보 → 제품 등록 → 이후 온보딩 단계.

1. 기존 사용자: `/` 진입 → 저장 상태 확인 → 시술 정보가 있으면 홈, 없으면 시술 정보 입력.

1. 동의 편집: 마이페이지 → 동의 내역 → edit 모드 → 저장 또는 X → 마이페이지.

1. 동의 화면에서 첫 화면 복귀: X → `/?showLanding=1` → 자동 리다이렉트 없이 랜딩 유지.

### 1.5 검수 기준

- □ 저장 정보가 없는 `/` 진입은 랜딩을 유지하는가.

- □ 동의만 있는 `/` 진입은 시술 정보 입력으로, 동의와 시술 정보가 모두 있으면 홈으로 이동하는가.

- □ `/?showLanding=1`에서 기존 동의가 있어도 랜딩이 유지되는가.

- □ edit/onboarding 모드에 따라 동의 화면의 저장·닫기 경로와 버튼 문구가 올바르게 달라지는가.

- □ 동의 상세 확인 후 복귀할 때 draft는 유지되고, X로 나갈 때는 미저장 draft가 폐기되는가.

- □ Topbar의 closeHref/backHref가 지정된 화면에서 브라우저 history와 무관하게 의도한 경로로 이동하는가.

## 2. 온보딩 입력 연속성과 제품 등록 상태 관리

온보딩을 앞뒤로 이동하거나 등록을 중단했다 다시 시작해도 “유지해야 할 값”과 “새로 시작해야 할 값”을 구분한다. 시술 정보는 저장값을 복원하고, 새 제품 등록은 이전 draft를 초기화하되 같은 등록 흐름 안에서는 draft를 유지한다.

### 2.1 시술 정보 재진입 시 저장값 복원

- Recovery Store hydration이 완료된 뒤 저장된 `performedAt`과 `profile.sensitivity`를 읽어 폼에 반영한다.

- 저장된 시술일이 있으면 해당 날짜를, 없으면 오늘 날짜를 사용한다.

- 저장된 민감도가 있으면 해당 값을, 없으면 `normal(보통)`을 기본값으로 사용한다.

- hydration 이후 `form.reset()`으로 시술일과 민감도를 한 번에 현재 세션 기준으로 맞춘다.

- 기존 제약은 유지한다: 시술 날짜 필수, 미래 날짜 저장 불가, 민감도는 낮은 편/보통/민감한 편 중 선택, 저장 후 `/onboarding/products` 이동, `procedure_saved` analytics 유지.

연동 코드  src/app/onboarding/procedure/page.tsx

### 2.2 제품 draft의 수명주기

| 사용자 행동 | draft 처리 | 의도 |
| --- | --- | --- |
| 제품 목록에서 “제품 등록하기” | 기존 draft 초기화 | 항상 새 제품 등록으로 시작 |
| 카테고리 선택 → 속성 입력 | 현재 draft 유지 | 같은 제품 등록을 이어감 |
| 속성 입력 → 이전 단계 | 현재 draft 유지 | 제품명/카테고리 재입력 방지 |
| 등록 완료 후 다시 새 제품 등록 | 새 draft로 초기화 | 이전 제품과 다음 제품 분리 |

- 새 등록 버튼을 누를 때 `setProductDraft({ name: '', category: null })`로 초기화한 뒤 카테고리 선택 화면으로 이동한다.

- 온보딩 제품 목록의 뒤로가기는 `backHref="/onboarding/procedure"`로 고정한다.

연동 코드  src/app/onboarding/products/page.tsx · src/components/common/topbar.tsx

### 2.3 온보딩 중 제품 삭제

- 제품 목록에서 Recovery Store의 `deleteProduct`를 연결해 잘못 등록한 제품을 온보딩 도중에도 삭제할 수 있다.

- 삭제는 즉시 실행하지 않고 앱 내부 `<dialog>`에서 사용자 확인 절차를 거친다. 취소하면 제품을 그대로 유지한다. 삭제 실패 메시지도 브라우저 `alert` 대신 dialog 내부에 표시한다.

- 제품이 없어도 온보딩을 계속 진행할 수 있는 기존 정책은 유지한다.

연동 코드  src/app/onboarding/products/page.tsx

### 2.4 검수 기준

- □ 시술 정보를 저장한 뒤 제품 화면에서 돌아오면 시술일과 민감도가 그대로 복원되는가.

- □ 새 제품 등록을 다시 시작할 때 이전 등록 draft가 남지 않는가.

- □ 같은 제품 등록 흐름 안에서 이전 화면으로 이동할 때는 draft가 유지되는가.

- □ 온보딩 제품 삭제에서 확인/취소가 구분되고, 확인 시 해당 제품만 제거되는가.

- □ 제품이 없는 상태에서도 기존 온보딩 진행 정책이 유지되는가.

## 3. 비동기 저장·삭제 중간 상태 안정화

정상적인 저장/삭제 과정에서 데이터가 먼저 바뀌고 화면 이동이 조금 늦게 일어나면, 실제 오류가 아닌데도 empty state가 잠깐 노출될 수 있다. 이번 변경은 “작업 중” 상태를 별도로 두고, 실제 데이터 없음 상태보다 먼저 렌더링하는 원칙을 적용한다.

### 3.1 제품 속성 저장 시 Loading 우선

| 우선순위 | 조건 | 표시 |
| --- | --- | --- |
| 1 | `saving === true` | LoadingScreen |
| 2 | 저장 중이 아니며 필수 draft 정보 없음 | 제품 정보가 비어 있는 상태 안내 |
| 3 | 정상 입력 상태 | 제품 속성 입력 폼 |

- 저장 시작 직후 saving을 true로 두고, 저장 과정에서 draft가 초기화되어도 Loading이 먼저 보이도록 한다.

- 저장 중 LoadingScreen은 `navigation={false}` 형태로 사용해 중복 조작을 줄인다.

연동 코드  src/components/products/product-attributes-form.tsx

### 3.2 제품 상세 삭제 시 Loading 우선

- 제품 삭제 버튼은 브라우저 `window.confirm` 대신 앱 내부 `<dialog>`를 연다. dialog에서 삭제를 확정한 뒤 `deleting=true`로 전환해 제품 데이터가 Store에서 먼저 제거되더라도 “제품을 찾을 수 없어요”가 순간적으로 보이지 않게 한다.

- `!hydrated || deleting` 동안 LoadingScreen을 표시한다.

- `deleteProduct` 완료를 await한 뒤 `router.replace('/products')`로 이동해 삭제된 상세 화면이 뒤로가기 기록에 불필요하게 남지 않도록 한다.

- 삭제 실패 시 `deleting=false`로 복구하고 브라우저 `alert` 대신 화면 내부 오류 안내를 표시한다.

연동 코드  src/app/products/[productId]/page.tsx

### 3.3 공통 상태 원칙

**UI 상태 우선순위:** 비동기 작업 중 상태 > 일시적으로 비어 보이는 데이터 상태 > 정상/실제 empty state. 저장 또는 삭제가 진행 중이라는 사실을 알고 있는 동안에는 이를 오류처럼 표현하지 않는다.

### 3.4 검수 기준

- □ 제품 속성 저장 직후 “제품 정보가 비어 있어요”가 깜빡이지 않는가.

- □ 제품 상세 삭제 직후 “제품을 찾을 수 없어요”가 깜빡이지 않는가.

- □ 삭제 완료 후 `/products`로 replace 이동하며, 뒤로가기로 삭제된 상세가 불필요하게 다시 열리지 않는가.

- □ 잘못된 직접 진입처럼 실제 데이터가 없는 상황에서는 기존 empty state가 정상적으로 보이는가.

## 4. 내 제품 판정 정보 구조 개편

내 제품 화면은 동일한 판정 결과를 “제품별”과 “성분·속성별” 두 관점에서 확인한다. 이번 변경은 두 보기 모두에서 더 보수적인 상태를 먼저 보여주고, 제품 전체 판정과 성분 단위 판정의 근거를 구분하도록 정보 구조를 정리한다.

### 4.1 공통 판정 우선순위

| 순위 | 판정 | 의미/표시 우선도 |
| --- | --- | --- |
| 1 | stop · 중단 | 가장 먼저 확인 |
| 2 | care · 주의 | 중단 다음 |
| 3 | unknown · 정보 없음 | 판정 정보 부족이므로 go보다 먼저 |
| 4 | go · 가능 | 상대적으로 마지막 |

- 제품별 보기와 성분·속성별 보기 모두 stop → care → unknown → go 순서를 사용한다.

- unknown은 go로 취급하지 않는다.

### 4.2 상단 판정 요약 카운터

- 중단·주의·정보 없음·가능의 제품 수를 계속 표시하되, 각 셀에 stop/care/unknown/go 상태 클래스를 부여한다.

- stop은 붉은 계열, care는 노란 계열, unknown은 중립 회색 계열, go는 녹색 계열로 구분한다.

### 4.3 제품별 보기: 상태 그룹 + 개별 제품 카드

| 상태 | 그룹 라벨 |
| --- | --- |
| stop | 지금은 멈춰주세요 |
| care | 아직 기다려주세요 |
| unknown | 연결된 판정 정보가 부족해요 |
| go | 계속 쓰셔도 돼요 |

- 각 그룹은 해당 상태의 제품만 포함하고, 제품 수가 0이면 그룹 자체를 렌더링하지 않는다.

- 그룹 헤더에는 라벨, 제품 수, 분리선을 표시한다.

- 제품 하나하나는 독립된 카드형 Link로 구성하고 제품명, 속성 개수, VerdictBadge, 우측 Chevron을 배치한다.

- 제품명은 속성 개수보다 큰 위계로 표시한다. 전체 카드가 상세 진입 링크이므로 내부에 중첩 버튼을 두지 않는다.

### 4.4 성분·속성별 보기: attribute detail 기준 대표 판정

- 각 제품의 전체 `verdict.level`이 아니라 `verdict.details`에서 해당 `attributeId`의 detail을 찾는다.

- 같은 성분이 여러 제품에 연결되면 detail.level을 rank로 비교해 가장 보수적인 상태를 성분 그룹의 대표값으로 사용한다.

- 대표 detail의 `reason`을 함께 보관해 성분 카드 하단의 판정 사유로 표시한다.

- 제품이 하나 이상 연결된 성분만 화면에 남기고, 대표 상태 기준 stop → care → unknown → go 순서로 정렬한다.

### 4.5 성분 그룹 구조와 연결 제품 표시

- `go`가 아닌 stop/care/unknown 성분은 “지금 걸린 성분 (n)”에 배치한다.

- `go` 성분은 “문제 없는 성분”에 배치한다.

- “지금 걸린 성분” 카드에는 등록된 제품 수 아래 실제 해당 제품명을 ` · ` 구분자로 나열한다.

- “문제 없는 성분”은 현재 활성 구현에서 등록된 제품 수와 reason을 표시하며, 제품명 목록은 별도로 추가하지 않는다.

연동 코드  src/app/products/page.tsx · src/styles/globals.css

### 4.6 검수 기준

- □ 제품별 탭에서 0개 상태 그룹이 노출되지 않고 stop → care → unknown → go 순서가 유지되는가.

- □ 각 제품 카드에서 제품명, 속성 개수, 상태 배지, 상세 진입 Chevron이 올바르게 보이는가.

- □ 성분별 탭에서 unknown이 “문제 없는 성분”에 포함되지 않는가.

- □ 동일 성분이 여러 제품에 있을 때 가장 보수적인 detail 판정이 대표값이 되는가.

- □ “지금 걸린 성분”의 제품 수와 실제 제품명 목록이 일치하는가.

- □ 제품별/성분별 보기 전환과 제품 상세 진입, 제품 등록 진입이 기존처럼 동작하는가.

## 5. 행동안내 3단계 연속 탐색

세안, 스킨케어, 외출준비는 서로 독립된 화면이지만 사용자는 회복 루틴의 연속된 3단계로 탐색할 수 있어야 한다. 현재 단계와 앞뒤 단계를 명확히 보여주는 페이저를 추가한다.

### 5.1 단계 순서와 화살표 이동

- 고정 순서는 cleansing(세안) → skincare(스킨케어) → outing(외출준비)이다.

- 현재 category의 인덱스로 previousCategory와 nextCategory를 계산한다.

- 첫 단계의 이전 화살표와 마지막 단계의 다음 화살표는 링크가 아닌 비활성 표시 요소로 렌더링한다.

- 활성 화살표는 `/guide/{category}`로 직접 이동한다.

### 5.2 현재 단계와 하단 점

- 상단 페이저 중앙에 현재 행동안내 제목과 `현재 단계 / 3`을 표시한다.

- 하단 3개 점은 각 단계로 직접 이동하는 Link이며, 현재 단계는 active 상태로 길게 강조한다.

- 현재 점에는 `aria-current="page"`를 부여하고 상단/하단 이동 요소에 목적을 설명하는 aria-label을 제공한다.

연동 코드  src/app/guide/[category]/page.tsx · src/styles/globals.css

### 5.3 검수 기준

- □ 세안 1/3에서는 이전이 비활성이고 다음이 스킨케어로 이동하는가.

- □ 스킨케어 2/3에서는 이전/다음 모두 동작하는가.

- □ 외출준비 3/3에서는 다음이 비활성이고 이전이 스킨케어로 이동하는가.

- □ 하단 점을 누르면 해당 단계로 직접 이동하고 active 표시와 aria-current가 현재 단계와 일치하는가.

- □ Topbar 닫기를 통해 기존 홈 복귀 흐름이 유지되는가.

## 6. D+7 회복 완료 경험

시술 후 첫 주를 지나면 일반 회복 홈과 다른 종료 경험을 제공한다. 판정 엔진을 바꾸지 않고, 기존 제품 판정을 D+7 이후 맥락에 맞는 표시 문구와 후속 행동으로 재구성한다.

### 6.1 노출 조건과 완료 화면

- `day !== null && day >= 7`이면 일반 홈 대신 회복 완료 전용 화면을 반환한다.

- 상단에는 `Picotoning · D+N`, “한 주의 회복을 잘 기록했어요.”, “피코토닝 후 첫 주 회복 기간을 마쳤어요.”를 표시한다.

- 회복 완료 카드에는 “이제 대부분의 일상 관리를 서서히 재개할 수 있어요.”를 표시하고, 제품별 안내가 등록 정보와 현재 룰팩 기준임을 안내한다.

### 6.2 D+7 전용 표시 라벨

| 원래 판정 | 완료 화면 표시 |
| --- | --- |
| go | 재개 가능 |
| care | 천천히 |
| stop | 계속 주의 |
| unknown | 확인 필요 |

이 매핑은 D+7 완료 화면의 표시 문구만 바꾸며 원래 판정값이나 룰 의미를 변경하지 않는다.

### 6.3 제품별 회복 상태

- `categoryVerdicts`의 product verdict를 `session.products`의 productId와 연결해 완료 화면용 제품 목록을 만든다.

- go 제품은 “현재 룰 기준으로 재개할 수 있어요.”, care는 “무리하지 말고 천천히 재개하세요.”, stop은 “아직은 사용을 쉬어가는 항목이에요.”를 표시한다.

- unknown 제품은 “현재 연결된 판정 정보가 부족해요.”를 표시한다.

- 재개 가능 또는 주의 제품이 하나도 없는 경우 해당 상태의 빈 안내 문구를 표시한다.

### 6.4 회복 이후 지속 관리와 후속 행동

- 별도 “계속 관리” 패널에서 “시술 부위는 색소침착(PIH)에 몇 주간 예민해요. 외출 시 선크림 SPF 50+는 앞으로도 꼭 발라주세요.”를 안내한다.

- “다음 시술 일정 잡기”는 `/records?addSchedule=1`로 이동해 기록 화면의 일정 추가 dialog를 바로 연다.

- “회복 기록 돌아보기”는 `/records`로 이동한다.

연동 코드  src/app/home/page.tsx · src/app/records/page.tsx · src/styles/globals.css

### 6.5 현재 활성 구현 기준

성분·속성 기반 완료 화면, 카테고리 카드형 완료 화면, 중복 notice는 JSX 주석 상태이므로 현재 활성 기능으로 보지 않는다. 현재 완료 화면은 등록 제품을 기준으로 상태를 나누어 표시한다.

### 6.6 검수 기준

- □ D+6 이하에서 기존 일반 홈이 유지되고 D+7 이상에서만 완료 화면이 보이는가.

- □ D+7 전용 라벨이 원래 go/care/stop/unknown 판정과 일치하는가.

- □ 제품별 보조 설명과 빈 상태 문구가 해당 그룹 조건에 맞게 표시되는가.

- □ 자외선 차단 안내 문구가 별도 “계속 관리” 패널에 보이는가.

- □ “다음 시술 일정 잡기”가 `/records?addSchedule=1`, “회복 기록 돌아보기”가 `/records`로 이동하는가.

## 7. 기록·달력·다음 시술 일정 관리

기록 화면을 “현재 월의 날짜 목록”에서 “과거/미래 월을 탐색하면서 시술일, 피부 체크일, 오늘, 다음 시술 예정일을 한 달력에서 구분하고 일정까지 관리하는 화면”으로 확장한다.

### 7.1 월 이동과 6주(42칸) 고정

- 현재 날짜(`now`)와 사용자가 보고 있는 월(`visibleMonth`)을 분리한다.

- 달력 상단 이전/다음 버튼으로 `visibleMonth`를 한 달씩 이동한다. 연도 경계도 월 계산에 따라 자연스럽게 변경된다.

- `firstDayOffset`, 실제 날짜 수, `trailingBlankCount`를 계산해 날짜 영역을 항상 7열 × 6행 = 42칸으로 유지한다.

- 6주 고정의 목적은 월을 넘길 때 달력 아래 범례와 기록 영역의 세로 위치가 흔들리는 느낌을 줄이는 것이다.

### 7.2 날짜 상태 표현

| 상태 | 표시 | 동작 |
| --- | --- | --- |
| 오늘 | 청록색 배경 + 흰색 날짜 | 현재 실제 월에서만 강조 |
| 시술일 | 청록색 점 | 기록 의미 표시 |
| 피부 체크일 | 황색 계열 점 | 시술일과 같은 날에도 동시 표시 |
| 다음 시술 예정일 | 청록색 테두리 | 클릭/Enter/Space로 일정 상세 dialog |

- 시술일과 다음 시술 예정일은 저장된 날짜의 `YYYY-MM`이 현재 보고 있는 `monthKey`와 같을 때만 표시한다.

- 오늘은 실제 현재 월을 보고 있을 때만 강조한다. 다른 달의 같은 일(day) 숫자는 오늘로 표시하지 않는다.

- 오늘 날짜에 시술/체크 점이 함께 있으면 대비를 위해 점을 흰색으로 표현한다.

- 달력 아래 범례로 시술일, 피부 체크한 날, 오늘, 다음 시술 예정일의 의미를 설명한다.

- 각 날짜의 aria-label에는 오늘/시술일/피부 체크/다음 시술 예정 등 해당 날짜의 의미를 조합해 제공한다.

### 7.3 다음 시술 예정일 조회·삭제

- 예정일을 선택하면 일정 상세 dialog에 예정 날짜와 시술 종류(현재 MVP는 피코토닝)를 표시한다.

- 예정일 상세 dialog 자체가 삭제 확인 단계 역할을 한다. 상세 dialog의 “삭제하기”를 누르면 별도 브라우저 `confirm` 없이 `nextProcedureAt`을 제거하고 dialog를 닫는다.

- 상세 dialog의 X는 변경 없이 닫고 기존 일정을 유지한다.

- 다음 시술 예정일 표시 기능은 구현 상 `SHOW_NEXT_PROCEDURE` 플래그로 제어되며 현재 활성(true) 기준으로 기획한다.

### 7.4 D+7에서 일정 추가로 바로 연결

- RecordsPage는 `useSearchParams`로 URL 쿼리를 읽는다.

- 스토어 hydration 완료 후 `addSchedule=1`이면 기존 일정 추가 `dialogRef.current?.showModal()`을 호출한다.

- 일반 `/records` 진입에서는 자동으로 dialog를 열지 않는다.

- D+7 홈의 “다음 시술 일정 잡기”가 `/records?addSchedule=1`로 연결되어 기록 화면에 들어오자마자 일정 추가를 시작한다.

연동 코드  src/app/records/page.tsx · src/app/home/page.tsx · src/styles/globals.css

### 7.5 `/records` Suspense 빌드 안정화

- `useSearchParams()`를 사용하는 실제 기록 화면을 `RecordsPageContent`로 분리한다.

- 기본 export인 `RecordsPage`는 `<Suspense>`로 `RecordsPageContent`를 감싸고 fallback에는 기존 `LoadingScreen`을 사용한다.

- 이 수정 직후 `pnpm build`에서 정적 페이지 22/22 생성까지 성공했다.

### 7.6 과거 체크인 결과 연결

- 기록 목록의 체크인 링크는 `/check-in/result?id={checkIn.id}` 형태로 이동한다.

- 체크인 결과 화면은 `id`가 있으면 해당 ID의 체크인을 찾고, `id`가 없으면 기존처럼 최신 체크인을 보여준다.

- 결과 화면도 `useSearchParams()` 사용을 위해 Suspense wrapper 구조를 적용한다.

- 코드와 typecheck는 완료했지만, 과거 기록을 실제 브라우저에서 클릭해 보는 기능 검증은 아직 하지 않았다.

연동 코드  src/app/records/page.tsx · src/app/check-in/result/page.tsx

### 7.7 검수 기준

- □ 4주·5주·6주 형태의 달을 오가도 달력 날짜 영역이 항상 6행으로 유지되는가.

- □ 연도 경계에서 이전/다음 달 이동이 정상적인가.

- □ 다른 달의 같은 일 숫자가 오늘로 잘못 강조되지 않는가.

- □ 시술일과 피부 체크일이 같은 날에 두 점이 모두 보이는가.

- □ 다음 시술 예정일을 마우스와 Enter/Space로 열 수 있고 상세 날짜/시술 종류가 맞는가.

- □ 일정 삭제 후 달력의 예정일 표시가 즉시 사라지고 다시 일정 추가가 가능한가.

- □ `/records?addSchedule=1`에서만 일정 추가 dialog가 자동으로 열리는가.

- □ 과거 체크인 목록에서 특정 기록을 누르면 해당 `id`의 결과가 열리는가. **(브라우저 검증 대기)**

## 8. 공통 시각·접근성 체계 확장

기능이 늘어나면서 같은 판정이나 날짜 상태를 화면마다 다른 방식으로 표현하지 않도록 전역 스타일을 확장했다. 동시에 클릭 가능한 날짜, 가이드 이동, 제품 상세 진입에 시각적·접근성 단서를 제공한다.

### 8.1 달력 스타일 체계

- 달력 날짜 셀 선택자를 `.calendar > span`처럼 직접 자식 기준으로 좁혀 내부 숫자/점 요소가 날짜 셀 스타일을 잘못 상속받지 않게 한다.

- 시술일은 `.procedure-dot`, 피부 체크일은 `.check-dot`, 오늘은 `.today`, 다음 시술 예정일은 `.next-procedure`로 역할을 분리한다.

- 다음 시술 예정일에는 `cursor: pointer`와 `:focus-visible` outline을 적용한다.

- 월 이동 UI는 중앙 정렬 flex 구조를 사용하고 월 라벨에 최소 너비를 줘 화살표 위치가 크게 흔들리지 않게 한다.

### 8.2 판정 요약·제품 카드·성분 관계 스타일

- `summary-cell.stop/care/unknown/go`로 상태별 배경·테두리·텍스트 색을 분리한다.

- `product-verdict-group`과 `product-group-head`는 상태 그룹 라벨, 개수, 분리선을 담당한다.

- `product-status-row`는 제품 정보 / 상태 배지 / 상세 진입의 3열 카드 구조를 사용한다.

- `attribute-group-label`은 성분별 큰 그룹과 제품별 상태 그룹의 작은 보조 제목 스타일로 공용한다.

- `attribute-product-list`는 걸린 성분 카드에서 실제 연결 제품명을 작은 보조 텍스트로 표시한다.

### 8.3 가이드·D+7 스타일

- `guide-pager`는 44px / 가변 중앙 / 44px의 3열 구조를 사용한다.

- 비활성 화살표는 링크가 아닌 `guide-pager-disabled`로 표현하고, 하단 active 점은 너비를 늘리고 청록색으로 강조한다.

- `recovery-summary`와 `recovery-summary-empty`는 D+7 제품 목록 간격과 빈 상태 안내를 담당한다.

### 8.4 접근성 및 상호작용 원칙

- 가이드 화살표·하단 점에는 이동 목적을 설명하는 aria-label을 제공하고 현재 단계에는 aria-current를 사용한다.

- 달력 날짜 aria-label은 하나의 날짜에 겹치는 여러 의미를 함께 전달한다.

- 다음 시술 예정일은 마우스뿐 아니라 Enter/Space와 focus-visible로 키보드 사용을 지원한다.

- 제품 카드 전체가 Link인 경우 내부에 별도 실제 버튼을 중첩하지 않고 Chevron은 상세 진입 affordance로 사용한다.

### 8.5 삭제 확인 UI의 앱 내부 통일

- `src/**/*.tsx`에서 `window.confirm`과 `window.alert` 사용을 제거한다.

- 온보딩 제품 삭제와 제품 상세 삭제는 앱 내부 `<dialog>`를 사용한다.

- 다음 시술 일정 삭제는 이미 열린 일정 상세 dialog를 확인 단계로 사용한다.

- 프로필의 전체 데이터 삭제는 영향 범위가 크므로 별도 확인 `<dialog>`를 유지하고, 실패 메시지도 dialog 안에서 표시한다.

- 최종 검색에서 `window.confirm` 및 `window.alert` 사용이 0건임을 확인했다.

### 8.6 로컬 폰트

- `next/font/google`을 제거하고 `next/font/local`을 사용한다.

- 본문 폰트는 IBM Plex Sans KR 400/500/600/700, 제목 폰트는 Gowun Dodum 400, 고정폭 폰트는 IBM Plex Mono 400/500/600을 사용한다.

- 폰트 파일은 `src/fonts` 아래 TTF 8개로 포함하고 기존 CSS 변수 `--font-body`, `--font-title`, `--font-mono`를 유지한다.

- 폰트 전환 후 `pnpm typecheck`는 통과했다. **로컬 폰트를 포함한 최종 `pnpm build`는 아직 실행하지 않았다.**

연동 코드  src/styles/globals.css · src/app/records/page.tsx · src/app/products/page.tsx · src/app/guide/[category]/page.tsx

## 9. 변경 이후 핵심 사용자 흐름

| 시나리오 | 연결 흐름 |
| --- | --- |
| 최초 온보딩 | 랜딩 → 동의(onboarding) → 시술 정보 → 제품 목록 → 신규 제품 등록 → 속성 저장 Loading → 다음 온보딩 단계 |
| 온보딩 되돌아가기 | 제품 목록 → 시술 정보(저장값 복원) → 동의(onboarding) / 명시적 backHref·closeHref 사용 |
| 동의 편집 | 마이페이지 → 동의 내역(edit) → 저장 시 실제 consent 반영 → 마이페이지 / X는 미저장 draft 폐기 |
| 내 제품 확인 | 내 제품 → 제품별 상태 그룹 또는 성분별 그룹 → 제품 상세 → 필요 시 삭제 Loading → 목록 replace |
| 행동안내 탐색 | 세안 ↔ 스킨케어 ↔ 외출준비 → 상단 화살표 또는 하단 점으로 이동 → Topbar로 홈 복귀 |
| D+7 완료 | 홈 → day ≥ 7 → 회복 완료 화면 → 제품별 재개/주의/확인 필요 → 일정 추가 또는 기록 보기 |
| 다음 시술 일정 | D+7 CTA → `/records?addSchedule=1` → hydration → 일정 추가 dialog → 저장 → 달력 예정일 테두리 → 상세/삭제 |
| 기록 탐색 | 기록 → 이전/다음 월 → 42칸 달력 → 시술/체크/오늘/예정일 상태 확인 → 하단 기록 확인 |
| 과거 체크인 확인 | 기록 목록 → `/check-in/result?id={checkIn.id}` → 선택한 과거 체크인 결과 확인 |

## 10. 공통 상태·데이터 처리 원칙

- 저장된 실제 데이터와 임시 draft를 분리한다. 실제 데이터는 명시적 저장 동작에서만 바뀌도록 한다.

- hydration 전에 빈 기본값을 실제 저장 데이터처럼 취급하지 않는다.

- 작업 중(Loading)과 실제 데이터 없음(empty/error)을 구분한다.

- 브라우저 history에 의존해야 할 이유가 없는 온보딩/편집 경로는 명시적 href를 우선한다.

- 표시 순서는 보수적 판정 우선순위 stop > care > unknown > go를 일관되게 적용한다.

- 프론트엔드에서 의료적 의미를 새로 추론하지 않고 룰 엔진의 결과와 detail을 그대로 사용해 정보 구조만 정리한다.

- URL query는 화면 이동 의도를 전달하는 일시적 트리거로 사용한다. `mode=edit/onboarding`, `addSchedule=1`은 저장 프로필 값이 아니며, `showLanding=1`은 데모 전용 랜딩 강제 표시 플래그다.

## 11. 이번 통합 변경에서 제외한 영역

12개 기획서에서 공통적으로 “이번 수정 범위가 아님”으로 명시된 내용은 아래와 같이 정리한다.

- 피코토닝 관련 의료적 판정 기준, 속성별 판정 기간, 룰테이블 값 및 룰 엔진 자체의 판단 로직.

- 약관·개인정보처리방침 등 법률 문구 자체의 내용 변경.

- 시술 종류 확장. 현재 MVP는 피코토닝 단일 시술 기준을 유지한다.

- 마이페이지의 데이터 내보내기, 법적 문서 링크, 알림 준비 중 표시 등 기존 기능의 재설계. 전체 데이터 삭제의 **기능 의미와 삭제 범위는 유지**하되, PR #11에서 브라우저 `confirm`을 앱 내부 dialog로 교체했다.

- 제품 category 정의나 속성 항목 자체의 의료적 구성 변경.

- 과거 판정 결과를 과거 룰 버전으로 재현하는 정책, 피부 체크 질문/판정 로직 자체의 변경.

- PR #12 이후 rebase 및 모델 변경 대응(리뷰 6번). 팀 지시에 따라 이번 PR #11 반영 범위에서 제외한다.

- `next.config.ts`의 로컬 개발용 변경. 이번 P4 PR staging 대상에서 제외한다.

## 12. 통합 검수 체크리스트

### 12.1 진입·동의·온보딩

- □ 최초/기존 사용자 `/` 진입 분기가 저장 상태에 따라 정상적으로 동작한다.

- □ `showLanding=1`은 저장된 동의가 있어도 랜딩을 유지한다.

- □ 동의 edit/onboarding 모드의 저장·X 경로와 문구가 구분된다.

- □ 동의 상세 왕복에서는 onboarding draft가 유지되고, X로 종료하면 미저장 draft가 폐기된다.

- □ edit 모드에서 미완료 onboarding draft가 노출되지 않는가.

- □ 랜딩에서 새로 “시작하기”를 누르면 이전 onboarding consent draft가 초기화되는가.

- □ 시술 정보 재진입 시 저장된 시술일과 민감도가 복원된다.

- □ 새 제품 등록만 draft를 초기화하고 같은 등록 흐름의 이전/다음 이동은 draft를 유지한다.

### 12.2 저장·삭제 안정성

- □ 제품 속성 저장 중 실제 empty state가 아닌 Loading이 우선 표시된다.

- □ 제품 상세 삭제 중 “제품을 찾을 수 없음”이 깜빡이지 않는다.

- □ 제품 상세 삭제 완료 후 목록으로 replace 이동한다.

- □ 온보딩 제품 삭제는 앱 내부 dialog로 확인/취소 절차를 제공한다.

- □ 제품 상세·다음 시술 일정·전체 데이터 삭제에서 브라우저 `confirm`/`alert`이 나타나지 않는가.

### 12.3 제품·가이드·D+7

- □ 제품별 상태 그룹은 stop → care → unknown → go이며 0개 그룹은 숨긴다.

- □ 성분별 대표 판정은 attribute detail의 가장 보수적인 수준을 사용한다.

- □ unknown 성분은 “문제 없는 성분”에 포함되지 않는다.

- □ 가이드 3단계의 화살표·단계 번호·하단 점이 서로 일치한다.

- □ D+7 이상에서만 완료 화면이 나타나고 전용 상태 라벨이 원래 판정과 맞는다.

- □ D+7 일정 CTA가 addSchedule 딥링크로 연결된다.

### 12.4 기록·달력·접근성

- □ 모든 월에서 달력 날짜 영역이 42칸으로 유지된다.

- □ 오늘/시술일/피부 체크일/다음 시술 예정일이 동시에 필요한 경우 서로 덮어쓰지 않는다.

- □ 다음 시술 예정일 상세를 마우스와 키보드로 열 수 있다.

- □ 일정 삭제 후 표시가 즉시 갱신되고 다시 일정 추가할 수 있다.

- □ 가이드와 달력의 aria-label, aria-current, focus-visible이 의도대로 작동한다.

- □ 과거 체크인 기록 1건을 눌렀을 때 선택한 기록의 결과가 열리는가. **(브라우저 검증 대기)**

- □ 로컬 폰트 포함 상태에서 최종 `pnpm build`가 성공하는가. **(검증 대기)**

## 13. 기능-코드 추적표

본문은 기능 중심으로 구성했지만 실제 코드 수정 위치를 빠르게 찾을 수 있도록 마지막에 파일 매핑을 남긴다.

| 기능 | 관련 코드 |
| --- | --- |
| 앱 진입·랜딩 | src/app/page.tsx |
| 동의 모드·draft | src/app/consent/page.tsx · src/app/profile/page.tsx · src/components/common/topbar.tsx |
| 시술 정보 복원 | src/app/onboarding/procedure/page.tsx |
| 온보딩 제품 draft·삭제 | src/app/onboarding/products/page.tsx |
| 제품 속성 저장 Loading | src/components/products/product-attributes-form.tsx |
| 제품 상세 삭제 Loading | src/app/products/[productId]/page.tsx |
| 내 제품 정보 구조 | src/app/products/page.tsx · src/styles/globals.css |
| 행동안내 3단계 | src/app/guide/[category]/page.tsx · src/styles/globals.css |
| D+7 회복 완료 | src/app/home/page.tsx · src/styles/globals.css |
| 기록·달력·다음 시술 | src/app/records/page.tsx · src/styles/globals.css |
| 과거 체크인 결과 연결 | src/app/records/page.tsx · src/app/check-in/result/page.tsx |
| 전체 데이터 삭제 dialog | src/app/profile/page.tsx |
| Topbar prop 상호배타 타입 | src/components/common/topbar.tsx |
| 로컬 폰트 | src/app/layout.tsx · src/fonts/* |
| D+7→일정 추가 딥링크 | src/app/home/page.tsx · src/app/records/page.tsx |

## 14. 통합에 사용한 기획 자료

| # | 기획 자료 |
| --- | --- |
| 1 | src/app/page.tsx 기획서 |
| 2 | src/app/consent/page.tsx 기획서 |
| 3 | src/app/onboarding/procedure/page.tsx 기획서 |
| 4 | src/app/onboarding/products/page.tsx 기획서 |
| 5 | src/app/products/page.tsx 기획서 |
| 6 | src/app/products/[productId]/page.tsx 기획서 |
| 7 | src/app/profile/page.tsx 기획서 |
| 8 | src/app/records/page.tsx 기획서 |
| 9 | src/styles/globals.css 기획서 |
| 10 | src/components/common/topbar.tsx 기획서 |
| 11 | src/components/products/product-attributes-form.tsx 기획서 |
| 12 | P4 기획서 작성 이후 수정사항 정리 (guide/home/products/records/globals) |
| 13 | PR #11 피드백 반영 추가 기획서 (2026-08-09) |

## 15. 문서 관리 및 PR #11 검증 상태

### 15.1 문서 관리 원칙

- 기존 최종 통합 DOCX와 PR #11 피드백 반영 추가 기획서는 `docs/planning/`에 참고자료로 보관한다.

- `src` 하위에 있던 화면별 DOCX 11개는 삭제한다.

- `.gitignore`에 `src/**/*.docx`를 추가해 소스 디렉터리에 DOCX가 다시 포함되지 않도록 한다.

- 이 문서 `docs/frontend-spec.md`를 앞으로의 기준 문서(canonical spec)로 사용하며, 이후 수정은 MD를 우선한다.

- 이번 변경 대상 TSX 파일에는 Prettier를 적용했고 이후 `pnpm typecheck`가 통과했다.

### 15.2 현재 검증 상태

| 검증 항목 | 현재 상태 | PR 전 처리 |
| --- | --- | --- |
| `pnpm typecheck` | 통과 | 최종 변경 후 한 번 더 실행 권장 |
| `/records` Suspense 수정 | 수정 직후 `pnpm build` 통과 | 완료 |
| 로컬 폰트 포함 최종 build | 미실행 | PR 전 `pnpm build` 필수 |
| 과거 체크인 `id` 연결 | 코드/typecheck 완료, 브라우저 미검증 | 과거 기록 1건 클릭 검증 |
| 네이티브 팝업 검색 | `window.confirm` / `window.alert` 0건 | 완료 |
| Prettier | 변경 대상 TSX 적용 완료 | 완료 |
| `next.config.ts` | 로컬 변경 존재 가능 | P4 PR staging에서 제외 |
| rulepack 생성물 | 원복 완료 | P4 PR에 포함하지 않음 |
| 리뷰 6번 rebase | 이번 범위 제외 | 팀 지시에 따라 별도 처리 |

### 15.3 PR #11 범위 원칙

- PR #12 이후 rebase 및 모델 변경 대응(리뷰 6번)은 이번 PR #11 반영 범위에서 제외한다.

- `next.config.ts`의 로컬 개발용 변경과 룰 관련 생성물은 이번 P4 반영 대상에 포함하지 않는다.

- PR 전에는 과거 체크인 브라우저 검증과 로컬 폰트를 포함한 최종 `pnpm build`를 완료한다.
