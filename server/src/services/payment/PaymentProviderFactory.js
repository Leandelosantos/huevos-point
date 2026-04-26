const MobbexProvider = require('./MobbexProvider');
const MercadoPagoProvider = require('./MercadoPagoProvider');

const PROVIDERS = {
  mobbex: MobbexProvider,
  mercadopago: MercadoPagoProvider,
};

/**
 * Retorna el provider correcto según el string recibido.
 * @param {string} providerName - 'mobbex' | 'mercadopago'
 */
const getProvider = (providerName) => {
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(`Payment provider desconocido: "${providerName}". Válidos: ${Object.keys(PROVIDERS).join(', ')}`);
  }
  return provider;
};

module.exports = { getProvider };
