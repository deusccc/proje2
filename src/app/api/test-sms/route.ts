import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, message } = body;

    console.log('📱 SMS Test API çağrıldı:', { to, message: message?.substring(0, 50) + '...' });

    if (!to || !message) {
      return NextResponse.json({ 
        success: false, 
        message: 'Telefon numarası ve mesaj gereklidir.' 
      }, { status: 400 });
    }

    const usercode = process.env.NETGSM_USERCODE;
    const password = process.env.NETGSM_PASSWORD;
    const msgheader = process.env.NETGSM_SENDER_TITLE;

    console.log('🔑 API bilgileri kontrol ediliyor:', {
      usercode: usercode ? '✅ Mevcut' : '❌ Yok',
      password: password ? '✅ Mevcut' : '❌ Yok', 
      msgheader: msgheader ? '✅ Mevcut' : '❌ Yok'
    });

    if (!usercode || !password) {
      return NextResponse.json({ 
        success: false, 
        message: 'Netgsm kullanıcı kodu ve şifre gereklidir.',
        details: {
          usercode: !!usercode,
          password: !!password,
          msgheader: !!msgheader
        }
      }, { status: 500 });
    }

    // Telefon numarası formatı kontrolü
    const cleanPhone = to.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10 || !cleanPhone.startsWith('5')) {
      return NextResponse.json({
        success: false,
        message: 'Telefon numarası 5XXXXXXXXX formatında olmalıdır (10 haneli, 5 ile başlayan)'
      }, { status: 400 });
    }

    // Mesajdan Türkçe karakterleri temizle
    const cleanMessage = message
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/Ç/g, 'C')
      .replace(/Ğ/g, 'G')
      .replace(/İ/g, 'I')
      .replace(/Ö/g, 'O')
      .replace(/Ş/g, 'S')
      .replace(/Ü/g, 'U');

    // Önce basit XML format deneyelim (msgheader olmadan)
    const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<mainbody>
    <header>
        <usercode>${usercode}</usercode>
        <password>${password}</password>
        <type>1:n</type>
    </header>
    <body>
        <msg><![CDATA[${cleanMessage}]]></msg>
        <no>${cleanPhone}</no>
    </body>
</mainbody>`;

    console.log('📤 Netgsm API\'ye gönderiliyor (basit format):', {
      url: 'https://api.netgsm.com.tr/sms/send/xml',
      phone: cleanPhone,
      messageLength: cleanMessage.length,
      xmlLength: xmlData.length,
      hasHeader: false
    });

    const response = await fetch('https://api.netgsm.com.tr/sms/send/xml', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
      },
      body: xmlData,
    });

    const responseText = await response.text();
    
    console.log('📥 Netgsm API yanıtı:', {
      status: response.status,
      response: responseText,
      isSuccess: responseText.startsWith('00')
    });

    // Netgsm hata kodları mapping
    const getErrorMessage = (code: string) => {
      const errorCodes: { [key: string]: string } = {
        '20': 'Mesaj metni boş',
        '30': 'Geçersiz kullanıcı adı / şifre',
        '40': 'Mesaj başlığı onaylanmamış',
        '50': 'Geçersiz numara formatı',
        '60': 'Operatör desteklenmiyor',
        '70': 'Hatalı mesaj formatı',
        '80': 'Mesaj karakter sınırı aşıldı',
        '85': 'Geçersiz XML format'
      };
      return errorCodes[code] || `Bilinmeyen hata kodu: ${code}`;
    };

    if (responseText.startsWith('00')) {
      return NextResponse.json({ 
        success: true, 
        message: 'SMS başarıyla gönderildi.', 
        response: responseText,
        details: {
          phone: cleanPhone,
          messageLength: cleanMessage.length,
          format: 'basit XML (msgheader yok)'
        }
      });
    } else {
      const errorCode = responseText.trim();
      const errorMessage = getErrorMessage(errorCode);
      
      // Eğer 30 hatası alıyorsak, msgheader ile tekrar deneyelim
      if (errorCode === '30' && msgheader) {
        console.log('⚠️ Basit format başarısız (30), msgheader ile tekrar deniyorum...');
        
        const xmlDataWithHeader = `<?xml version="1.0" encoding="UTF-8"?>
<mainbody>
    <header>
        <usercode>${usercode}</usercode>
        <password>${password}</password>
        <type>1:n</type>
        <msgheader>${msgheader}</msgheader>
    </header>
    <body>
        <msg><![CDATA[${cleanMessage}]]></msg>
        <no>${cleanPhone}</no>
    </body>
</mainbody>`;

        const response2 = await fetch('https://api.netgsm.com.tr/sms/send/xml', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml; charset=UTF-8',
          },
          body: xmlDataWithHeader,
        });

        const responseText2 = await response2.text();
        console.log('📥 Netgsm API yanıtı (msgheader ile):', responseText2);

        if (responseText2.startsWith('00')) {
          return NextResponse.json({ 
            success: true, 
            message: 'SMS başarıyla gönderildi (msgheader ile).', 
            response: responseText2,
            details: {
              phone: cleanPhone,
              messageLength: cleanMessage.length,
              format: 'msgheader ile'
            }
          });
        }
      }

      // Eğer 40 hatası alıyorsak, msgheader ile tekrar deneyelim (başlık onaylanmış olabilir)
      if (errorCode === '40' && msgheader) {
        console.log('⚠️ Başlık onaylanmamış (40), msgheader ile tekrar deniyorum...');
        
        const xmlDataWithHeader = `<?xml version="1.0" encoding="UTF-8"?>
<mainbody>
    <header>
        <usercode>${usercode}</usercode>
        <password>${password}</password>
        <type>1:n</type>
        <msgheader>${msgheader}</msgheader>
    </header>
    <body>
        <msg><![CDATA[${cleanMessage}]]></msg>
        <no>${cleanPhone}</no>
    </body>
</mainbody>`;

        const response2 = await fetch('https://api.netgsm.com.tr/sms/send/xml', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml; charset=UTF-8',
          },
          body: xmlDataWithHeader,
        });

        const responseText2 = await response2.text();
        console.log('📥 Netgsm API yanıtı (msgheader ile, 40 sonrası):', responseText2);

        if (responseText2.startsWith('00')) {
          return NextResponse.json({ 
            success: true, 
            message: 'SMS başarıyla gönderildi (msgheader ile, başlık onaylanmış).', 
            response: responseText2,
            details: {
              phone: cleanPhone,
              messageLength: cleanMessage.length,
              format: 'msgheader ile (40 sonrası başarılı)'
            }
          });
        } else {
          // Başlık ile de başarısız olduysa, gerçekten onaylanmamış demektir
          return NextResponse.json({ 
            success: false, 
            message: 'Mesaj başlığı henüz onaylanmamış. Başlık olmadan SMS gönderebilirsiniz.', 
            response: responseText2,
            errorCode: responseText2.trim(),
            suggestion: 'Netgsm hesabınızda "UFUK SAGIN" başlığını onaylatın veya başlık olmadan SMS gönderin.',
            workaround: '/api/test-sms-no-header endpoint\'ini kullanabilirsiniz.'
          }, { status: 200 });
        }
      }

      // 40 hatası ama msgheader yok
      if (errorCode === '40') {
        return NextResponse.json({ 
          success: false, 
          message: `SMS gönderilemedi: ${errorMessage}`, 
          response: responseText,
          errorCode: errorCode,
          suggestion: 'Netgsm hesabınızda "UFUK SAGIN" mesaj başlığını onaylatmanız gerekiyor.',
          workaround: 'Alternatif olarak başlık olmadan SMS gönderebiliriz.'
        }, { status: 200 }); // 200 status code çünkü sistem çalışıyor
      }
      
      return NextResponse.json({ 
        success: false, 
        message: `SMS gönderilemedi: ${errorMessage}`, 
        response: responseText,
        errorCode: errorCode,
        suggestion: errorCode === '30' ? 'Netgsm hesap bilgilerinizi ve hesap durumunuzu kontrol edin' : undefined
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('💥 SMS gönderme hatası:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Sunucu hatası.', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 