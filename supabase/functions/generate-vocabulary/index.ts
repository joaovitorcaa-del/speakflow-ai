import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { theme, wordCount = 3 } = await req.json();
    const count = Math.min(Math.max(wordCount, 3), 5); // Clamp between 3-5

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Check how many words were already generated today for this user
    const today = new Date().toISOString().split('T')[0];
    const { data: todayWords } = await supabaseClient
      .from('vocabulary_words')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`);

    if (todayWords && todayWords.length >= 5) {
      return new Response(JSON.stringify({ 
        error: "Daily limit reached", 
        message: "Você já aprendeu 5 palavras hoje! Volte amanhã para mais." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const remainingCount = Math.min(count, 5 - (todayWords?.length || 0));

    // Get words already learned to avoid duplicates
    const { data: existingWords } = await supabaseClient
      .from('vocabulary_words')
      .select('word')
      .eq('user_id', user.id);

    const existingWordsList = existingWords?.map(w => w.word.toLowerCase()) || [];

    const systemPrompt = `You are a vocabulary assistant for an English speaking practice app for Brazilian Portuguese speakers.
Your job is to suggest practical, high-frequency vocabulary words that are useful in everyday conversation.

RULES:
- Choose words that are COMMON and USEFUL in spoken English
- NO academic or rare words
- NO technical jargon unless it's everyday tech (like "deadline", "meeting", "update")
- Each word MUST have a simple explanation in PLAIN ENGLISH (no Portuguese)
- Each word MUST have a practical, realistic example phrase
- Words should relate to the given theme if provided
- NEVER repeat words the user already knows

ALREADY KNOWN WORDS (do not suggest these): ${existingWordsList.slice(-100).join(', ')}`;

    const userPrompt = `Generate ${remainingCount} vocabulary words${theme ? ` related to the theme: "${theme}"` : ' for everyday conversation'}.

Return a JSON array with this exact structure:
[
  {
    "word": "deadline",
    "explanation": "A deadline is the date or time when something must be finished.",
    "example_phrase": "I have a deadline tomorrow, so I need to finish this today."
  }
]

Only return the JSON array, nothing else.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate vocabulary");
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    let words;
    try {
      // Try to extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        words = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON array found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse vocabulary response");
    }

    // Insert words into database
    const wordsToInsert = words.map((w: any) => ({
      user_id: user.id,
      word: w.word,
      explanation: w.explanation,
      example_phrase: w.example_phrase,
      context_theme: theme || null,
    }));

    const { data: insertedWords, error: insertError } = await supabaseClient
      .from('vocabulary_words')
      .insert(wordsToInsert)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save vocabulary");
    }

    return new Response(JSON.stringify({ 
      success: true, 
      words: insertedWords,
      remaining: 5 - (todayWords?.length || 0) - remainingCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("generate-vocabulary error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
