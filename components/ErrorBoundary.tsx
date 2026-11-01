import { logEvent } from '../lib/logger';
import React from 'react';

import Button from './Button';
import StateMessage from './states/StateMessage';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Last line of defence for client-side rendering errors. Without it, a throw in
 * any component unmounts the whole tree and the visitor is left on a blank
 * page. This is the only error surface that actually fires on a static export,
 * since the host never runs our code and so never serves 500.html.
 */
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    logEvent('render_error');
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  // A client-side link to "/" is a no-op when the error happened on "/", which
  // is most of this site. A document reload is the recovery that always works.
  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main
        id="main"
        className="min-h-screen bg-darkest-navy flex items-center justify-center px-4 py-20"
      >
        <StateMessage
          variant="block"
          tone="error"
          titleAs="h1"
          title="Something went wrong on this page"
          description="An unexpected error stopped part of the page from rendering. Trying again often clears it. If it keeps happening, let us know what you were doing and we will fix it."
          action={
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button onClick={this.handleRetry}>Try again</Button>
              <Button onClick={this.handleReload} variant="outline">
                Reload the page
              </Button>
            </div>
          }
          className="max-w-2xl w-full"
        />
      </main>
    );
  }
}
