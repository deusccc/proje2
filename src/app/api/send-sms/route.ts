import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { phone, orderId } = await req.json()

    console.log('📱 Konum doğrulama SMS API çağrıldı:', { phone, orderId });

    if (!phone || !orderId) {
      return NextResponse.json({ error: 'Telefon numarası ve sipariş IDsi gereklidir.' }, { status: 400 })
    }

    // 1. Generate a unique token for location verification
    const token = crypto.randomUUID()

    console.log('🔐 Doğrulama token oluşturuldu:', token);

    // 2. Save the token to the order
    const { error: updateError } = await supabase
      .from('orders')
      .update({ location_verification_token: token })
      .eq('id', orderId)

    if (updateError) {
      console.error('❌ Sipariş token güncellenirken hata:', updateError)
      return NextResponse.json({ error: 'Sipariş güncellenirken bir hata oluştu.' }, { status: 500 })
    }

    console.log('✅ Sipariş token ile güncellendi');

    // 3. Construct the verification URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/verify-location/${token}`

    console.log('🔗 Doğrulama URL\'si oluşturuldu:', verificationUrl);

    // 4. Prepare and send the SMS via Netgsm
    const usercode = process.env.NETGSM_USERCODE
    const password = process.env.NETGSM_PASSWORD
    const senderTitle = process.env.NETGSM_SENDER_TITLE
    
    console.log('🔑 Netgsm API bilgileri kontrol ediliyor:', {
      usercode: usercode ? '✅ Mevcut' : '❌ Yok',
      password: password ? '✅ Mevcut' : '❌ Yok',
      senderTitle: senderTitle ? '✅ Mevcut' : '❌ Yok'
    });
    
    if (!usercode || !password || !senderTitle) {
      console.error('❌ Netgsm credentials are not set in .env.local')
      return NextResponse.json({ error: 'SMS gönderici bilgileri ayarlanmamış.' }, { status: 500 })
    }

    // Telefon numarası formatı kontrolü
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10 || !cleanPhone.startsWith('5')) {
      return NextResponse.json({
        error: 'Telefon numarası 5XXXXXXXXX formatında olmalıdır (10 haneli, 5 ile başlayan)'
      }, { status: 400 });
    }

    const message = `Siparisinizin teslimat adresini dogrulamak icin lutfen linke tiklayin: ${verificationUrl}`

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

    console.log('📝 SMS mesajı hazırlandı:', {
      phone: cleanPhone,
      messageLength: cleanMessage.length,
      url: verificationUrl
    });

    // Düzeltilmiş XML format - Netgsm'in resmi dokümantasyonuna uygun
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<mainbody>
  <header>
    <company dil="TR">Netgsm</company>
    <usercode>${usercode}</usercode>
    <password>${password}</password>
    <type>1:n</type>
    <msgheader>${senderTitle}</msgheader>
  </header>
  <body>
    <msg><![CDATA[${cleanMessage}]]></msg>
    <no>${cleanPhone}</no>
  </body>
</mainbody>`

    console.log('📤 Netgsm API\'ye gönderiliyor...');

    const response = await fetch('https://api.netgsm.com.tr/sms/send/xml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml; charset=UTF-8' },
      body: xmlBody,
    })

    const responseText = await response.text()
    
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
    
    // Netgsm API returns '00' on success
    if (responseText.startsWith('00')) {
      console.log('✅ SMS başarıyla gönderildi');
      return NextResponse.json({ 
        success: true, 
        message: 'Doğrulama SMS\'i başarıyla gönderildi.',
        details: {
          phone: cleanPhone,
          orderId: orderId,
          token: token
        }
      })
    } else {
      const errorCode = responseText.trim();
      const errorMessage = getErrorMessage(errorCode);
      console.error('❌ Netgsm API Hatası:', { errorCode, errorMessage });
      return NextResponse.json({ 
        error: `SMS gönderilemedi: ${errorMessage}`, 
        errorCode: errorCode,
        response: responseText 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('💥 Send-SMS API hatası:', error)
    return NextResponse.json({ 
      error: 'İç sunucu hatası.',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
} 