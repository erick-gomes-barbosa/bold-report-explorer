import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BOLD_SITE_ID = Deno.env.get('BOLD_SITE_ID');
const BOLD_TOKEN = Deno.env.get('BOLD_TOKEN');
const BASE_URL = `https://cloud.boldreports.com/reporting/api/site/${BOLD_SITE_ID}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, reportId, parameters, format } = await req.json();

    const headers = {
      'Authorization': `Bearer ${BOLD_TOKEN}`,
      'Content-Type': 'application/json',
    };

    let response;

    switch (action) {
      case 'list-reports':
        // Get all items from Bold Reports
        response = await fetch(`${BASE_URL}/v2.0/items?itemType=Report`, {
          method: 'GET',
          headers,
        });
        break;

      case 'get-report-parameters':
        // Get report parameters
        response = await fetch(`${BASE_URL}/v1.0/reports/${reportId}/parameters`, {
          method: 'GET',
          headers,
        });
        break;

      case 'export-report':
        // Export report with parameters
        const exportBody: Record<string, unknown> = {
          ReportId: reportId,
          ExportType: format || 'PDF',
        };

        if (parameters && Object.keys(parameters).length > 0) {
          exportBody.Parameters = Object.entries(parameters).map(([name, value]) => ({
            Name: name,
            Values: Array.isArray(value) ? value : [value],
          }));
        }

        response = await fetch(`${BASE_URL}/v1.0/reports/export`, {
          method: 'POST',
          headers,
          body: JSON.stringify(exportBody),
        });

        if (response.ok) {
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              data: base64,
              contentType: response.headers.get('content-type'),
              filename: `report.${format?.toLowerCase() || 'pdf'}`
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (!response) {
      return new Response(
        JSON.stringify({ error: 'No response from Bold Reports API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({ success: response.ok, data, status: response.status }),
      { 
        status: response.ok ? 200 : response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
