// Service role key ile trigger oluşturma
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nijfrqlruefhnjnynnfx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pamZycWxydWVmaG5qbnlubmZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc5NjU1MCwiZXhwIjoyMDY2MzcyNTUwfQ.TVOy-A6b8eoUFCodX_Atjk9-al1tg_uGcdrpHKZ6no4';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createTrigger() {
  try {
    // Trigger fonksiyonunu oluştur
    const { data: funcResult, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_couriers_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (funcError) {
      console.error('Fonksiyon oluşturma hatası:', funcError);
      return;
    }

    // Trigger'ı oluştur
    const { data: triggerResult, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP TRIGGER IF EXISTS update_couriers_updated_at ON couriers;
        CREATE TRIGGER update_couriers_updated_at
            BEFORE UPDATE ON couriers
            FOR EACH ROW
            EXECUTE FUNCTION update_couriers_updated_at();
      `
    });

    if (triggerError) {
      console.error('Trigger oluşturma hatası:', triggerError);
      return;
    }

    console.log('Trigger başarıyla oluşturuldu!');
  } catch (error) {
    console.error('Genel hata:', error);
  }
}

createTrigger(); 