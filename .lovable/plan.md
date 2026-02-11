

# Tema Principal: Selecao, Ajuste e Conteudo Dinamico

## Visao Geral

Quatro mudancas interligadas que tornam o conteudo dos desafios dinamico, tematico e progressivo:

1. Tela de selecao de tema no final do onboarding
2. Opcao de ajuste de tema no Menu de configuracoes
3. Edge function para gerar conteudo de desafio dinamico via IA (substituindo o conteudo hardcoded)
4. Integracao do vocabulario aprendido nas frases geradas

## Detalhes da Implementacao

### 1. Tela de selecao de tema no onboarding

**Arquivo: `src/components/AppPreviewCarousel.tsx`**

Adicionar um slide final (antes do "Pronto para comecar?") com selecao de tema. Os temas disponiveis:

| Valor | Label | Icone |
|-------|-------|-------|
| `work` | Trabalho e Carreira | Briefcase |
| `travel` | Viagens | Plane |
| `conversation` | Conversacao do Dia a Dia | MessageCircle |
| `study` | Estudos e Intercambio | GraduationCap |

O slide tera cards selecionaveis (estilo radio visual). A selecao sera armazenada em estado local e passada ao `onComplete`.

**Arquivo: `src/components/Onboarding.tsx`**

Atualizar a interface para receber o tema selecionado e repassar ao `onComplete`.

**Arquivo: `src/pages/Index.tsx`**

Atualizar `handleOnboardingComplete` para receber o tema e salvar no profile:
```
await updateProfile({ goal: selectedGoal, level: 'beginner' });
```

### 2. Ajuste de tema no Menu

**Arquivo: `src/components/SettingsMenu.tsx`**

Adicionar novo item "Tema" no dropdown e um Dialog para selecao:
- Mostra os 4 temas com radio buttons estilizados
- Indica o tema atual com check
- Ao salvar, chama `updateProfile({ goal: newGoal })`
- Posicionar entre "Plano" e "Dados pessoais"

### 3. Edge Function para gerar desafios dinamicos

**Arquivo: `supabase/functions/generate-challenge/index.ts`** (novo)

Nova edge function que gera conteudo de desafio usando IA. Recebe:
- `goal`: tema do usuario (work, travel, conversation, study)
- `level`: nivel atual (beginner, intermediate, advanced)
- `date`: data atual (para seed de variacao)
- `vocabularyWords`: lista de palavras aprendidas recentemente para incorporar

Retorna JSON com:
```json
{
  "title": "Titulo do desafio em portugues",
  "inputText": "Texto de input longo em ingles (3 paragrafos)",
  "shadowingSentences": ["10 frases extraidas/relacionadas ao input"],
  "questions": ["4 perguntas abertas de output"]
}
```

O prompt da IA instrui:
- Gerar conteudo aderente ao tema mas com sub-topicos variados a cada dia (usando a data como seed)
- Incorporar 2-3 palavras do vocabulario aprendido nas frases de shadowing e nas perguntas de output
- Ajustar complexidade ao nivel do usuario
- Nunca repetir o mesmo cenario exato

**Arquivo: `src/components/ChallengeFlow.tsx`**

Mudancas principais:
- Remover o objeto `goalThemes` hardcoded
- Ao montar, chamar a edge function `generate-challenge` para obter o conteudo
- Mostrar loading enquanto gera
- Cachear o conteudo gerado na `challenge_sessions` (campo novo `challenge_content` jsonb) para nao regerar ao retomar
- Buscar vocabulario recente do usuario (ultimas 20 palavras confident) para enviar a edge function

### 4. Persistir conteudo gerado na sessao

**Migracao de banco:**

Adicionar coluna `challenge_content` (jsonb, nullable) a tabela `challenge_sessions` para armazenar o conteudo gerado e permitir retomada sem regerar.

```sql
ALTER TABLE challenge_sessions ADD COLUMN challenge_content jsonb;
```

## Fluxo Tecnico

```text
Onboarding (selecao tema)
        |
        v
  profiles.goal = 'work' | 'travel' | 'conversation' | 'study'
        |
        v
  ChallengeFlow monta
        |
        +--> Tem challenge_sessions.challenge_content para hoje? 
        |         SIM --> Usa conteudo salvo
        |         NAO --> Chama generate-challenge
        |                    |
        |                    +--> Envia: goal, level, date, vocabularyWords[]
        |                    |
        |                    +--> Recebe: title, inputText, shadowingSentences, questions
        |                    |
        |                    +--> Salva em challenge_sessions.challenge_content
        |
        v
  Desafio com conteudo dinamico
```

## Arquivos criados/modificados

| Arquivo | Acao |
|---------|------|
| `supabase/functions/generate-challenge/index.ts` | Criar -- edge function de geracao de desafio |
| `src/components/AppPreviewCarousel.tsx` | Modificar -- adicionar slide de selecao de tema |
| `src/components/Onboarding.tsx` | Modificar -- repassar tema selecionado |
| `src/pages/Index.tsx` | Modificar -- salvar tema no profile |
| `src/components/SettingsMenu.tsx` | Modificar -- adicionar opcao de ajuste de tema |
| `src/components/ChallengeFlow.tsx` | Modificar -- substituir hardcoded por geracao dinamica |
| Migracao SQL | Criar -- adicionar coluna `challenge_content` em `challenge_sessions` |

## Detalhes do Prompt da Edge Function

O prompt da IA para geracao de desafios incluira:
- Instrucao para variar sub-topicos dentro do tema principal com base na data
- Lista de palavras do vocabulario aprendido para incorporar naturalmente nas frases
- Regra de ajuste de complexidade por nivel (beginner: frases curtas e vocabulario simples; advanced: frases compostas e vocabulario rico)
- Exigencia de 10 frases de shadowing e 4 perguntas de output
- Proibicao de repetir cenarios exatos de dias anteriores

