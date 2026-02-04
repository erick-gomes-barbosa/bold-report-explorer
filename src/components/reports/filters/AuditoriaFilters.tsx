import { useEffect, useRef } from 'react';
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
import { useCascadingFilters } from '@/hooks/useCascadingFilters';

const filterSchema = z.object({
  orgao: z.array(z.string()).min(1, { message: "Selecione ao menos um órgão" }),
  unidade: z.array(z.string()).min(1, { message: "Selecione ao menos uma unidade" }),
  setor: z.array(z.string()).min(1, { message: "Selecione ao menos um setor" }),
  periodoInicio: z.date().optional(),
  periodoFim: z.date().optional(),
});

type FilterFormData = z.infer<typeof filterSchema>;

interface AuditoriaFiltersProps {
  onSubmit: (data: FilterFormData & { _labelMappings?: Record<string, Record<string, string>> }) => void;
  loading?: boolean;
}

export function AuditoriaFilters({ onSubmit, loading }: AuditoriaFiltersProps) {
  const {
    orgaos,
    unidades,
    setores,
    loadingOrgaos,
    loadingUnidades,
    loadingSetores,
    fetchUnidadesByOrgaos,
    fetchSetoresByUnidades,
    unidadesDisabled,
    setoresDisabled,
    resetUnidades,
    resetSetores,
  } = useCascadingFilters();

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

  // Track previous values to detect changes
  const prevOrgaoRef = useRef<string[]>([]);
  const prevUnidadeRef = useRef<string[]>([]);

  // Watch for changes in orgao selection
  const watchedOrgao = form.watch('orgao');
  const watchedUnidade = form.watch('unidade');

  // Effect to handle orgao changes -> fetch unidades
  useEffect(() => {
    const prevOrgao = prevOrgaoRef.current;
    const currentOrgao = watchedOrgao || [];
    
    // Check if orgao selection actually changed
    const hasChanged = 
      prevOrgao.length !== currentOrgao.length ||
      prevOrgao.some((id, idx) => id !== currentOrgao[idx]);

    if (hasChanged) {
      prevOrgaoRef.current = currentOrgao;
      
      if (currentOrgao.length === 0) {
        // Reset unidade and setor when orgao is cleared
        form.setValue('unidade', []);
        form.setValue('setor', []);
        resetUnidades();
        resetSetores();
      } else {
        // Fetch unidades for selected orgaos
        form.setValue('unidade', []);
        form.setValue('setor', []);
        resetSetores();
        fetchUnidadesByOrgaos(currentOrgao);
      }
    }
  }, [watchedOrgao, form, fetchUnidadesByOrgaos, resetUnidades, resetSetores]);

  // Effect to handle unidade changes -> fetch setores
  useEffect(() => {
    const prevUnidade = prevUnidadeRef.current;
    const currentUnidade = watchedUnidade || [];
    
    // Check if unidade selection actually changed
    const hasChanged = 
      prevUnidade.length !== currentUnidade.length ||
      prevUnidade.some((id, idx) => id !== currentUnidade[idx]);

    if (hasChanged) {
      prevUnidadeRef.current = currentUnidade;
      
      if (currentUnidade.length === 0) {
        // Reset setor when unidade is cleared
        form.setValue('setor', []);
        resetSetores();
      } else {
        // Fetch setores for selected unidades
        form.setValue('setor', []);
        fetchSetoresByUnidades(currentUnidade);
      }
    }
  }, [watchedUnidade, form, fetchSetoresByUnidades, resetSetores]);

  // Build label mappings from the loaded options
  const buildLabelMappings = () => {
    const orgaoMapping: Record<string, string> = {};
    const unidadeMapping: Record<string, string> = {};
    const setorMapping: Record<string, string> = {};

    orgaos.forEach(opt => { orgaoMapping[opt.value] = opt.label; });
    unidades.forEach(opt => { unidadeMapping[opt.value] = opt.label; });
    setores.forEach(opt => { setorMapping[opt.value] = opt.label; });

    return {
      orgao: orgaoMapping,
      unidade: unidadeMapping,
      setor: setorMapping,
    };
  };

  const handleFormSubmit = (data: FilterFormData) => {
    onSubmit({
      ...data,
      _labelMappings: buildLabelMappings(),
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
    prevOrgaoRef.current = [];
    prevUnidadeRef.current = [];
    resetUnidades();
    resetSetores();
  };

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
                {loadingOrgaos ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <MultiSelect
                    id="filter-orgao"
                    options={orgaos}
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
                {loadingUnidades ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <MultiSelect
                    id="filter-unidade"
                    options={unidades}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={unidadesDisabled ? "Selecione um órgão primeiro" : "Todas as unidades"}
                    disabled={unidadesDisabled}
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
                {loadingSetores ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <MultiSelect
                    id="filter-setor"
                    options={setores}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={setoresDisabled ? "Selecione uma unidade primeiro" : "Todos os setores"}
                    disabled={setoresDisabled}
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
