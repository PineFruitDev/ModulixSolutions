import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import Button from '../../components/Button';
import Card, { SectionContainer } from '../../components/Card';
import Container from '../../components/Container';
import RowContainer from '../../components/RowContainer';
import SectionWrapper from '../../components/SectionWrapper';
import Spinner from '../../components/states/Spinner';
import StateMessage from '../../components/states/StateMessage';

afterEach(cleanup);

describe('Card', () => {
  test('a card without a click handler is not advertised as interactive', () => {
    const { container } = render(<Card>Plain</Card>);
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).not.toContain('cursor-pointer');
    expect(card.className).toContain('card-hover');
  });

  test('a clickable card looks clickable and reports pointer entry and exit', () => {
    const onClick = jest.fn();
    const onMouseEnter = jest.fn();
    const onMouseLeave = jest.fn();
    const { container } = render(
      <Card onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        Pick me
      </Card>
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain('cursor-pointer');

    fireEvent.click(card);
    fireEvent.mouseEnter(card);
    fireEvent.mouseLeave(card);
    expect(onClick).toHaveBeenCalledTimes(1);
    // The homepage carousel pauses on pointer entry, so both have to arrive.
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
  });

  test('opting out of hover drops the lift and the glow', () => {
    const { container } = render(<Card hover={false}>Static</Card>);
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).not.toContain('card-hover');
    expect(card.className).not.toContain('hover:shadow');
  });

  test('each glow colour picks a matching border rather than defaulting to blue', () => {
    const { container: blue } = render(<Card>Blue</Card>);
    expect((blue.firstElementChild as HTMLElement).className).toContain('border-cyber-blue/20');

    const { container: purple } = render(<Card glowColor="purple">Purple</Card>);
    const purpleCard = purple.firstElementChild as HTMLElement;
    expect(purpleCard.className).toContain('border-neon-purple/20');
    expect(purpleCard.className).toContain('hover:shadow-neon-purple/20');

    const { container: mixed } = render(<Card glowColor="mixed">Mixed</Card>);
    const mixedCard = mixed.firstElementChild as HTMLElement;
    expect(mixedCard.className).toContain('hover:shadow-cyber-blue/10');
    expect(mixedCard.className).toContain('hover:shadow-neon-purple/10');
  });

  test('the static section container keeps the card surface without the motion', () => {
    const { container } = render(<SectionContainer className="mt-4">Panel</SectionContainer>);
    const panel = container.firstElementChild as HTMLElement;
    expect(panel.className).toContain('bg-deeper-blue/50');
    expect(panel.className).toContain('mt-4');
    expect(panel.className).not.toContain('card-hover');
    expect(screen.getByText('Panel')).toBeInTheDocument();
  });

  test('both card surfaces render without a className', () => {
    // The default has to be an empty string, not undefined, or it lands in the
    // template literal as the word "undefined" and becomes a bogus class.
    const { container: card } = render(<Card>A</Card>);
    expect((card.firstElementChild as HTMLElement).className).not.toContain('undefined');

    const { container: panel } = render(<SectionContainer>B</SectionContainer>);
    expect((panel.firstElementChild as HTMLElement).className).not.toContain('undefined');
  });
});

describe('layout primitives', () => {
  test('the container keeps its gutters and width cap while accepting overrides', () => {
    const { container } = render(<Container className="py-0">Body</Container>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain('max-w-7xl');
    expect(el.className).toContain('mx-auto');
    // The override has to come last or Tailwind cannot win the specificity tie.
    expect(el.className.trimEnd().endsWith('py-0')).toBe(true);
  });

  test('the container and the row both render without a className', () => {
    const { container: plain } = render(<Container>Body</Container>);
    expect((plain.firstElementChild as HTMLElement).className).not.toContain('undefined');

    const { container: row } = render(<RowContainer>Cells</RowContainer>);
    expect((row.firstElementChild as HTMLElement).className).not.toContain('undefined');
  });

  test('a row stacks on small screens and only becomes a row at md', () => {
    const { container } = render(<RowContainer>Cells</RowContainer>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain('flex-col');
    expect(el.className).toContain('md:flex-row');
  });

  test('a section keeps its id so the nav anchors can find it', () => {
    const { container } = render(<SectionWrapper id="services">Services</SectionWrapper>);
    expect(container.querySelector('section#services')).toBeInTheDocument();
  });

  test('a section can opt out of the scroll reveal and render immediately', () => {
    // The reveal animates from opacity 0, so anything above the fold has to be
    // able to skip it rather than wait for an intersection that already passed.
    const { container } = render(
      <SectionWrapper id="hero" reveal={false}>
        Hero
      </SectionWrapper>
    );
    const section = container.querySelector('section#hero') as HTMLElement;
    expect(section).toBeInTheDocument();
    expect(section.style.opacity).toBe('');
  });
});

describe('Spinner', () => {
  test('it is decorative, since the status region owns the announcement', () => {
    const { container } = render(<Spinner />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('it stops rotating for users who asked for reduced motion', () => {
    const { container } = render(<Spinner />);
    expect((container.firstElementChild as HTMLElement).className).toContain(
      'motion-reduce:animate-none'
    );
  });

  test('every size is a real size, not a silent fall-through to the default', () => {
    const sizes = { sm: 'w-4', md: 'w-6', lg: 'w-10' } as const;
    (Object.keys(sizes) as Array<keyof typeof sizes>).forEach(size => {
      const { container, unmount } = render(<Spinner size={size} />);
      expect((container.firstElementChild as HTMLElement).className).toContain(sizes[size]);
      unmount();
    });
  });
});

describe('StateMessage inline variant', () => {
  test('a full-page loading state gets the large spinner', () => {
    const { container } = render(
      <StateMessage tone="loading" variant="block" title="Loading" />
    );
    // The inline spinner is 16px, which disappears on a centred empty page.
    expect(container.querySelector('[aria-hidden="true"]')?.className).toContain('w-10');
  });

  test('an inline message still carries its description and action', () => {
    render(
      <StateMessage
        tone="error"
        title="Could not send"
        description="Check the address and try again."
        action={<button type="button">Retry</button>}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Could not send');
    expect(screen.getByText('Check the address and try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('Button as a link', () => {
  test('an internal href renders a link, not a button', () => {
    // A button inside an anchor is invalid markup, and a nested interactive
    // element is announced twice.
    render(<Button href="/#services">Browse services</Button>);
    const link = screen.getByRole('link', { name: 'Browse services' });
    expect(link).toHaveAttribute('href', '/#services');
    expect(link.querySelector('button')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('an internal link is not given a new browsing context', () => {
    render(<Button href="/#contact">Get in touch</Button>);
    const link = screen.getByRole('link');
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
  });

  test('a disabled link is styled as disabled and does not animate', () => {
    // An anchor cannot carry the disabled attribute, so the only signal is the
    // class, and the hover/tap scaling has to be suppressed by hand.
    const { rerender } = render(
      <Button href="/#services" disabled>
        Browse services
      </Button>
    );
    expect(screen.getByRole('link').className).toContain('disabled:pointer-events-none');

    rerender(
      <Button href="https://example.com" external disabled>
        Visit
      </Button>
    );
    const external = screen.getByRole('link');
    expect(external).toHaveAttribute('rel', 'noopener noreferrer');
    expect(external.className).toContain('disabled:pointer-events-none');
  });

  test('an icon can lead or trail the label without changing the accessible name', () => {
    const icon = <svg data-testid="icon" aria-hidden="true" />;
    const { rerender } = render(<Button icon={icon}>Send</Button>);
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();

    rerender(
      <Button icon={icon} iconPosition="right">
        Send
      </Button>
    );
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  test('a submit button keeps its form semantics', () => {
    render(<Button type="submit">Send Message</Button>);
    expect(screen.getByRole('button', { name: 'Send Message' })).toHaveAttribute('type', 'submit');
  });
});
