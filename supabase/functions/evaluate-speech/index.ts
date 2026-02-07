import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const evaluationPrompt = `You are an expert English speech coach for Brazilian Portuguese speakers. Your role is to provide contextual, encouraging feedback based on the ACTUAL transcription of what the user said.

CRITICAL RULES:
- Your feedback MUST reference specific words or phrases FROM THE USER'S TRANSCRIPTION
- NEVER give generic feedback that could apply to anyone
- Be encouraging and supportive - focus on progress, not perfection
- Keep each section brief (1-2 sentences max)
- Do NOT teach grammar rules or use technical linguistic terms

FEEDBACK STRUCTURE (mandatory):
1. **Positive Reinforcement**: Highlight something SPECIFIC the user said well (quote their words)
2. **Fluency Observation**: Comment on their speech flow (pauses, rhythm, connectors used)
3. **Pronunciation/Clarity Note**: Pick MAX 1-2 specific words that could be improved, with simple tips
4. **Natural Phrase Suggestion**: Rewrite one of their sentences in a more natural/native way

SCORING GUIDELINES (0-100):
- Fluency: Based on pauses, filler words, sentence completion
- Clarity: Based on how understandable the message is
- Confidence: Based on sentence structure and vocabulary range

Return JSON format:
{
  "positiveReinforcement": "Quote from their speech + praise",
  "fluencyNote": "Observation about their flow",
  "pronunciationTip": "One specific word + simple tip (or 'Great pronunciation!' if nothing critical)",
  "naturalPhrase": {
    "original": "What they said",
    "improved": "More natural version"
  },
  "scores": {
    "fluency": 75,
    "clarity": 80,
    "confidence": 70
  },
  "encouragement": "Brief motivational closing"
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      transcription, 
      context, 
      challengeType,
      speakingDurationSeconds 
    } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!transcription || transcription.trim().length === 0) {
      return new Response(JSON.stringify({
        error: "No transcription provided",
        fallbackFeedback: {
          positiveReinforcement: "Parece que não conseguimos capturar sua fala. Tente novamente!",
          fluencyNote: "Certifique-se de que o microfone está funcionando corretamente.",
          pronunciationTip: "",
          naturalPhrase: null,
          scores: { fluency: 0, clarity: 0, confidence: 0 },
          encouragement: "Vamos tentar de novo!"
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[evaluate-speech] Evaluating ${transcription.length} chars, context: ${context}, type: ${challengeType}`);

    const userPrompt = `Evaluate this English speech from a learner:

TRANSCRIPTION:
"${transcription}"

CONTEXT: ${context || 'General conversation'}
CHALLENGE TYPE: ${challengeType || 'free-talk'}
SPEAKING DURATION: ${speakingDurationSeconds || 0} seconds

Remember:
- Reference their ACTUAL words in your feedback
- Be specific and encouraging
- Keep it brief and actionable
- Return valid JSON only`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: evaluationPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("[evaluate-speech] AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "";

    console.log("[evaluate-speech] AI response:", aiContent.substring(0, 200));

    // Parse JSON from response
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const evaluation = JSON.parse(jsonMatch[0]);
        
        // Validate required fields
        if (!evaluation.positiveReinforcement || !evaluation.scores) {
          throw new Error("Missing required fields");
        }

        return new Response(JSON.stringify({
          success: true,
          evaluation,
          transcription,
          analyzedAt: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (parseError) {
      console.error("[evaluate-speech] Parse error:", parseError);
    }

    // Fallback if parsing fails
    return new Response(JSON.stringify({
      success: true,
      evaluation: {
        positiveReinforcement: `Ótimo esforço! Você conseguiu se expressar em inglês.`,
        fluencyNote: "Continue praticando para desenvolver um ritmo mais natural.",
        pronunciationTip: "Preste atenção na entonação das frases para soar mais natural.",
        naturalPhrase: null,
        scores: {
          fluency: 65,
          clarity: 70,
          confidence: 60
        },
        encouragement: "Cada prática te deixa mais fluente. Continue assim!"
      },
      transcription,
      analyzedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[evaluate-speech] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      fallbackFeedback: {
        positiveReinforcement: "Boa tentativa! Continue praticando.",
        fluencyNote: "A prática leva à fluência.",
        pronunciationTip: "",
        naturalPhrase: null,
        scores: { fluency: 50, clarity: 50, confidence: 50 },
        encouragement: "Não desista, você está no caminho certo!"
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
