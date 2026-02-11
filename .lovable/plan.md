
# Correcao do Microfone no iPhone (iOS Safari)

## Problemas Identificados

### Problema 1: Shadowing nao transcreve no iOS
No iOS Safari, o modo `continuous = false` da Web Speech API frequentemente entrega o resultado final (`isFinal = true`) apenas no evento `onend`, e nao antes do `stop()` ser chamado. Quando `stopListening()` e invocado, `accumulatedRef` ainda esta vazio. O codigo trata isso como "audio confirmado sem texto", setando `audioConfirmed = true` mas nunca chamando `getShadowingFeedback`.

### Problema 2: FreeTalk microfone desativa sozinho no iOS
O fluxo atual chama `getUserMedia()` para verificar permissao e imediatamente encerra o stream, seguido por `recognition.start()`. No iOS Safari, liberar um stream de audio e iniciar outro (SpeechRecognition) em sequencia rapida causa conflito — o iOS so permite uma captura de audio por vez. O reconhecimento inicia e encerra imediatamente.

## Solucao

### 1. Remover `getUserMedia` pre-check no `useSpeechRecognition`

**Arquivo: `src/hooks/useSpeechRecognition.tsx`**

- Remover a funcao `requestMicrophoneAccess` que chama `getUserMedia` antes de iniciar o reconhecimento
- Em `startListening`, pular o pre-check de permissao e iniciar `recognition.start()` diretamente
- A propria Web Speech API ja solicita permissao de microfone ao usuario quando necessario
- Se ocorrer erro `not-allowed`, o handler de erro ja trata isso corretamente
- Isso elimina o conflito de captura dupla de audio no iOS

### 2. Capturar transcript no `onend` para iOS

**Arquivo: `src/hooks/useSpeechRecognition.tsx`**

- No handler `onend`, quando `isActiveRef.current` e `false` (ou seja, o usuario pediu para parar), verificar se `accumulatedRef` esta vazio
- Se vazio, usar o ultimo `interimTranscript` disponivel como fallback (salvar em uma ref separada `lastInterimRef`)
- Adicionar um pequeno delay (300ms) antes de chamar `stop()` no `stopListening` para dar tempo ao iOS de entregar o resultado final
- Alterar `stopListening` para retornar via Promise ou usar o callback `onResult` de forma mais confiavel

### 3. Refatorar `stopListening` com delay para iOS

**Arquivo: `src/hooks/useSpeechRecognition.tsx`**

Mudanca principal em `stopListening`:
- Ao inves de chamar `recognition.stop()` e retornar imediatamente, aguardar um curto periodo (300ms) para que o iOS processe o resultado final
- Usar uma Promise que resolve com o texto final apos o delay
- Manter `lastInterimRef` como fallback caso o resultado final nao chegue

### 4. Ajustar ChallengeFlow para lidar com transcript assincrono

**Arquivo: `src/components/ChallengeFlow.tsx`**

- `handleRecordToggle`: como `stopListening` passara a ser async (retornando Promise), ajustar o `await`
- Usar o `transcript` state como fallback se `stopListening` retornar vazio
- Garantir que `getShadowingFeedback` seja chamado mesmo quando o texto vem do fallback

### 5. Ajustar FreeTalkFlow para o mesmo padrao

**Arquivo: `src/components/FreeTalkFlow.tsx`**

- `handleRecordToggle`: mesma logica — usar `transcript` como fallback se `stopListening` retornar vazio
- `handleSendTranscript`: ajustar para o novo formato async

## Mudancas Detalhadas no Hook

```text
useSpeechRecognition.tsx:

1. Nova ref: lastInterimRef = useRef('')
2. Em onresult: salvar interimTranscript em lastInterimRef
3. Remover requestMicrophoneAccess (getUserMedia)
4. startListening: remover chamada a requestMicrophoneAccess, ir direto para recognition.start()
5. stopListening: 
   - Setar isActiveRef = false
   - Chamar recognition.stop()
   - Esperar 300ms
   - Retornar accumulatedRef || lastInterimRef como fallback
   - Retornar Promise<string> ao inves de string
6. onend: se !isActiveRef e accumulatedRef vazio, usar lastInterimRef
```

## Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useSpeechRecognition.tsx` | Remover getUserMedia pre-check, adicionar lastInterimRef fallback, tornar stopListening async com delay |
| `src/components/ChallengeFlow.tsx` | Ajustar handleRecordToggle para await stopListening e usar transcript como fallback |
| `src/components/FreeTalkFlow.tsx` | Ajustar handleRecordToggle e handleSendTranscript para await stopListening e usar transcript como fallback |
