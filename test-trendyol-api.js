const https = require('https');

const testTrendyolAPI = async () => {
  const supplierId = '6642392';
  const storeId = '361179'; // Gerçek store ID
  const apiKey = 'zwAcfNuGBrHYOn38pUHW';
  const apiSecret = 'rtnQ8k7ZQnnMXgeVgzBY';
  const token = 'endBY2ZOdUdCckhZT24zOHBVSFc6cnRuUThrN1pRbm5NWGdlVmd6Qlk=';
  
  const credentials = `${supplierId}:${apiKey}:${apiSecret}`;
  const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;
  
  console.log('🔐 Authentication Info:');
  console.log('Supplier ID:', supplierId);
  console.log('Store ID:', storeId);
  console.log('API Key:', apiKey.substring(0, 10) + '...');
  console.log('API Secret:', apiSecret.substring(0, 10) + '...');
  console.log('Token:', token.substring(0, 20) + '...');
  console.log('Auth Header:', authHeader.substring(0, 30) + '...');
  
  const testEndpoints = [
    {
      name: 'Restaurant Menu',
      url: `https://api.tgoapis.com/integrator/product/meal/suppliers/${supplierId}/stores/${storeId}/products`
    },
    {
      name: 'Restaurant Info',
      url: `https://api.tgoapis.com/integrator/product/meal/suppliers/${supplierId}/stores/${storeId}`
    },
    {
      name: 'Orders (Packages) - No Params',
      url: `https://api.tgoapis.com/integrator/order/meal/suppliers/${supplierId}/packages`
    },
    {
      name: 'Orders (Packages) - With Timestamp Size 50',
      url: `https://api.tgoapis.com/integrator/order/meal/suppliers/${supplierId}/packages?size=50&packageModificationStartDate=${Date.now() - 7*24*60*60*1000}&packageModificationEndDate=${Date.now()}`
    },
    {
      name: 'Orders (Packages) - With Timestamp Size 10',
      url: `https://api.tgoapis.com/integrator/order/meal/suppliers/${supplierId}/packages?size=10&packageModificationStartDate=${Date.now() - 7*24*60*60*1000}&packageModificationEndDate=${Date.now()}`
    }
  ];
  
  // Test 1: Basic Auth ile
  console.log('\n🔵 Testing with Basic Auth:');
  for (const endpoint of testEndpoints) {
    console.log(`\n🧪 Testing ${endpoint.name}:`);
    console.log('URL:', endpoint.url);
    
    try {
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'User-Agent': `${supplierId} - SelfIntegration`,
          'x-agentname': `${supplierId} - SelfIntegration`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Status:', response.status, response.statusText);
      
      const text = await response.text();
      console.log('Response Body:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
      
      if (response.ok) {
        console.log('✅ Success!');
      } else {
        console.log('❌ Failed!');
      }
    } catch (error) {
      console.log('💥 Error:', error.message);
    }
  }
  
  // Test 2: Token ile
  console.log('\n🟡 Testing with Token:');
  for (const endpoint of testEndpoints) {
    console.log(`\n🧪 Testing ${endpoint.name}:`);
    console.log('URL:', endpoint.url);
    
    try {
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': `${supplierId} - SelfIntegration`,
          'x-agentname': `${supplierId} - SelfIntegration`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Status:', response.status, response.statusText);
      
      const text = await response.text();
      console.log('Response Body:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
      
      if (response.ok) {
        console.log('✅ Success!');
      } else {
        console.log('❌ Failed!');
      }
    } catch (error) {
      console.log('💥 Error:', error.message);
    }
  }
  
  // Test 3: Token'ı Basic olarak
  console.log('\n🟢 Testing with Token as Basic:');
  for (const endpoint of testEndpoints) {
    console.log(`\n🧪 Testing ${endpoint.name}:`);
    console.log('URL:', endpoint.url);
    
    try {
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${token}`,
          'User-Agent': `${supplierId} - SelfIntegration`,
          'x-agentname': `${supplierId} - SelfIntegration`,
          'x-executor-user': 'integration@restaurant.com',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Status:', response.status, response.statusText);
      
      const text = await response.text();
      console.log('Response Body:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
      
      if (response.ok) {
        console.log('✅ Success!');
      } else {
        console.log('❌ Failed!');
      }
    } catch (error) {
      console.log('💥 Error:', error.message);
    }
  }
};

testTrendyolAPI().catch(console.error); 