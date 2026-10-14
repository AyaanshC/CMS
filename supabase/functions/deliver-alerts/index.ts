// Sends queued alert emails. Invoked by pg_cron every 15 minutes.
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM = Deno.env.get("ALERTS_FROM_EMAIL") ?? "Studio <alerts@example.com>";

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey || req.headers.get("Authorization") !== `Bearer ${serviceKey}`) return new Response("Unauthorized", { status: 401 });
  if (!["GET", "POST"].includes(req.method)) return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST" } });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  if(req.method==="GET")return Response.json({configured:!!(RESEND_API_KEY&&Deno.env.get("ALERTS_FROM_EMAIL"))});
  if (!RESEND_API_KEY || !Deno.env.get("ALERTS_FROM_EMAIL")) return Response.json({ error: "Email delivery is not configured; queued emails remain pending." }, { status: 503 });
  const claim = crypto.randomUUID();
  const { data: queue, error } = await db.rpc("claim_alert_emails", { p_claim: claim });
  if (error) return new Response(error.message, { status: 500 });

  let sent = 0;
  for (const a of queue ?? []) {
    try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `studio-alert-${a.id}` },
      body: JSON.stringify({ from: FROM, to: [a.recipient_email], subject: a.title, text: a.body }),
    });
    if (res.ok) {
      sent++;
      await db.from("alerts").update({ email_status: "sent", email_error: null, delivery_claim: null, claimed_at: null }).eq("id", a.id).eq("delivery_claim",claim);
    } else {
      throw new Error(`Email provider returned ${res.status}: ${(await res.text()).slice(0,300)}`);
    }
    } catch(error) {
      await db.from("alerts").update({ email_status: "failed", email_error: String(error).slice(0,500), delivery_claim: null, claimed_at: null,
        next_attempt_at: new Date(Date.now()+Math.min(24*60,15*2**a.delivery_attempts)*60_000).toISOString() }).eq("id",a.id).eq("delivery_claim",claim);
    }
  }
  return Response.json({ processed: queue?.length ?? 0, sent });
});
