import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BOLD_SITE_ID = Deno.env.get('BOLD_SITE_ID');
const BOLD_TOKEN = Deno.env.get('BOLD_TOKEN');
const BOLD_EMAIL = Deno.env.get('BOLD_EMAIL');
const BOLD_PASSWORD = Deno.env.get('BOLD_PASSWORD');
const BASE_URL = `https://cloud.boldreports.com/reporting/api/site/${BOLD_SITE_ID}`;
const TOKEN_URL = `https://cloud.boldreports.com/reporting/api/site/${BOLD_SITE_ID}/token`;

// Cache for access token
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // If we have a static token configured, use it directly
  if (BOLD_TOKEN) {
    console.log('Using static BOLD_TOKEN');
    return BOLD_TOKEN;
  }

  // Otherwise, try to generate token via email/password
  if (!BOLD_EMAIL || !BOLD_PASSWORD) {
    throw new Error('No BOLD_TOKEN or BOLD_EMAIL/BOLD_PASSWORD configured');
  }

  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    console.log('Using cached token');
    return cachedToken.token;
  }

  console.log('Generating new access token...');
  
  const formData = new URLSearchParams();
  formData.append('grant_type', 'password');
  formData.append('username', BOLD_EMAIL);
  formData.append('password', BOLD_PASSWORD);

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const responseText = await response.text();
  console.log('Token response status:', response.status);

  if (!response.ok) {
    console.error('Token error response:', responseText);
    throw new Error(`Failed to get access token: ${responseText}`);
  }

  const tokenData = JSON.parse(responseText);
  
  // Cache token with expiration (subtract 5 minutes for safety)
  const expiresIn = tokenData.expires_in || 3600;
  cachedToken = {
    token: tokenData.access_token,
    expiresAt: Date.now() + (expiresIn - 300) * 1000,
  };

  console.log('Token generated successfully');
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('BOLD_SITE_ID:', BOLD_SITE_ID);
    console.log('BOLD_TOKEN present:', !!BOLD_TOKEN);

    if (!BOLD_SITE_ID) {
      return new Response(
        JSON.stringify({ error: 'Missing BOLD_SITE_ID configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!BOLD_TOKEN && (!BOLD_EMAIL || !BOLD_PASSWORD)) {
      return new Response(
        JSON.stringify({ error: 'Missing Bold Reports authentication (BOLD_TOKEN or BOLD_EMAIL/BOLD_PASSWORD)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, reportId, parameters, format } = await req.json();

    // Get fresh access token
    const accessToken = await getAccessToken();

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    let response;

    switch (action) {
      case 'list-reports':
        const listUrl = `${BASE_URL}/v1.0/items?itemType=Report`;
        console.log('Fetching reports from:', listUrl);
        
        response = await fetch(listUrl, {
          method: 'GET',
          headers,
        });
        break;

      case 'get-report-parameters':
        // Try to get report parameters - use items/{id}/report-parameters for Cloud
        const paramsUrl = `${BASE_URL}/v1.0/items/${reportId}/report-parameters`;
        console.log('Fetching parameters from:', paramsUrl);
        
        response = await fetch(paramsUrl, {
          method: 'GET',
          headers,
        });
        
        // If 404, report has no parameters - return empty array
        if (response.status === 404) {
          return new Response(
            JSON.stringify({ success: true, data: [], status: 200 }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;

      case 'export-report':
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

        const exportUrl = `${BASE_URL}/v1.0/reports/export`;
        console.log('Exporting from:', exportUrl);

        response = await fetch(exportUrl, {
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

    const responseText = await response.text();
    console.log('API Response status:', response.status);
    console.log('API Response:', responseText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }
    
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
