import { AppShell } from '@/components/app-shell/app-shell';
import { Topbar } from '@/components/common/topbar';

export default function TermsPage() {
  return (
    <AppShell navigation={false}>
      <Topbar title="서비스 이용약관" />
      <article className="legal">
        <p>시행일: 2026년 7월 29일 · MVP 초안</p>
        <h2>서비스 범위</h2>
        <p>
          회복노트는 사용자가 입력한 시술일과 제품 속성에 따라 결정론적 룰팩의 안내를 보여 주는 기록
          도구입니다.
        </p>
        <h2>의료 면책</h2>
        <p>
          이 안내는 진단이나 의료진의 판단을 대신하지 않습니다. 증상이 새로 생기거나 심해지면
          시술받은 병원 또는 의료기관에 문의하세요.
        </p>
        <h2>긴급 상황</h2>
        <p>
          호흡곤란, 의식 변화 등 긴급한 증상이 있으면 앱을 사용하지 말고 119 또는 응급실을
          이용하세요.
        </p>
        <h2>샘플 룰팩</h2>
        <p>현재 DRAFT_NOT_FOR_PATIENTS 상태의 룰팩은 실제 환자 안내용으로 검수되지 않았습니다.</p>
      </article>
    </AppShell>
  );
}
