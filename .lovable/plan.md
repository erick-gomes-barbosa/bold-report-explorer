
# Plano: Redesign das Telas de Login e Cadastro

## Analise da Imagem de Referencia

A imagem mostra um design com os seguintes elementos:
- Fundo com gradiente verde (do topo mais escuro para baixo mais claro)
- Logo posicionado no canto superior esquerdo (fora do card)
- Card central com fundo azul escuro (#132040) e bordas arredondadas
- Campos de input com fundo azul escuro/transparente com borda sutil
- Botao verde (#247d5b ou #215c47)
- Textos em branco sobre o card azul
- Links na parte inferior do card

Cores fornecidas:
- `#247d5b` - Verde para botoes e elementos de destaque
- `#132040` - Azul escuro para o fundo do card
- `#215c47` - Nova cor principal do sistema

---

## Alteracoes Necessarias

### 1. Atualizar Cor Principal do Sistema

**Arquivo:** `src/index.css`

Converter `#215c47` para HSL e atualizar a variavel `--primary`:
- `#215c47` em HSL: aproximadamente `156 48% 24%`

### 2. Criar Estilos para Telas de Autenticacao

**Arquivo:** `src/index.css`

Adicionar novas classes CSS utilitarias:
```css
/* Cores especificas para autenticacao */
--auth-card-bg: 220 52% 16%;        /* #132040 */
--auth-button: 155 53% 31%;          /* #247d5b */
--auth-gradient-start: 155 48% 24%;  /* #215c47 */
--auth-gradient-end: 160 35% 65%;    /* Verde claro */
```

Classes de gradiente e estilo:
```css
.auth-gradient {
  background: linear-gradient(180deg, #215c47 0%, #7ab5a0 50%, #c4d9d2 100%);
}

.auth-card {
  background-color: #132040;
}

.auth-input {
  background-color: rgba(19, 32, 64, 0.8);
  border-color: rgba(255, 255, 255, 0.2);
  color: white;
}
```

---

### 3. Redesign da Pagina de Login

**Arquivo:** `src/pages/Login.tsx`

Alteracoes visuais:
1. **Container principal:**
   - Remover `bg-background`
   - Adicionar classe `auth-gradient` para fundo gradiente
   - Logo posicionado no canto superior esquerdo (absolute)

2. **Card:**
   - Trocar Card padrao por `div` com classe `auth-card`
   - Fundo azul escuro (#132040)
   - Bordas arredondadas maiores (`rounded-xl`)
   - Remover logo de dentro do card

3. **Titulos e textos:**
   - Titulo "Login" em branco, com sublinhado verde
   - Subtitulo "Bem-vindo! Por favor, entre com seus dados." em cinza claro

4. **Inputs:**
   - Fundo semi-transparente azul escuro
   - Borda sutil cinza/branca
   - Texto e placeholder em branco/cinza claro
   - Labels em branco

5. **Botao:**
   - Fundo verde (#215c47)
   - Texto branco
   - Bordas arredondadas

6. **Links:**
   - "Primeiro acesso" (cadastro) a esquerda
   - "Esqueceu a senha?" a direita (futuro)

Layout proposto:
```
+------------------------------------------+
| [Logo]                                   |
|                                          |
|         +------------------------+       |
|         |      Login             |       |
|         |      ------            |       |
|         |  Bem-vindo!            |       |
|         |                        |       |
|         |  Email                 |       |
|         |  [__________________]  |       |
|         |                        |       |
|         |  Senha                 |       |
|         |  [________________ 👁] |       |
|         |                        |       |
|         |  Primeiro    Esqueceu? |       |
|         |  acesso                |       |
|         |                        |       |
|         |  [     Entrar       ]  |       |
|         +------------------------+       |
|                                          |
+------------------------------------------+
```

---

### 4. Redesign da Pagina de Cadastro

**Arquivo:** `src/pages/Cadastro.tsx`

Mesma estrutura visual do Login, com adaptacoes:

1. **Container e fundo:**
   - Mesmo gradiente verde

2. **Card:**
   - Mesmo estilo azul escuro
   - Titulo "Criar conta" com sublinhado verde

3. **Campos:**
   - Nome completo
   - Email
   - Senha (com indicadores de requisitos em verde/cinza)
   - Confirmar senha

4. **Links:**
   - "Ja tem uma conta? Faca login"

5. **Tela de sucesso:**
   - Manter dentro do mesmo estilo visual
   - Icone de check em verde
   - Fundo gradiente

---

### 5. Atualizar Componente Input (opcional)

**Arquivo:** `src/components/ui/input.tsx`

Adicionar variante para inputs de autenticacao:
```tsx
// Variante auth para inputs escuros
const authVariant = "bg-[#132040]/80 border-white/20 text-white placeholder:text-white/50"
```

---

## Resumo de Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/index.css` | Atualizar cor primaria para #215c47, adicionar classes auth-* |
| `src/pages/Login.tsx` | Redesign completo seguindo o mockup |
| `src/pages/Cadastro.tsx` | Redesign completo seguindo o mesmo estilo |

---

## Cores em HSL para o CSS

| Cor Hex | HSL | Uso |
|---------|-----|-----|
| `#215c47` | `156 48% 24%` | Cor primaria do sistema |
| `#132040` | `220 52% 16%` | Fundo do card de auth |
| `#247d5b` | `155 53% 31%` | Botoes e destaques |

---

## Resultado Esperado

1. Telas de Login e Cadastro com visual moderno e profissional
2. Gradiente verde suave no fundo
3. Card central com fundo azul escuro
4. Inputs com estilo escuro e bordas sutis
5. Botoes verdes com boa visibilidade
6. Logo posicionado no canto superior esquerdo
7. Toda a aplicacao usando a nova cor primaria #215c47
