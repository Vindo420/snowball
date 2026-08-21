import type { Integration } from '@prisma/client';

/**
 * Fans a new-participant event out to every integration configured on the
 * campaign. Each provider branch is a stub — fill in the real API call when
 * you're ready to wire up that provider. Failures are swallowed (logged)
 * rather than thrown, so one bad integration never blocks a signup.
 */
export async function dispatchNewParticipant(
  integrations: Integration[],
  participant: { email: string; name: string | null }
) {
  await Promise.allSettled(
    integrations.map((integration) => dispatchOne(integration, participant))
  );
}

async function dispatchOne(
  integration: Integration,
  participant: { email: string; name: string | null }
) {
  try {
    switch (integration.provider) {
      case 'WEBHOOK': {
        const { url } = integration.config as { url?: string };
        if (!url) return;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'participant.created', participant }),
        });
        return;
      }

      case 'MAILCHIMP': {
        // TODO: POST to https://<dc>.api.mailchimp.com/3.0/lists/<listId>/members
        // using integration.config.{ apiKey, listId, dc } and the Mailchimp API.
        console.log('[integrations] Mailchimp stub — would add', participant.email);
        return;
      }

      case 'ACTIVE_CAMPAIGN': {
        // TODO: POST to <apiUrl>/api/3/contacts using integration.config.{ apiUrl, apiKey }.
        console.log('[integrations] ActiveCampaign stub — would add', participant.email);
        return;
      }

      case 'HUBSPOT': {
        // TODO: POST to https://api.hubapi.com/crm/v3/objects/contacts.
        console.log('[integrations] HubSpot stub — would add', participant.email);
        return;
      }

      case 'CONVERTKIT': {
        // TODO: POST to https://api.convertkit.com/v3/forms/<formId>/subscribe.
        console.log('[integrations] ConvertKit stub — would add', participant.email);
        return;
      }

      default:
        return;
    }
  } catch (err) {
    console.error(`[integrations] ${integration.provider} dispatch failed:`, err);
  }
}
