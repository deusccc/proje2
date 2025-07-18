import crypto from 'crypto';

export class RijndaelEncryption {
  /**
   * Migros Yemek API için AES-256-ECB şifreleme
   * @param data - Şifrelenecek veri (string veya object)
   * @param secretKey - 32 karakter secret key
   * @returns Base64 encoded şifrelenmiş veri
   */
  static encrypt(data: string | object, secretKey: string): string {
    try {
      // Veriyi string'e çevir
      const text = typeof data === 'string' ? data : JSON.stringify(data);
      
      // PKCS7 padding uygula (16 byte blok boyutu)
      const padded = this.pkcs7Pad(text, 16);
      
      // AES-256-ECB cipher oluştur
      const cipher = crypto.createCipheriv('aes-256-ecb', secretKey, null);
      cipher.setAutoPadding(false);
      
      // Şifrele
      let encrypted = cipher.update(padded, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      return encrypted;
    } catch (error) {
      console.error('Rijndael encryption error:', error);
      throw new Error('Şifreleme hatası');
    }
  }

  /**
   * AES-256-ECB şifre çözme
   * @param encryptedData - Base64 encoded şifrelenmiş veri
   * @param secretKey - 32 karakter secret key
   * @returns Şifresi çözülmüş veri
   */
  static decrypt(encryptedData: string, secretKey: string): string {
    try {
      const decipher = crypto.createDecipheriv('aes-256-ecb', secretKey, null);
      decipher.setAutoPadding(false);
      
      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      // PKCS7 padding'i kaldır
      return this.pkcs7Unpad(decrypted);
    } catch (error) {
      console.error('Rijndael decryption error:', error);
      throw new Error('Şifre çözme hatası');
    }
  }

  /**
   * PKCS7 padding uygula
   * @param data - Veri
   * @param blockSize - Blok boyutu
   * @returns Padded veri
   */
  private static pkcs7Pad(data: string, blockSize: number): string {
    const pad = blockSize - (data.length % blockSize);
    const padding = String.fromCharCode(pad).repeat(pad);
    return data + padding;
  }

  /**
   * PKCS7 padding'i kaldır
   * @param data - Padded veri
   * @returns Unpadded veri
   */
  private static pkcs7Unpad(data: string): string {
    const pad = data.charCodeAt(data.length - 1);
    return data.slice(0, -pad);
  }

  /**
   * Migros Yemek API request body oluştur
   * @param postData - Gönderilecek veri
   * @param secretKey - Secret key
   * @returns Şifrelenmiş request body
   */
  static createRequestBody(postData: object, secretKey: string): { value: string } {
    const encrypted = this.encrypt(postData, secretKey);
    return { value: encrypted };
  }
} 