import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BOLD_SITE_ID = Deno.env.get('BOLD_SITE_ID');
const BASE_URL = `https://cloud.boldreports.com/reporting/api/site/${BOLD_SITE_ID}`;
const TOKEN_URL = `${BASE_URL}/token`;

interface AuthRequest {
  email: string;
  password: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: string;
  email: string;
  error?: string;
  error_description?: string;
}

interface UserMeResponse {
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[BoldAuth] Starting authentication flow');
    
    if (!BOLD_SITE_ID) {
      console.error('[BoldAuth] BOLD_SITE_ID not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Bold Reports not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password }: AuthRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[BoldAuth] Authenticating user:', email);

    // Step 1: Get access token from Bold Reports
    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('username', email);
    formData.append('password', password);

    console.log('[BoldAuth] Token URL:', TOKEN_URL);

    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const tokenText = await tokenResponse.text();
    console.log('[BoldAuth] Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      console.error('[BoldAuth] Token error:', tokenText.substring(0, 300));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Credenciais inválidas no Bold Reports' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData: TokenResponse = JSON.parse(tokenText);

    if (tokenData.error) {
      console.error('[BoldAuth] Token API error:', tokenData.error_description || tokenData.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: tokenData.error_description || tokenData.error 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = `${tokenData.token_type} ${tokenData.access_token}`;
    console.log('[BoldAuth] Token obtained successfully');

    // Step 2: Get user info from /users/me
    const userMeUrl = `${BASE_URL}/v1.0/users/me`;
    console.log('[BoldAuth] Getting user info from:', userMeUrl);

    const userResponse = await fetch(userMeUrl, {
      method: 'GET',
      headers: {
        'Authorization': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!userResponse.ok) {
      const userErrorText = await userResponse.text();
      console.error('[BoldAuth] User info error:', userErrorText.substring(0, 300));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Falha ao obter informações do usuário' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userData: UserMeResponse = await userResponse.json();
    console.log('[BoldAuth] User info:', { id: userData.Id, email: userData.Email });

    // Step 3: Check if user is admin by getting groups
    const groupsUrl = `${BASE_URL}/v1.0/users/${userData.Id}/groups`;
    console.log('[BoldAuth] Getting user groups from:', groupsUrl);

    const groupsResponse = await fetch(groupsUrl, {
      method: 'GET',
      headers: {
        'Authorization': accessToken,
        'Content-Type': 'application/json',
      },
    });

    let isAdmin = false;

    if (groupsResponse.ok) {
      const groupsData: GroupsResponse = await groupsResponse.json();
      console.log('[BoldAuth] User groups:', groupsData.Groups?.map(g => g.Name) || []);
      
      // Check if user belongs to "System Administrator" group
      isAdmin = groupsData.Groups?.some(g => g.Name === 'System Administrator') || false;
    } else {
      console.warn('[BoldAuth] Could not fetch user groups, assuming non-admin');
    }

    console.log('[BoldAuth] Authentication successful:', { userId: userData.Id, isAdmin });

    return new Response(
      JSON.stringify({
        success: true,
        boldToken: tokenData.access_token,
        userId: userData.Id,
        email: userData.Email,
        isAdmin,
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
