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
  await expect(page.locator('.draft-banner')).toContainText('내부 검증용 룰팩');
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
