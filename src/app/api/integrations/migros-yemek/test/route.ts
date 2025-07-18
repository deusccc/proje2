import { NextRequest, NextResponse } from 'next/server';
import { RijndaelEncryption } from '@/lib/encryption/rijndael';
import { MigrosYemekApiClient } from '@/lib/integrations/migros-yemek/api-client';
import { MigrosYemekConfig } from '@/lib/integrations/migros-yemek/types';

export async function POST(request: NextRequest) {
  try {
    const { secretKey, apiKey, testData } = await request.json();

    // Test verileri
    const defaultTestData = {
      storeGroupId: 511
    };

    const dataToTest = testData || defaultTestData;

    console.log('🧪 Migros Yemek Rijndael Encryption Test');
    console.log('Secret Key:', secretKey);
    console.log('Test Data:', dataToTest);

    // 1. Şifreleme testi
    const encrypted = RijndaelEncryption.encrypt(dataToTest, secretKey);
    console.log('Encrypted:', encrypted);

    // 2. Şifre çözme testi
    const decrypted = RijndaelEncryption.decrypt(encrypted, secretKey);
    console.log('Decrypted:', decrypted);

    // 3. Request body oluşturma testi
    const requestBody = RijndaelEncryption.createRequestBody(dataToTest, secretKey);
    console.log('Request Body:', requestBody);

    // 4. API Client testi (eğer API bilgileri verilmişse)
    let apiTestResult = null;
    if (apiKey && secretKey) {
      const config: MigrosYemekConfig = {
        secretKey,
        apiKey,
        baseUrl: 'https://api.migros.com.tr', // Test URL
        webhookUrl: '',
        isActive: true
      };

      const apiClient = new MigrosYemekApiClient(config);
      
      try {
        apiTestResult = await apiClient.testConnection();
        console.log('API Test Result:', apiTestResult);
      } catch (error) {
        console.error('API Test Error:', error);
        apiTestResult = { success: false, error: error instanceof Error ? error.message : 'API test failed' };
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        encryption: {
          original: dataToTest,
          encrypted: encrypted,
          decrypted: JSON.parse(decrypted),
          requestBody: requestBody,
          encryptionWorking: JSON.stringify(dataToTest) === decrypted
        },
        apiTest: apiTestResult
      }
    });

  } catch (error: any) {
    console.error('💥 Migros Yemek test hatası:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Test failed' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Migros Yemek Integration Test Endpoint',
    usage: {
      method: 'POST',
      body: {
        secretKey: 'string (32 characters)',
        apiKey: 'string (optional)',
        testData: 'object (optional, defaults to {storeGroupId: 511})'
      }
    },
    example: {
      secretKey: '4t7w9z$C&F)J@NcRfUjXn2r5u8x/A%D*',
      apiKey: 'YOUR_API_KEY',
      testData: {
        storeGroupId: 511
      }
    }
  });
} 