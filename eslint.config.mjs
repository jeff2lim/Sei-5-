import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
  '.next/**',
  'coverage/**',
  'playwright-report/**',
  'src/rules/generated/**',
  // Next.js가 자동 생성하며 "편집하지 말 것"이라고 명시된 파일.
  // Next 15.5부터 typed routes용 triple-slash reference가 포함되는데,
  // next/typescript 프리셋의 @typescript-eslint/triple-slash-reference 규칙과 충돌한다.
  'next-env.d.ts',
],
  },
];

export default config;
