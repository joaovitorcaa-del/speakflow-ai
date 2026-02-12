

# Correcoes no ChallengeFlow: mic apos audio, transcricao vazia e navegacao

## Problemas identificados

### 1. Audio playback quebra o microfone no iOS
Quando o usuario clica no botao de ouvir a frase (Volume2), o `HTMLAudioElement` toma controle da sessao de audio do dispositivo. No iOS Safari, apenas uma "audio session" pode estar ativa por vez. Quando o usuario tenta gravar depois, a Web Speech API inicia (o botao muda visualmente, o iPhone mostra o indicador de mic), mas o audio nao e roteado para o reconhecimento de fala -- resultado: nenhuma transcricao.

**Causa no codigo (linhas 304-331)**: `playAudioUrl` cria um `new Audio()` que fica referenciado em `audioRef.current`, mas apos o `onended`, o elemento nao e liberado. O `audio.pause()` na linha 306 pausa mas nao libera a sessao de audio.

**Solucao**: No `onended` e no `stopAudio`, alem de pausar, setar `audioRef.current.src = ''` e `audioRef.current = null` para liberar a sessao de audio do iOS antes de qualquer tentativa de gravar. Tambem adicionar um guard em `handleRecordToggle`: se o audio estiver tocando, parar antes de iniciar a gravacao.

### 2. Feedback falso de "Audio recebido" sem transcricao
Linha 397-398: quando `text` esta vazio, `setAudioConfirmed(true)` e chamado mesmo assim, mostrando o card verde "Audio recebido" sem ter capturado nada.

**Solucao**: Novo estado `transcriptionFailed`. Quando `text` esta vazio, setar `transcriptionFailed = true` em vez de `audioConfirmed = true`. Na UI, mostrar card amarelo com "Nao foi possivel capturar sua fala. Tente novamente." O estado limpa ao iniciar nova gravacao ou mudar de step/index.

### 3. Avanco sem registro permite prosseguir sem aviso
O botao "Proxima frase" nao diferencia se a etapa foi completada ou nao.

**Solucao**: Se a etapa atual nao foi completada (sem gravacao registrada), o botao muda para "Pular" com estilo `outline` em vez de `hero`. O avanco e permitido, mas nao marca a etapa como concluida.

### 4. Sem botao de voltar entre frases
Nao ha como retornar a uma frase anterior no shadowing ou output.

**Solucao**: Botao com icone `ChevronLeft` ao lado do botao de avancar. No shadowing: decrementa `shadowingIndex` se > 0. No output: decrementa `outputIndex` se > 0; se `outputIndex === 0`, volta para ultima frase do shadowing.

## Detalhes tecnicos

### Arquivo: `src/components/ChallengeFlow.tsx`

**Novo estado:**
```text
const [transcriptionFailed, setTranscriptionFailed] = useState(false);
```

**Correcao do audio (playAudioUrl e stopAudio):**
```text
// Em playAudioUrl - onended:
audio.onended = () => {
  setIsPlaying(false);
  audio.src = '';
  audioRef.current = null;
  // marcar inputListened se step === 'input'
};

// Em stopAudio:
if (audioRef.current) {
  audioRef.current.pause();
  audioRef.current.src = '';
  audioRef.current = null;
}
```

**Guard no handleRecordToggle (bloco else, ao iniciar gravacao):**
```text
// Antes de startListening, parar qualquer audio tocando
if (isPlaying) stopAudio();
```

**handleRecordToggle - bloco text vazio (linha 397-398):**
```text
ANTES: setAudioConfirmed(true);
DEPOIS: setTranscriptionFailed(true);
```

**Limpar transcriptionFailed:**
```text
- Ao iniciar nova gravacao (junto com setAudioConfirmed(false))
- No useEffect de [step, shadowingIndex, outputIndex] (linha 360)
```

**Nova funcao handlePreviousStep:**
```text
const handlePreviousStep = () => {
  if (step === 'shadowing' && shadowingIndex > 0) {
    setShadowingIndex(prev => prev - 1);
  } else if (step === 'output') {
    if (outputIndex > 0) {
      setOutputIndex(prev => prev - 1);
    } else {
      // Volta para ultima frase do shadowing
      setStep('shadowing');
      setShadowingIndex(shadowingSentences.length - 1);
    }
  }
};
```

**UI - Card de falha (shadowing e output):**
```text
Condicao: transcriptionFailed && !audioConfirmed && !isRecording
Icone: AlertCircle amarelo
Texto: "Nao foi possivel capturar sua fala. Tente novamente."
```

**UI - Botao avancar condicional:**
```text
Se etapa atual nao completada:
  variant="outline", texto="Pular" (shadowing) ou "Pular pergunta" (output)
Se completada:
  variant="hero", texto normal
```

**UI - Botao voltar:**
```text
Visivel se shadowingIndex > 0 (shadowing) ou sempre no output
Icone ChevronLeft, variant="outline"
Posicionado em row com o botao de avancar
```

## Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/ChallengeFlow.tsx` | Liberar audio session apos playback, guard no mic, estado transcriptionFailed, botao voltar, botao pular |

