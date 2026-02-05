import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BOLD_SITE_ID = Deno.env.get('BOLD_SITE_ID');
const BOLD_EMAIL = Deno.env.get('BOLD_EMAIL');
const BOLD_EMBED_SECRET = Deno.env.get('BOLD_EMBED_SECRET');
const BASE_URL = `https://cloud.boldreports.com/reporting/api/site/${BOLD_SITE_ID}`;
const TOKEN_URL = `${BASE_URL}/token`;

interface AuthRequest {
  email: string;
}

interface UserResponse {
  Id: number;
  Email: string;
  FirstName: string;
  LastName: string;
  DisplayName: string;
  IsActive: boolean;
}

interface GroupsResponse {
  Groups?: Array<{
    Id: string;
    Name: string;
  }>;
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
  const bytes = new Uint8Array(signature);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Get system token using Embed Secret (authenticates as system user)
async function getSystemToken(): Promise<string> {
  console.log('[BoldAuth] Getting system token via Embed Secret');
  
  if (!BOLD_EMBED_SECRET || !BOLD_EMAIL) {
    throw new Error('BOLD_EMBED_SECRET and BOLD_EMAIL are required');
  }
  
  const nonce = crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const embedMessage = `embed_nonce=${nonce}&user_email=${BOLD_EMAIL}&timestamp=${timestamp}`.toLowerCase();
  
  const signature = await generateEmbedSignature(embedMessage, BOLD_EMBED_SECRET);
  
  const formData = new URLSearchParams();
  formData.append('grant_type', 'embed_secret');
  formData.append('username', BOLD_EMAIL);
  formData.append('embed_nonce', nonce);
  formData.append('embed_signature', signature);
  formData.append('timestamp', timestamp);
  
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[BoldAuth] System token error:', errorText);
    throw new Error('Failed to get system token');
  }
  
  const tokenData = await response.json();
  return tokenData.access_token;
}

// Find user by email using system token
async function findUserByEmail(systemToken: string, email: string): Promise<UserResponse | null> {
  // Try to get all users and filter by email
  const usersUrl = `${BASE_URL}/v1.0/users`;
  console.log('[BoldAuth] Searching for user:', email);
  console.log('[BoldAuth] Users URL:', usersUrl);
  
  const response = await fetch(usersUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${systemToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    console.error('[BoldAuth] Failed to fetch users:', response.status);
    const errorText = await response.text();
    console.error('[BoldAuth] Users error response:', errorText.substring(0, 300));
    return null;
  }
  
  const data = await response.json();
  console.log('[BoldAuth] Users response type:', typeof data);
  console.log('[BoldAuth] Users response keys:', Object.keys(data || {}));
  
  // Handle different response formats from Bold Reports API
  let users: UserResponse[] = [];
  
  if (Array.isArray(data)) {
    users = data;
  } else if (data && typeof data === 'object') {
    // Try common response wrapper properties
    users = data.value || data.Users || data.items || data.Result || [];
    
    // If still not an array, check if it's a single user object
    if (!Array.isArray(users)) {
      console.log('[BoldAuth] Response is not an array, checking if single user');
      if (data.Email || data.Id) {
        users = [data as UserResponse];
      } else {
        console.error('[BoldAuth] Unexpected response format:', JSON.stringify(data).substring(0, 500));
        users = [];
      }
    }
  }
  
  console.log('[BoldAuth] Found', users.length, 'users total');
  
  // Find user by email (case-insensitive)
  const user = users.find((u: UserResponse) => 
    u.Email?.toLowerCase() === email.toLowerCase()
  );
  
  if (user) {
    console.log('[BoldAuth] Found user:', { id: user.Id, email: user.Email });
  } else {
    console.log('[BoldAuth] User not found in Bold Reports');
  }
  
  return user || null;
}

// Get user groups
async function getUserGroups(systemToken: string, userId: number): Promise<string[]> {
  const groupsUrl = `${BASE_URL}/v1.0/users/${userId}/groups`;
  console.log('[BoldAuth] Getting groups for user:', userId);
  
  const response = await fetch(groupsUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${systemToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    console.warn('[BoldAuth] Could not fetch user groups');
    return [];
  }
  
  const data: GroupsResponse = await response.json();
  const groupNames = data.Groups?.map(g => g.Name) || [];
  console.log('[BoldAuth] User groups:', groupNames);
  
  return groupNames;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[BoldAuth] Starting authentication flow');
    
    if (!BOLD_SITE_ID || !BOLD_EMBED_SECRET || !BOLD_EMAIL) {
      console.error('[BoldAuth] Missing configuration');
      return new Response(
        JSON.stringify({ success: false, error: 'Bold Reports not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email }: AuthRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[BoldAuth] Looking up user:', email);

    // Step 1: Get system token using embed secret
    const systemToken = await getSystemToken();
    console.log('[BoldAuth] System token obtained');

    // Step 2: Find user by email
    const user = await findUserByEmail(systemToken, email);
    
    if (!user) {
      // User doesn't exist in Bold Reports - still return success but not synced
      console.log('[BoldAuth] User not found in Bold Reports, returning unsynced state');
      return new Response(
        JSON.stringify({
          success: true,
          synced: false,
          userId: null,
          email: email,
          isAdmin: false,
          message: 'Usuário não encontrado no Bold Reports',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Get user groups to check admin status
    const groups = await getUserGroups(systemToken, user.Id);
    const isAdmin = groups.includes('System Administrator');

    console.log('[BoldAuth] Authentication successful:', { userId: user.Id, isAdmin });

    return new Response(
      JSON.stringify({
        success: true,
        synced: true,
        boldToken: systemToken, // Use system token for API calls
        userId: user.Id,
        email: user.Email,
        isAdmin,
        groups,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[BoldAuth] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro inesperado na autenticação' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
