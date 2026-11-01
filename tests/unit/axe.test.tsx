import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

import Home from '../../pages/index';
import NotFound from '../../pages/404';
import ServerError from '../../pages/500';
import ContactConfirmed from '../../pages/contact-confirmed';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ContactForm from '../../components/ContactForm';
import StateMessage from '../../components/states/StateMessage';
import Button from '../../components/Button';
import Card from '../../components/Card';

expect.extend(toHaveNoViolations);

// axe walks the whole rendered tree; the homepage is ~1400 lines of markup and
// runs well past the 5s default on a cold cache.
jest.setTimeout(120000);

afterEach(cleanup);

/**
 * What this file does and does not prove.
 *
 * jsdom has no layout engine and no canvas, so axe silently drops every rule
 * that needs a computed box or a rendered pixel. `color-contrast` is the one
 * that matters: it does not appear in the results at all here, not as a pass
 * and not as a violation. Treating a green run as proof of contrast would be
 * reading a rule that never executed.
 *
 * So contrast is pinned twice elsewhere and deliberately not here:
 *   - `contrast.test.tsx` computes WCAG 2.x ratios from the design tokens, so
 *     a token edit that drops a pairing below 4.5:1 fails without a browser.
 *   - `tests/smoke/a11y.spec.ts` runs the real axe `color-contrast` rule in
 *     Chromium against the built CSS, which is the only check that sees what
 *     a visitor actually sees.
 *
 * `assertNoViolations` also asserts that some rule actually applied, because
 * "0 violations" is equally what a harness that ran nothing reports. How many
 * rules apply depends on the markup (a bare card triggers two, the homepage
 * triggers thirty-odd), so the floor here is just "not silent"; the
 * broken-markup test at the bottom of the file is what proves the harness can
 * still fail.
 */
async function assertNoViolations(container: HTMLElement) {
  const results = await axe(container);
  expect(results.passes.length).toBeGreaterThan(0);
  expect(results).toHaveNoViolations();
}

describe('axe finds no violations in', () => {
  test('the homepage', async () => {
    const { container } = render(<Home />);
    await assertNoViolations(container);
  });

  test('the homepage with every FAQ expanded', async () => {
    const { container } = render(<Home />);
    for (const question of screen.getAllByRole('button', { expanded: false })) {
      fireEvent.click(question);
    }
    await assertNoViolations(container);
  });

  test('the header, closed and with the drawer open', async () => {
    const { container } = render(<Header />);
    await assertNoViolations(container);

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await assertNoViolations(container);
  });

  test('the simple header used by the status pages', async () => {
    const { container } = render(<Header simple={true} />);
    await assertNoViolations(container);
  });

  test('the footer', async () => {
    const { container } = render(<Footer />);
    await assertNoViolations(container);
  });

  test('the not-found page', async () => {
    const { container } = render(<NotFound />);
    await assertNoViolations(container);
  });

  test('the server-error page', async () => {
    const { container } = render(<ServerError />);
    await assertNoViolations(container);
  });

  test('the contact confirmation page', async () => {
    const { container } = render(<ContactConfirmed />);
    await assertNoViolations(container);
  });
});

describe('axe finds no violations in the inquiry form', () => {
  test('at rest', async () => {
    const { container } = render(<ContactForm />);
    await assertNoViolations(container);
  });

  test('once the fields validate and the submit button enables', async () => {
    const { container } = render(<ContactForm />);
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Ada Lovelace' } });
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Message/), {
      target: { value: 'A message comfortably past ten characters.' },
    });
    expect(screen.getByRole('button', { name: 'Send Message' })).toBeEnabled();
    await assertNoViolations(container);
  });

  test('while showing a validation error', async () => {
    const { container } = render(<ContactForm />);
    fireEvent.submit(screen.getByRole('button', { name: 'Send Message' }).closest('form')!);
    // role="alert" has to survive an axe pass as well as be announced.
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await assertNoViolations(container);
  });
});

/**
 * WCAG 2.2 1.3.5 Identify Input Purpose (AA). axe's `autocomplete-valid` rule
 * only checks tokens that are present; a field with no autocomplete at all is
 * "inapplicable" to it and passes silently, so the presence of the attribute
 * has to be asserted separately from its validity.
 */
test('fields collecting the visitor’s own details declare their purpose', () => {
  render(<ContactForm />);

  const purposes: Array<[RegExp, string]> = [
    [/^Name/, 'name'],
    [/^Email/, 'email'],
    [/^Discord/, 'nickname'],
  ];

  for (const [label, token] of purposes) {
    expect(screen.getByLabelText(label)).toHaveAttribute('autocomplete', token);
  }

  // The message is free text about a project rather than anything about the
  // person, so no token on the 1.3.5 list applies and inventing one would
  // make a browser offer the wrong saved value.
  expect(screen.getByLabelText(/^Message/)).not.toHaveAttribute('autocomplete');
});

test('the optional Discord field still states the constraint that can reject it', () => {
  render(<ContactForm />);
  // Submission is blocked by an invalid value here even though the label says
  // optional, so the limit has to be programmatically available.
  expect(screen.getByLabelText(/^Discord/)).toHaveAccessibleDescription(
    /two to thirty-two characters/i
  );
});

describe('axe finds no violations in shared primitives', () => {
  // Every tone renders a different role (`alert` vs `status`) and a different
  // icon, so one representative is not enough.
  for (const tone of ['loading', 'error', 'success', 'empty', 'info'] as const) {
    test(`the ${tone} state message, inline and block`, async () => {
      const inline = render(<StateMessage tone={tone} title={`${tone} title`} />);
      await assertNoViolations(inline.container);
      cleanup();

      const block = render(
        <StateMessage
          tone={tone}
          title={`${tone} title`}
          variant="block"
          titleAs="h2"
          description="Extra detail about what happened."
          action={<Button href="/">Return to Homepage</Button>}
        />
      );
      await assertNoViolations(block.container);
    });
  }

  for (const variant of ['primary', 'secondary', 'outline', 'ghost'] as const) {
    test(`the ${variant} button as a button, a link and an external link`, async () => {
      const { container } = render(
        <div>
          <Button variant={variant}>Press me</Button>
          <Button variant={variant} disabled>
            Unavailable
          </Button>
          <Button variant={variant} href="/">
            Internal
          </Button>
          <Button variant={variant} href="https://example.com" external>
            External
          </Button>
        </div>
      );
      await assertNoViolations(container);
    });
  }

  test('a card, with and without hover', async () => {
    const { container } = render(
      <div>
        <Card>
          <h2>Named card</h2>
        </Card>
        <Card hover={false} glowColor="purple">
          <h2>Static card</h2>
        </Card>
      </div>
    );
    await assertNoViolations(container);
  });
});

test('the harness itself fails on markup that is actually broken', async () => {
  // Without this, every assertion above would still pass if jest-axe stopped
  // reporting: a suite that cannot fail is not pinning anything.
  const { container } = render(
    <div>
      <img src="/decorative.png" />
      <button />
      <input type="text" />
    </div>
  );

  const results = await axe(container);
  expect(results.violations.map(violation => violation.id).sort()).toEqual([
    'button-name',
    'image-alt',
    'label',
  ]);
});
