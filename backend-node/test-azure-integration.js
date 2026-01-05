/**
 * Azure Office 365 Integration Test
 * Tests if Azure SSO is properly configured
 */

require('dotenv').config();
const db = require('./config/database');
const msal = require('@azure/msal-node');

async function testAzureIntegration() {
  console.log('===========================================');
  console.log('🔍 Azure Office 365 Integration Test');
  console.log('===========================================\n');

  try {
    await db.initializeDatabase();
    const connection = await db.getConnection();

    // Test 1: Check Azure configuration in database
    console.log('1️⃣  Checking Azure Configuration in Database...\n');
    
    const [configs] = await connection.query(
      'SELECT config_key, config_value FROM system_configurations WHERE category = "Azure/Office 365" ORDER BY config_key'
    );

    if (configs.length === 0) {
      console.log('❌ CRITICAL: No Azure configuration found in database!');
      console.log('\n💡 Run the seeding script to add Azure configuration:');
      console.log('   node run-seed.js\n');
      connection.release();
      await db.closePool();
      process.exit(1);
    }

    console.log(`✅ Found ${configs.length} Azure configuration items:\n`);
    
    const configObj = {};
    configs.forEach(config => {
      configObj[config.config_key] = config.config_value;
      const displayValue = config.config_key.includes('secret') || config.config_key.includes('password')
        ? '***hidden***'
        : config.config_value;
      console.log(`   ${config.config_key}: ${displayValue}`);
    });

    // Test 2: Validate required fields
    console.log('\n2️⃣  Validating Required Configuration Fields...\n');
    
    const requiredFields = [
      'azure_tenant_id',
      'azure_client_id',
      'azure_client_secret',
      'azure_redirect_uri',
      'azure_auth_scope',
      'azure_authority_url'
    ];

    let allFieldsPresent = true;
    requiredFields.forEach(field => {
      if (configObj[field]) {
        console.log(`   ✅ ${field}: Present`);
      } else {
        console.log(`   ❌ ${field}: MISSING`);
        allFieldsPresent = false;
      }
    });

    if (!allFieldsPresent) {
      console.log('\n❌ Some required fields are missing!');
      connection.release();
      await db.closePool();
      process.exit(1);
    }

    // Test 3: Test MSAL configuration
    console.log('\n3️⃣  Testing MSAL Configuration...\n');
    
    try {
      const msalConfig = {
        auth: {
          clientId: configObj.azure_client_id,
          authority: `${configObj.azure_authority_url}${configObj.azure_tenant_id}`,
          clientSecret: configObj.azure_client_secret
        }
      };
      
      const pca = new msal.ConfidentialClientApplication(msalConfig);
      console.log('   ✅ MSAL Client created successfully');
      
      // Test generating auth URL
      const authCodeUrlParameters = {
        scopes: configObj.azure_auth_scope.split(' '),
        redirectUri: configObj.azure_redirect_uri
      };
      
      const authUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);
      console.log('   ✅ Auth URL generated successfully');
      console.log(`   📍 Auth URL: ${authUrl.substring(0, 80)}...`);
      
    } catch (msalError) {
      console.log('   ❌ MSAL Error:', msalError.message);
      console.log('\n💡 This might be an invalid Azure configuration.');
      console.log('   Check your Azure Portal settings.\n');
      connection.release();
      await db.closePool();
      process.exit(1);
    }

    // Test 4: Check if redirect URI matches
    console.log('\n4️⃣  Checking Redirect URI Configuration...\n');
    
    const expectedRedirectUri = `${process.env.BACKEND_URL || 'http://localhost:8001'}/api/auth/callback`;
    const configuredRedirectUri = configObj.azure_redirect_uri;
    
    console.log(`   Expected:   ${expectedRedirectUri}`);
    console.log(`   Configured: ${configuredRedirectUri}`);
    
    if (expectedRedirectUri === configuredRedirectUri) {
      console.log('   ✅ Redirect URI matches!');
    } else {
      console.log('   ⚠️  Redirect URI mismatch!');
      console.log('   💡 Update the database or your .env file to match.');
    }

    // Test 5: Check JWT configuration
    console.log('\n5️⃣  Checking JWT Configuration...\n');
    
    if (process.env.JWT_SECRET) {
      console.log(`   ✅ JWT_SECRET: Set (${process.env.JWT_SECRET.length} characters)`);
    } else {
      console.log('   ❌ JWT_SECRET: NOT SET in .env file!');
      console.log('   💡 Add JWT_SECRET to backend-node/.env file');
    }

    if (process.env.FRONTEND_URL) {
      console.log(`   ✅ FRONTEND_URL: ${process.env.FRONTEND_URL}`);
    } else {
      console.log('   ❌ FRONTEND_URL: NOT SET in .env file!');
    }

    // Test 6: Check if users exist
    console.log('\n6️⃣  Checking Users in Database...\n');
    
    const [users] = await connection.query(
      'SELECT COUNT(*) as count FROM users WHERE is_active = 1'
    );
    
    const activeUserCount = users[0].count;
    console.log(`   ✅ Active users in database: ${activeUserCount}`);
    
    if (activeUserCount === 0) {
      console.log('   ⚠️  No active users found!');
      console.log('   💡 Run the seeding script: node run-seed.js');
    }

    // Test 7: Test login endpoint availability
    console.log('\n7️⃣  Checking Auth Endpoints...\n');
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8001';
    console.log(`   Login URL: ${backendUrl}/api/auth/login`);
    console.log(`   Callback URL: ${backendUrl}/api/auth/callback`);
    console.log('   ✅ Routes should be registered');

    connection.release();
    await db.closePool();

    // Final Summary
    console.log('\n===========================================');
    console.log('📊 Integration Status Summary');
    console.log('===========================================\n');

    const issues = [];
    
    if (!allFieldsPresent) issues.push('Missing required Azure config fields');
    if (!process.env.JWT_SECRET) issues.push('JWT_SECRET not set');
    if (!process.env.FRONTEND_URL) issues.push('FRONTEND_URL not set');
    if (activeUserCount === 0) issues.push('No active users in database');
    if (expectedRedirectUri !== configuredRedirectUri) issues.push('Redirect URI mismatch');

    if (issues.length === 0) {
      console.log('✅ ✅ ✅ ALL CHECKS PASSED! ✅ ✅ ✅');
      console.log('\n🎉 Azure Office 365 integration is properly configured!\n');
      console.log('📋 Next Steps:');
      console.log('   1. Ensure backend is running: npm start');
      console.log('   2. Ensure frontend is running: npm start (in frontend folder)');
      console.log('   3. Go to: http://localhost:3000');
      console.log('   4. Click "Sign in with Microsoft"');
      console.log('   5. You should be redirected to Microsoft login\n');
      console.log('⚠️  IMPORTANT: The Azure app must be registered in Azure Portal');
      console.log('    and the redirect URI must match in both places!\n');
    } else {
      console.log('⚠️  ISSUES FOUND:\n');
      issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue}`);
      });
      console.log('\n💡 Fix these issues before testing login.\n');
    }

    process.exit(issues.length === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    await db.closePool();
    process.exit(1);
  }
}

// Run the test
testAzureIntegration();

