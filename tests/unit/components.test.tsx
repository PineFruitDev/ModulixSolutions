import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Button from '../../components/Button';
import ContactForm from '../../components/ContactForm';

beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn();
});
afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
});

test('button invokes its handler and respects disabled state', () => {
  const click = jest.fn();
  const { rerender } = render(<Button onClick={click}>Continue</Button>);
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(click).toHaveBeenCalledTimes(1);
  rerender(<Button onClick={click} disabled>Continue</Button>);
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(click).toHaveBeenCalledTimes(1);
});

test('external button links isolate the new browsing context', () => {
  render(<Button href="https://example.com" external>Visit</Button>);
  expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');
  expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
});

function fillForm() {
  fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'Test User' } });
  fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'test@example.com' } });
  fireEvent.change(screen.getByLabelText('Message *'), { target: { value: 'A synthetic project inquiry.' } });
}

test('required fields gate submission; Discord remains optional', () => {
  render(<ContactForm />);
  expect(screen.getByRole('button', { name: 'Send Message' })).toBeDisabled();
  fillForm();
  expect(screen.getByRole('button', { name: 'Send Message' })).toBeEnabled();
  fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'invalid' } });
  expect(screen.getByRole('button', { name: 'Send Message' })).toBeDisabled();
  expect(fetch).not.toHaveBeenCalled();
});

test('invalid optional Discord prevents a network request', () => {
  render(<ContactForm />);
  fillForm();
  // Matched loosely: the label now also carries an "(optional)" hint, and this
  // test is about the validation behaviour rather than the wording.
  fireEvent.change(screen.getByLabelText(/Discord Username/), { target: { value: 'x' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
  expect(screen.getByText('Please fill out all required fields correctly.')).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});

test('HTTP failure displays an error and restores the submit control', async () => {
  (fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503, statusText: 'Unavailable' });
  render(<ContactForm />);
  fillForm();
  fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
  expect(await screen.findByText('Failed to send message (503). Please try again.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Send Message' })).toBeEnabled();
  expect(fetch).toHaveBeenCalledTimes(1);
});
