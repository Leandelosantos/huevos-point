const { getPlans, register, submitContact } = require('./onboarding.service');

const getPlansHandler = async (req, res, next) => {
  try {
    const plans = await getPlans();
    res.json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
};

const registerHandler = async (req, res, next) => {
  try {
    const { businessName, contactName, email, phone, password, planId, billingCycle, paymentProvider } = req.body;
    const result = await register({ businessName, contactName, email, phone, password, planId, billingCycle, paymentProvider });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const contactHandler = async (req, res, next) => {
  try {
    const { name, email, phone, businessName, message, planId } = req.body;
    const result = await submitContact({ name, email, phone, businessName, message, planId });
    res.json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPlansHandler, registerHandler, contactHandler };
