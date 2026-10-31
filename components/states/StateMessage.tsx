import React from 'react';
import { AlertTriangle, CheckCircle, Inbox, Info } from 'lucide-react';

import Spinner from './Spinner';

export type StateTone = 'loading' | 'error' | 'empty' | 'success' | 'info';

const tones = {
  loading: {
    Icon: null,
    surface: 'bg-cyber-blue/10 border-cyber-blue/30',
    accent: 'text-cyber-blue',
  },
  error: {
    Icon: AlertTriangle,
    surface: 'bg-red-950/50 border-red-500/40',
    accent: 'text-red-300',
  },
  success: {
    Icon: CheckCircle,
    surface: 'bg-green-950/50 border-green-500/40',
    accent: 'text-green-300',
  },
  empty: {
    Icon: Inbox,
    surface: 'bg-deeper-blue/50 border-cyber-blue/20',
    accent: 'text-cyber-blue',
  },
  info: {
    Icon: Info,
    surface: 'bg-deeper-blue/50 border-cyber-blue/20',
    accent: 'text-cyber-blue',
  },
} as const;

interface StateMessageProps {
  tone: StateTone;
  /** Short, specific summary. This is what assistive technology announces. */
  title: string;
  description?: React.ReactNode;
  /** Recovery control, such as a retry button or a link out of the dead end. */
  action?: React.ReactNode;
  /** `inline` sits inside a form or card; `block` fills an empty section. */
  variant?: 'inline' | 'block';
  /** Promote the title to a heading when this message is the page's subject. */
  titleAs?: 'p' | 'h1' | 'h2';
  className?: string;
}

/**
 * The single presentation for loading, error, empty and success states. Error
 * tones interrupt with `role="alert"`; everything else is announced politely so
 * a background refresh never talks over the user.
 *
 * Keying the region on the tone matters: screen readers decide how a live
 * region behaves when it enters the accessibility tree and do not re-read a
 * `role` that changes in place. Without the key, React would reuse the
 * "Sending..." node for the failure that follows it and the error would never
 * interrupt. No `aria-busy` here for the same reason, since it suppresses the
 * announcement of the very text this region exists to deliver.
 */
export default function StateMessage({
  tone,
  title,
  description,
  action,
  variant = 'inline',
  titleAs: Title = 'p',
  className = '',
}: StateMessageProps) {
  const { Icon, surface, accent } = tones[tone];
  const isError = tone === 'error';
  const isBlock = variant === 'block';

  const icon = Icon ? (
    <Icon className={`${isBlock ? 'w-8 h-8' : 'w-5 h-5'} flex-shrink-0 ${accent}`} aria-hidden="true" />
  ) : (
    <Spinner size={isBlock ? 'lg' : 'sm'} />
  );

  return (
    <div
      key={tone}
      role={isError ? 'alert' : 'status'}
      className={`border rounded-lg backdrop-blur-sm ${surface} ${
        isBlock ? 'p-10 text-center' : 'p-3'
      } ${className}`}
    >
      <div
        className={
          isBlock ? 'flex flex-col items-center gap-3' : 'flex items-center justify-center gap-2'
        }
      >
        {icon}
        <Title className={`${isBlock ? 'text-xl font-bold text-white' : `text-sm ${accent}`}`}>
          {title}
        </Title>
      </div>

      {description && (
        <p
          className={`text-gray-300 ${
            isBlock ? 'mt-3 max-w-xl mx-auto leading-relaxed' : 'mt-1 text-sm text-center'
          }`}
        >
          {description}
        </p>
      )}

      {action && <div className={isBlock ? 'mt-6' : 'mt-3 flex justify-center'}>{action}</div>}
    </div>
  );
}
