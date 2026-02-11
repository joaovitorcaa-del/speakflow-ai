

# Pacote de Melhorias -- SpeakDaily v2

Este plano cobre 13 ajustes identificados, organizados por prioridade e agrupados por area de impacto.

---

## Grupo A: Desafio Diario -- Conteudo e Progresso (itens 1, 6, 7, 9, 12)

### 1. Titulo do Desafio alinhado ao objetivo do usuario

**Problema**: O titulo do desafio na HomeScreen esta fixo ("Descrevendo seu trabalho") e as frases de shadowing nao correspondem ao tema do goal.

**Solucao**:
- Em `HomeScreen.tsx`, ler `profile.goal` (passado como nova prop) e exibir o titulo dinamico baseado no goal
- Em `ChallengeFlow.tsx`, gerar as frases de shadowing tambem a partir do `goalThemes`, extraindo-as do `inputText` em vez de usar uma lista fixa desconectada do tema

### 6. Salvar etapa do desafio para retomar

**Problema**: Se o usuario sair no meio do desafio, perde todo o progresso.

**Solucao**:
- Criar nova tabela `challenge_sessions` com colunas: `id`, `user_id`, `date`, `current_step` (input/shadowing/output/feedback/complete), `current_index` (indice da frase/pergunta), `transcriptions` (jsonb array), `speaking_seconds` (integer), `created_at`, `updated_at`
- Em `ChallengeFlow`, ao mudar de step ou index, fazer upsert nessa tabela
- Em `Index.tsx`, ao iniciar desafio, verificar se existe sessao incompleta para o dia e restaurar o estado

### 7. Permitir avancar mas registrar conclusao parcial

**Problema**: O usuario pode pular etapas sem completar e o desafio conta como 100%.

**Solucao**:
- Adicionar estado `stepsCompleted` que rastreia: `inputListened` (boolean), `shadowingRecorded` (array de booleans por frase), `outputRecorded` (array de booleans por pergunta)
- Calcular `completionPercentage` baseado em quantas acoes foram efetivamente realizadas vs total
- Botao "Proximo" permanece disponivel, mas a barra de progresso reflete a conclusao real
- Na tela final, mostrar % de conclusao e so marcar `challenge_completed = true` se >= 80%

### 9. Validacao para finalizar desafio

**Problema**: Botao "Finalizar desafio" funciona sem o usuario ter falado nada.

**Solucao**:
- Se `allTranscriptions.length === 0` ou `speakingDuration < 10`, desabilitar o botao "Finalizar desafio" e mostrar "Desafio incompleto"
- Adicionar botao alternativo "Retomar desafio" que volta a etapa mais recente incompleta

### 12. Card do desafio na Home mostra status de conclusao

**Problema**: Nao ha indicacao visual de que o desafio do dia ja foi completado.

**Solucao**:
- Passar `todayChallengeCompleted` como prop para HomeScreen (verificar em `daily_progress`)
- Se completo: mostrar badge "Completo" e alterar texto do botao para "Exercicio de fixacao"
- Se parcialmente completo: mostrar porcentagem
- Ao clicar em exercicio de fixacao, chamar `ChallengeFlow` com prop `isFixation={true}` que nao contabiliza progresso

---

## Grupo B: Feedback de Voz -- Shadowing e Output (itens 3, 4, 5, 8)

### 3. Sinalizacao de audio recebido no Shadowing e Output

**Problema**: Apos gravar, nao ha confirmacao de que o audio foi capturado.

**Solucao**:
- Adicionar estado `audioReceived` (array por indice) em ambas as etapas
- Apos `stopListening` retornar texto, exibir card de confirmacao: icone de check verde + "Audio recebido" + preview do texto transcrito
- Manter visivel ate usuario avancar

### 4. Feedback por frase no Output

**Problema**: No output, nao ha feedback entre perguntas.

**Solucao**:
- Apos cada output gravado, chamar `evaluate-speech` com a transcricao individual + contexto da pergunta
- Exibir mini-card de feedback antes de avancar: sugestao de frase mais fluida ou correcao
- Adicionar estado `outputFeedbacks` (array de feedbacks por pergunta)

### 5. Output encerrou do nada

**Problema provavel**: O `stopListening` esta sendo chamado prematuramente pelo evento `onend` da Web Speech API, ou o `maxRestarts` de 3 esta sendo excedido.

**Solucao**:
- Aumentar `maxRestarts` para 5 em `useSpeechRecognition`
- Adicionar log mais detalhado no `onend` para debug
- No output, se a gravacao terminar inesperadamente e houver texto acumulado, tratar como gravacao valida (nao descartar)

### 8. Animacao de analise no Feedback e exemplos reais

**Problema**: Feedback nao transmite confianca de analise real.

**Solucao**:
- Na tela de feedback, antes de mostrar resultados: animacao sequencial com checkmarks (similar ao onboarding): "Analisando fluencia...", "Avaliando vocabulario...", "Verificando pronuncia..."
- Nos cards de feedback, incluir citacao direta da fala do usuario (campo `naturalPhrase.original` ja existe)
- Garantir que `allTranscriptions` esta sendo passado corretamente para `evaluate-speech` -- verificar que o array nao esta vazio

---

## Grupo C: Celebracao e Metricas (itens 10, 11)

### 10. Efeito de celebracao e metricas reais

**Problema**: Tela de "Desafio Completado" e simples e minutos falados sao estimados.

**Solucao**:
- Adicionar animacao de confetti/particulas na tela `complete` usando CSS keyframes (sem dependencia externa)
- Substituir `speaking_minutes: 20` fixo em `handleChallengeComplete` pelo valor real de `speakingDuration` (em minutos), passado como parametro de `ChallengeFlow` via callback
- Contabilizar frases efetivamente gravadas (`allTranscriptions.length`)
- Usar score de fluencia retornado pela IA (`evaluation.scores.fluency`)

### 11. Streak de foguinho baseado em desafios consecutivos

**Problema**: O streak pode nao estar refletindo corretamente os dias consecutivos.

**Solucao**:
- Verificar que `update_user_streak` RPC esta sendo chamada corretamente apos `challenge_completed = true`
- Na HomeScreen, garantir que `profile.current_streak` e atualizado apos completar desafio (refetch do profile)
- O StreakDisplay ja esta correto visualmente, o problema esta na atualizacao dos dados

---

## Grupo D: Free Talk (item 13)

### 13. Free Talk -- feedback visual e contabilizacao real

**Problema**: Sem feedback de gravacao, sem confirmacao de recebimento, tempo nao contabilizado corretamente.

**Solucao**:
- **Feedback visual de gravacao**: O WaveformVisualizer ja esta presente mas o `isListening` pode nao estar atualizando. Garantir que `micStatus` reflete corretamente no botao (cor, animacao pulse-glow)
- **Confirmacao de recebimento**: Apos enviar mensagem, mostrar checkmark no card do usuario ("Enviado") antes da resposta da IA
- **Contabilizacao de tempo**: Substituir `elapsedTime` (tempo total na tela) por `speakingTime` que conta apenas o tempo efetivo de gravacao (somar duracoes entre `startListening` e `stopListening`)
- **Na Home**: Passar `speakingTime` real para `handleFreeTalkComplete` em vez do tempo total
- **Exibir de forma intuitiva**: No FreeTalkCard na home, mostrar "X min falados hoje" baseado em `daily_progress.speaking_minutes`

---

## Grupo E: Responsividade (item 2)

### 2. Ajustar responsividade mobile

**Problema**: Barras de rolagem visiveis e bordas cortadas no celular.

**Solucao**:
- Adicionar `overflow-x-hidden` no container principal das telas
- No `ChallengeFlow` e `FreeTalkFlow`: usar `min-h-[100dvh]` em vez de `min-h-screen` para respeitar viewport dinamico do mobile
- Garantir que cards usam `max-w-full` e nao ultrapassam o viewport
- Verificar padding lateral consistente (`px-4` para mobile)
- Adicionar no `index.css`: `html, body { overflow-x: hidden; }` e `-webkit-overflow-scrolling: touch`

---

## Mudancas no Banco de Dados

Nova tabela necessaria:

```text
challenge_sessions
  - id: uuid (PK, default gen_random_uuid())
  - user_id: uuid (NOT NULL)
  - date: date (NOT NULL, default CURRENT_DATE)
  - current_step: text (NOT NULL, default 'input')
  - current_index: integer (NOT NULL, default 0)
  - transcriptions: jsonb (default '[]')
  - speaking_seconds: integer (default 0)
  - steps_completed: jsonb (default '{}')
  - created_at: timestamptz (default now())
  - updated_at: timestamptz (default now())
  - UNIQUE(user_id, date)
  - RLS: user can SELECT/INSERT/UPDATE/DELETE own records
```

---

## Arquivos Modificados

| Arquivo | Mudancas |
|---------|----------|
| `src/pages/Index.tsx` | Passar goal e challenge status para HomeScreen, receber speakingDuration do ChallengeFlow, verificar sessao existente |
| `src/components/HomeScreen.tsx` | Receber e exibir goal no titulo do desafio, mostrar status de conclusao, exibir minutos falados reais |
| `src/components/ChallengeFlow.tsx` | Frases de shadowing do tema, feedback por output, confirmacao audio, validacao finalizar, animacao feedback, salvar sessao, retomar, confetti |
| `src/components/FreeTalkFlow.tsx` | Tracking de tempo efetivo de fala, confirmacao visual de envio |
| `src/components/FreeTalkCard.tsx` | Exibir minutos falados hoje |
| `src/hooks/useSpeechRecognition.tsx` | Aumentar maxRestarts, melhorar tratamento de onend |
| `src/index.css` | overflow-x: hidden, 100dvh, confetti keyframes |
| Migration SQL | Criar tabela challenge_sessions |

---

## Ordem de Implementacao

1. Responsividade (rapido, sem risco)
2. Tabela challenge_sessions + salvar/retomar etapa
3. Titulo dinamico + frases de shadowing do tema
4. Confirmacao de audio recebido (shadowing + output)
5. Feedback por frase no output
6. Validacao de finalizacao + % conclusao
7. Animacao de analise no feedback
8. Status na Home + exercicio de fixacao
9. Confetti + metricas reais
10. Streak + refetch
11. Free Talk: tempo real + confirmacao
12. Fix output encerrando (maxRestarts)

