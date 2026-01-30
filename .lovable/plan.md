
# Plano: Pré-visualização de Excel, Word e CSV

## Status: ✅ Implementado

## Resumo

Sistema de pré-visualização expandido para suportar Excel, Word e CSV, utilizando as bibliotecas `SheetJS (xlsx)` e `docx-preview`, mantendo a arquitetura unificada com o visualizador de PDF.

---

## Componentes Criados

1. **SpreadsheetPreview.tsx** - Renderiza Excel e CSV usando SheetJS
   - Suporte a múltiplas planilhas (tabs)
   - Tabela estilizada com scroll
   - Contador de linhas

2. **DocxPreview.tsx** - Renderiza Word usando docx-preview
   - Preserva formatação visual
   - Container com scroll

3. **DocumentPreviewDialog.tsx** - Dialog unificado que detecta o formato e renderiza o preview apropriado

---

## Arquivos Modificados

- `src/hooks/useBoldReports.ts` - Suporte a múltiplos formatos de preview
- `src/components/ExportPanel.tsx` - Botão de preview para todos os formatos
- `src/pages/Index.tsx` - Integração com novo DocumentPreviewDialog

---

## Formatos Suportados para Preview

| Formato | Biblioteca | Funcionalidades |
|---------|------------|-----------------|
| PDF | react-pdf | Zoom, navegação de páginas |
| Excel | xlsx (SheetJS) | Múltiplas abas, tabela |
| Word | docx-preview | Renderização visual |
| CSV | xlsx (SheetJS) | Tabela |

