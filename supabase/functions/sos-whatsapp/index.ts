import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

const bodySchema = z.object({
  user_id: z.string().uuid(),
  alert_id: z.string().uuid().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

const normalizePhoneNumber = (value: string, defaultCountryCode = "+91") => {
  const sanitized = value.trim().replace(/^whatsapp:/i, "").replace(/[^\d+]/g, "");

  if (!sanitized) {
    throw new Error("Invalid phone number format");
  }

  if (sanitized.startsWith("+")) {
    return sanitized;
  }

  return `${defaultCountryCode}${sanitized.replace(/^0+/, "")}`;
};

const toWhatsAppAddress = (value: string, defaultCountryCode = "+91") =>
  `whatsapp:${normalizePhoneNumber(value, defaultCountryCode)}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");

    const WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM");
    if (!WHATSAPP_FROM) throw new Error("TWILIO_WHATSAPP_FROM is not configured");

    const parsedBody = bodySchema.safeParse(await req.json());

    if (!parsedBody.success) {
      return new Response(
        JSON.stringify({ error: parsedBody.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id, alert_id, latitude, longitude } = parsedBody.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const formattedFrom = toWhatsAppAddress(WHATSAPP_FROM, "+1");

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", user_id)
      .single();

    // Fetch emergency contacts
    const { data: contacts } = await supabase
      .from("emergency_contacts")
      .select("name, phone")
      .eq("user_id", user_id);

    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No emergency contacts found", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userName = profile?.full_name || "A HerNet user";
    const locationLink = latitude && longitude
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : "Location unavailable";

    const messageBody = `🚨 *EMERGENCY ALERT* 🚨\n\n` +
      `${userName} has activated the SOS emergency alert on HerNet.\n\n` +
      `📍 *Live Location:*\n${locationLink}\n\n` +
      `Please track the location and assist immediately.\n\n` +
      `⏰ Alert Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;

    const results: Array<{ phone: string; success: boolean; sid?: string; error?: string }> = [];

    for (const contact of contacts) {
      const toWhatsApp = toWhatsAppAddress(contact.phone);

      try {
        const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TWILIO_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: toWhatsApp,
            From: formattedFrom,
            Body: messageBody,
          }),
        });

        const rawData = await response.text();
        const data = rawData ? JSON.parse(rawData) : {};
        if (!response.ok) {
          console.error(`WhatsApp send failed for ${contact.name}:`, JSON.stringify(data));
          results.push({ phone: contact.phone, success: false, error: data.message || `HTTP ${response.status}` });
        } else {
          console.log(`WhatsApp sent to ${contact.name} (${contact.phone}): SID ${data.sid}`);
          results.push({ phone: contact.phone, success: true, sid: data.sid });
        }
      } catch (err) {
        console.error(`WhatsApp error for ${contact.name}:`, err);
        results.push({ phone: contact.phone, success: false, error: String(err) });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    // Update alert status
    if (alert_id) {
      await supabase
        .from("sos_alerts")
        .update({ status: "contacts_notified" })
        .eq("id", alert_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: contacts.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("WhatsApp SOS error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
