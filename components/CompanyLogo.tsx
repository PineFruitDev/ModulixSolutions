import React, { useState } from 'react';

interface CompanyLogoProps {
  /** Falls back to the monogram when absent or when the file fails to load. */
  logoUrl?: string;
  displayName: string;
}

/**
 * A logo that degrades to a monogram. The failure is held in state so the
 * fallback stays part of the render pass: this carousel animates continuously,
 * and a fallback node appended outside React would be wiped or duplicated on
 * the next re-render.
 *
 * Both branches are decorative. The company name is rendered beside this and
 * the whole card is a link, so announcing the mark again would just repeat it.
 */
export default function CompanyLogo({ logoUrl, displayName }: CompanyLogoProps) {
  const [failed, setFailed] = useState(false);

  if (!logoUrl || failed) {
    return (
      <div
        aria-hidden="true"
        className="text-6xl font-bold transition-colors duration-300 text-gray-300 group-hover:text-white"
      >
        {displayName.charAt(0)}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt=""
      width={256}
      height={256}
      className="w-full h-full object-contain transition-all duration-300 rounded-2xl"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
