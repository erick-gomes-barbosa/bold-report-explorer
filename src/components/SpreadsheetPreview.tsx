import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Loader2, AlertCircle } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SpreadsheetPreviewProps {
  fileUrl: string | null;
  fileBlob: Blob | null;
  loading: boolean;
}

interface SheetData {
  name: string;
  data: (string | number | boolean | null)[][];
}

export function SpreadsheetPreview({ fileUrl, fileBlob, loading }: SpreadsheetPreviewProps) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const parseSpreadsheet = useCallback(async (blob: Blob) => {
    setParseLoading(true);
    setParseError(null);

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const parsedSheets: SheetData[] = workbook.SheetNames.map((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
          worksheet,
          { header: 1, defval: null }
        );
        return {
          name: sheetName,
          data: jsonData,
        };
      });

      setSheets(parsedSheets);
      if (parsedSheets.length > 0) {
        setActiveSheet(parsedSheets[0].name);
      }
    } catch (err) {
      console.error('Error parsing spreadsheet:', err);
      setParseError(err instanceof Error ? err.message : 'Erro ao processar planilha');
    } finally {
      setParseLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fileBlob && !loading) {
      parseSpreadsheet(fileBlob);
    }
  }, [fileBlob, loading, parseSpreadsheet]);

  // Reset state when no file
  useEffect(() => {
    if (!fileBlob && !fileUrl) {
      setSheets([]);
      setActiveSheet('');
      setParseError(null);
    }
  }, [fileBlob, fileUrl]);

  // Get current sheet and normalize data
  const { headers, rows, maxColumns } = useMemo(() => {
    const currentSheet = sheets.find((s) => s.name === activeSheet);
    if (!currentSheet || currentSheet.data.length === 0) {
      return { headers: [], rows: [], maxColumns: 0 };
    }

    // Find the maximum number of columns across all rows
    const maxCols = currentSheet.data.reduce((max, row) => 
      Math.max(max, Array.isArray(row) ? row.length : 0), 0
    );

    // Normalize headers - ensure we have headers for all columns
    const headerRow = currentSheet.data[0] || [];
    const normalizedHeaders: (string | number | boolean | null)[] = [];
    for (let i = 0; i < maxCols; i++) {
      normalizedHeaders[i] = headerRow[i] !== undefined ? headerRow[i] : null;
    }

    // Normalize data rows - ensure each row has the same number of columns
    const dataRows = currentSheet.data.slice(1).map(row => {
      const normalizedRow: (string | number | boolean | null)[] = [];
      for (let i = 0; i < maxCols; i++) {
        normalizedRow[i] = row[i] !== undefined ? row[i] : null;
      }
      return normalizedRow;
    });

    return { 
      headers: normalizedHeaders, 
      rows: dataRows, 
      maxColumns: maxCols 
    };
  }, [sheets, activeSheet]);

  if (loading || parseLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {loading ? 'Gerando pré-visualização...' : 'Processando planilha...'}
          </p>
        </div>
      </div>
    );
  }

  if (parseError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">{parseError}</p>
          <p className="text-xs text-muted-foreground">Tente baixar o arquivo diretamente</p>
        </div>
      </div>
    );
  }

  if (sheets.length === 0 || maxColumns === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Nenhum dado para exibir</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tabs for multiple sheets */}
      {sheets.length > 1 && (
        <div className="border-b px-4 py-2 flex-shrink-0">
          <Tabs value={activeSheet} onValueChange={setActiveSheet}>
            <TabsList className="h-8">
              {sheets.map((sheet) => (
                <TabsTrigger
                  key={sheet.name}
                  value={sheet.name}
                  className="text-xs px-3 h-7"
                >
                  {sheet.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Table content with horizontal and vertical scroll */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="p-4 min-w-max">
            <div className="rounded-md border overflow-hidden">
              <table className="w-full caption-bottom text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    {headers.map((header, index) => (
                      <th
                        key={index}
                        className="h-10 px-3 text-left align-middle font-semibold text-xs whitespace-nowrap border-r last:border-r-0 text-muted-foreground min-w-[100px]"
                      >
                        {header !== null ? String(header) : `Coluna ${index + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={maxColumns || 1}
                        className="text-center text-muted-foreground py-8"
                      >
                        Planilha vazia
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, rowIndex) => (
                      <tr 
                        key={rowIndex} 
                        className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                      >
                        {row.map((cell, colIndex) => (
                          <td
                            key={colIndex}
                            className="px-3 py-2 text-xs whitespace-nowrap border-r last:border-r-0 align-middle min-w-[100px]"
                          >
                            {cell !== null && cell !== undefined
                              ? String(cell)
                              : ''}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Row count info */}
            <div className="mt-3 text-xs text-muted-foreground text-right">
              {rows.length} linha{rows.length !== 1 ? 's' : ''} • {maxColumns} coluna{maxColumns !== 1 ? 's' : ''}
              {sheets.length > 1 && ` • ${sheets.length} planilhas`}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}