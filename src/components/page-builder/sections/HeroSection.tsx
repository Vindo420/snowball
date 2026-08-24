import type { HeroSectionSchema } from '@/lib/pageConfig';
import type { z } from 'zod';

export function HeroSection({
  section,
  headline,
  description,
  prizeDescription,
}: {
  section: z.infer<typeof HeroSectionSchema>;
  headline: string | null;
  description: string | null;
  prizeDescription: string | null;
}) {
  return (
    <div>
      {section.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- external, owner-supplied URL; no upload/storage in v1
        <img
          src={section.imageUrl}
          alt=""
          className="mx-auto mb-6 max-h-64 w-full rounded-lg object-cover"
        />
      )}
      <h1 className="text-3xl font-bold">{headline ?? 'Join the giveaway'}</h1>
      {description && <p className="mt-3 text-gray-600">{description}</p>}
      {prizeDescription && (
        <p className="mt-1 text-sm font-medium uppercase tracking-wide text-brand-600">
          Prize: {prizeDescription}
        </p>
      )}
    </div>
  );
}
