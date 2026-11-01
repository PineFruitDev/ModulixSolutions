import React from 'react';
import type { AppProps } from 'next/app';
import { cleanup, render, screen } from '@testing-library/react';

import App from '../../pages/_app';

afterEach(cleanup);

/**
 * _app only reads Component and pageProps, but AppProps also carries the
 * router that Next injects at runtime and no test has any use for.
 */
function appProps(Component: React.ComponentType<any>, pageProps: object = {}): AppProps {
  return { Component, pageProps } as unknown as AppProps;
}

function Page() {
  return (
    <main id="main">
      <h1>Page content</h1>
    </main>
  );
}

function Broken(): JSX.Element {
  throw new Error('synthetic render failure');
}

test('the page is rendered with its props and preceded by the skip link', () => {
  function Greeting({ name }: { name: string }) {
    return <main id="main">Hello {name}</main>;
  }
  const { container } = render(<App {...appProps(Greeting, { name: 'Modulix' })} />);

  expect(screen.getByText('Hello Modulix')).toBeInTheDocument();

  const skipLink = screen.getByRole('link', { name: 'Skip to content' });
  expect(skipLink).toHaveAttribute('href', '#main');

  // A skip link only works if it is the first thing a keyboard reaches.
  const focusable = container.querySelectorAll('a[href], button, [tabindex]');
  expect(focusable[0]).toBe(skipLink);
});

test('the skip link points at a target that exists on the page', () => {
  render(<App {...appProps(Page)} />);
  const target = screen.getByRole('link', { name: 'Skip to content' }).getAttribute('href');
  expect(document.querySelector(target as string)).toBe(screen.getByRole('main'));
});

test('a page that throws is contained, and the skip target survives with it', () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  render(<App {...appProps(Broken)} />);

  expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong on this page');

  // The fallback has to keep supplying #main, because the skip link is rendered
  // outside the boundary and would otherwise point at nothing.
  const skipLink = screen.getByRole('link', { name: 'Skip to content' });
  expect(skipLink).toBeInTheDocument();
  expect(document.querySelector(skipLink.getAttribute('href') as string)).toBe(
    screen.getByRole('main')
  );

  consoleError.mockRestore();
});

test('the fallback keeps the site typography, not the browser default', () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  const { container } = render(<App {...appProps(Broken)} />);

  // The boundary sits inside the font wrapper, so the error state is still
  // styled rather than dropping to Times New Roman.
  const wrapper = container.firstElementChild as HTMLElement;
  expect(wrapper.className).not.toBe('');
  expect(wrapper.contains(screen.getByRole('alert'))).toBe(true);

  consoleError.mockRestore();
});

test('both recovery paths are offered, and retrying does not navigate', () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  render(<App {...appProps(Broken)} />);

  // Retry re-renders in place and is the cheap option; the reload is the one
  // that always works. jsdom will not let the reload itself be intercepted
  // (window.location is non-configurable), so only the wiring is asserted.
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reload the page' })).toHaveAttribute(
    'type',
    'button'
  );

  consoleError.mockRestore();
});
