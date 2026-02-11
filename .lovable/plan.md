
# Correcao: Microfone FreeTalk desativa sozinho no iOS

## Causa Raiz

O hook `useSpeechRecognition` tem um `useEffect` (linha 185) que depende de `initRecognition`. Por sua vez, `initRecognition` depende de `onResult`, `onError` e `onPartialResult` — callbacks passados como props que sao funcoes novas a cada render.

Fluxo do bug:
```text
1. Usuario clica no mic → startListening() → seta micStatus = 'listening'
2. Componente re-renderiza (novo micStatus)
3. Nova funcao onError criada → initRecognition muda → useEffect cleanup executa
4. Cleanup chama recognitionRef.current.abort() → microfone desliga
5. useEffect re-executa, cria nova instancia (mas nao inicia)
6. Resultado: mic liga e desliga no mesmo segundo
```

O Shadowing funciona porque o fluxo de re-renders e menos frequente no momento critico de gravacao.

## Solucao

Usar refs para os callbacks (`onResult`, `onError`, `onPartialResult`) ao inves de inclui-los diretamente nas dependencias do `useCallback`. Isso torna `initRecognition` estavel entre renders, evitando que o `useEffect` re-execute e aborte o reconhecimento.

### Mudancas em `src/hooks/useSpeechRecognition.tsx`

1. **Adicionar 3 refs para callbacks**:
   - `onResultRef = useRef(onResult)`
   - `onErrorRef = useRef(onError)` 
   - `onPartialResultRef = useRef(onPartialResult)`

2. **Manter refs atualizadas** com um `useEffect` separado que sincroniza os valores a cada render (sem deps pesadas).

3. **Dentro de `initRecognition`**: substituir chamadas diretas a `onResult`, `onError`, `onPartialResult` por chamadas via ref (`onResultRef.current?.(...)`).

4. **Remover callbacks das dependencias** de `initRecognition` e `stopListening`, deixando apenas `isSupported`, `continuous`, `language`.

5. **Simplificar o `useEffect` de inicializacao** (linha 185): como `initRecognition` agora e estavel, ele nao re-executa a cada render, eliminando o abort indevido.

### Arquivo modificado

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useSpeechRecognition.tsx` | Estabilizar callbacks via refs para evitar re-criacao de recognition a cada render |

Nenhuma mudanca necessaria em `FreeTalkFlow.tsx` ou `ChallengeFlow.tsx` — o problema esta inteiramente no hook.
