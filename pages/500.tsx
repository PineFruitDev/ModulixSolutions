import React from 'react';
import { Home, MessageCircle, ServerCrash } from 'lucide-react';

import StatusPage from '../components/states/StatusPage';
import Button from '../components/Button';

export default function Custom500() {
  return (
    <StatusPage
      path="/500/"
      icon={ServerCrash}
      heading="Something Went Wrong"
      actions={
        <>
          <Button href="/" size="lg" icon={<Home className="w-5 h-5" />}>
            Return to Homepage
          </Button>
          <Button
            href="/#contact"
            variant="outline"
            size="lg"
            icon={<MessageCircle className="w-5 h-5" />}
          >
            Report the problem
          </Button>
        </>
      }
    >
      <p>
        This one is on us, not on you. Reloading usually clears it. If the page keeps failing, tell us
        what you were trying to reach and we will get it fixed.
      </p>
    </StatusPage>
  );
}
