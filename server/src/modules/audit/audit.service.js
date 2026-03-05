const auditRepository = require('./audit.repository');

const getAuditLogs = async (filters) => {
  return auditRepository.findAll(filters);
};

module.exports = { getAuditLogs };
