# Deployment

## Vercel

1. GitHub 저장소를 Vercel 프로젝트에 연결합니다.
2. Framework Preset은 Next.js, Install Command는 `pnpm install --frozen-lockfile`을 사용합니다.
3. `.env.example`의 네 환경 변수를 Preview와 Production에 설정합니다.
4. `main`을 Production Branch로 지정하고 PR Preview를 활성화합니다.
5. 배포 전 GitHub branch protection에서 CI의 `validate` job을 필수로 설정합니다.

현재 초기 MVP는 Vercel Hobby 범위에서 실행 가능한 정적·클라이언트 중심 구조입니다. 수익 또는 상업 트래픽이 시작되거나 Hobby 정책 범위를 벗어나면 적합한 유료 플랜으로 전환해야 합니다. 플랜 조건은 배포 시점의 Vercel 공식 정책을 다시 확인하세요.

## 운영 점검

- DRAFT 경고 배너가 모든 주요 화면에 보이는지 확인
- CSP와 기본 보안 헤더 확인
- 로그와 분석 이벤트에 제품명, 증상 상세, 사진 URL이 없는지 확인
- 룰팩 상태가 PILOT/APPROVED라면 검수자와 검수 일시 확인
