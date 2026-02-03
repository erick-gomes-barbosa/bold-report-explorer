/**
 * Utilitário para parsear CSV e converter para objetos.
 */

/**
 * Decodifica uma string base64 para texto UTF-8.
 * Lida corretamente com caracteres especiais (acentos, cedilha, etc).
 */
export function decodeBase64(base64String: string): string {
  try {
    // Handle URL-safe base64
    const normalized = base64String.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decode base64 to binary string
    const binaryString = atob(normalized);
    
    // Convert binary string to Uint8Array for proper UTF-8 decoding
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Decode UTF-8 bytes to string
    const decoder = new TextDecoder('utf-8');
    let decoded = decoder.decode(bytes);
    
    // Remove BOM (Byte Order Mark) if present
    if (decoded.charCodeAt(0) === 0xFEFF) {
      decoded = decoded.substring(1);
    }
    
    return decoded;
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
    headerMapping?: Record<string, string>;
  } = {}
): ParsedCSVResult {
  const { normalizeHeaders = false, headerMapping } = options;
  const separator = options.separator || detectSeparator(csvString);

  // Remove BOM if still present after decoding
  let cleanedCSV = csvString;
  if (cleanedCSV.startsWith('ï»¿')) {
    cleanedCSV = cleanedCSV.substring(3);
  }
  if (cleanedCSV.charCodeAt(0) === 0xFEFF) {
    cleanedCSV = cleanedCSV.substring(1);
  }

  // Split lines and filter empty/whitespace-only lines
  const lines = cleanedCSV
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && line !== '');

  // Find the first line that looks like a header (has separator)
  const headerLineIndex = lines.findIndex(line => line.includes(separator));
  if (headerLineIndex === -1 || lines.length < headerLineIndex + 2) {
    return { headers: [], data: [], rawHeaders: [] };
  }

  // Parse headers from the first valid line
  const rawHeaders = parseCSVLine(lines[headerLineIndex], separator);
  
  // Apply header mapping if provided (e.g., TextBox9 -> Patrimônio)
  let headers: string[];
  if (headerMapping) {
    headers = rawHeaders.map(h => headerMapping[h] || h);
  } else if (normalizeHeaders) {
    headers = rawHeaders.map(normalizeHeader);
  } else {
    headers = rawHeaders;
  }

  // Parse data rows (starting after header line)
  const data = lines.slice(headerLineIndex + 1).map((line, index) => {
    const values = parseCSVLine(line, separator);
    const obj: Record<string, unknown> = { id: `row-${index}` };

    headers.forEach((header, i) => {
      const value = values[i] || '';
      const cleanValue = value.replace(/"/g, '').trim();
      
      // Detecta se o valor parece uma data (formato americano ou ISO)
      // Ex: "1/24/2026 5:56:16 AM", "2026-01-24T05:56:16", "01/24/2026"
      const looksLikeDate = /^\d{1,2}\/\d{1,2}\/\d{4}/.test(cleanValue) || // mm/dd/yyyy
                           /^\d{4}-\d{2}-\d{2}/.test(cleanValue);         // yyyy-mm-dd
      
      if (looksLikeDate) {
        // Mantém datas como string para formatação posterior
        obj[header] = cleanValue;
      } else {
        // Try to parse numbers (handle both . and , as decimal separator)
        const numValue = parseFloat(cleanValue.replace(',', '.'));
        obj[header] = !isNaN(numValue) && cleanValue !== '' ? numValue : cleanValue;
      }
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
    headerMapping?: Record<string, string>;
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
