'use client';

import { useRouter } from 'next/navigation';
import { CampaignStatusControl, type CampaignStatus } from '@/components/CampaignStatusControl';

/** Thin client wrapper so the (server-component) detail page can use CampaignStatusControl. */
export function CampaignStatusControlWithRefresh({
  campaignId,
  status,
}: {
  campaignId: string;
  status: CampaignStatus;
}) {
  const router = useRouter();
  return <CampaignStatusControl campaignId={campaignId} status={status} onChanged={() => router.refresh()} />;
}
