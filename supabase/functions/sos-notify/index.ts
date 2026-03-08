import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, alert_id, latitude, longitude, action } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

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

    const userName = profile?.full_name || "A HerNet user";
    const locationStr = latitude && longitude
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : "Location unavailable";

    if (action === "notify_contacts") {
      // In production, integrate with Twilio/SMS gateway here
      // For now, log the notifications that would be sent
      const notifications = (contacts || []).map((c) => ({
        to: c.phone,
        message: `🚨 EMERGENCY ALERT from HerNet!\n${userName} has activated SOS.\nLocation: ${locationStr}\nPlease check on them immediately!`,
      }));

      console.log("Emergency contact notifications:", JSON.stringify(notifications));

      // Update the alert to mark contacts as notified
      await supabase
        .from("sos_alerts")
        .update({ status: "contacts_notified" })
        .eq("id", alert_id);

      return new Response(
        JSON.stringify({
          success: true,
          contacts_notified: notifications.length,
          notifications,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "escalate_police") {
      // Mark as escalated to police
      await supabase
        .from("sos_alerts")
        .update({ escalated_to_police: true, status: "escalated" })
        .eq("id", alert_id);

      // SMS fallback message for police
      const policeMessage = `🚨 EMERGENCY ALERT - HerNet\nUser: ${userName}\nLocation: ${locationStr}\nSOS active for over 2 minutes.\nImmediate response required.`;

      console.log("Police escalation:", policeMessage);

      return new Response(
        JSON.stringify({
          success: true,
          escalated: true,
          message: policeMessage,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_location") {
      await supabase
        .from("sos_alerts")
        .update({ latitude, longitude })
        .eq("id", alert_id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("SOS notify error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
