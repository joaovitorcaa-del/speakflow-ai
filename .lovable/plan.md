

# Correção: App travado após exclusão de dados do perfil

## Problema
O perfil foi deletado da tabela `profiles`, mas o usuário continua autenticado. O código em `Index.tsx` fica preso na tela de loading porque nunca trata o caso em que `profile` e null e `profileLoading` e false.

## Solucao imediata
Recriar o registro de perfil na tabela `profiles` para o usuario `00aa4136-9e33-4e48-97a4-5477ac9f4378` (John), **sem** goal e level definidos, para que o onboarding seja exibido normalmente.

## Correcao no codigo

### Arquivo: `src/pages/Index.tsx`
Adicionar tratamento para o caso em que o usuario esta autenticado mas nao tem perfil. No `useEffect`, quando `profileLoading` e `false` e `profile` e `null`, o app deve:
1. Tentar criar um novo perfil automaticamente (usando `user.id` e `user.user_metadata.display_name`)
2. Se falhar, redirecionar para onboarding com uma mensagem de erro

### Arquivo: `src/hooks/useProfile.tsx`
Adicionar uma funcao `createProfile` que insere um novo registro na tabela profiles quando nenhum e encontrado. Isso garante resiliencia caso o trigger de criacao automatica falhe ou dados sejam deletados.

## Detalhes tecnicos

```text
useEffect (Index.tsx):
  profileLoading = false
  profile = null
  user exists?
    -> Sim: chamar createProfile()
    -> Nao: redirecionar para /auth
```

### Mudancas:
1. **INSERT** na tabela `profiles`: user_id, display_name (sem goal/level para acionar onboarding)
2. **useProfile.tsx**: adicionar `createProfile()` que faz upsert com `onConflict: 'user_id'`
3. **Index.tsx**: no useEffect, quando `!profile && !profileLoading && user`, chamar createProfile e depois refetch

