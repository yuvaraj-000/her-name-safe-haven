import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { incident } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an AI investigative assistant for HerNet, a women's safety platform. Based on the incident report details provided, generate exactly 5 follow-up questions that would help law enforcement officers investigate the case and identify the criminal.

RULES:
- Questions MUST be directly relevant to the specific incident type and details provided
- Questions should extract actionable information: physical descriptions, witness details, digital evidence, patterns, timelines
- Be sensitive — the victim may be traumatized. Use gentle but clear language.
- Do NOT ask questions already answered in the report
- Each question should target a different aspect of the investigation

OUTPUT FORMAT (follow EXACTLY — return ONLY a JSON array, no markdown):
[
  {"id": 1, "question": "...", "type": "text", "placeholder": "..."},
  {"id": 2, "question": "...", "type": "text", "placeholder": "..."},
  {"id": 3, "question": "...", "type": "select", "options": ["Option1", "Option2", "Option3", "Other"]},
  {"id": 4, "question": "...", "type": "text", "placeholder": "..."},
  {"id": 5, "question": "...", "type": "text", "placeholder": "..."}
]

Use "type": "select" for questions with limited answer choices, "text" for open-ended questions.`;

    const userPrompt = `Generate investigation follow-up questions for this incident:
Type: ${incident.incident_type || "Not specified"}
Title: ${incident.title}
Description: ${incident.description}
Location: ${incident.location || "Not provided"}
Date: ${incident.incident_date || "Not specified"}
Time: ${incident.incident_time || "Not specified"}
Suspect Name: ${incident.suspect_name || "Unknown"}
Suspect Relationship: ${incident.suspect_relationship || "Unknown"}
Threat Level: ${incident.threat_level || "medium"}
Safety Status: ${incident.safety_status || "Not specified"}`;

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
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "[]";
    
    // Strip markdown code fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    const questions = JSON.parse(content);

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-followup error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
