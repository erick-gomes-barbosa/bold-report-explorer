
# Plano: Pré-visualização de Excel, Word e CSV

## Resumo

Expandir o sistema de pré-visualização existente para suportar Excel, Word e CSV, utilizando as bibliotecas `SheetJS (xlsx)` e `docx-preview`, mantendo a arquitetura unificada com o visualizador de PDF já implementado.

---

## Arquitetura Proposta

```text
                    ┌─────────────────────────────────────┐
                    │         ExportPanel.tsx             │
                    │   (Botão Pré-visualizar para        │
                    │    PDF, Excel, Word, CSV)           │
                    └───────────────┬─────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────────┐
                    │      DocumentPreviewDialog.tsx      │
                    │   (Componente unificado que         │
                    │    detecta o formato e renderiza)   │
                    └───────────────┬─────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
    │  PDFPreview     │  │ SpreadsheetPrev │  │   DocxPreview   │
    │  (react-pdf)    │  │ (xlsx + table)  │  │ (docx-preview)  │
    │                 │  │ Excel & CSV     │  │                 │
    └─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Etapas de Implementação

### Etapa 1: Instalar Dependências

Adicionar as bibliotecas necessárias:
- `xlsx` - Para parsing de arquivos Excel e CSV
- `docx-preview` - Para renderização de documentos Word
- `jszip` - Dependência do docx-preview

### Etapa 2: Criar Componente de Preview para Planilhas

**Novo arquivo:** `src/components/SpreadsheetPreview.tsx`

Funcionalidades:
- Parsear arquivos Excel (.xlsx) e CSV usando SheetJS
- Renderizar dados em uma tabela HTML estilizada com Tailwind
- Suporte a navegação entre abas (para Excel com múltiplas planilhas)
- Scroll horizontal e vertical para tabelas grandes

### Etapa 3: Criar Componente de Preview para Word

**Novo arquivo:** `src/components/DocxPreview.tsx`

Funcionalidades:
- Renderizar documentos .docx usando docx-preview
- Container com scroll para documentos longos
- Preservar formatação visual do documento original

### Etapa 4: Criar Dialog Unificado de Preview

**Novo arquivo:** `src/components/DocumentPreviewDialog.tsx`

Substituir o `PDFPreviewDialog` por um componente genérico que:
- Aceita o formato como prop (`PDF | Excel | Word | CSV`)
- Renderiza o componente de preview apropriado baseado no formato
- Mantém controles de zoom (onde aplicável)
- Botão de download unificado

### Etapa 5: Atualizar o Hook useBoldReports

**Arquivo:** `src/hooks/useBoldReports.ts`

Modificações:
- Generalizar `generatePreview` para aceitar qualquer formato
- Ajustar o MIME type baseado no formato
- Armazenar o formato atual no estado para o dialog

### Etapa 6: Atualizar ExportPanel

**Arquivo:** `src/components/ExportPanel.tsx`

Modificações:
- Mostrar botão "Pré-visualizar" para todos os formatos (PDF, Excel, Word, CSV)
- Passar o formato selecionado para a função de preview

### Etapa 7: Atualizar Index Page

**Arquivo:** `src/pages/Index.tsx`

Modificações:
- Substituir `PDFPreviewDialog` por `DocumentPreviewDialog`
- Passar o formato selecionado para o dialog

---

## Estrutura de Arquivos Final

```text
src/components/
├── DocumentPreviewDialog.tsx  (novo - dialog unificado)
├── SpreadsheetPreview.tsx     (novo - Excel/CSV)
├── DocxPreview.tsx            (novo - Word)
├── PDFPreviewDialog.tsx       (será refatorado ou removido)
├── ExportPanel.tsx            (modificado)
└── ...
```

---

## Detalhes Técnicos

### Renderização de Excel/CSV (SheetJS)

```typescript
import * as XLSX from 'xlsx';

// Converter ArrayBuffer para dados de planilha
const workbook = XLSX.read(arrayBuffer, { type: 'array' });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
```

### Renderização de Word (docx-preview)

```typescript
import { renderAsync } from 'docx-preview';

// Renderizar DOCX em um container
await renderAsync(blob, containerRef.current, null, {
  className: 'docx-preview',
  inWrapper: true,
  ignoreWidth: false,
  ignoreHeight: false,
});
```

### Mapeamento de MIME Types

| Formato | MIME Type |
|---------|-----------|
| PDF | application/pdf |
| Excel | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |
| Word | application/vnd.openxmlformats-officedocument.wordprocessingml.document |
| CSV | text/csv |

---

## Interface do Componente Unificado

```typescript
interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string | null;  // Blob URL
  fileBlob: Blob | null;   // Blob original (necessário para docx-preview)
  format: ExportFormat;    // 'PDF' | 'Excel' | 'Word' | 'CSV'
  loading: boolean;
  onDownload: () => void;
  documentName?: string;
}
```

---

## Consideracoes de UX

1. **Loading States**: Cada tipo de preview terá seu próprio indicador de carregamento
2. **Tratamento de Erros**: Mensagens específicas por formato se o arquivo não puder ser renderizado
3. **Fallback**: Se a renderização falhar, oferecer opção de download direto
4. **Responsividade**: Todos os previews funcionarão em dispositivos móveis

---

## Limitacoes Conhecidas

- **Excel**: Formatação complexa (cores, bordas, merge cells) pode ter limitações
- **Word**: Alguns elementos avançados (SmartArt, formas) podem não renderizar perfeitamente
- **CSV**: Assumirá delimitador vírgula por padrão
