import { expect, test } from '@playwright/test';

test('new user can finish onboarding with no products and enter home', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /시작하기/ }).click();

  const required = page.locator('input[type="checkbox"]');
  await required.nth(1).check();
  await required.nth(2).check();
  await required.nth(3).check();
  await page.getByRole('button', { name: '동의하고 계속' }).click();

  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  await page.getByLabel('시술 날짜').fill(today);
  await page.getByRole('button', { name: '다음' }).click();
  await expect(page).toHaveURL(/\/onboarding\/products$/);

  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding\/products$/);

  await page.getByRole('button', { name: '제품 없이 넘어가기' }).click();
  await page.getByLabel('잘 모르겠어요').check();
  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.getByRole('heading', { name: '회복 관리 준비가 끝났어요.' })).toBeVisible();
  await page.getByRole('button', { name: /회복 관리 시작/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText('Picotoning · D+0', { exact: true })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto('/');
  await expect(page).toHaveURL(/\/home$/);
});

test('draft warning and bottom navigation stay visible on mobile', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'recovery-note:v1',
      JSON.stringify({
        profile: { sensitivity: 'normal' },
        procedure: {
          id: 'p1',
          procedureType: 'picotoning',
          performedAt: new Date().toISOString().slice(0, 10),
          createdAt: new Date().toISOString(),
        },
        products: [],
        checkIns: [],
        consent: {
          terms: true,
          privacy: true,
          healthData: true,
          photo: false,
          marketing: false,
          updatedAt: new Date().toISOString(),
        },
      }),
    );
  });
  await page.goto('/home');
  await expect(page.locator('.draft-banner')).toContainText('내부 검증 중인 안내');
  await expect(page.getByRole('navigation', { name: '하단 탐색' })).toBeVisible();
  await page.getByRole('link', { name: '내 제품' }).click();
  await expect(page).toHaveURL(/\/products$/);
});

test('user can register a skincare product with a v5 ingredient group', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'recovery-note:v1',
      JSON.stringify({
        profile: { sensitivity: 'normal' },
        procedure: {
          id: 'p1',
          procedureType: 'picotoning',
          performedAt: new Date().toISOString().slice(0, 10),
          createdAt: new Date().toISOString(),
        },
        products: [],
        checkIns: [],
        consent: null,
      }),
    );
  });

  await page.goto('/products/new/category');
  await page.getByLabel('제품 이름').fill('비타민C 세럼');
  await page.getByRole('radio', { name: /스킨케어/ }).check();
  await page.getByRole('button', { name: '속성 선택하기' }).click();
  await expect(page.getByRole('heading', { name: /전성분표/ })).toBeVisible();
  await page.getByRole('checkbox', { name: /비타민C/ }).check();
  await page.getByRole('button', { name: '제품 저장' }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByText('비타민C 세럼')).toBeVisible();
  await expect(page.getByText('중단', { exact: true }).first()).toBeVisible();
});

test('D+7 and D+14 have distinct milestone homes while D+8 keeps the daily home', async ({
  page,
}) => {
  await page.goto('/');

  await page.evaluate(() => {
    const procedureDate = new Date();
    procedureDate.setDate(procedureDate.getDate() - 7);
    const performedAt = [
      procedureDate.getFullYear(),
      String(procedureDate.getMonth() + 1).padStart(2, '0'),
      String(procedureDate.getDate()).padStart(2, '0'),
    ].join('-');

    window.localStorage.setItem(
      'recovery-note:v1',
      JSON.stringify({
        schemaVersion: 2,
        onboarding: { status: 'completed', currentStep: 'complete', completedAt: null },
        profile: { sensitivity: 'normal' },
        procedure: {
          id: 'p1',
          procedureType: 'picotoning',
          performedAt,
          createdAt: new Date().toISOString(),
        },
        products: [],
        checkIns: [],
        consent: null,
      }),
    );
  });

  await page.goto('/home');
  await expect(page.getByRole('heading', { name: '한 주의 회복을 잘 기록했어요.' })).toBeVisible();

  await page.evaluate(() => {
    const session = JSON.parse(window.localStorage.getItem('recovery-note:v1') ?? '{}');
    const procedureDate = new Date();
    procedureDate.setDate(procedureDate.getDate() - 8);
    session.procedure.performedAt = [
      procedureDate.getFullYear(),
      String(procedureDate.getMonth() + 1).padStart(2, '0'),
      String(procedureDate.getDate()).padStart(2, '0'),
    ].join('-');
    window.localStorage.setItem('recovery-note:v1', JSON.stringify(session));
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: '오늘의 회복 안내예요.' })).toBeVisible();

  await page.evaluate(() => {
    const session = JSON.parse(window.localStorage.getItem('recovery-note:v1') ?? '{}');
    const procedureDate = new Date();
    procedureDate.setDate(procedureDate.getDate() - 14);
    session.procedure.performedAt = [
      procedureDate.getFullYear(),
      String(procedureDate.getMonth() + 1).padStart(2, '0'),
      String(procedureDate.getDate()).padStart(2, '0'),
    ].join('-');
    window.localStorage.setItem('recovery-note:v1', JSON.stringify(session));
  });
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '14일의 회복 여정을 잘 마쳤어요.' }),
  ).toBeVisible();
});

test('user can edit the procedure date from profile without mobile overflow', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.setItem(
      'recovery-note:v1',
      JSON.stringify({
        schemaVersion: 2,
        onboarding: { status: 'completed', currentStep: 'complete', completedAt: null },
        profile: { sensitivity: 'normal', nextProcedureAt: '2026-09-01' },
        procedure: {
          id: 'procedure-existing',
          procedureType: 'picotoning',
          performedAt: '2026-08-01',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
        products: [],
        checkIns: [],
        consent: null,
      }),
    );
  });

  await page.goto('/profile');
  await page.getByRole('link', { name: /시술 정보/ }).click();
  await expect(page).toHaveURL(/\/profile\/procedure$/);

  const dateInput = page.getByLabel('시술 날짜');
  await expect(dateInput).toHaveValue('2026-08-01');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  await dateInput.fill('2026-08-02');
  await page.getByLabel('민감한 편').check();
  await page.getByRole('button', { name: '변경사항 저장' }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText('2026-08-02')).toBeVisible();

  const stored = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('recovery-note:v1') ?? '{}'),
  );
  expect(stored.procedure).toMatchObject({
    id: 'procedure-existing',
    performedAt: '2026-08-02',
    createdAt: '2026-08-01T00:00:00.000Z',
  });
  expect(stored.profile).toMatchObject({
    sensitivity: 'high',
    nextProcedureAt: '2026-09-01',
  });
});
