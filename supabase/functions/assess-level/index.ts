import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const goalContexts: Record<string, string> = {
  work: "profissional, focado em reuniões de trabalho, emails corporativos e apresentações",
  travel: "viagem, focado em situações de turismo, aeroportos, hotéis e restaurantes",
  conversation: "conversação casual, focado em fazer amigos e falar naturalmente",
  study: "acadêmico, focado em estudos e intercâmbio",
};

const systemPrompt = `Você é um coach de inglês amigável e encorajador chamado Alex. Seu papel é avaliar o nível de inglês do usuário através de uma conversa natural.

REGRAS IMPORTANTES:
- Seja sempre positivo e encorajador
- Fale em inglês simples e claro
- Use frases curtas e diretas
- NUNCA corrija gramática durante a avaliação
- Foque em manter a conversa fluindo naturalmente
- Faça perguntas relacionadas ao contexto/tema escolhido pelo usuário

NÍVEIS DE AVALIAÇÃO:
- beginner: Dificuldade em formar frases, vocabulário muito limitado, pausas longas frequentes
- elementary: Consegue frases simples, vocabulário básico, muitas pausas
- intermediate: Consegue expressar ideias, vocabulário adequado, algumas hesitações
- upper_intermediate: Fluente com pequenos erros, bom vocabulário, poucas hesitações  
- advanced: Muito fluente, vocabulário rico, expressões naturais`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, goal, userMessage, conversationHistory } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const goalContext = goalContexts[goal] || goalContexts.conversation;

    if (action === "start") {
      // Generate first question based on goal
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
            { 
              role: "user", 
              content: `O usuário quer aprender inglês para contexto ${goalContext}. 
              
Comece a avaliação com uma saudação calorosa em inglês e faça uma primeira pergunta simples e relevante ao contexto escolhido. Seja breve (máximo 2 frases).`
            }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const aiMessage = data.choices?.[0]?.message?.content || "Hi! Let's start our conversation. Tell me a little about yourself!";

      return new Response(JSON.stringify({ 
        message: aiMessage,
        questionNumber: 1,
        isComplete: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "respond") {
      // Continue conversation or evaluate
      const messages = [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Contexto de aprendizado: ${goalContext}. Mantenha a conversa no tema.`
        },
        ...conversationHistory.map((msg: { role: string; content: string }) => ({
          role: msg.role,
          content: msg.content
        })),
        { role: "user", content: userMessage }
      ];

      const questionNumber = Math.floor(conversationHistory.length / 2) + 1;
      const isLastQuestion = questionNumber >= 3;

      if (isLastQuestion) {
        // Final evaluation
        messages.push({
          role: "user",
          content: `Com base em TODA a conversa acima, avalie o nível de inglês do usuário.

RESPONDA EXATAMENTE NESTE FORMATO JSON (sem markdown, sem código):
{
  "level": "beginner|elementary|intermediate|upper_intermediate|advanced",
  "feedback": "Uma mensagem encorajadora em PORTUGUÊS (2-3 frases) destacando pontos positivos e o que pode melhorar",
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "areasToImprove": ["área 1", "área 2"],
  "encouragement": "Uma frase motivacional em português para começar a jornada"
}`
        });
      } else {
        messages.push({
          role: "user",
          content: `Continue a conversa naturalmente. Faça uma pergunta de follow-up interessante relacionada ao que o usuário disse, mantendo o contexto ${goalContext}. Seja breve (máximo 2 frases).`
        });
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || "";

      if (isLastQuestion) {
        // Parse evaluation JSON
        try {
          // Try to extract JSON from response
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const evaluation = JSON.parse(jsonMatch[0]);
            return new Response(JSON.stringify({
              isComplete: true,
              evaluation
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (parseError) {
          console.error("Error parsing evaluation:", parseError);
        }

        // Fallback evaluation
        return new Response(JSON.stringify({
          isComplete: true,
          evaluation: {
            level: "intermediate",
            feedback: "Você se comunicou muito bem! Continue praticando para melhorar ainda mais.",
            strengths: ["Boa comunicação", "Vocabulário adequado"],
            areasToImprove: ["Fluência", "Pronúncia"],
            encouragement: "Sua jornada de aprendizado começa agora! Vamos juntos!"
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        message: aiResponse,
        questionNumber: questionNumber + 1,
        isComplete: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("assess-level error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
