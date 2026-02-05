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

interface BoldUser {
  id: number;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  groups: string[];
}

interface UserResponse {
  UserId?: number;
  Id?: number;
  Email: string;
  FirstName?: string;
  LastName?: string;
  DisplayName?: string;
  IsActive?: boolean;
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

// Get system token using Embed Secret
async function getSystemToken(): Promise<string> {
  console.log('[BoldUsers] Getting system token via Embed Secret');
  
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
    console.error('[BoldUsers] System token error:', errorText);
    throw new Error('Failed to get system token');
  }
  
  const tokenData = await response.json();
  return tokenData.access_token;
}

// Get all users from Bold Reports
async function getAllUsers(systemToken: string): Promise<UserResponse[]> {
  const usersUrl = `${BASE_URL}/v1.0/users`;
  console.log('[BoldUsers] Fetching all users');
  
  const response = await fetch(usersUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${systemToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    console.error('[BoldUsers] Failed to fetch users:', response.status);
    throw new Error('Failed to fetch users');
  }
  
  const data = await response.json();
  
  let users: UserResponse[] = [];
  
  if (Array.isArray(data)) {
    users = data;
  } else if (data && typeof data === 'object') {
    users = data.UserList || data.value || data.Users || data.items || data.Result || [];
  }
  
  console.log('[BoldUsers] Found', users.length, 'users');
  return users;
}

// Get user groups
async function getUserGroups(systemToken: string, userId: number): Promise<string[]> {
  const groupsUrl = `${BASE_URL}/v1.0/users/${userId}/groups`;
  
  const response = await fetch(groupsUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${systemToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    console.warn('[BoldUsers] Could not fetch groups for user:', userId);
    return [];
  }
  
  const data = await response.json();
  
  let groups: Array<{ Id?: string; Name?: string; GroupName?: string }> = [];
  
  if (Array.isArray(data)) {
    groups = data;
  } else if (data && typeof data === 'object') {
    groups = data.GroupList || data.Groups || data.value || data.items || data.Result || [];
  }
  
  return groups.map(g => g.Name || g.GroupName || '').filter(Boolean);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[BoldUsers] Starting users fetch');
    
    if (!BOLD_SITE_ID || !BOLD_EMBED_SECRET || !BOLD_EMAIL) {
      console.error('[BoldUsers] Missing configuration');
      return new Response(
        JSON.stringify({ success: false, error: 'Bold Reports not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get system token
    const systemToken = await getSystemToken();
    console.log('[BoldUsers] System token obtained');

    // Get all users
    const rawUsers = await getAllUsers(systemToken);

    // Enrich each user with their groups
    const users: BoldUser[] = await Promise.all(
      rawUsers.map(async (user) => {
        const userId = user.UserId || user.Id || 0;
        const groups = userId ? await getUserGroups(systemToken, userId) : [];
        
        return {
          id: userId,
          email: user.Email || '',
          displayName: user.DisplayName || `${user.FirstName || ''} ${user.LastName || ''}`.trim() || user.Email || '',
          firstName: user.FirstName || '',
          lastName: user.LastName || '',
          isActive: user.IsActive !== false,
          groups,
        };
      })
    );

    console.log('[BoldUsers] Returning', users.length, 'users with groups');

    return new Response(
      JSON.stringify({
        success: true,
        users,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[BoldUsers] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao buscar usuários' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
