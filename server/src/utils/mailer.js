const nodemailer = require('nodemailer');
const env = require('../config/environment');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT, 10) || 587,
    secure: env.SMTP_PORT === '465',
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  return transporter;
};

/**
 * Send an email.
 * @param {Object} options - { to: string|string[], subject: string, html: string }
 */
const sendMail = async ({ to, subject, html }) => {
  const transport = getTransporter();
  const recipients = Array.isArray(to) ? to.join(',') : to;

  await transport.sendMail({
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
    to: recipients,
    subject,
    html,
  });
};

module.exports = { sendMail };
