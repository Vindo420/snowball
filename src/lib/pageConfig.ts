import { z } from 'zod';

/**
 * Page-builder section schema. Stored as JSON in `Campaign.pageConfig`, so it
 * must be validated on every read (data can be null, from an older shape, or
 * simply malformed) as well as on every write.
 */

const BaseSectionSchema = z.object({
  id: z.string().min(1),
});

export const HeroSectionSchema = BaseSectionSchema.extend({
  type: z.literal('HERO'),
  imageUrl: z.string().url().optional(),
});

export const LeaderboardSectionSchema = BaseSectionSchema.extend({
  type: z.literal('LEADERBOARD'),
});

export const RewardTiersSectionSchema = BaseSectionSchema.extend({
  type: z.literal('REWARD_TIERS'),
});

export const CountdownSectionSchema = BaseSectionSchema.extend({
  type: z.literal('COUNTDOWN'),
});

export const EntryFormSectionSchema = BaseSectionSchema.extend({
  type: z.literal('ENTRY_FORM'),
});

export const SectionSchema = z.discriminatedUnion('type', [
  HeroSectionSchema,
  LeaderboardSectionSchema,
  RewardTiersSectionSchema,
  CountdownSectionSchema,
  EntryFormSectionSchema,
]);

export type Section = z.infer<typeof SectionSchema>;
export type SectionType = Section['type'];

export const PageConfigSchema = z.object({
  sections: z.array(SectionSchema),
});

export type PageConfig = z.infer<typeof PageConfigSchema>;

/**
 * The layout every campaign gets when its stored `pageConfig` is null, in the
 * older `{ theme, sections: string[] }` shape, or otherwise malformed. This is
 * the only fallback layout — see design.md for why a fixed default is used
 * instead of attempting to translate old section-name strings.
 */
export const DEFAULT_PAGE_CONFIG: PageConfig = {
  sections: [
    { id: 'default-hero', type: 'HERO' },
    { id: 'default-entry-form', type: 'ENTRY_FORM' },
    { id: 'default-leaderboard', type: 'LEADERBOARD' },
    { id: 'default-reward-tiers', type: 'REWARD_TIERS' },
  ],
};

function hasEntryForm(config: PageConfig): boolean {
  return config.sections.some((section) => section.type === 'ENTRY_FORM');
}

/**
 * Normalizes a campaign's stored `pageConfig` into a valid `PageConfig`,
 * never throwing. Anything that isn't a valid current-shape config (null, the
 * legacy shape, or anything else malformed) falls back to
 * `DEFAULT_PAGE_CONFIG`. A structurally-valid config that's somehow missing
 * an entry-form section gets one appended — reading must never depend on
 * writes having been correctly guarded (see `PATCH /api/campaigns/:id`,
 * which rejects that case at save time as the primary guard).
 */
export function parsePageConfig(raw: unknown): PageConfig {
  const parsed = PageConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return DEFAULT_PAGE_CONFIG;
  }

  if (!hasEntryForm(parsed.data)) {
    return {
      sections: [...parsed.data.sections, { id: 'appended-entry-form', type: 'ENTRY_FORM' }],
    };
  }

  return parsed.data;
}
