import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userTranscription, targetSentence } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!userTranscription || !targetSentence) {
      return new Response(JSON.stringify({
        feedback: "Voice captured! Keep going.",
        tips: []
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[shadowing-feedback] Target: "${targetSentence.substring(0, 30)}..." User: "${userTranscription.substring(0, 30)}..."`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a pronunciation coach. Compare what the user said to the target sentence and give IMMEDIATE, BRIEF feedback.

Rules:
- Be very brief (under 10 words)
- Be encouraging first
- Only mention 1 pronunciation tip if needed
- Focus on rhythm and flow, not grammar

Return JSON:
{
  "feedback": "Brief encouragement (under 10 words)",
  "tip": "One specific word to improve OR null if good",
  "accuracy": 0-100
}`
          },
          {
            role: "user",
            content: `Target: "${targetSentence}"
User said: "${userTranscription}"

Give brief shadowing feedback.`
          }
        ],
        max_tokens: 100,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      console.error("[shadowing-feedback] AI error:", response.status);
      return new Response(JSON.stringify({
        feedback: "Good effort! Keep practicing.",
        tip: null,
        accuracy: 70
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.error("[shadowing-feedback] Parse error:", e);
    }

    return new Response(JSON.stringify({
      feedback: "Nice try! Keep the rhythm.",
      tip: null,
      accuracy: 70
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[shadowing-feedback] Error:", error);
    return new Response(JSON.stringify({
      feedback: "Good effort!",
      tip: null,
      accuracy: 65
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
