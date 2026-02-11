import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { goal, level, date, vocabularyWords } = await req.json();

    const themeLabels: Record<string, string> = {
      work: "Work & Career",
      travel: "Travel & Tourism",
      conversation: "Everyday Conversation",
      study: "Studies & Exchange Programs",
    };

    const levelInstructions: Record<string, string> = {
      beginner: "Use simple vocabulary, short sentences (max 12 words), present tense mostly. Avoid idioms and complex grammar.",
      intermediate: "Use varied vocabulary, moderate sentence length (12-20 words), mix tenses. Include some common phrasal verbs.",
      advanced: "Use rich vocabulary, complex sentences with subordinate clauses, varied tenses and moods. Include idioms and nuanced expressions.",
    };

    const themeName = themeLabels[goal] || themeLabels.conversation;
    const levelGuide = levelInstructions[level] || levelInstructions.beginner;
    const vocabList = (vocabularyWords || []).slice(0, 10);
    const vocabInstruction = vocabList.length > 0
      ? `IMPORTANT: Naturally incorporate these recently learned words into the shadowing sentences and output questions: ${vocabList.join(", ")}. Use at least 2-3 of them.`
      : "";

    const prompt = `You are an English learning content generator for a Brazilian Portuguese-speaking audience.

Generate a daily English practice challenge about the theme "${themeName}".
Today's date is ${date}. Use this date as a seed to vary the specific sub-topic within the theme — never repeat the exact same scenario. For example, if the theme is "Work & Career", one day could be about job interviews, another about giving presentations, another about email communication, etc.

${levelGuide}

${vocabInstruction}

Return a valid JSON object with exactly this structure:
{
  "title": "Challenge title in Portuguese (short, 3-6 words)",
  "inputText": "A 3-paragraph English text (~150 words) about the sub-topic. Natural, conversational tone as if someone is telling a story or sharing an experience. Each paragraph should be separated by a blank line.",
  "shadowingSentences": ["exactly 10 short English sentences extracted from or closely related to the input text, each under 15 words for beginner, under 20 for intermediate, under 25 for advanced"],
  "questions": ["exactly 4 open-ended questions in English that prompt the learner to speak about the topic using their own experience"]
}

RULES:
- The title MUST be in Brazilian Portuguese
- All other content MUST be in English
- The inputText should feel natural and conversational, not academic
- Shadowing sentences should be practical and useful in real life
- Questions should be personal and encourage free expression
- Do NOT repeat scenarios from previous days
- Return ONLY the JSON object, no markdown formatting`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a JSON-only content generator. Return only valid JSON, no markdown." },
          { role: "user", content: prompt },
        ],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`AI API failed [${response.status}]: ${errorBody}`);
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const challengeContent = JSON.parse(content);

    // Validate structure
    if (!challengeContent.title || !challengeContent.inputText || !challengeContent.shadowingSentences || !challengeContent.questions) {
      throw new Error("Invalid challenge content structure");
    }

    return new Response(JSON.stringify(challengeContent), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating challenge:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
