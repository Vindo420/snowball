import { test, expect } from '@playwright/test';

test('POST /api/campaigns with no session returns 401', async ({ request }) => {
  const res = await request.post('/api/campaigns', {
    data: { name: 'Should Be Rejected', slug: 'should-be-rejected' },
  });
  expect(res.status()).toBe(401);
});
