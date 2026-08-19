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
  await page.getByRole('button', { name: '제품 없이 넘어가기' }).click();
  await page.getByLabel('잘 모르겠어요').check();
  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.getByRole('heading', { name: '회복 관리 준비가 끝났어요.' })).toBeVisible();
  await page.getByRole('button', { name: /회복 관리 시작/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText('Picotoning · D+0', { exact: true })).toBeVisible();
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
  const bottomNav = page.getByRole('navigation', { name: '하단 탐색' });
  await expect(bottomNav).toBeVisible();
  await bottomNav.getByRole('link', { name: '내 제품' }).click();
  await expect(page).toHaveURL(/\/products$/);
});

test('user can register a skincare product with a v6 ingredient group', async ({ page }) => {
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

const isoDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

type SeedOptions = {
  daysAgo?: number;
  profile?: Record<string, unknown>;
  products?: unknown[];
  checkIns?: unknown[];
};

const seed = (page: import('@playwright/test').Page, options: SeedOptions = {}) =>
  page.addInitScript((seedOptions: SeedOptions) => {
    const performedAt = (() => {
      const date = new Date();
      date.setDate(date.getDate() - (seedOptions.daysAgo ?? 0));
      return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-');
    })();
    window.localStorage.setItem(
      'recovery-note:v1',
      JSON.stringify({
        profile: seedOptions.profile ?? { sensitivity: 'normal' },
        procedure: {
          id: 'p1',
          procedureType: 'picotoning',
          performedAt,
          createdAt: new Date().toISOString(),
        },
        products: seedOptions.products ?? [],
        checkIns: seedOptions.checkIns ?? [],
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
  }, options);

test('after the D+14 window home shows the completion screen and still reaches check-in', async ({
  page,
}) => {
  await seed(page, { daysAgo: 20 });

  await page.goto('/home');
  await expect(
    page.getByRole('heading', { name: '14일의 회복 여정을 잘 마쳤어요.' }),
  ).toBeVisible();
  await expect(page.getByText('Picotoning · D+20', { exact: true })).toBeVisible();

  // 회복 완료 화면에서도 상태 체크로 갈 수 있어야 합니다.
  await page.getByRole('link', { name: '상태 체크 시작' }).click();
  await expect(page).toHaveURL(/\/check-in$/);
});

test('within the window home keeps the daily guidance screen', async ({ page }) => {
  await seed(page, { daysAgo: 10 });

  await page.goto('/home');
  await expect(page.getByText('Picotoning · D+10', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '오늘의 회복 안내예요.' })).toBeVisible();
});

test('D+7 shows the first-week recovery milestone', async ({ page }) => {
  await seed(page, { daysAgo: 7 });
  await page.goto('/home');
  await expect(page.getByRole('heading', { name: '한 주의 회복을 잘 기록했어요.' })).toBeVisible();
});

test('D+14 shows the completed recovery milestone', async ({ page }) => {
  await seed(page, { daysAgo: 14 });
  await page.goto('/home');
  await expect(
    page.getByRole('heading', { name: '14일의 회복 여정을 잘 마쳤어요.' }),
  ).toBeVisible();
});

test('procedure date can be edited without losing the next appointment', async ({ page }) => {
  await seed(page, {
    daysAgo: 3,
    profile: { sensitivity: 'normal', nextProcedureAt: '2026-12-01' },
  });

  await page.goto('/profile');
  await page.getByRole('link', { name: /시술 정보/ }).click();
  await expect(page).toHaveURL(/\/profile\/procedure$/);

  await page.getByLabel('시술 날짜').fill(isoDaysAgo(1));
  await page.getByRole('button', { name: '변경사항 저장' }).click();
  await expect(page).toHaveURL(/\/profile$/);

  const stored = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('recovery-note:v1') ?? '{}'),
  );
  expect(stored.procedure.performedAt).toBe(isoDaysAgo(1));
  expect(stored.procedure.id).toBe('p1');
  expect(stored.profile.nextProcedureAt).toBe('2026-12-01');
});

test('product can be edited in place instead of deleted and re-added', async ({ page }) => {
  await seed(page, {
    daysAgo: 2,
    products: [
      {
        id: 'prod-1',
        name: '기존 세럼',
        category: 'skincare',
        ruleSelection: {
          ingredientGroupIds: ['niacinamide'],
          cleansingMethodIds: [],
          baseMakeupIds: [],
        },
        attributeIds: ['niacinamide'],
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
    ],
  });

  await page.goto('/products/prod-1');
  await page.getByRole('link', { name: /제품 수정/ }).click();
  await expect(page).toHaveURL(/\/products\/prod-1\/edit$/);

  // 기존 값이 초기값으로 들어와야 합니다.
  await expect(page.getByLabel('제품 이름')).toHaveValue('기존 세럼');
  await page.getByLabel('제품 이름').fill('이름 바꾼 세럼');
  await page.getByRole('button', { name: '속성 선택하기' }).click();
  await expect(
    page.getByRole('checkbox', { name: /^나이아신아마이드 성분표/ }),
  ).toBeChecked();
  await page.getByRole('button', { name: '변경 저장' }).click();

  await expect(page).toHaveURL(/\/products\/prod-1$/);
  await expect(page.getByRole('heading', { name: '이름 바꾼 세럼' })).toBeVisible();

  const stored = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('recovery-note:v1') ?? '{}'),
  );
  expect(stored.products).toHaveLength(1);
  expect(stored.products[0].id).toBe('prod-1');
  expect(stored.products[0].createdAt).toBe('2026-07-01T00:00:00.000Z');
});

test('calendar opens the check-in record for a checked day', async ({ page }) => {
  const checkedAt = new Date();
  checkedAt.setHours(12, 0, 0, 0);
  await seed(page, {
    daysAgo: 1,
    checkIns: [
      {
        id: 'check-1',
        checkedAt: checkedAt.toISOString(),
        procedureDay: 1,
        answers: [{ symptomId: 'redness', present: false }],
        rulePackVersion: '6.0.0',
      },
    ],
  });

  await page.goto('/records');
  await page.getByRole('button', { name: /피부 체크한 날, 기록 보기/ }).click();
  await expect(page).toHaveURL(/\/check-in\/result\?id=check-1$/);
});

test.describe('home uses the browser local calendar date', () => {
  test.use({ timezoneId: 'Asia/Seoul' });

  test('does not treat a previous-day check-in as today at KST 00:30', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-08-18T15:30:00.000Z') });
    await seed(page, {
      daysAgo: 1,
      checkIns: [
        {
          id: 'check-yesterday',
          // 2026-08-18 23:30 KST. Its UTC date matches the frozen current UTC date,
          // but its browser-local calendar date is the previous day.
          checkedAt: '2026-08-18T14:30:00.000Z',
          procedureDay: 1,
          answers: [{ symptomId: 'redness', present: false }],
          rulePackVersion: '6.0.0',
        },
      ],
    });

    await page.goto('/home');
    await expect(page.getByText('최대 5개 항목을 직접 확인해요.')).toBeVisible();
    await expect(page.getByRole('link', { name: '상태 체크 시작' })).toBeVisible();
  });

  test('marks an earlier check-in on the same local day as complete', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-08-19T00:30:00.000Z') });
    await seed(page, {
      daysAgo: 1,
      checkIns: [
        {
          id: 'check-today',
          // 2026-08-19 05:00 KST. Its UTC date differs from the frozen current UTC date,
          // while both timestamps are on the same browser-local calendar date.
          checkedAt: '2026-08-18T20:00:00.000Z',
          procedureDay: 1,
          answers: [{ symptomId: 'redness', present: false }],
          rulePackVersion: '6.0.0',
        },
      ],
    });

    await page.goto('/home');
    await expect(page.getByText('오늘 기록을 완료했어요.')).toBeVisible();
    await expect(page.getByRole('link', { name: '다시 체크하기' })).toBeVisible();
  });
});

test('failed check-in keeps answers and retry stores exactly one record', async ({ page }) => {
  await seed(page, { daysAgo: 1 });
  await page.goto('/check-in');

  const firstPresentButton = page.getByRole('button', { name: '있어요' }).first();
  await firstPresentButton.click();
  await expect(firstPresentButton).toHaveAttribute('aria-pressed', 'true');

  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem;
    Object.defineProperty(window, '__restoreLocalStorageSetItem', {
      configurable: true,
      value: () => {
        Storage.prototype.setItem = originalSetItem;
      },
    });
    Storage.prototype.setItem = () => {
      throw new DOMException('Simulated storage failure', 'QuotaExceededError');
    };
  });

  await page.getByRole('button', { name: '체크 완료' }).click();
  await expect(page.locator('.sticky-actions').getByRole('alert')).toContainText(
    '선택한 내용은 이 화면에 그대로 있어요.',
  );
  await expect(firstPresentButton).toHaveAttribute('aria-pressed', 'true');

  await page.evaluate(() => {
    const restore = (window as typeof window & { __restoreLocalStorageSetItem?: () => void })
      .__restoreLocalStorageSetItem;
    restore?.();
  });
  await page.getByRole('button', { name: '체크 완료' }).click();
  await expect(page).toHaveURL(/\/check-in\/result$/);

  const storedCheckIns = await page.evaluate(() => {
    const session = JSON.parse(window.localStorage.getItem('recovery-note:v1') ?? '{}');
    return session.checkIns ?? [];
  });
  expect(storedCheckIns).toHaveLength(1);
});

test('home shows an empty-product state that is distinct from an unknown verdict', async ({
  page,
}) => {
  await seed(page, { daysAgo: 1, products: [] });

  await page.goto('/home');
  await expect(page.getByText('제품을 등록해 주세요').first()).toBeVisible();
  await expect(page.getByText('등록 필요').first()).toBeVisible();
  const registerLink = page.getByRole('link', { name: '내 제품 등록하기' });
  await expect(registerLink).toBeVisible();
  await expect(registerLink).toHaveAttribute('href', '/products');
});

test('rule-pack version is not exposed on the home or profile screens', async ({ page }) => {
  await seed(page, {
    daysAgo: 1,
    products: [
      {
        id: 'prod-1',
        name: '기존 세럼',
        category: 'skincare',
        ruleSelection: {
          ingredientGroupIds: ['niacinamide'],
          cleansingMethodIds: [],
          baseMakeupIds: [],
        },
        attributeIds: ['niacinamide'],
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
    ],
  });

  await page.goto('/home');
  await expect(page.getByText(/룰팩/)).toHaveCount(0);
  await expect(
    page.getByText('이 안내는 입력한 시술일과 제품 정보를 바탕으로 정리했어요.'),
  ).toBeVisible();

  await page.goto('/profile');
  await expect(page.getByText(/룰팩/)).toHaveCount(0);
});
