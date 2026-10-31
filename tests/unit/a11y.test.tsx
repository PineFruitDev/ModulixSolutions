import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Button from '../../components/Button';
import Home from '../../pages/index';

afterEach(cleanup);

test('header exposes a landmark, a named menu button, and a sized logo', () => {
  const { container } = render(<Header />);
  expect(screen.getByRole('banner')).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
  const logo = container.querySelector('img');
  expect(logo).toHaveAttribute('src', '/modulix-icon-128.png');
  expect(logo).toHaveAttribute('width', '56');
  expect(logo).toHaveAttribute('height', '56');
});

test('footer logo reserves its layout size', () => {
  const { container } = render(<Footer />);
  expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  const logo = container.querySelector('img');
  expect(logo).toHaveAttribute('width', '56');
  expect(logo).toHaveAttribute('height', '56');
  expect(screen.getByRole('link', { name: 'Join our Discord' })).toBeInTheDocument();
});

test('primary actions use a dark background so white text stays readable', () => {
  render(<Button>Launch</Button>);
  expect(screen.getByRole('button', { name: 'Launch' }).className).toContain('from-purple-800');
  expect(screen.getByRole('button', { name: 'Launch' }).className).toContain('to-blue-800');
});

test('homepage paints the title, sizes logos, and toggles FAQ from the keyboard', () => {
  const { container } = render(<Home />);
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  expect(screen.getByRole('heading', { level: 1, name: /MODULIX SOLUTIONS/ })).toBeInTheDocument();
  expect(container.innerHTML).not.toContain('unsplash');
  expect(container.innerHTML).not.toContain('background-attachment');
  const logo = container.querySelector('img[src="/companies/readyup-logo.png"]') as HTMLImageElement;
  expect(logo).toHaveAttribute('width', '256');
  expect(logo).toHaveAttribute('height', '256');
  expect(screen.getByRole('link', { name: 'ReadyUp' })).toHaveAttribute('href', 'https://getreadyup.com');

  const question = screen.getByRole('button', { name: /right community fit/i });
  expect(question).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(question);
  expect(question).toHaveAttribute('aria-expanded', 'true');
});

test('fonts and section backgrounds are not render-blocking third-party requests', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'styles/globals.css'), 'utf8');
  const app = fs.readFileSync(path.join(process.cwd(), 'pages/_app.tsx'), 'utf8');
  expect(css).not.toContain('fonts.googleapis.com');
  expect(css).not.toContain('background-attachment');
  expect(app).toContain('Skip to content');
  expect(app).toContain("display: 'swap'");
});
