import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { MultiSelect } from '@/components/ui/multi-select';
import { Skeleton } from '@/components/ui/skeleton';
import { useReportParameters } from '@/hooks/useReportParameters';
import { REPORT_MAPPING } from '@/config/reportMapping';

const filterSchema = z.object({
  orgao: z.array(z.string()).default([]),
  unidade: z.array(z.string()).default([]),
  setor: z.array(z.string()).default([]),
  periodoInicio: z.date().optional(),
  periodoFim: z.date().optional(),
});

type FilterFormData = z.infer<typeof filterSchema>;

interface AuditoriaFiltersProps {
  onSubmit: (data: FilterFormData & { _labelMappings?: Record<string, Record<string, string>> }) => void;
  loading?: boolean;
}

export function AuditoriaFilters({ onSubmit, loading }: AuditoriaFiltersProps) {
  const reportId = REPORT_MAPPING['auditoria'].reportId;
  
  const { 
    getOptionsForParameter, 
    getLabelMappingForParameter,
    loading: loadingParams 
  } = useReportParameters(reportId);

  const form = useForm<FilterFormData>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      orgao: [],
      unidade: [],
      setor: [],
      periodoInicio: undefined,
      periodoFim: undefined,
    },
  });

  const handleFormSubmit = (data: FilterFormData) => {
    const labelMappings: Record<string, Record<string, string>> = {
      orgao: getLabelMappingForParameter('param_orgao'),
      unidade: getLabelMappingForParameter('param_unidade'),
      setor: getLabelMappingForParameter('param_setor'),
    };

    onSubmit({
      ...data,
      _labelMappings: labelMappings,
    });
  };

  const handleReset = () => {
    form.reset({
      orgao: [],
      unidade: [],
      setor: [],
      periodoInicio: undefined,
      periodoFim: undefined,
    });
  };

  // Get dynamic options from API
  const orgaoOptions = getOptionsForParameter('param_orgao');
  const unidadeOptions = getOptionsForParameter('param_unidade');
  const setorOptions = getOptionsForParameter('param_setor');

  return (
    <Form {...form}>
      <form 
        id="form-auditoria"
        onSubmit={form.handleSubmit(handleFormSubmit)} 
        className="space-y-4"
      >
        {/* Órgão */}
        <FormField
          control={form.control}
          name="orgao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Órgão</FormLabel>
              <FormControl>
                {loadingParams ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <MultiSelect
                    id="filter-orgao"
                    options={orgaoOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Todos os órgãos"
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Unidade */}
        <FormField
          control={form.control}
          name="unidade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unidade</FormLabel>
              <FormControl>
                {loadingParams ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <MultiSelect
                    id="filter-unidade"
                    options={unidadeOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Todas as unidades"
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Setor */}
        <FormField
          control={form.control}
          name="setor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Setor</FormLabel>
              <FormControl>
                {loadingParams ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <MultiSelect
                    id="filter-setor"
                    options={setorOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Todos os setores"
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Período (opcional) */}
        <div className="space-y-2">
          <Label>Período</Label>
          <div className="grid grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="periodoInicio"
              render={({ field }) => (
                <FormItem>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          id="filter-periodo-inicio"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Início"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="periodoFim"
              render={({ field }) => (
                <FormItem>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          id="filter-periodo-fim"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Fim"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            id="btn-filter-reset-auditoria"
            type="button"
            variant="outline"
            onClick={handleReset}
            className="flex-1 gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Limpar
          </Button>
          <Button
            id="btn-filter-submit-auditoria"
            type="submit"
            disabled={loading}
            className="flex-1 gap-2"
          >
            <Search className="h-4 w-4" />
            {loading ? 'Gerando...' : 'Gerar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
