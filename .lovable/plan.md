

# Botao "Tentar Novamente" no Free Talk

## Problema

Quando o reconhecimento de voz entende errado o que foi dito, a frase incorreta e enviada para a IA, que responde com base nesse texto errado, desviando a conversa para um caminho inesperado. Hoje nao ha como desfazer isso.

## Solucao

Adicionar um botao de "Tentar novamente" (icone de refresh) nas mensagens do usuario no chat. Ao clicar:

1. Remove a ultima mensagem do usuario E a resposta da IA correspondente
2. Reativa o microfone automaticamente para o usuario falar de novo
3. A conversa retorna ao ponto anterior, como se a frase errada nunca tivesse sido enviada

## Experiencia do usuario

```text
[Mensagem do usuario com erro] [icone retry]
[Resposta da IA baseada no erro]

Usuario clica no retry →
  - Ambas mensagens somem
  - Microfone ativa automaticamente
  - Usuario fala novamente
  - Nova resposta da IA e gerada
```

O botao aparece apenas na ultima mensagem do usuario (nao faz sentido refazer mensagens anteriores, pois a IA ja respondeu com base nelas e a conversa seguiu).

## Mudancas tecnicas

### Arquivo: `src/components/FreeTalkFlow.tsx`

1. **Import adicional**: `RotateCcw` do lucide-react

2. **Nova funcao `handleRetry`**:
   - Identifica a ultima mensagem do usuario e a resposta da IA logo apos ela
   - Remove ambas do array `messages`
   - Inicia o microfone automaticamente (`startListening()`)
   - Seta `micStatus = 'listening'` e `recordingStartRef`

3. **Botao retry na UI**: Ao lado do indicador "Enviado" na ultima mensagem do usuario, adicionar um botao com icone `RotateCcw`. Visivel apenas quando:
   - E a ultima mensagem do usuario no array
   - Nao esta gravando (`!isListening`)
   - Nao esta carregando (`!isLoading`)

4. **Logica de identificacao**: Comparar o `message.id` com o id da ultima mensagem de role "user" no array para decidir se mostra o botao

### Nenhuma mudanca em outros arquivos

A logica e inteiramente local ao componente FreeTalkFlow.

