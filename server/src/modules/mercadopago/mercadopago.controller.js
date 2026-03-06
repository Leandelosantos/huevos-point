const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { Sale, Product } = require('../../models');
const sequelize = require('../../config/database');
const env = require('../../config/environment');

// Para pruebas locales, usar tokens del .env o estos dados por el usuario
const client = new MercadoPagoConfig({
  accessToken: env.MP_ACCESS_TOKEN || 'APP_USR-104589882768169-030617-59ab0cdef75a17c60f2d8f275b8df93d-3239537378',
});

// Función para enviar la orden a la Terminal Física Point
const sendPointOrder = async (sale) => {
  const externalPosId = env.MP_EXTERNAL_POS_ID || 'CAJA001';
  const userId = env.MP_USER_ID || '3239537378';
  const accessToken = env.MP_ACCESS_TOKEN || 'APP_USR-104589882768169-030617-59ab0cdef75a17c60f2d8f275b8df93d-3239537378';

  const payload = {
    external_reference: String(sale.id),
    title: `Venta Huevos Point #${sale.id}`,
    description: `Venta de productos en sucursal`,
    notification_url: `${env.API_URL || env.NGROK_URL}/api/mercadopago/webhook`,
    total_amount: parseFloat(sale.totalAmount),
    items: [
      {
        sku_number: "VARIOS",
        category: "marketplace",
        title: "Productos Varios",
        description: "Productos Huevos Point",
        unit_price: parseFloat(sale.totalAmount),
        quantity: 1,
        unit_measure: "unit",
        total_amount: parseFloat(sale.totalAmount)
      }
    ],
    cash_out: {
      amount: 0
    }
  };

  try {
    // Para Point Integrado es instore/orders/qr/seller/collectors/... O a veces /v1/orders
    const url = `https://api.mercadopago.com/instore/orders/qr/seller/collectors/${userId}/pos/${externalPosId}/qrs`;
    
    // El PDF proporcionado indica "POST /v1/orders. Se requiere amount, terminal_id, etc." 
    // pero el endpoint oficial de Point Plus/Smart suele ser el PUT de instore. Lo intentaremos mediante fetch nativo.
    const res = await fetch(url, {
      method: 'PUT', // o POST dependiendo la gen de la API
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error enviando orden a Point MP:', errorText);
      throw new Error('No se pudo enviar la orden a la terminal Mercado Pago.');
    }

    console.log(`✅ Orden enviada a la terminal ${externalPosId} para la Venta #${sale.id}`);
    
    return {
      status: 'waiting_for_payment'
    };
  } catch (error) {
    console.error('Excepción enviando Point Order:', error);
    throw new Error('Fallo la conexión con la terminal Mercado Pago.');
  }
};

// Hook que recibe las notificaciones de pagos de Mercado Pago
const handleWebhook = async (req, res) => {
  try {
    const paymentId = req.query.id || req.body.data?.id;

    if (!paymentId) {
       return res.status(200).send('Webhook received without ID');
    }

    if (req.query.topic === 'payment' || req.body.type === 'payment') {
      const payment = new Payment(client);
      const paymentInfo = await payment.get({ id: paymentId });

      console.log('Pago recibido desde Webhook MP:', paymentInfo.status);

      if (paymentInfo.status === 'approved') {
        const saleId = paymentInfo.external_reference;
        
        if (!saleId) return res.status(200).send('No external_reference');

        // Check if the sale was already completed
        const sale = await Sale.findByPk(saleId);
        
        if (!sale) return res.status(200).send('Sale not found');
        if (sale.status === 'COMPLETED') return res.status(200).send('Already completed');

        // Finalizar venta en una transacción 
        const transaction = await sequelize.transaction();
        try {
          // Descontar Stock ahora que se pagó
          const saleItems = await sale.getItems({ transaction });
          
          for (const item of saleItems) {
            const product = await Product.findByPk(item.productId, { transaction, lock: transaction.LOCK.UPDATE });
            if (product) {
               await product.update({
                 stockQuantity: parseFloat(product.stockQuantity) - parseFloat(item.quantity)
               }, { transaction });
            }
          }

          await sale.update({ status: 'COMPLETED' }, { transaction });
          await transaction.commit();
          
          console.log(`✅ Venta #${saleId} completada exitosamente vía MercadoPago Webhook.`);
        } catch (error) {
          await transaction.rollback();
          console.error('Error descontando stock en Webhook:', error);
          return res.status(500).send('Error internally fulfilling sale');
        }
      }
    }

    // MP siempre requiere devolver un status 200 o 201 rápido.
    res.status(200).send('Webhook OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  sendPointOrder,
  handleWebhook
};
