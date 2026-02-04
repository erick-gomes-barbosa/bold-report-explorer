

# Plano: Filtros em Cascata para Auditoria com Banco de Dados Externo

## Visão Geral

Implementar filtros hierárquicos dinâmicos (Órgão → Unidade → Setor) para o relatório de Auditoria, consumindo dados de um banco de dados externo via API REST do Supabase.

---

## Estrutura do Banco Externo

Baseado na imagem do schema fornecida:

| Tabela | Campos | Relacionamento |
|--------|--------|----------------|
| `orgaos` | id (uuid), nome (text) | - |
| `unidades` | id (uuid), nome (text), orgao_id (uuid) | → orgaos.id |
| `setores` | id (uuid), nome (text), unidade_id (uuid) | → unidades.id |

---

## Arquitetura da Solução

```text
+-------------------+     +----------------------+     +-------------------+
|   AuditoriaFilters |---->| useCascadingFilters  |---->| Edge Function     |
|   (React Form)     |     | (Hook)               |     | hierarchy-data    |
+-------------------+     +----------------------+     +-------------------+
                                                              |
                                                              v
                                                       +-------------------+
                                                       | API Supabase      |
                                                       | Externo           |
                                                       | (orgaos,unidades, |
                                                       |  setores)         |
                                                       +-------------------+
```

---

## Arquivos a Criar/Modificar

### 1. Criar Edge Function: `supabase/functions/hierarchy-data/index.ts`

Função que atua como proxy para o banco externo, realizando consultas nas tabelas `orgaos`, `unidades` e `setores`.

**Funcionalidades:**
- `get-orgaos`: Retorna todos os órgãos
- `get-unidades`: Retorna unidades filtradas por `orgao_id` (se fornecido)
- `get-setores`: Retorna setores filtrados por `unidade_id` (se fornecido)

**Conexão com banco externo:**
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXTERNAL_SUPABASE_URL = Deno.env.get('EXTERNAL_SUPABASE_URL')
const EXTERNAL_SUPABASE_KEY = Deno.env.get('EXTERNAL_SUPABASE_KEY')

const externalClient = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_KEY)
```

---

### 2. Adicionar Secrets Necessários

Os seguintes secrets precisam ser configurados:

| Secret | Valor |
|--------|-------|
| `EXTERNAL_SUPABASE_URL` | `https://fyzipdzbslanwzbjgrrn.supabase.co` |
| `EXTERNAL_SUPABASE_KEY` | `sb_publishable_8foRTdonScLDIW37MEcIHg_Arav34aP` |

---

### 3. Criar Hook: `src/hooks/useCascadingFilters.ts`

Hook React para gerenciar o carregamento hierárquico dos filtros.

**Responsabilidades:**
- Carregar órgãos ao inicializar
- Carregar unidades quando órgão(s) forem selecionados
- Carregar setores quando unidade(s) forem selecionadas
- Gerenciar estados de loading e error para cada nível
- Resetar filtros dependentes quando o pai muda

**Interface do Hook:**
```typescript
interface CascadingFiltersResult {
  // Opções disponíveis
  orgaos: MultiSelectOption[];
  unidades: MultiSelectOption[];
  setores: MultiSelectOption[];
  
  // Estados de loading
  loadingOrgaos: boolean;
  loadingUnidades: boolean;
  loadingSetores: boolean;
  
  // Funções para buscar dados filtrados
  fetchUnidadesByOrgaos: (orgaoIds: string[]) => Promise<void>;
  fetchSetoresByUnidades: (unidadeIds: string[]) => Promise<void>;
  
  // Estados de disponibilidade
  unidadesDisabled: boolean;
  setoresDisabled: boolean;
}
```

---

### 4. Modificar: `src/components/reports/filters/AuditoriaFilters.tsx`

**Alterações principais:**
- Substituir `useReportParameters` pelo novo `useCascadingFilters`
- Adicionar `useEffect` para reagir às mudanças de seleção
- Desabilitar campos Unidade/Setor até que o pai seja selecionado
- Resetar valores filhos quando o pai muda

**Comportamento esperado:**
1. Ao abrir: Órgão carrega automaticamente, Unidade e Setor ficam desabilitados
2. Ao selecionar Órgão(s): Unidade é habilitado e carrega opções filtradas
3. Ao selecionar Unidade(s): Setor é habilitado e carrega opções filtradas
4. Ao limpar Órgão: Unidade e Setor são resetados e desabilitados

---

### 5. Atualizar `supabase/config.toml`

Adicionar configuração para a nova Edge Function:

```toml
[functions.hierarchy-data]
verify_jwt = false
```

---

## Fluxo de Dados Detalhado

```text
1. Usuário abre aba Auditoria
   ↓
2. Hook carrega órgãos: GET /hierarchy-data { action: 'get-orgaos' }
   ↓
3. Usuário seleciona "Órgão A" (id: abc-123)
   ↓
4. Hook carrega unidades: GET /hierarchy-data { action: 'get-unidades', orgaoIds: ['abc-123'] }
   ↓
5. Usuário seleciona "Unidade X" (id: xyz-456)
   ↓
6. Hook carrega setores: GET /hierarchy-data { action: 'get-setores', unidadeIds: ['xyz-456'] }
   ↓
7. Usuário seleciona setor(es) e clica "Gerar"
   ↓
8. Formulário envia: { orgao: [...], unidade: [...], setor: [...], periodoInicio, periodoFim }
```

---

## Considerações de UX

| Estado | Comportamento Visual |
|--------|---------------------|
| Órgão não selecionado | Unidade e Setor aparecem desabilitados (opacidade reduzida) |
| Carregando Unidades | Skeleton no lugar do MultiSelect |
| Órgão selecionado, nenhuma Unidade disponível | Mensagem "Nenhuma unidade encontrada" |
| Limpando Órgão | Unidade e Setor são resetados para [] |

---

## Resumo das Alterações

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/hierarchy-data/index.ts` | Criar | Edge Function para consultar banco externo |
| `supabase/config.toml` | Modificar | Adicionar configuração da nova function |
| `src/hooks/useCascadingFilters.ts` | Criar | Hook para gerenciar filtros em cascata |
| `src/components/reports/filters/AuditoriaFilters.tsx` | Modificar | Usar novo hook e implementar lógica cascata |
| Secrets | Adicionar | `EXTERNAL_SUPABASE_URL` e `EXTERNAL_SUPABASE_KEY` |

---

## Validações e Testes

Após implementação, testar:
1. Órgãos carregam ao abrir a aba Auditoria
2. Selecionar órgão habilita e carrega unidades corretas
3. Selecionar unidade habilita e carrega setores corretos
4. Limpar órgão reseta unidade e setor
5. Multi-seleção funciona corretamente em todos os níveis
6. Gerar relatório com filtros aplicados funciona

