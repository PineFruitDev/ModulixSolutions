import React from 'react';
import { CheckCircle, Home, Sparkles } from 'lucide-react';

import StatusPage from '../components/states/StatusPage';
import Button from '../components/Button';

export default function ContactConfirmed() {
  return (
    <StatusPage
      pageTitle="Message Sent Successfully | Modulix Solutions"
      metaDescription="Thank you for contacting Modulix Solutions. Your message has been sent successfully and we'll get back to you within 24 hours."
      canonical="https://modulixsolutions.com/contact-confirmed/"
      icon={CheckCircle}
      heading="We'll Contact You Soon!"
      actions={
        <>
          <Button href="/" size="lg" icon={<Home className="w-5 h-5" />}>
            Return to Homepage
          </Button>
          <Button
            href="/#services"
            variant="outline"
            size="lg"
            icon={<Sparkles className="w-5 h-5" />}
          >
            Browse services
          </Button>
        </>
      }
    >
      <p>
        Your message is with our team and we&apos;ll get back to you within 24 hours. We&apos;re keen to hear
        how you want your community to grow, whether that is on Discord, inside a game like Fortnite,
        or wherever else your audience already gathers.
      </p>
    </StatusPage>
  );
}
