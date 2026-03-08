import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { incident, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "summarize") {
      systemPrompt = `You are a police case analyst AI. Summarize incident reports concisely for law enforcement officers. Include: incident type, location, date/time, threat level, key details, and recommended actions. Keep it under 150 words. Be professional and factual.`;
      userPrompt = `Summarize this incident report for police investigation:
Title: ${incident.title}
Description: ${incident.description}
Location: ${incident.location || "Not specified"}
Date: ${incident.incident_date || "Not specified"}
Threat Level: ${incident.threat_level || "medium"}
Anonymous: ${incident.is_anonymous ? "Yes" : "No"}
Status: ${incident.status}`;
    } else if (type === "verify") {
      systemPrompt = `You are an AI complaint verification system. Analyze the complaint for authenticity indicators. Check for: consistency of details, specificity of description, presence of verifiable information (location, dates, names), emotional language patterns. Rate credibility as: VERIFIED, NEEDS_REVIEW, or SUSPICIOUS. Provide brief reasoning. Be objective.`;
      userPrompt = `Verify the authenticity of this complaint:
Title: ${incident.title}
Description: ${incident.description}
Location: ${incident.location || "Not provided"}
Date: ${incident.incident_date || "Not provided"}
Anonymous: ${incident.is_anonymous ? "Yes" : "No"}
Has evidence attached: ${incident.has_evidence ? "Yes" : "No"}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Unable to generate analysis.";

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-summarize error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
