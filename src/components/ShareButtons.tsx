'use client';

import { useState } from 'react';

type Channel = 'FACEBOOK' | 'TWITTER_X' | 'WHATSAPP' | 'EMAIL' | 'INSTAGRAM_STORY' | 'LINK';

/**
 * Social share row for a participant's personal referral link.
 *
 * Note on Instagram: Instagram has no public web-share endpoint like
 * Facebook/Twitter/WhatsApp do. Real IG Stories sharing works by deep-linking
 * into the Instagram app with a pre-rendered background image
 * ("instagram-stories://share?source_application=..."), which only works
 * from a mobile browser/app and requires you to generate a shareable image
 * per participant (e.g. their referral count as a graphic) and host it
 * publicly first. This scaffold wires up the button and the deep link
 * structure; generating that per-participant image is a TODO — a nice v1 is
 * an OG-image-style API route (`/api/campaigns/[id]/share-image`) using
 * `@vercel/og` that renders "I'm #3 on the leaderboard!" and returns a PNG.
 */
export function ShareButtons({
  url,
  message,
  shareImageUrl,
}: {
  url: string;
  message: string;
  shareImageUrl?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function share(channel: Channel) {
    const encodedUrl = encodeURIComponent(url);
    const encodedMessage = encodeURIComponent(message);

    switch (channel) {
      case 'FACEBOOK':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
        return;
      case 'TWITTER_X':
        window.open(`https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`, '_blank');
        return;
      case 'WHATSAPP':
        window.open(`https://wa.me/?text=${encodedMessage}%20${encodedUrl}`, '_blank');
        return;
      case 'EMAIL':
        window.location.href = `mailto:?subject=${encodedMessage}&body=${encodedUrl}`;
        return;
      case 'INSTAGRAM_STORY': {
        // Mobile-only deep link; requires a hosted background image (see note above).
        if (shareImageUrl) {
          window.location.href = `instagram-stories://share?source_application=snowball&background_image=${encodeURIComponent(
            shareImageUrl
          )}`;
        } else {
          copyLink();
        }
        return;
      }
      case 'LINK':
        copyLink();
        return;
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => share('FACEBOOK')} className="rounded-lg bg-[#1877F2] px-4 py-2 text-sm font-medium text-white">
        Facebook
      </button>
      <button onClick={() => share('TWITTER_X')} className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
        X / Twitter
      </button>
      <button onClick={() => share('WHATSAPP')} className="rounded-lg bg-[#25D366] px-4 py-2 text-sm font-medium text-white">
        WhatsApp
      </button>
      <button
        onClick={() => share('INSTAGRAM_STORY')}
        className="rounded-lg bg-gradient-to-tr from-[#FEDA75] via-[#D62976] to-[#4F5BD5] px-4 py-2 text-sm font-medium text-white"
      >
        Instagram Story
      </button>
      <button onClick={() => share('EMAIL')} className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white">
        Email
      </button>
      <button onClick={copyLink} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium">
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  );
}
