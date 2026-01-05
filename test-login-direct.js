const http = require('http');

function testLogin(email, roleName) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email });
    
    const options = {
      hostname: 'localhost',
      port: 8001,
      path: '/api/auth/test-login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200 && response.success) {
            console.log(`\n✅ ${roleName} Login SUCCESS`);
            console.log(`   Name: ${response.user.name}`);
            console.log(`   Email: ${response.user.email}`);
            console.log(`   Is Admin: ${response.user.isAdmin}`);
            console.log(`   Is PM: ${response.user.isProjectManager}`);
            console.log(`   Token: ${response.token.substring(0, 40)}...`);
            resolve(true);
          } else {
            console.log(`\n❌ ${roleName} Login FAILED`);
            console.log(`   Error: ${response.error || 'Unknown error'}`);
            resolve(false);
          }
        } catch (error) {
          console.log(`\n❌ ${roleName} Login ERROR`);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Response: ${data}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`\n❌ ${roleName} Connection ERROR`);
      console.log(`   Error: ${error.message}`);
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('\n========================================');
  console.log('   ROLE-BASED LOGIN TEST (Node.js)');
  console.log('========================================');
  
  // Test 1: Employee
  const test1 = await testLogin('alice.johnson@kadellabs.com', 'Employee (Alice Johnson)');
  
  // Test 2: Project Manager
  const test2 = await testLogin('michael.chen@kadellabs.com', 'Project Manager (Michael Chen)');
  
  // Test 3: Admin
  const test3 = await testLogin('atul.pandey@kadellabs.com', 'Admin (Atul Pandey)');
  
  console.log('\n========================================');
  console.log('   TEST SUMMARY');
  console.log('========================================\n');
  
  console.log(`Employee Test:          ${test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Project Manager Test:   ${test2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Admin Test:             ${test3 ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = test1 && test2 && test3;
  console.log(`\nOverall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);
  
  process.exit(allPassed ? 0 : 1);
}

runTests();

