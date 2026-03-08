import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { incident_id, incident } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const systemPrompt = `You are an AI complaint screening system for a women's safety platform (HerNet). Your job is to analyze incoming complaints and assign priority levels to reduce police workload.

PRIORITY LEVELS:
- HIGH: SOS emergencies, physical assault, rape, kidnapping, life-threatening situations, blackmail with explicit threats, domestic violence with injury
- MEDIUM: Harassment, stalking, cheating/exploitation, cyberbullying, verbal threats, workplace harassment
- LOW: Unclear complaints, incomplete reports, non-specific grievances, minor disputes

ANALYSIS CRITERIA:
1. Keywords: rape, assault, kidnap, murder, blackmail, threat, abuse, violence, molest
2. Evidence presence: photos/videos/audio increase priority
3. Location data: GPS coordinates increase credibility
4. Threat level (self-reported): factor into assessment
5. Urgency indicators: words like "now", "help", "emergency", "scared"

OUTPUT FORMAT (follow EXACTLY):
PRIORITY: [HIGH | MEDIUM | LOW]
SUMMARY: [2-3 sentence case summary for officers]
CATEGORY: [One of: Sexual Assault, Domestic Violence, Harassment, Stalking, Cyber Crime, Blackmail, Physical Assault, Cheating/Exploitation, Other]
RECOMMENDED_ACTION: [Immediate dispatch | Assign to Women Safety Officer | Queue for review | Flag for verification]
KEY_DETAILS:
- [Detail 1]
- [Detail 2]
- [Detail 3]`;

    const userPrompt = `Screen this complaint:
Title: ${incident.title}
Description: ${incident.description}
Location: ${incident.location || "Not provided"}
GPS: ${incident.latitude && incident.longitude ? `${incident.latitude}, ${incident.longitude}` : "Not captured"}
Date: ${incident.incident_date || "Not specified"}
Threat Level (self-reported): ${incident.threat_level || "medium"}
Anonymous: ${incident.is_anonymous ? "Yes" : "No"}
Has Evidence: ${incident.has_evidence ? "Yes" : "No"}`;

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
    const result = data.choices?.[0]?.message?.content || "";

    // Parse priority from AI response
    let priority = "medium";
    if (result.includes("PRIORITY: HIGH")) priority = "high";
    else if (result.includes("PRIORITY: LOW")) priority = "low";

    // Extract summary line
    const summaryMatch = result.match(/SUMMARY:\s*(.+?)(?:\n|$)/);
    const aiSummary = summaryMatch ? summaryMatch[1].trim() : result.slice(0, 200);

    // Update incident with priority and summary
    await supabase.from("incidents").update({
      priority_level: priority,
      ai_summary: result,
    }).eq("id", incident_id);

    // Send automated acknowledgment as system message
    const priorityLabels: Record<string, string> = {
      high: "🔴 HIGH — Immediate attention required",
      medium: "🟡 MEDIUM — A safety officer will review your case soon",
      low: "🟢 LOW — Your case has been queued for review",
    };

    await supabase.from("case_messages").insert({
      incident_id: incident_id,
      sender_type: "system",
      message: `✅ Your complaint has been received and screened.\n\n📋 Case ID: ${incident.case_id || "Generating..."}\n⚡ Priority: ${priorityLabels[priority]}\n\n${priority === "high" ? "A protection officer has been alerted and will respond immediately." : "A women safety officer will review your case and respond through this chat."}\n\nYou can track your case status and communicate anonymously through the Case Chat.`,
    });

    return new Response(JSON.stringify({ priority, summary: aiSummary, full_result: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-screen error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
