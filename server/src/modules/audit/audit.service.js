const auditRepository = require('./audit.repository');

const getAuditLogs = async (tenantId, filters) => {
  return auditRepository.findAll(tenantId, filters);
};

module.exports = { getAuditLogs };
