import { AppShell } from '@/components/app-shell/app-shell';
import { Topbar } from '@/components/common/topbar';

export default function PrivacyPage() {
  return (
    <AppShell navigation={false}>
      <Topbar title="개인정보처리방침" />
      <article className="legal">
        <p>시행일: 2026년 7월 29일 · MVP 초안</p>
        <h2>수집 목적</h2>
        <p>날짜별 제품 사용 안내, 피부 상태 기록, 사용자가 요청한 데이터 내보내기를 제공합니다.</p>
        <h2>수집 항목</h2>
        <p>
          시술일, 민감도 선택, 제품명과 제품 속성, 피부 상태 체크, 별도 동의 시 사진 저장 정보가
          포함됩니다. 카카오 연결을 선택하면 인증 사용자 ID와 카카오가 제공하도록 사용자가 동의한
          프로필 정보가 추가됩니다. 생년월일과 전화번호는 MVP에서 수집하지 않습니다.
        </p>
        <h2>보유 기간과 저장 위치</h2>
        <p>
          local 모드에서는 모든 정보가 이 브라우저에만 저장됩니다. 카카오 계정을 연결하면 기록은
          Supabase 계정 저장소로 이전되며, 사용자가 전체 데이터 또는 계정 삭제를 실행할 때까지
          보유됩니다.
        </p>
        <h2>분석 정보</h2>
        <p>
          분석 이벤트에 제품명 원문, 증상 자유서술, 사진 URL, 전화번호를 보내지 않습니다. 제품명과
          건강 상태는 커머스 링크 URL에도 포함하지 않습니다.
        </p>
      </article>
    </AppShell>
  );
}
