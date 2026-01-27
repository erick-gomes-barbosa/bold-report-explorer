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

// Format mapping for correct file extensions and MIME types
const FORMAT_MAPPING: Record<string, { extension: string; mimeType: string }> = {
  'PDF': { extension: 'pdf', mimeType: 'application/pdf' },
  'Excel': { extension: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  'Word': { extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  'CSV': { extension: 'csv', mimeType: 'text/csv' },
  'HTML': { extension: 'html', mimeType: 'text/html' },
  'PPT': { extension: 'pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
};

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
      case 'get-viewer-config':
        // Return the site ID and token for the embedded viewer
        return new Response(
          JSON.stringify({ 
            success: true, 
            siteId: BOLD_SITE_ID,
            token: accessToken
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'list-reports':
        const listUrl = `${BASE_URL}/v1.0/items?itemType=Report`;
        console.log('Fetching reports from:', listUrl);
        
        response = await fetch(listUrl, {
          method: 'GET',
          headers,
        });
        break;

      case 'get-report-parameters':
        // Try both documented endpoint formats for v1.0:
        // Format 1: GET /v1.0/reports/{id}/parameters
        // Format 2: GET /v1.0/reports/parameters/{id}
        const paramEndpoints = [
          `${BASE_URL}/v1.0/reports/${reportId}/parameters`,
          `${BASE_URL}/v1.0/reports/parameters/${reportId}`,
        ];
        
        let foundParams = null;
        
        for (const url of paramEndpoints) {
          console.log('Trying parameters endpoint:', url);
          
          const resp = await fetch(url, {
            method: 'GET',
            headers,
          });
          
          const text = await resp.text();
          console.log('Response status for', url, ':', resp.status);
          console.log('Response body:', text.substring(0, 300));
          
          if (resp.ok && text) {
            try {
              const parsed = JSON.parse(text);
              // Handle various response formats
              const params = Array.isArray(parsed) 
                ? parsed 
                : (parsed.value || parsed.Parameters || parsed.parameters || parsed);
              
              if (Array.isArray(params) && params.length > 0) {
                foundParams = params;
                console.log('Found', params.length, 'parameters at:', url);
                break;
              }
            } catch (e) {
              console.log('Failed to parse response:', e);
            }
          }
        }
        
        return new Response(
          JSON.stringify({ success: true, data: foundParams || [], status: 200 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'export-report':
        // API Cloud v5.0 endpoint: POST /v5.0/reports/export
        // This endpoint requires FilterParameters to be a JSON string with arrays
        // Documentation: https://documentation.boldreports.com/embedded/rest-api/api-reference/export-report/
        
        const exportFormat = format || 'PDF';
        const exportUrl = `${BASE_URL}/v5.0/reports/export`;
        
        // Transform parameters: ensure all values are arrays (for multi-value support)
        const paramsObject: Record<string, string[]> = {};
        if (parameters && Object.keys(parameters).length > 0) {
          Object.entries(parameters).forEach(([name, value]) => {
            // Convert everything to array of strings
            if (Array.isArray(value)) {
              paramsObject[name] = value.map(String);
            } else if (value !== null && value !== undefined && value !== '') {
              paramsObject[name] = [String(value)];
            }
          });
        }
        
        // Serialize parameters as JSON string (the key part!)
        const filterParametersJson = JSON.stringify(paramsObject);
        
        const exportBody = {
          ReportId: reportId,
          ExportType: exportFormat,
          FilterParameters: filterParametersJson
        };
        
        console.log('Exporting from:', exportUrl);
        console.log('Export parameters:', paramsObject);
        console.log('Export body:', JSON.stringify(exportBody, null, 2));

        response = await fetch(exportUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(exportBody),
        });

        console.log('Export response status:', response.status);

        if (response.ok) {
          // API returns JSON with FileContent (Base64 encoded)
          const responseText = await response.text();
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Failed to parse API response:', parseError);
            throw new Error('Invalid API response format - expected JSON');
          }
          
          // Check if FileContent exists and is not empty
          if (!data.FileContent) {
            throw new Error('API returned empty FileContent');
          }
          
          const base64Content = data.FileContent;
          const formatInfo = FORMAT_MAPPING[exportFormat] || { 
            extension: exportFormat.toLowerCase(), 
            mimeType: 'application/octet-stream' 
          };
          
          // Calculate size from base64 (approximately)
          const estimatedSize = Math.ceil(base64Content.length * 0.75);
          
          console.log('Export successful:', {
            format: exportFormat,
            size: estimatedSize,
            contentType: formatInfo.mimeType,
            filename: `report.${formatInfo.extension}`,
            base64Length: base64Content.length
          });
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              data: base64Content,
              contentType: formatInfo.mimeType,
              filename: `report.${formatInfo.extension}`,
              size: estimatedSize
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        } else {
          const errorText = await response.text();
          console.error('Export failed:', {
            status: response.status,
            body: errorText.substring(0, 500)
          });
          throw new Error(`Export failed: ${response.status} - ${errorText.substring(0, 200)}`);
        }
        return new Response(
          JSON.stringify({ error: 'Unexpected state after export' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

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
