

# Fix: 3 Problemas do Onboarding

## Problemas Identificados

### 1. Onboarding reinicia apos feedback da IA (BUG CRITICO)
**Causa raiz**: Em `Index.tsx` linha 32, a condição para considerar o onboarding completo é:
```
if (profile.goal && profile.level !== 'beginner')
```
Se a IA avalia o usuario como `beginner`, a condição falha e o app volta ao onboarding em loop infinito. Qualquer nivel "beginner" causa esse problema.

**Correção**: Mudar a lógica para verificar apenas se `goal` e `level` estão definidos (não nulos), independente do valor do nível.

### 2. Tempo de processamento longo
**Causa raiz**: Cada interação faz uma chamada ao Gemini via edge function (2-5s) + chamada ao ElevenLabs TTS (2-3s), somando 4-8s por turno. Na avaliação final (3a pergunta), o processamento é ainda mais lento pois o modelo precisa gerar JSON estruturado.

**Correção**:
- Adicionar feedback visual progressivo durante o processamento ("Analisando sua resposta...", "Gerando feedback...")
- Na fase de avaliação, mostrar animação de progresso com etapas visuais ao invés de apenas um spinner genérico
- Pular o TTS na última mensagem do Alex (que é a avaliação), já que o resultado é exibido como texto na tela de resultado

### 3. Ultima fala do Alex não carregou
**Causa raiz**: Quando `isComplete` é `true` na resposta da 3a pergunta (linha 305-312), o fluxo pula direto para a fase "evaluating" sem falar nenhuma mensagem. Não há mensagem final do Alex antes do resultado.

**Correção**: Antes de ir para a fase de resultado, falar uma mensagem de transição curta como "Great conversation! Let me analyze your English level..." usando TTS, e só depois mostrar o resultado.

---

## Detalhes Técnicos

### Arquivo: `src/pages/Index.tsx`
- Linha 32: Trocar `profile.level !== 'beginner'` por `profile.level !== null` (ou simplesmente `profile.level`)

### Arquivo: `src/components/AssessmentFlow.tsx`
- Linhas 305-312: Ao receber `isComplete`, primeiro falar uma mensagem de transição via TTS, depois ir para fase "evaluating"
- Linhas 458-461: Melhorar o indicador de loading com mensagens contextuais baseadas no estado atual
- Linhas 500-509: Adicionar etapas visuais animadas na tela "Analisando" (ex: checkmarks aparecendo: "Fluência analisada", "Vocabulário avaliado", etc.)

