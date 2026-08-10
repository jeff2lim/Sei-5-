const errors: string[] = [];

function validateChoice(name: string, allowed: readonly string[], fallback: string) {
  const value = process.env[name] ?? fallback;
  if (!allowed.includes(value)) {
    errors.push(`${name}=${value} (지원 값: ${allowed.join(', ')})`);
  }
}

validateChoice('NEXT_PUBLIC_DATA_MODE', ['local', 'hybrid'], 'local');
validateChoice('NEXT_PUBLIC_RULEPACK_SOURCE', ['bundled'], 'bundled');
validateChoice('NEXT_PUBLIC_ENABLE_COMMERCE', ['true', 'false'], 'true');
validateChoice('NEXT_PUBLIC_ENABLE_PHOTO', ['false'], 'false');

const dataMode = process.env.NEXT_PUBLIC_DATA_MODE ?? 'local';
if (dataMode !== 'local') {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL이 필요합니다.');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY가 필요합니다.');
  }
  if (!process.env.SUPABASE_SECRET_KEY) {
    errors.push('계정 삭제를 위한 SUPABASE_SECRET_KEY가 필요합니다.');
  }
}

if (errors.length > 0) {
  throw new Error(
    `지원되지 않는 배포 환경변수가 있습니다:\n- ${errors.join('\n- ')}\n` +
      'Vercel의 Preview와 Production 환경변수를 수정한 뒤 다시 배포하세요.',
  );
}

console.log(`Deployment environment validation passed (${dataMode} data, bundled rules).`);
