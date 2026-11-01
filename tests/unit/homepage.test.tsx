import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import Home from '../../pages/index';

const BOT_FEATURE_INTERVAL_MS = 7500;

function mockReducedMotion(matches: boolean) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

beforeEach(() => {
  jest.useFakeTimers();
  mockReducedMotion(false);
  // jsdom performs no scrolling and does not implement this at all.
  Element.prototype.scrollIntoView = jest.fn();
});

afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('hero call to action', () => {
  test('it scrolls to the contact section that is actually on the page', () => {
    render(<Home />);

    fireEvent.click(screen.getByRole('button', { name: 'Launch Your Campaign' }));

    // A smooth jump to a section that had been renamed would silently do
    // nothing, so assert the target exists as well as the call.
    expect(document.querySelector('#contact')).toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });
});

describe('feature carousel pointer handling', () => {
  test('hovering the carousel holds the slide and leaving resumes it', () => {
    render(<Home />);
    const carousel = screen.getByRole('group', { name: 'Modulix Bot features' });
    expect(screen.getByText('Feature 1 of 10')).toBeInTheDocument();

    // Reading a card should not have it swapped out mid-sentence.
    fireEvent.mouseEnter(carousel);
    act(() => {
      jest.advanceTimersByTime(BOT_FEATURE_INTERVAL_MS * 3);
    });
    expect(screen.getByText('Feature 1 of 10')).toBeInTheDocument();

    fireEvent.mouseLeave(carousel);
    act(() => {
      jest.advanceTimersByTime(BOT_FEATURE_INTERVAL_MS);
    });
    expect(screen.getByText('Feature 2 of 10')).toBeInTheDocument();
  });

  test('the explicit pause survives the pointer leaving', () => {
    render(<Home />);
    const carousel = screen.getByRole('group', { name: 'Modulix Bot features' });

    fireEvent.click(screen.getByRole('button', { name: 'Pause feature rotation' }));
    fireEvent.mouseEnter(carousel);
    fireEvent.mouseLeave(carousel);

    // Leaving must not quietly undo a choice the user made deliberately.
    act(() => {
      jest.advanceTimersByTime(BOT_FEATURE_INTERVAL_MS * 2);
    });
    expect(screen.getByText('Feature 1 of 10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume feature rotation' })).toBeInTheDocument();
  });

  test('the stepper still works while the rotation is paused', () => {
    render(<Home />);
    fireEvent.click(screen.getByRole('button', { name: 'Pause feature rotation' }));

    fireEvent.click(screen.getByRole('button', { name: 'Next feature' }));
    expect(screen.getByText('Feature 2 of 10')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous feature' }));
    expect(screen.getByText('Feature 1 of 10')).toBeInTheDocument();
  });
});

describe('FAQ disclosure', () => {
  test('an open answer can be closed again', () => {
    render(<Home />);
    const question = screen.getByRole('button', { name: /right community fit/i });

    fireEvent.click(question);
    expect(question).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(question);
    expect(question).toHaveAttribute('aria-expanded', 'false');
  });

  test('answers open independently rather than as an accordion', () => {
    render(<Home />);
    const first = screen.getByRole('button', { name: /right community fit/i });
    const second = screen.getByRole('button', { name: /ad formats stand out/i });

    fireEvent.click(first);
    fireEvent.click(second);

    // Opening one must not collapse another the reader is still comparing.
    expect(first).toHaveAttribute('aria-expanded', 'true');
    expect(second).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(first);
    expect(first).toHaveAttribute('aria-expanded', 'false');
    expect(second).toHaveAttribute('aria-expanded', 'true');
  });

  test('each question controls the answer region it names', () => {
    render(<Home />);
    const question = screen.getByRole('button', { name: /right community fit/i });
    const controls = question.getAttribute('aria-controls') as string;

    fireEvent.click(question);
    const answer = document.getElementById(controls);
    expect(answer).toBeInTheDocument();
    expect(answer).toHaveTextContent(/interest profiles/i);
  });
});
