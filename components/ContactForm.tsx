import { logEvent } from '../lib/logger';
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Button from './Button';
import Spinner from './states/Spinner';
import StateMessage from './states/StateMessage';

type FormStatus =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; message: string };

const REDIRECT_DELAY_MS = 1500;

export default function ContactForm() {
  const [status, setStatus] = useState<FormStatus>({ kind: 'idle' });
  const isSubmitting = status.kind === 'submitting';
  const [fieldValidity, setFieldValidity] = useState({
    name: false,
    email: false,
    discord: false,
    message: false
  });

  const validateField = (field: string, value: string) => {
    switch (field) {
      case 'name':
        return value.length >= 2;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      case 'discord':
        // Optional field - empty is valid, but if provided must be valid Discord format
        if (value.length === 0) return true;
        // Discord username format: username#1234 or just username
        const discordRegex = /^.{2,32}(#\d{4})?$/;
        return discordRegex.test(value);
      case 'message':
        return value.length >= 10;
      default:
        return false;
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    const isValid = validateField(field, value);
    setFieldValidity(prev => ({
      ...prev,
      [field]: isValid
    }));
  };

  const showError = (message: string) => {
    setStatus({ kind: 'error', message });
  };

  const confirmSubmission = (form: HTMLFormElement) => {
    setStatus({ kind: 'success', message: 'Message sent successfully! Redirecting...' });
    form.reset();
    setFieldValidity({ name: false, email: false, discord: false, message: false });
    setTimeout(() => {
      window.location.href = '/contact-confirmed';
    }, REDIRECT_DELAY_MS);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    // Check if all fields are valid before submitting
    const currentValues = {
      name: (form.elements.namedItem('name') as HTMLInputElement)?.value || '',
      email: (form.elements.namedItem('email') as HTMLInputElement)?.value || '',
      discord: (form.elements.namedItem('discord') as HTMLInputElement)?.value || '',
      message: (form.elements.namedItem('message') as HTMLTextAreaElement)?.value || ''
    };

    const isNameValid = validateField('name', currentValues.name);
    const isEmailValid = validateField('email', currentValues.email);
    const isDiscordValid = validateField('discord', currentValues.discord);
    const isMessageValid = validateField('message', currentValues.message);

    if (!isNameValid || !isEmailValid || !isDiscordValid || !isMessageValid) {
      showError('Please fill out all required fields correctly.');
      return;
    }

    setStatus({ kind: 'submitting' });

    const formData = new FormData(form);

    // Web3Forms expects 'access_key', not 'apikey'
    formData.append('access_key', 'ac55144c-ed04-4d25-8b83-fe6847721ebf');
    formData.append('subject', 'New Contact Form Submission - Modulix Solutions');

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
        // Remove manual headers - let browser set them automatically for FormData
      });

      if (!response.ok) {
        logEvent('contact_http_error', response.status);
        showError(`Failed to send message (${response.status}). Please try again.`);
        return;
      }

      try {
        const data = await response.json();

        if (data?.success === true) {
          confirmSubmission(form);
        } else {
          logEvent('contact_rejected');
          showError('Failed to send message. Please review your details and try again.');
        }
      } catch {
        logEvent('contact_invalid_response');
        showError('We could not confirm delivery. Your details are preserved. Retrying may send a duplicate.');
      }
    } catch {
      logEvent('contact_network_error');
      showError('We could not confirm delivery. Your details are preserved. Retrying may send a duplicate.');
    }

  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="max-w-lg mx-auto"
    >
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Name and Discord side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Name *
            </label>
            <div className="relative">
              <input
                type="text"
                name="name"
                id="name"
                required
                className="form-input w-full pr-10"
                placeholder="Your name"
                disabled={isSubmitting}
                onChange={(e) => handleFieldChange('name', e.target.value)}
              />
              {fieldValidity.name && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Check className="w-5 h-5 text-green-400" aria-hidden="true" />
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="discord" className="block text-sm font-medium text-gray-300 mb-2">
              Discord Username
            </label>
            <div className="relative">
              <input
                type="text"
                name="discord"
                id="discord"
                className="bg-deeper-blue border border-neon-purple/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-purple/60 focus:border-neon-purple w-full pr-10"
                placeholder="@username"
                disabled={isSubmitting}
                onChange={(e) => handleFieldChange('discord', e.target.value)}
              />
              {fieldValidity.discord && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Check className="w-5 h-5 text-green-400" aria-hidden="true" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
            Email *
          </label>
          <div className="relative">
            <input
              type="email"
              name="email"
              id="email"
              required
              className="form-input w-full pr-10"
              placeholder="your.email@example.com"
              disabled={isSubmitting}
              onChange={(e) => handleFieldChange('email', e.target.value)}
            />
            {fieldValidity.email && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Check className="w-5 h-5 text-green-400" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
          Message *
        </label>
        <div className="relative">
          <textarea
            name="message"
            id="message"
            rows={5}
            required
            className="form-textarea w-full pr-10"
            placeholder="Tell us about your project..."
            disabled={isSubmitting}
            onChange={(e) => handleFieldChange('message', e.target.value)}
          />
          {fieldValidity.message && (
            <div className="absolute bottom-3 right-3">
              <Check className="w-5 h-5 text-green-400" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>

      <div className="text-center">
        <Button
          type="submit"
          disabled={isSubmitting || !fieldValidity.name || !fieldValidity.email || !fieldValidity.message}
          className="w-full md:w-auto"
          icon={isSubmitting ? <Spinner size="sm" /> : undefined}
        >
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </Button>
      </div>

      {status.kind !== 'idle' && (
        <StateMessage
          className="mt-4"
          tone={
            status.kind === 'submitting'
              ? 'loading'
              : status.kind === 'success'
              ? 'success'
              : 'error'
          }
          title={status.kind === 'submitting' ? 'Sending...' : status.message}
        />
      )}

      </form>
    </motion.div>
  );
}

