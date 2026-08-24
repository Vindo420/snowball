import { NextRequest, NextResponse } from 'next/server';

/**
 * Inbound webhook receiver — e.g. for providers that need to notify this app
 * back (delivery confirmations, unsubscribes, etc). Currently a stub that
 * just logs the payload; add signature verification per-provider before
 * trusting anything here in production.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ provider: string }> }) {
 const params = await props.params;
 const payload = await req.json().catch(() => null);
 console.log(`[webhook:${params.provider}] received`, payload);

 // TODO: verify signature (e.g. Mailchimp's X-Mandrill-Signature) before acting on payload.

 return NextResponse.json({ ok: true });
}
