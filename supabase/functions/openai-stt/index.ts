import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const formData = await req.formData();
    const audioFile = formData.get("file");
    
    if (!audioFile || !(audioFile instanceof File)) {
      throw new Error("Audio file is required");
    }

    console.log(`[openai-stt] Transcribing audio: ${audioFile.size} bytes, type: ${audioFile.type}`);

    const apiFormData = new FormData();
    apiFormData.append("file", audioFile);
    apiFormData.append("model", "whisper-1");
    apiFormData.append("language", "en");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: apiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[openai-stt] API error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI STT API error: ${response.status}`);
    }

    const result = await response.json();
    console.log(`[openai-stt] Transcription: "${result.text?.substring(0, 50)}..."`);

    return new Response(
      JSON.stringify({ text: result.text }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[openai-stt] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
