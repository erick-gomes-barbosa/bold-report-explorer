
## Plano: Redirecionamento para Login após Troca de Senha

### Objetivo
Após o usuário definir sua nova senha no primeiro acesso, ele será desconectado automaticamente e redirecionado para a tela de login, onde deverá entrar com suas novas credenciais.

### Alteração Necessária

**Arquivo:** `src/pages/PasswordReset.tsx`

### O que será feito:

1. **Importar a função `signOut`** do hook `useAuth` (já disponível no contexto)

2. **Modificar o fluxo de sucesso** na função `onSubmit`:
   - Após atualizar a senha e o perfil com sucesso
   - Exibir mensagem informando que o usuário deve fazer login novamente
   - Executar `signOut()` para encerrar a sessão atual
   - Redirecionar para `/login` em vez de `/`

### Mudanças no código:

```
Linha 35: Adicionar signOut na desestruturação
- const { user, profile } = useAuth();
+ const { user, signOut } = useAuth();

Linhas 79-84: Atualizar mensagem e fluxo
- toast({ title: 'Senha atualizada', description: 'Sua nova senha foi definida com sucesso.' });
- navigate('/');
+ toast({ title: 'Senha atualizada', description: 'Faça login novamente com sua nova senha.' });
+ await signOut();
+ navigate('/login');
```

### Benefícios
- **Sessão limpa**: Garante que o usuário inicie uma nova sessão com as credenciais atualizadas
- **Experiência clara**: O usuário entende que precisa fazer login novamente
- **Segurança**: Evita possíveis inconsistências de estado com a sessão anterior
