
export const oauthProviders = {
  google: {
    id: 'google',
    name: 'Google',
    type: 'oauth' as const,
    authorization: {
      url: 'https://accounts.google.com/oauth/authorize',
      params: {
        scope: 'openid email profile',
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent'
      }
    },
    token: 'https://oauth2.googleapis.com/token',
    userinfo: 'https://openidconnect.googleapis.com/v1/userinfo',
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    allowDangerousEmailAccountLinking: true,
    profile(profile: any) {
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        image: profile.picture,
        emailVerified: profile.email_verified,
        locale: profile.locale
      };
    },
    options: {
      scope: 'openid email profile'
    }
  },

  facebook: {
    id: 'facebook',
    name: 'Facebook',
    type: 'oauth' as const,
    authorization: {
      url: 'https://www.facebook.com/v18.0/dialog/oauth',
      params: {
        scope: 'email public_profile',
        response_type: 'code'
      }
    },
    token: 'https://graph.facebook.com/v18.0/oauth/access_token',
    userinfo: 'https://graph.facebook.com/v18.0/me?fields=id,name,email,picture',
    clientId: process.env.FACEBOOK_CLIENT_ID!,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    allowDangerousEmailAccountLinking: true,
    profile(profile: any) {
      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        image: profile.picture?.data?.url
      };
    },
    options: {
      scope: 'email public_profile'
    }
  },

  // Add more providers as needed
  github: {
    id: 'github',
    name: 'GitHub',
    type: 'oauth' as const,
    authorization: {
      url: 'https://github.com/login/oauth/authorize',
      params: {
        scope: 'read:user user:email'
      }
    },
    token: 'https://github.com/login/oauth/access_token',
    userinfo: 'https://api.github.com/user',
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    profile(profile: any) {
      return {
        id: profile.id.toString(),
        name: profile.name || profile.login,
        email: profile.email,
        image: profile.avatar_url
      };
    }
  }
};

// OAuth scopes for different providers
export const oauthScopes = {
  google: [
    'openid',
    'email', 
    'profile'
  ],
  facebook: [
    'email',
    'public_profile'
  ],
  github: [
    'read:user',
    'user:email'
  ]
};

// OAuth configuration for device flow
export const deviceFlowConfig = {
  // Device authorization endpoint
  deviceAuthUrl: '/api/oauth/device/auth',
  
  // Token endpoint
  tokenUrl: '/api/oauth/device/token',
  
  // Verification URL for users
  verificationUrl: '/device/verify',
  
  // Complete verification URL
  verificationUriComplete: '/device/verify?user_code={{USER_CODE}}',
  
  // Polling interval in seconds
  interval: 5,
  
  // Device code expires in seconds
  expiresIn: 600, // 10 minutes
  
  // User code length
  userCodeLength: 8,
  
  // Device code length  
  deviceCodeLength: 40
};

// OAuth client credentials flow configuration
export const clientCredentialsConfig = {
  // Token endpoint
  tokenUrl: '/api/oauth/token',
  
  // Supported grant types
  grantTypes: [
    'client_credentials',
    'authorization_code',
    'refresh_token',
    'device_code'
  ],
  
  // Token expiration times
  tokenExpiry: {
    accessToken: 3600, // 1 hour
    refreshToken: 2592000, // 30 days
    deviceCode: 600, // 10 minutes
    authorizationCode: 300 // 5 minutes
  },
  
  // Supported scopes
  scopes: [
    'read:profile',
    'read:transactions', 
    'read:loans',
    'write:transactions',
    'write:loans',
    'admin:all'
  ],

  // Rate limiting for OAuth endpoints
  rateLimit: {
    tokenRequests: 10, // per minute
    deviceAuth: 5, // per minute
    introspection: 20 // per minute
  }
};

// OAuth error codes
export const oauthErrors = {
  invalidRequest: 'invalid_request',
  invalidClient: 'invalid_client', 
  invalidGrant: 'invalid_grant',
  unauthorizedClient: 'unauthorized_client',
  unsupportedGrantType: 'unsupported_grant_type',
  invalidScope: 'invalid_scope',
  accessDenied: 'access_denied',
  unsupportedResponseType: 'unsupported_response_type',
  serverError: 'server_error',
  temporarilyUnavailable: 'temporarily_unavailable',
  authorizationPending: 'authorization_pending',
  slowDown: 'slow_down',
  expiredToken: 'expired_token'
};

// OAuth security configuration
export const oauthSecurity = {
  // PKCE (Proof Key for Code Exchange) settings
  pkce: {
    required: true,
    codeChallengeMethods: ['S256', 'plain']
  },
  
  // State parameter validation
  state: {
    required: true,
    length: 32
  },
  
  // Nonce for ID tokens
  nonce: {
    required: true,
    length: 32
  },
  
  // Redirect URI validation
  redirectUri: {
    strictMatching: true,
    allowedSchemes: ['https', 'http'], // http only for development
    allowLocalhost: process.env.NODE_ENV === 'development'
  },
  
  // Client authentication methods
  clientAuthMethods: [
    'client_secret_basic',
    'client_secret_post',
    'private_key_jwt',
    'client_secret_jwt'
  ],
  
  // Token introspection
  introspection: {
    enabled: true,
    requireAuth: true
  },
  
  // Refresh token rotation
  refreshTokenRotation: true,
  
  // Access token format
  accessTokenFormat: 'jwt', // or 'opaque'
  
  // JWT settings for access tokens
  jwt: {
    algorithm: 'HS256',
    issuer: process.env.NEXTAUTH_URL,
    audience: 'financial-app',
    expiresIn: '1h'
  }
};

// Export OAuth configuration
export const oauthConfig = {
  providers: oauthProviders,
  scopes: oauthScopes,
  deviceFlow: deviceFlowConfig,
  clientCredentials: clientCredentialsConfig,
  errors: oauthErrors,
  security: oauthSecurity
};

export default oauthConfig;