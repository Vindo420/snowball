/**
 * Seeds a demo user + one fully-configured campaign so you have something
 * to look at immediately after `npm run db:push && npm run db:seed`.
 */
import { PrismaClient, CampaignType, CampaignStatus, DisplayMode } from '@prisma/client';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@snowball.dev' },
    update: {},
    create: {
      email: 'demo@snowball.dev',
      name: 'Demo User',
      passwordHash,
    },
  });

  const campaign = await prisma.campaign.upsert({
    where: { slug: 'launch-giveaway' },
    update: { userId: user.id },
    create: {
      userId: user.id,
      slug: 'launch-giveaway',
      name: 'Product Launch Giveaway',
      type: CampaignType.REWARDS,
      status: CampaignStatus.ACTIVE,
      displayMode: DisplayMode.LANDING_PAGE,
      headline: 'Win early access + $500 in credit',
      description: 'Refer your friends to move up the list and unlock rewards.',
      prizeDescription: '$500 credit + lifetime early-adopter pricing',
      pageConfig: {
        theme: 'brand',
        sections: ['hero', 'progress', 'leaderboard', 'share', 'footer'],
      },
      rewardTiers: {
        create: [
          { name: 'Bronze', referralsRequired: 1, rewardDescription: 'Exclusive Discord role', autoDeliver: true },
          { name: 'Silver', referralsRequired: 5, rewardDescription: '1 month free', autoDeliver: false },
          { name: 'Gold', referralsRequired: 20, rewardDescription: 'Lifetime access', autoDeliver: false },
        ],
      },
      integrations: {
        create: [
          {
            provider: 'WEBHOOK',
            config: { url: 'https://hooks.zapier.com/hooks/catch/replace-me' },
          },
        ],
      },
    },
  });

  // A couple of demo participants, one referred by the other.
  const alice = await prisma.participant.upsert({
    where: { campaignId_email: { campaignId: campaign.id, email: 'alice@example.com' } },
    update: {},
    create: {
      campaignId: campaign.id,
      email: 'alice@example.com',
      name: 'Alice',
      refCode: nanoid(10),
      status: 'VERIFIED',
    },
  });

  await prisma.participant.upsert({
    where: { campaignId_email: { campaignId: campaign.id, email: 'bob@example.com' } },
    update: {},
    create: {
      campaignId: campaign.id,
      email: 'bob@example.com',
      name: 'Bob',
      refCode: nanoid(10),
      status: 'VERIFIED',
      referredById: alice.id,
    },
  });

  await prisma.participant.update({
    where: { id: alice.id },
    data: { referralCount: 1, points: 10 },
  });

  console.log('Seeded demo user (demo@snowball.dev / password123) and campaign:', campaign.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
