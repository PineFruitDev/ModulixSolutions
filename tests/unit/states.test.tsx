import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import StateMessage from '../../components/states/StateMessage';
import ErrorBoundary from '../../components/ErrorBoundary';
import CompanyLogo from '../../components/CompanyLogo';
import ContactForm from '../../components/ContactForm';
import Custom404 from '../../pages/404';
import Custom500 from '../../pages/500';
import ContactConfirmed from '../../pages/contact-confirmed';

afterEach(cleanup);

describe('StateMessage', () => {
  test('errors interrupt; every other tone is announced politely', () => {
    const { rerender } = render(<StateMessage tone="error" title="Could not send" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not send');

    rerender(<StateMessage tone="success" title="Sent" />);
    expect(screen.getByRole('status')).toHaveTextContent('Sent');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('changing tone remounts the live region rather than relabelling it', () => {
    // Screen readers decide how a live region behaves when it enters the
    // accessibility tree, so a role rewritten on a surviving node is not
    // announced. The loading-then-error transition is the one that matters.
    const { rerender } = render(<StateMessage tone="loading" title="Sending..." />);
    const loadingNode = screen.getByRole('status');

    rerender(<StateMessage tone="error" title="Could not send" />);
    expect(screen.getByRole('alert')).not.toBe(loadingNode);
    expect(loadingNode).not.toBeInTheDocument();
  });

  test('nothing marks the announcing region busy', () => {
    // aria-busy suppresses announcement of the text the region exists to read.
    render(<StateMessage tone="loading" title="Sending..." />);
    expect(screen.getByRole('status')).not.toHaveAttribute('aria-busy');
  });

  test('the title can be promoted to a heading when it is the page subject', () => {
    render(<StateMessage tone="error" variant="block" titleAs="h1" title="Page broke" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page broke');
  });

  test('the spinner adds no text of its own to the announcement', () => {
    render(<StateMessage tone="loading" title="Sending..." />);
    expect(screen.getByRole('status')).toHaveTextContent(/^Sending\.\.\.$/);
  });

  test('the block variant carries a description and a way out', () => {
    render(
      <StateMessage
        tone="empty"
        variant="block"
        title="Nothing here yet"
        description="Check back soon."
        action={<button type="button">Reload</button>}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent('Nothing here yet');
    expect(screen.getByText('Check back soon.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });
});

describe('ErrorBoundary', () => {
  function Boom({ explode }: { explode: boolean }) {
    if (explode) throw new Error('synthetic render failure');
    return <p>Working content</p>;
  }

  test('a render error is contained, explained and recoverable', () => {
    // React reports the caught error on the console; keep the suite output clean.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = render(
      <ErrorBoundary>
        <Boom explode={true} />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong on this page');
    // The fallback replaces the whole document, so it has to supply the
    // landmark and heading the failed page no longer provides.
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Something went wrong on this page'
    );
    expect(screen.getByRole('button', { name: 'Reload the page' })).toBeInTheDocument();
    expect(screen.queryByText('Working content')).toBeNull();

    rerender(
      <ErrorBoundary>
        <Boom explode={false} />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Working content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();

    consoleError.mockRestore();
  });
});

describe('CompanyLogo', () => {
  test('a logo that fails to load degrades to exactly one monogram', () => {
    const props = { displayName: 'CHARTIS', logoUrl: '/companies/chartis-logo.png' };
    const { container, rerender } = render(<CompanyLogo {...props} />);

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    fireEvent.error(img!);
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('C');

    // A fallback appended outside React would stack a second monogram here,
    // because the carousel re-renders continuously.
    rerender(<CompanyLogo {...props} />);
    expect(container.textContent).toBe('C');
  });

  test('a missing logo renders the monogram without requesting an image', () => {
    const { container } = render(<CompanyLogo displayName="READYUP" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('R');
  });

  test('the mark is decorative, since the company name is rendered beside it', () => {
    const { container } = render(<CompanyLogo displayName="READYUP" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).toBeNull();
  });
});

describe('status pages', () => {
  test('the not-found page states what happened and offers crawlable exits', () => {
    render(<Custom404 />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('404 Error - Page Not Found');

    const home = screen.getByRole('link', { name: /Return to Homepage/ });
    expect(home).toHaveAttribute('href', '/');
    // A button nested inside an anchor is invalid markup and was what the
    // previous `<Link><Button/></Link>` pairing produced.
    expect(home.querySelector('button')).toBeNull();

    expect(screen.getByRole('link', { name: /Browse services/ })).toHaveAttribute(
      'href',
      '/#services'
    );
    expect(screen.getByRole('link', { name: /Get in touch/ })).toHaveAttribute('href', '/#contact');
  });

  test('the server error page explains the failure and links home', () => {
    render(<Custom500 />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Something Went Wrong');
    expect(screen.getByRole('link', { name: /Return to Homepage/ })).toHaveAttribute('href', '/');
  });

  test('the confirmation page keeps its heading and its exits', () => {
    render(<ContactConfirmed />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("We'll Contact You Soon");
    expect(screen.getByRole('link', { name: /Return to Homepage/ })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Browse services/ })).toHaveAttribute(
      'href',
      '/#services'
    );
  });
});

describe('contact form status', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  function fillForm() {
    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Message *'), {
      target: { value: 'A synthetic project inquiry.' },
    });
  }

  test('a transient error retires itself after five seconds', async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503, statusText: 'Unavailable' });
    render(<ContactForm />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to send message (503). Please try again.'
    );

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('a success stays on screen through the redirect timer', async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    render(<ContactForm />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    // The in-flight state is announced through the same region, so wait on the
    // message rather than on the role.
    expect(await screen.findByText('Message sent successfully! Redirecting...')).toBeInTheDocument();

    // jsdom cannot replace window.location or implement the navigation it
    // triggers, so the redirect itself is asserted in the browser smoke test
    // and the resulting console error is muted here.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    // The old cleanup compared against a stale copy of the message and so
    // cleared the wrong one; the success must survive the five-second timer.
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Message sent successfully! Redirecting...');

    consoleError.mockRestore();
  });

  // Both branches below deliberately report success without proof of delivery,
  // because the provider can reject the fetch on CORS while still sending the
  // mail. They are pinned so the behaviour cannot change by accident.
  test('an unreadable body on a 2xx is still treated as delivered', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input');
      },
    });
    render(<ContactForm />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    expect(await screen.findByText('Message sent successfully! Redirecting...')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('a rejected fetch is still treated as delivered', async () => {
    (fetch as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    render(<ContactForm />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    expect(await screen.findByText('Message sent successfully! Redirecting...')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    consoleWarn.mockRestore();
  });

  test('a repeated identical failure gets its full five seconds', async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503, statusText: 'Unavailable' });
    render(<ContactForm />);
    fillForm();

    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(4500);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    // The first error's timer fires here and must not clear the second one.
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to send message (503)');
  });

  test('a rejected payload surfaces the provider message as an error', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, message: 'Spam detected.' }),
    });
    render(<ContactForm />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Spam detected.');
    expect(screen.getByRole('button', { name: 'Send Message' })).toBeEnabled();
  });
});
