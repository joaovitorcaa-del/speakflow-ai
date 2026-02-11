

# Historico por Calendario com Heatmap e Resumo Diario

## Visao Geral

Ao tocar nos dias da semana no topo da Home (area do StreakDisplay), abre um modal/drawer com:

1. **Calendario heatmap** -- mostra todos os dias com desafios concluidos (verde), parciais (amarelo), e inativos (cinza)
2. **Medalhas semanais** -- um pequeno emoji/icone ao lado de cada linha de semana no calendario
3. **Resumo do dia selecionado** -- ao tocar em um dia, exibe na base: minutos falados, se o desafio foi concluido, score medio
4. **Totais da jornada** -- no topo do modal: total de minutos falados e total de palavras aprendidas desde o inicio

## Estrutura da Implementacao

### 1. Novo componente: `src/components/CalendarHistoryModal.tsx`

Modal (usando Drawer no mobile para melhor UX) contendo:

- **Header motivacional**: Total de minutos falados na jornada + total de palavras aprendidas (dados do `profiles` e `vocabulary_words`)
- **Calendario**: Usando `react-day-picker` (ja instalado) com estilizacao customizada para heatmap
  - Dias com `challenge_completed = true`: fundo verde (accent)
  - Dias com `speaking_minutes > 0` mas sem desafio completo: fundo amarelo suave
  - Dias sem atividade: neutro
- **Medalhas por semana**: Para cada semana visivel, calcula o progresso e exibe um emoji pequeno (🥇🥈🥉) ao lado da linha
- **Resumo do dia selecionado**: Card na base mostrando:
  - Data formatada
  - Minutos falados
  - Desafio concluido ou nao
  - Scores medios (fluencia, pronuncia, clareza) se disponiveis

### 2. Novo hook: `src/hooks/useCalendarHistory.tsx`

Responsavel por buscar os dados historicos:

- Busca `daily_progress` do usuario filtrando pelo mes visivel (com margem para semanas parciais)
- Busca totais da jornada: `profiles.total_speaking_minutes` e count de `vocabulary_words` com `is_confident = true`
- Calcula medalhas por semana agrupando os dados semanalmente e aplicando a mesma logica do `useWeeklyStats` (Bronze 60%, Prata 100%, Ouro 120%)
- Retorna os dados formatados para o calendario

### 3. Modificacao: `src/components/StreakDisplay.tsx`

- Tornar a area dos dias da semana clicavel (adicionar `onClick` prop)
- Quando tocado, dispara a abertura do modal de calendario

### 4. Modificacao: `src/components/HomeScreen.tsx`

- Importar e renderizar o `CalendarHistoryModal`
- Gerenciar o estado `showCalendar` (aberto/fechado)
- Passar o callback para o `StreakDisplay`

## Detalhes Tecnicos

### Dados necessarios (todos ja existem no banco)

| Tabela | Campos usados |
|--------|--------------|
| `daily_progress` | date, challenge_completed, speaking_minutes, fluency_score, pronunciation_score, clarity_score |
| `profiles` | total_speaking_minutes |
| `vocabulary_words` | count onde is_confident = true |

### Calculo de medalha semanal

Reutiliza a mesma logica do `useWeeklyStats`:
- Agrupa dias por semana (domingo a sabado)
- Calcula: `minutesProgress = (minutos / 150) * 60` + `daysProgress = (diasAtivos / 7) * 40`
- Bronze >= 60%, Prata >= 100%, Ouro >= 120%

### Estilizacao do heatmap no DayPicker

- Usa `modifiers` e `modifiersClassNames` do react-day-picker para aplicar cores condicionais
- Dias completos: `bg-accent/80 text-accent-foreground`
- Dias parciais: `bg-yellow-400/30`
- Dia selecionado: borda primary

### Navegacao entre meses

- O DayPicker ja suporta navegacao por mes nativamente
- Ao mudar de mes, o hook refaz a query para o novo intervalo

### Layout do modal

```text
+------------------------------------------+
|  Sua Jornada                        [X]  |
|                                          |
|  🎯 142 min falados   📚 23 palavras    |
|                                          |
|  < Janeiro 2026 >                        |
|  S  M  T  W  T  F  S              Medal  |
|  .  .  .  1  2  3  4              --     |
|  5  6  7  8  9  10 11             🥉     |
|  12 13 14 15 16 17 18             🥈     |
|  19 20 21 22 23 24 25             🥇     |
|  26 27 28 29 30 31  .             --     |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │ 📅 15 de janeiro                 │    |
|  │ ✅ Desafio concluido             │    |
|  │ 🎤 22 min falados                │    |
|  │ Fluencia: 78  Pronuncia: 82     │    |
|  └──────────────────────────────────┘    |
+------------------------------------------+
```

### Arquivos criados/modificados

| Arquivo | Acao |
|---------|------|
| `src/hooks/useCalendarHistory.tsx` | Criar -- hook para dados do calendario |
| `src/components/CalendarHistoryModal.tsx` | Criar -- modal com calendario heatmap |
| `src/components/StreakDisplay.tsx` | Modificar -- adicionar onClick |
| `src/components/HomeScreen.tsx` | Modificar -- integrar modal |

Nenhuma alteracao de banco de dados e necessaria -- todos os dados ja existem nas tabelas atuais.
