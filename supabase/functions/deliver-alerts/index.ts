// Sends queued alert emails. Invoked by pg_cron every 15 minutes.
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM = Deno.env.get("ALERTS_FROM_EMAIL") ?? "Studio <alerts@example.com>";

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (req.headers.get("Authorization") !== `Bearer ${serviceKey}`) return new Response("Unauthorized", { status: 401 });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const { data: queue, error } = await db.from("alerts")
    .select("id, recipient_email, title, body").eq("email_status", "pending").order("created_at").limit(50);
  if (error) return new Response(error.message, { status: 500 });

  let sent = 0;
  for (const a of queue ?? []) {
    if (!RESEND_API_KEY) {
      await db.from("alerts").update({ email_status: "skipped", email_error: "RESEND_API_KEY not set" }).eq("id", a.id);
      continue;
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [a.recipient_email], subject: a.title, text: a.body }),
    });
    if (res.ok) {
      sent++;
      await db.from("alerts").update({ email_status: "sent" }).eq("id", a.id);
    } else {
      await db.from("alerts").update({ email_status: "failed", email_error: (await res.text()).slice(0, 500) }).eq("id", a.id);
    }
  }
  return Response.json({ processed: queue?.length ?? 0, sent });
});
