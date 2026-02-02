/**
 * Utilitário para parsear CSV e converter para objetos.
 */

/**
 * Decodifica uma string base64 para texto.
 */
export function decodeBase64(base64String: string): string {
  try {
    // Handle URL-safe base64
    const normalized = base64String.replace(/-/g, '+').replace(/_/g, '/');
    return atob(normalized);
  } catch (error) {
    console.error('[CSVParser] Erro ao decodificar base64:', error);
    throw new Error('Falha ao decodificar dados do relatório');
  }
}

/**
 * Parseia uma linha CSV considerando campos com aspas.
 */
export function parseCSVLine(line: string, separator: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Detecta o separador usado no CSV (vírgula ou ponto-e-vírgula).
 */
export function detectSeparator(csvString: string): string {
  const firstLine = csvString.split('\n')[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

/**
 * Normaliza um header para ser usado como chave de objeto.
 */
function normalizeHeader(header: string): string {
  return header
    .trim()
    .replace(/[^\w\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '_')     // Substitui espaços por underscore
    .toLowerCase();
}

export interface ParsedCSVResult {
  headers: string[];
  data: Record<string, unknown>[];
  rawHeaders: string[];
}

/**
 * Converte uma string CSV em um array de objetos.
 * 
 * @param csvString - String CSV a ser parseada
 * @param options - Opções de parsing
 * @returns Array de objetos com os dados parseados
 */
export function parseCSVToObjects(
  csvString: string,
  options: {
    separator?: string;
    normalizeHeaders?: boolean;
  } = {}
): ParsedCSVResult {
  const { normalizeHeaders = false } = options;
  const separator = options.separator || detectSeparator(csvString);

  // Split lines and filter empty
  const lines = csvString
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length < 1) {
    return { headers: [], data: [], rawHeaders: [] };
  }

  // Parse headers
  const rawHeaders = parseCSVLine(lines[0], separator);
  const headers = normalizeHeaders 
    ? rawHeaders.map(normalizeHeader) 
    : rawHeaders;

  // Parse data rows
  const data = lines.slice(1).map((line, index) => {
    const values = parseCSVLine(line, separator);
    const obj: Record<string, unknown> = { id: `row-${index}` };

    headers.forEach((header, i) => {
      const value = values[i] || '';
      // Try to parse numbers
      const numValue = parseFloat(value.replace(',', '.'));
      obj[header] = !isNaN(numValue) && value.trim() !== '' ? numValue : value;
    });

    return obj;
  });

  return { headers, data, rawHeaders };
}

/**
 * Converte base64 diretamente para objetos parseados.
 */
export function parseBase64CSVToObjects(
  base64String: string,
  options: {
    separator?: string;
    normalizeHeaders?: boolean;
  } = {}
): ParsedCSVResult {
  const csvString = decodeBase64(base64String);
  return parseCSVToObjects(csvString, options);
}

/**
 * Converte base64 para Blob para download.
 */
export function base64ToBlob(base64String: string, mimeType: string): Blob {
  const byteCharacters = atob(base64String);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Dispara o download de um arquivo a partir de um Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Mapa de formatos para MIME types.
 */
export const FORMAT_MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/**
 * Mapa de formatos para extensões de arquivo.
 */
export const FORMAT_EXTENSIONS: Record<string, string> = {
  pdf: '.pdf',
  xlsx: '.xlsx',
  csv: '.csv',
  docx: '.docx',
};
