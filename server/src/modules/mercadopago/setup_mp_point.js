const ACCESS_TOKEN = 'APP_USR-104589882768169-030617-59ab0cdef75a17c60f2d8f275b8df93d-3239537378';
const USER_ID = '3239537378';

const headers = {
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
};

async function setupPoint() {
  console.log('--- Configuración Inicial Mercado Pago Point ---');
  try {
    // 1. Crear Sucursal (Store)
    console.log('\n[1] Creando Sucursal de Prueba...');
    let storeId = null;
    const storePayload = {
      name: "Huevos Point - Sucursal Central",
      location: {
        street_number: "123",
        street_name: "Calle Falsa",
        city_name: "Almagro",
        state_name: "Capital Federal",
        latitude: -34.603722,
        longitude: -58.381592,
        reference: "Local en esquina"
      },
      external_id: "SUC-001"
    };

    const storeRes = await fetch(`https://api.mercadopago.com/users/${USER_ID}/stores`, {
      method: 'POST',
      headers,
      body: JSON.stringify(storePayload)
    });
    
    const storeData = await storeRes.json();
    if (storeRes.ok) {
      storeId = storeData.id;
      console.log(`✅ Sucursal Creada Exitosamente:`);
      console.log(`   ID: ${storeId}`);
      console.log(`   External ID: SUC-001`);
    } else {
      console.log('❌ Error creando sucursal:', JSON.stringify(storeData, null, 2));
      // Intentar buscarla si ya existía external_id
      const searchRes = await fetch(`https://api.mercadopago.com/users/${USER_ID}/stores/search?external_id=SUC-001`, { headers });
      const searchData = await searchRes.json();
      if (searchData.results && searchData.results.length > 0) {
        storeId = searchData.results[0].id;
        console.log(`✅ Usando sucursal existente. ID: ${storeId}`);
      } else {
        return; // Detener si no hay sucursal
      }
    }

    // 2. Crear Caja (POS)
    console.log('\n[2] Creando Caja / Terminal (POS)...');
    const posPayload = {
      name: "Caja Principal - MP Point",
      fixed_amount: true,
      store_id: storeId,
      external_store_id: "SUC-001",
      external_id: "CAJA001"
    };

    const posRes = await fetch('https://api.mercadopago.com/pos', {
      method: 'POST',
      headers,
      body: JSON.stringify(posPayload)
    });
    
    const posData = await posRes.json();
    if (posRes.ok) {
      console.log(`✅ Caja Creada Exitosamente:`);
      console.log(`   ID de la Terminal: ${posData.id}`);
      console.log(`   External ID (Dispositivo): CAJA-001`);
      console.log(`   QR Vinculado: ${posData.qr?.qr_template_document}`);
      
      console.log('\n=============================================');
      console.log('📋 INSTRUCCIONES PARA TERMINAR:');
      console.log('1. Añade esto a tu archivo server/.env :');
      console.log(`   MP_POS_ID=${posData.id}`);
      console.log(`   MP_STORE_ID=${storeId}`);
      console.log('   MP_EXTERNAL_POS_ID=CAJA-001');
      console.log('2. Con la cuenta TESTUSER4227336865803271876, debes abrir tu app "Mercado Pago" o ir al QR.');
      console.log('3. Vincular un dispositivo Point Smart o usar Postman para ponerlo en PDV.');
      console.log('=============================================');

    } else {
      console.log('❌ Error creando caja:', posData.message || posData);
    }
    
  } catch (error) {
    console.error('Error general:', error.message);
  }
}

setupPoint();
