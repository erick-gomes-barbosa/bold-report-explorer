import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Loader2, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

  if (sheets.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Nenhum dado para exibir</p>
      </div>
    );
  }

  const currentSheet = sheets.find((s) => s.name === activeSheet);
  const headers = currentSheet?.data[0] || [];
  const rows = currentSheet?.data.slice(1) || [];

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

      {/* Table content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {headers.map((header, index) => (
                    <TableHead
                      key={index}
                      className="font-semibold text-xs whitespace-nowrap border-r last:border-r-0"
                    >
                      {header !== null ? String(header) : `Coluna ${index + 1}`}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={headers.length || 1}
                      className="text-center text-muted-foreground py-8"
                    >
                      Planilha vazia
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, rowIndex) => (
                    <TableRow key={rowIndex} className="hover:bg-muted/30">
                      {headers.map((_, colIndex) => (
                        <TableCell
                          key={colIndex}
                          className="text-xs whitespace-nowrap border-r last:border-r-0 py-2"
                        >
                          {row[colIndex] !== null && row[colIndex] !== undefined
                            ? String(row[colIndex])
                            : ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Row count info */}
          <div className="mt-3 text-xs text-muted-foreground text-right">
            {rows.length} linha{rows.length !== 1 ? 's' : ''} 
            {sheets.length > 1 && ` • ${sheets.length} planilhas`}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
