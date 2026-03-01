

# Migração de ElevenLabs + Web Speech API para OpenAI (Whisper + TTS)

## Visão geral

Substituir completamente o ElevenLabs (TTS) e a Web Speech API (STT) pela API da OpenAI, usando:
- **Whisper** para transcrição de áudio (STT)
- **OpenAI TTS** (`tts-1` com voz `alloy` ou similar) para síntese de voz

## Pré-requisito

Será necessário adicionar sua chave da API da OpenAI como secret do projeto (via ferramenta segura). Ela será usada nas edge functions.

## Mudanças

### 1. Nova edge function: `openai-tts`

Substitui a `elevenlabs-tts`. Recebe `{ text, voice? }` e retorna áudio MP3 via API `https://api.openai.com/v1/audio/speech`.

- Modelo: `tts-1` (rápido) ou `tts-1-hd` (qualidade)
- Voz padrão: `alloy` (ou `nova`, `echo`, etc.)
- Retorna `audio/mpeg` como já faz a atual

### 2. Nova edge function: `openai-stt`

Recebe áudio (FormData com arquivo) e retorna transcrição via Whisper (`https://api.openai.com/v1/audio/transcriptions`).

- Modelo: `whisper-1`
- Idioma: `en`
- Retorna `{ text: "transcription" }`

### 3. Novo hook: `useWhisperRecognition`

Substitui `useSpeechRecognition`. Usa `MediaRecorder` para gravar áudio real do microfone e envia para a edge function `openai-stt`.

Interface mantém compatibilidade:
- `startListening()` → inicia `MediaRecorder`
- `stopListening()` → para gravação, envia blob para edge function, retorna texto
- `transcript`, `isListening`, `isSupported`, `error` — mesmos campos

Diferença principal: o transcript parcial (interim) não existirá mais — Whisper só retorna resultado final após enviar o áudio completo. O campo `transcript` será atualizado apenas após o envio.

### 4. Atualizar componentes consumidores

Trocar imports e chamadas em 4 arquivos:

| Arquivo | Mudança TTS | Mudança STT |
|---------|------------|------------|
| `ChallengeFlow.tsx` | `elevenlabs-tts` → `openai-tts` | `useSpeechRecognition` → `useWhisperRecognition` |
| `FreeTalkFlow.tsx` | `elevenlabs-tts` → `openai-tts` | `useSpeechRecognition` → `useWhisperRecognition` |
| `AssessmentFlow.tsx` | `elevenlabs-tts` → `openai-tts` | N/A (não usa STT) |
| `VocabularyLearningModal.tsx` | `elevenlabs-tts` → `openai-tts` | N/A (não usa STT) |

### 5. Atualizar `supabase/config.toml`

Adicionar entradas para `openai-tts` e `openai-stt` com `verify_jwt = false`.

## Impacto na UX

- **TTS**: Qualidade diferente (vozes OpenAI vs ElevenLabs), mas funcional
- **STT**: Precisão do Whisper é superior à Web Speech API, porém **sem transcript parcial em tempo real** — o texto só aparece após parar a gravação. O waveform visualizer continua funcionando (usa MediaStream)
- **Custo**: Passa a consumir créditos da sua conta OpenAI em vez do ElevenLabs

## Detalhes técnicos

```text
Fluxo STT (novo):
  User toca gravar
    → MediaRecorder.start() captura áudio
    → WaveformVisualizer usa o MediaStream (sem mudança visual)
  User toca parar
    → MediaRecorder.stop() gera Blob (webm/mp4)
    → Blob enviado via FormData para edge function openai-stt
    → Whisper retorna texto
    → Componente recebe transcript final

Fluxo TTS (novo):
  Componente chama fetch('openai-tts', { text })
    → Edge function chama OpenAI TTS API
    → Retorna audio/mpeg
    → Componente toca com HTMLAudioElement (sem mudança)
```

