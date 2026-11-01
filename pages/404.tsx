import React from 'react';
import { Compass, Home, MessageCircle, Sparkles } from 'lucide-react';

import StatusPage from '../components/states/StatusPage';
import Button from '../components/Button';

export default function Custom404() {
  return (
    <StatusPage
      path="/404.html"
      icon={Compass}
      heading="404 Error - Page Not Found"
      actions={
        <>
          <Button href="/" size="lg" icon={<Home className="w-5 h-5" />}>
            Return to Homepage
          </Button>
          <Button href="/#services" variant="outline" size="lg" icon={<Sparkles className="w-5 h-5" />}>
            Browse services
          </Button>
          <Button href="/#contact" variant="ghost" size="lg" icon={<MessageCircle className="w-5 h-5" />}>
            Get in touch
          </Button>
        </>
      }
    >
      <p>
        The link may be out of date, or the page may have moved. Nothing is lost: everything we build
        for online communities and creator platforms is still a click away.
      </p>
    </StatusPage>
  );
}
