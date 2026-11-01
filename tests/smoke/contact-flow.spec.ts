import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * The inquiry flow past its happy path, which pages.spec.ts already covers.
 *
 * The status machine itself is unit-tested in tests/unit/states.test.tsx with a
 * stubbed fetch and fake timers, and is not repeated here. What is left for a
 * browser is everything jsdom cannot do honestly: the navigation a success
 * triggers, a failure leaving the visitor on the page with their typing intact
 * and a retry that then lands, and whether a real double-click can get two
 * inquiries out of one form. Every response below is synthetic and no real
 * inquiry is ever submitted.
 */

const ENDPOINT = 'https://api.web3forms.com/submit';

const INQUIRY = {
  name: 'Smoke Tester',
  email: 'smoke@example.com',
  message: 'Synthetic test inquiry only.',
};

test.beforeEach(async ({ page }) => {
  // Fail closed: no external traffic, including accidental real submissions.
  // The endpoint route each test adds is registered after this one and so is
  // matched first.
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    return route.abort();
  });
});

const fillInquiry = async (page: Page) => {
  await page.getByLabel('Name *', { exact: true }).fill(INQUIRY.name);
  await page.getByLabel('Email *', { exact: true }).fill(INQUIRY.email);
  await page.getByLabel('Message *', { exact: true }).fill(INQUIRY.message);
};

const send = (page: Page) => page.getByRole('button', { name: 'Send Message' });

/**
 * The form's own status region. Scoped to the contact section because Next's
 * route announcer is also `role="alert"`, so a page-wide query matches two
 * elements and fails strict mode.
 */
const formAlert = (page: Page) => page.locator('#contact').getByRole('alert');

test('a failed inquiry keeps what was typed, and the retry reaches confirmation', async ({
  page,
}) => {
  let attempts = 0;
  await page.route(ENDPOINT, async route => {
    attempts++;
    if (attempts === 1) {
      return route.fulfill({ status: 503, json: { success: false } });
    }
    return route.fulfill({ json: { success: true } });
  });

  await page.goto('/');
  await fillInquiry(page);
  await send(page).click();

  await expect(formAlert(page)).toContainText('Failed to send message (503)');

  // The form is only reset once the inquiry has actually landed. Clearing it on
  // failure would make a provider outage cost the visitor their message, and
  // they would have to retype it to retry.
  await expect(page.getByLabel('Name *', { exact: true })).toHaveValue(INQUIRY.name);
  await expect(page.getByLabel('Email *', { exact: true })).toHaveValue(INQUIRY.email);
  await expect(page.getByLabel('Message *', { exact: true })).toHaveValue(INQUIRY.message);

  // Still on the homepage: a failure must not redirect to the confirmation and
  // tell someone their inquiry arrived when it did not.
  await expect(page).toHaveURL(/127\.0\.0\.1:3100\/$/);

  // Retrying from that state, without retyping, gets through. The error
  // retires itself after five seconds, so this click is deliberately the next
  // thing that happens.
  await send(page).click();
  await expect(page).toHaveURL(/\/contact-confirmed\/?$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText("We'll Contact You Soon");
  expect(attempts).toBe(2);
});

test('double-clicking Send submits one inquiry, not two', async ({ page }) => {
  let posts = 0;
  let release = () => {};
  const held = new Promise<void>(resolve => {
    release = resolve;
  });

  // The response is held open so the second click of the double-click lands
  // while the first request is genuinely still in flight. With fake timers in
  // jsdom there is no window in which that race can be observed at all.
  await page.route(ENDPOINT, async route => {
    posts++;
    await held;
    await route.fulfill({ json: { success: true } });
  });

  await page.goto('/');
  await fillInquiry(page);
  await send(page).dblclick();

  // Both halves of the guard: the control says what it is doing, and it is
  // disabled while it does it. The second click arrives here and is refused.
  // Soft, because the count below is the assertion that actually matters and
  // a failure should report both rather than stopping at the symptom.
  await expect.soft(page.getByRole('button', { name: 'Sending...' })).toBeDisabled();

  release();
  await expect(page).toHaveURL(/\/contact-confirmed\/?$/);
  expect(posts).toBe(1);
});

test('an unusable Discord username stops the inquiry before it is sent', async ({ page }) => {
  let posts = 0;
  await page.route(ENDPOINT, async route => {
    posts++;
    await route.fulfill({ json: { success: true } });
  });

  await page.goto('/');
  await fillInquiry(page);
  // Optional, but validated when filled in: under two characters fails the
  // check the submit handler runs.
  await page.getByLabel(/Discord Username/).fill('x');

  // Discord is left out of the rule that disables Send, so unlike the required
  // fields it does not gate the control: the button invites a submission that
  // the handler then refuses. The message it refuses with talks about required
  // fields, which is not what went wrong, and that is worth tightening
  // separately. What is pinned here is the part that matters for the flow:
  // nothing is sent, and the visitor is told and kept on the page with their
  // message still in the box.
  await expect(send(page)).toBeEnabled();
  await send(page).click();

  await expect(formAlert(page)).toContainText(/required fields/i);
  await expect(page).toHaveURL(/127\.0\.0\.1:3100\/$/);
  await expect(page.getByLabel('Message *', { exact: true })).toHaveValue(INQUIRY.message);
  expect(posts).toBe(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  // The whole flow on the viewport where the nav is a drawer, the field grid
  // collapses to one column and the submit button goes full width. The pieces
  // are covered separately; this is the one case that walks the entire path a
  // visitor on a phone takes.
  test('a visitor reaches the form from the drawer and gets confirmed', async ({ page }) => {
    let posts = 0;
    await page.route(ENDPOINT, async route => {
      posts++;
      await route.fulfill({ json: { success: true } });
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page
      .getByRole('navigation', { name: 'Mobile' })
      .getByRole('link', { name: 'Contact', exact: true })
      .click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.locator('#contact')).toBeInViewport();

    await fillInquiry(page);
    await send(page).click();

    await expect(page).toHaveURL(/\/contact-confirmed\/?$/);
    expect(posts).toBe(1);
  });
});
