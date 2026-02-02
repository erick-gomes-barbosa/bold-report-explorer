import { serve } from "https://deno.land/std@0.168.0/http/server.ts";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BOLD_SITE_ID = Deno.env.get('BOLD_SITE_ID');
const BOLD_TOKEN = Deno.env.get('BOLD_TOKEN');
const BOLD_EMAIL = Deno.env.get('BOLD_EMAIL');
const BOLD_PASSWORD = Deno.env.get('BOLD_PASSWORD');
const BOLD_EMBED_SECRET = Deno.env.get('BOLD_EMBED_SECRET');
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

// Remove 'bearer ' or 'Bearer ' prefix if present, returns raw JWT
function extractRawToken(token: string): string {
  const lowerToken = token.toLowerCase();
  if (lowerToken.startsWith('bearer ')) {
    return token.substring(7).trim();
  }
  return token.trim();
}

// Generate HMACSHA256 signature for Embed Secret authentication
async function generateEmbedSignature(message: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  // Convert ArrayBuffer to base64 using btoa
  const bytes = new Uint8Array(signature);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Generate token using Embed Secret (recommended approach)
async function getTokenViaEmbedSecret(): Promise<string> {
  console.group('[BoldReports Edge] Gerando token via Embed Secret');
  
  if (!BOLD_EMBED_SECRET || !BOLD_EMAIL) {
    console.error('[BoldReports Edge] BOLD_EMBED_SECRET ou BOLD_EMAIL não configurado');
    console.groupEnd();
    throw new Error('BOLD_EMBED_SECRET and BOLD_EMAIL are required for embed_secret authentication');
  }
  
  const nonce = crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  
  // Build the message to sign (must be lowercase)
  const embedMessage = `embed_nonce=${nonce}&user_email=${BOLD_EMAIL}&timestamp=${timestamp}`.toLowerCase();
  
  console.log('[BoldReports Edge] Embed message:', embedMessage);
  console.log('[BoldReports Edge] Nonce:', nonce);
  console.log('[BoldReports Edge] Timestamp:', timestamp);
  
  // Generate HMACSHA256 signature
  const signature = await generateEmbedSignature(embedMessage, BOLD_EMBED_SECRET);
  console.log('[BoldReports Edge] Signature generated:', signature.substring(0, 30) + '...');
  
  // Make token request
  const formData = new URLSearchParams();
  formData.append('grant_type', 'embed_secret');
  formData.append('username', BOLD_EMAIL);
  formData.append('embed_nonce', nonce);
  formData.append('embed_signature', signature);
  formData.append('timestamp', timestamp);
  
  console.log('[BoldReports Edge] Token URL:', TOKEN_URL);
  
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  
  const responseText = await response.text();
  console.log('[BoldReports Edge] Token response status:', response.status);
  
  if (!response.ok) {
    console.error('[BoldReports Edge] Token error response:', responseText.substring(0, 300));
    console.groupEnd();
    throw new Error(`Failed to get access token via embed_secret: ${responseText}`);
  }
  
  const tokenData = JSON.parse(responseText);
  
  if (tokenData.error) {
    console.error('[BoldReports Edge] Token API error:', tokenData.error, tokenData.error_description);
    console.groupEnd();
    throw new Error(`Embed secret auth failed: ${tokenData.error_description || tokenData.error}`);
  }
  
  // Cache token with expiration (subtract 5 minutes for safety)
  const expiresIn = tokenData.expires_in || 3600;
  cachedToken = {
    token: tokenData.access_token,
    expiresAt: Date.now() + (expiresIn - 300) * 1000,
  };
  
  console.log('[BoldReports Edge] ✅ Token gerado via Embed Secret');
  console.log('[BoldReports Edge] Token expiry:', new Date(cachedToken.expiresAt).toISOString());
  console.log('[BoldReports Edge] Token preview:', tokenData.access_token.substring(0, 50) + '...');
  console.groupEnd();
  
  return tokenData.access_token;
}

async function getAccessToken(): Promise<string> {
  console.group('[BoldReports Edge] Obtendo token de acesso');
  
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    console.log('[BoldReports Edge] Token source: cached');
    console.log('[BoldReports Edge] Token expiry:', new Date(cachedToken.expiresAt).toISOString());
    console.log('[BoldReports Edge] Token preview:', cachedToken.token.substring(0, 50) + '...');
    console.groupEnd();
    return cachedToken.token;
  }
  
  // Priority 1: Use Embed Secret (recommended, generates fresh tokens)
  if (BOLD_EMBED_SECRET && BOLD_EMAIL) {
    console.log('[BoldReports Edge] Token source: embed_secret (recomendado)');
    console.groupEnd();
    return await getTokenViaEmbedSecret();
  }
  
  // Priority 2: Use static token (fallback)
  if (BOLD_TOKEN) {
    const rawToken = extractRawToken(BOLD_TOKEN);
    console.log('[BoldReports Edge] Token source: BOLD_TOKEN (estático)');
    console.log('[BoldReports Edge] Raw token length:', rawToken.length);
    console.log('[BoldReports Edge] Raw token preview:', rawToken.substring(0, 50) + '...');
    console.groupEnd();
    return rawToken;
  }

  // Priority 3: Use email/password (legacy)
  if (BOLD_EMAIL && BOLD_PASSWORD) {
    console.log('[BoldReports Edge] Token source: password_grant (gerando novo)');
    console.log('[BoldReports Edge] Email:', BOLD_EMAIL);
    console.log('[BoldReports Edge] Token URL:', TOKEN_URL);
    
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
    console.log('[BoldReports Edge] Token response status:', response.status);

    if (!response.ok) {
      console.error('[BoldReports Edge] Token error response:', responseText.substring(0, 200));
      console.groupEnd();
      throw new Error(`Failed to get access token: ${responseText}`);
    }

    const tokenData = JSON.parse(responseText);
    
    // Cache token with expiration (subtract 5 minutes for safety)
    const expiresIn = tokenData.expires_in || 3600;
    cachedToken = {
      token: tokenData.access_token,
      expiresAt: Date.now() + (expiresIn - 300) * 1000,
    };

    console.log('[BoldReports Edge] Token gerado com sucesso');
    console.log('[BoldReports Edge] Token expiry:', new Date(cachedToken.expiresAt).toISOString());
    console.log('[BoldReports Edge] Token preview:', tokenData.access_token.substring(0, 50) + '...');
    console.groupEnd();
    
    return tokenData.access_token;
  }

  console.error('[BoldReports Edge] Nenhum método de autenticação configurado');
  console.groupEnd();
  throw new Error('No authentication method configured (BOLD_EMBED_SECRET, BOLD_TOKEN, or BOLD_EMAIL/BOLD_PASSWORD)');
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

      case 'get-viewer-config':
        // Return viewer configuration with raw JWT token (no prefix)
        // Frontend will add lowercase 'bearer' prefix as required
        const viewerToken = await getAccessToken();
        
        return new Response(
          JSON.stringify({
            success: true,
            siteId: BOLD_SITE_ID,
            token: viewerToken, // Raw JWT without prefix
            reportServerUrl: `https://${BOLD_SITE_ID}.boldreports.com/reporting/api`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'export-report':
        // API Cloud v5.0 endpoint: POST /v5.0/reports/export
        // Parameters must be an array of { Name, Labels, Values }
        // Documentation: https://documentation.boldreports.com/embedded/rest-api/api-reference/export-report/
        
        const exportFormat = format || 'PDF';
        const exportUrl = `${BASE_URL}/v5.0/reports/export`;
        
        // Transform parameters to Bold Reports format: { Name, Labels, Values }[]
        interface BoldReportParameter {
          Name: string;
          Labels: string[];
          Values: string[];
        }
        
        const formattedParameters: BoldReportParameter[] = [];
        
        if (parameters && typeof parameters === 'object') {
          Object.entries(parameters).forEach(([name, data]) => {
            // Handle both formats:
            // 1. New format: { labels: string[], values: string[] }
            // 2. Legacy format: string[] (values only)
            
            let values: string[] = [];
            let labels: string[] = [];
            
            if (data && typeof data === 'object' && !Array.isArray(data)) {
              // New format with labels and values
              const paramData = data as { labels?: string[]; values?: string[] };
              values = paramData.values || [];
              labels = paramData.labels || values; // Fallback to values if no labels
            } else if (Array.isArray(data)) {
              // Legacy format: just values array
              values = data.map(String);
              labels = values; // Use values as labels
            } else if (data !== null && data !== undefined && data !== '') {
              // Single value
              values = [String(data)];
              labels = values;
            }
            
            // Only add parameter if it has values (empty arrays = omit for "select all" behavior)
            if (values.length > 0) {
              formattedParameters.push({
                Name: name,
                Labels: labels,
                Values: values
              });
            }
          });
        }
        
        const exportBody = {
          ReportId: reportId,
          ExportType: exportFormat,
          Parameters: formattedParameters
        };
        
        console.log('Exporting from:', exportUrl);
        console.log('Formatted parameters:', JSON.stringify(formattedParameters, null, 2));
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
