
## Correção Consistente para Pré-visualização de Word

### Diagnóstico do Problema
O container de renderização mostra a forma de uma página (bordas e sombra), mas o conteúdo está em branco. Os logs da Edge Function confirmam que o documento Word é gerado com sucesso (37KB, base64 válido). O problema está na renderização cliente.

### Causas Identificadas

1. **Conversão Blob para ArrayBuffer**: A biblioteca `docx-preview` processa melhor ArrayBuffer que Blob. Exemplos de sucesso na documentação convertem o arquivo para ArrayBuffer antes de chamar `renderAsync`.

2. **Timing de Renderização**: O delay de 150ms pode não ser suficiente para alguns navegadores ou pode haver race conditions com o estado do React.

3. **Opções de Renderização Ausentes**: O modo `debug: true` não está ativado, dificultando o diagnóstico. Além disso, `ignoreLastRenderedPageBreak: true` pode afetar documentos simples.

4. **CSS Potencialmente Conflitante**: Os estilos da página podem estar interferindo com o conteúdo renderizado pela biblioteca.

---

### Plano de Implementação

#### 1. Converter Blob para ArrayBuffer antes de renderizar
Modificar o componente `DocxPreview` para converter o Blob em ArrayBuffer explicitamente antes de passar para `renderAsync`.

```text
Arquivo: src/components/DocxPreview.tsx

- Adicionar função de conversão:
  async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return await blob.arrayBuffer();
  }

- Modificar renderDocument() para usar:
  const arrayBuffer = await fileBlob.arrayBuffer();
  await docxPreview.renderAsync(arrayBuffer, container, undefined, options);
```

#### 2. Ativar modo debug da biblioteca
Adicionar a opção `debug: true` às configurações do `renderAsync` para obter logs detalhados sobre o processo de parsing e renderização.

```text
Opções atualizadas:
{
  className: 'docx-preview-content',
  inWrapper: true,
  ignoreWidth: false,
  ignoreHeight: false,
  ignoreFonts: false,
  breakPages: true,
  ignoreLastRenderedPageBreak: false,  // Alterado para false
  experimental: false,
  trimXmlDeclaration: true,
  useBase64URL: true,
  debug: true,  // Novo
  // ... demais opções
}
```

#### 3. Adicionar logs diagnósticos detalhados
Incluir logs para verificar o conteúdo do container após renderização:

```text
- Log do ArrayBuffer size e type antes de renderizar
- Log do container.innerHTML.length após renderAsync
- Log do container.querySelector('.docx') para verificar se o wrapper foi criado
```

#### 4. Melhorar estratégia de timing
Usar `requestAnimationFrame` em vez de `setTimeout` para garantir que o DOM está pronto:

```text
// Garantir que o próximo frame de pintura está disponível
await new Promise(resolve => {
  requestAnimationFrame(() => {
    requestAnimationFrame(resolve);
  });
});
```

#### 5. Ajustar CSS para garantir visibilidade do conteúdo
Adicionar regras CSS mais específicas para forçar visibilidade do conteúdo:

```css
.docx-container .docx-wrapper {
  background: white !important;
  padding: 20px;
  min-height: 100%;
}

.docx-container .docx-wrapper > section.docx {
  min-height: 200px;
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}

.docx-container p, 
.docx-container span,
.docx-container div {
  color: #000 !important;  // Garantir contraste
}
```

#### 6. Adicionar fallback visual
Implementar verificação após renderização para detectar se o conteúdo realmente apareceu:

```text
Após renderAsync:
- Verificar se container.textContent tem conteúdo
- Se vazio após 500ms, mostrar mensagem de fallback sugerindo download
```

---

### Arquivos a Modificar

| Arquivo | Modificações |
|---------|--------------|
| `src/components/DocxPreview.tsx` | Conversão para ArrayBuffer, debug mode, logs aprimorados, CSS ajustado, fallback visual |

---

### Seção Técnica

**Fluxo de dados atual:**
```text
Edge Function → Base64 → base64ToBlob() → Blob → renderAsync(Blob)
```

**Fluxo de dados proposto:**
```text
Edge Function → Base64 → base64ToBlob() → Blob → blob.arrayBuffer() → renderAsync(ArrayBuffer)
```

**Configurações críticas do renderAsync:**
- `inWrapper: true` - Cria estrutura de página
- `useBase64URL: true` - Melhor compatibilidade com imagens
- `debug: true` - Logs detalhados no console
- `ignoreLastRenderedPageBreak: false` - Respeitar quebras de página do documento

**Validação pós-implementação:**
1. Verificar logs no console com prefixo `[docx-preview]`
2. Inspecionar DOM para elementos com classe `.docx-wrapper` e `.docx`
3. Confirmar que `container.children.length > 0`
4. Testar com diferentes relatórios Word para garantir consistência
