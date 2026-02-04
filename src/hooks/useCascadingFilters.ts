import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MultiSelectOption } from '@/components/ui/multi-select';

interface HierarchyItem {
  id: string;
  nome: string;
}

interface CascadingFiltersResult {
  // Available options
  orgaos: MultiSelectOption[];
  unidades: MultiSelectOption[];
  setores: MultiSelectOption[];
  
  // Loading states
  loadingOrgaos: boolean;
  loadingUnidades: boolean;
  loadingSetores: boolean;
  
  // Functions to fetch filtered data
  fetchUnidadesByOrgaos: (orgaoIds: string[]) => Promise<void>;
  fetchSetoresByUnidades: (unidadeIds: string[]) => Promise<void>;
  
  // Availability states (disabled when parent not selected)
  unidadesDisabled: boolean;
  setoresDisabled: boolean;
  
  // Reset functions
  resetUnidades: () => void;
  resetSetores: () => void;
}

export function useCascadingFilters(): CascadingFiltersResult {
  const [orgaos, setOrgaos] = useState<MultiSelectOption[]>([]);
  const [unidades, setUnidades] = useState<MultiSelectOption[]>([]);
  const [setores, setSetores] = useState<MultiSelectOption[]>([]);
  
  const [loadingOrgaos, setLoadingOrgaos] = useState(true);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [loadingSetores, setLoadingSetores] = useState(false);
  
  const [unidadesDisabled, setUnidadesDisabled] = useState(true);
  const [setoresDisabled, setSetoresDisabled] = useState(true);

  // Convert API items to MultiSelectOption format
  const toOptions = (items: HierarchyItem[]): MultiSelectOption[] => {
    return items.map(item => ({
      value: item.id,
      label: item.nome,
    }));
  };

  // Fetch órgãos on mount
  useEffect(() => {
    const fetchOrgaos = async () => {
      setLoadingOrgaos(true);
      try {
        const { data, error } = await supabase.functions.invoke('hierarchy-data', {
          body: { action: 'get-orgaos' },
        });

        if (error) throw error;
        
        setOrgaos(toOptions(data?.data || []));
      } catch (err) {
        console.error('Error fetching órgãos:', err);
        setOrgaos([]);
      } finally {
        setLoadingOrgaos(false);
      }
    };

    fetchOrgaos();
  }, []);

  // Fetch unidades filtered by selected órgãos
  const fetchUnidadesByOrgaos = useCallback(async (orgaoIds: string[]) => {
    if (orgaoIds.length === 0) {
      setUnidades([]);
      setUnidadesDisabled(true);
      setSetores([]);
      setSetoresDisabled(true);
      return;
    }

    setLoadingUnidades(true);
    setUnidadesDisabled(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('hierarchy-data', {
        body: { action: 'get-unidades', orgaoIds },
      });

      if (error) throw error;
      
      setUnidades(toOptions(data?.data || []));
    } catch (err) {
      console.error('Error fetching unidades:', err);
      setUnidades([]);
    } finally {
      setLoadingUnidades(false);
    }
  }, []);

  // Fetch setores filtered by selected unidades
  const fetchSetoresByUnidades = useCallback(async (unidadeIds: string[]) => {
    if (unidadeIds.length === 0) {
      setSetores([]);
      setSetoresDisabled(true);
      return;
    }

    setLoadingSetores(true);
    setSetoresDisabled(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('hierarchy-data', {
        body: { action: 'get-setores', unidadeIds },
      });

      if (error) throw error;
      
      setSetores(toOptions(data?.data || []));
    } catch (err) {
      console.error('Error fetching setores:', err);
      setSetores([]);
    } finally {
      setLoadingSetores(false);
    }
  }, []);

  // Reset functions
  const resetUnidades = useCallback(() => {
    setUnidades([]);
    setUnidadesDisabled(true);
  }, []);

  const resetSetores = useCallback(() => {
    setSetores([]);
    setSetoresDisabled(true);
  }, []);

  return {
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
  };
}
