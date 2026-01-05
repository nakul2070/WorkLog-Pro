const msal = require('@azure/msal-node');
const jwt = require('jsonwebtoken');
const db = require('../config/database'); // Use our existing DB config

// Helper function to fetch Azure config from the database
async function getAzureConfig() {
  const configs = await db.executeQuery(
    'SELECT config_key, config_value FROM system_configurations WHERE category = "Azure/Office 365"'
  );
  return configs.reduce((acc, c) => ({ ...acc, [c.config_key]: c.config_value }), {});
}

exports.initiateAzureLogin = async (req, res) => {
  try {
    const config = await getAzureConfig();
    
    // Use BACKEND_URL from environment if available (for local development)
    // Otherwise fall back to database value (for production)
    const backendUrl = process.env.BACKEND_URL || (config.azure_redirect_uri ? config.azure_redirect_uri.replace('/api/auth/callback', '') : 'http://localhost:8001');
    const redirectUri = `${backendUrl}/api/auth/callback`;
    
    console.log(`🔐 Using redirect URI: ${redirectUri} (BACKEND_URL: ${process.env.BACKEND_URL || 'not set'})`);
    
    const msalConfig = {
      auth: {
        clientId: config.azure_client_id,
        authority: `${config.azure_authority_url}${config.azure_tenant_id}`,
        clientSecret: config.azure_client_secret
      }
    };
    
    const pca = new msal.ConfidentialClientApplication(msalConfig);
    const authCodeUrlParameters = {
      scopes: config.azure_auth_scope.split(' '), 
      redirectUri: redirectUri
    };
    
    const authUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);
    res.redirect(authUrl);
  } catch (error) {
    console.error("Error in /auth/login:", error);
    res.status(500).json({ success: false, error: "Failed to initiate login." });
  }
};

exports.handleAzureCallback = async (req, res) => {
  try {
    const { code } = req.query; 
    const config = await getAzureConfig();
    
    // Use BACKEND_URL from environment if available (for local development)
    // Otherwise fall back to database value (for production)
    const backendUrl = process.env.BACKEND_URL || (config.azure_redirect_uri ? config.azure_redirect_uri.replace('/api/auth/callback', '') : 'http://localhost:8001');
    const redirectUri = `${backendUrl}/api/auth/callback`;
    
    console.log(`🔐 Callback using redirect URI: ${redirectUri}`);
    
    const msalConfig = {
      auth: {
        clientId: config.azure_client_id,
        authority: `${config.azure_authority_url}${config.azure_tenant_id}`,
        clientSecret: config.azure_client_secret
      }
    };

    const tokenRequest = {
        code: code,
        scopes: config.azure_auth_scope.split(' '),
        redirectUri: redirectUri,
    };
    
    const pca = new msal.ConfidentialClientApplication(msalConfig);
    const tokenResponse = await pca.acquireTokenByCode(tokenRequest);
    
    const { account } = tokenResponse;
    const email = account.username;
    
    // Look up user in our database
    const [dbUser] = await db.executeQuery('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
    
    if (!dbUser) { // Check if dbUser (the first object) is undefined
      console.error(`Auth failed: User not found or inactive in DB: ${email}`);
      return res.status(403).send('User not found or is not active in this system. Please contact your administrator.');
    }
    
    // <-- FIX: The variable 'dbUser' is already the user object.
    // We don't need 'dbUser[0]'.
    const user = dbUser; 
    
    // Create our app's JWT
    // Convert token expiration to proper format (handle both string and number)
    let tokenExpiration = '8h'; // Default: 8 hours
    if (config.azure_token_expiration) {
      // If it's a number string like "3600", convert to seconds format
      const expirationValue = parseInt(config.azure_token_expiration);
      if (!isNaN(expirationValue)) {
        tokenExpiration = expirationValue; // JWT will treat as seconds
      } else {
        tokenExpiration = config.azure_token_expiration; // Use as-is if it's like "1h", "2d", etc.
      }
    }
    
    const jwtToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        name: user.name,
        isAdmin: !!user.is_admin,
        isProjectManager: !!user.is_project_manager
      },
      process.env.JWT_SECRET,
      { expiresIn: tokenExpiration }
    );
    
    console.log(`✅ JWT created for user ${user.email} with expiration: ${tokenExpiration}`);
    
    // Redirect to the frontend callback page with the token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${jwtToken}`);
  } catch (error) {
      console.error("Error in /auth/callback:", error);
      // Send a plain JSON error
      res.status(500).json({ success: false, error: "Failed to handle auth callback." });
  }
};

// Test login endpoint (development only)
exports.testLogin = async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log(`🧪 Test login attempt for: ${email}`);
    
    // Look up user in database
    const [user] = await db.executeQuery(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email]
    );
    
    if (!user) {
      console.error(`❌ Test login failed: User not found - ${email}`);
      return res.status(404).json({
        success: false,
        error: 'User not found or inactive'
      });
    }
    
    // Create JWT with role information
    const jwtToken = jwt.sign({
      userId: user.id,
      email: user.email,
      name: user.name,
      isAdmin: !!user.is_admin,
      isProjectManager: !!user.is_project_manager
    }, process.env.JWT_SECRET, { expiresIn: '8h' });
    
    console.log(`✅ Test login successful for ${user.name} (Admin: ${!!user.is_admin}, PM: ${!!user.is_project_manager})`);
    
    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        employeeId: user.employee_id,
        email: user.email,
        name: user.name,
        isAdmin: !!user.is_admin,
        isProjectManager: !!user.is_project_manager
      }
    });
    
  } catch (error) {
    console.error('❌ Test login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
};