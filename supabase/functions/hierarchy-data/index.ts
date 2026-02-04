import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  action: 'get-orgaos' | 'get-unidades' | 'get-setores';
  orgaoIds?: string[];
  unidadeIds?: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EXTERNAL_SUPABASE_URL = Deno.env.get('EXTERNAL_SUPABASE_URL');
    const EXTERNAL_SUPABASE_KEY = Deno.env.get('EXTERNAL_SUPABASE_KEY');

    if (!EXTERNAL_SUPABASE_URL || !EXTERNAL_SUPABASE_KEY) {
      throw new Error('Missing external Supabase configuration');
    }

    const externalClient = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_KEY);

    const body: RequestBody = await req.json();
    const { action, orgaoIds, unidadeIds } = body;

    let data: any[] = [];
    let error: any = null;

    switch (action) {
      case 'get-orgaos': {
        const result = await externalClient
          .from('orgaos')
          .select('id, nome')
          .order('nome');
        
        data = result.data || [];
        error = result.error;
        break;
      }

      case 'get-unidades': {
        let query = externalClient
          .from('unidades')
          .select('id, nome, orgao_id')
          .order('nome');

        // Filter by orgaoIds if provided
        if (orgaoIds && orgaoIds.length > 0) {
          query = query.in('orgao_id', orgaoIds);
        }

        const result = await query;
        data = result.data || [];
        error = result.error;
        break;
      }

      case 'get-setores': {
        let query = externalClient
          .from('setores')
          .select('id, nome, unidade_id')
          .order('nome');

        // Filter by unidadeIds if provided
        if (unidadeIds && unidadeIds.length > 0) {
          query = query.in('unidade_id', unidadeIds);
        }

        const result = await query;
        data = result.data || [];
        error = result.error;
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    if (error) {
      console.error('Database query error:', error);
      throw new Error(error.message);
    }

    return new Response(
      JSON.stringify({ data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in hierarchy-data function:', err);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
