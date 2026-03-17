const CURRENCY = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});

const fmt = (n) => CURRENCY.format(n);

const fmtTime = (dateStr) => {
  try {
    return new Date(dateStr).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires',
    });
  } catch {
    return '--:--';
  }
};

const movementDetailCell = (mov) => {
  if (mov.type === 'EGRESO') return `<span style="color:#888">—</span>`;
  return mov.details
    .map((d) => {
      const discountBadge =
        d.discount > 0
          ? `<span style="color:#2D6A4F;font-weight:700;margin-left:4px">-${d.discount}%</span>`
          : '';
      const concept =
        d.discount > 0 && d.discountConcept
          ? `<br><span style="color:#e67e22;font-style:italic;font-size:11px">🏷 ${d.discountConcept}</span>`
          : '';
      return `<span style="display:block;white-space:nowrap">${d.productName}${discountBadge} <strong>x${d.quantity}</strong>${concept}</span>`;
    })
    .join('');
};

const movementsTable = (movements) => {
  if (movements.length === 0) {
    return `<p style="color:#888;text-align:center;padding:16px">Sin movimientos registrados en el día.</p>`;
  }

  const rows = movements
    .map((mov) => {
      const isVenta = mov.type === 'VENTA';
      const typeCell = isVenta
        ? `<span style="background:#E8F5E9;color:#2D6A4F;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700">VENTA</span>`
        : `<span style="background:#FFEBEE;color:#C62828;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700">EGRESO</span>`;

      const conceptCell = !isVenta
        ? `<span style="color:#555;font-size:12px">${mov.description}</span>`
        : '';

      const discountCell =
        mov.discountAmount > 0
          ? `<span style="color:#C62828;font-weight:600">-${fmt(mov.discountAmount)}</span>`
          : `<span style="color:#bbb">—</span>`;

      const amountColor = isVenta ? '#2D6A4F' : '#C62828';
      const amountPrefix = isVenta ? '+' : '-';

      return `<tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:8px 10px;color:#555;white-space:nowrap;font-size:13px">${fmtTime(mov.createdAt)}</td>
        <td style="padding:8px 10px">${typeCell}${conceptCell ? `<br>${conceptCell}` : ''}</td>
        <td style="padding:8px 10px;font-size:12px">${movementDetailCell(mov)}</td>
        <td style="padding:8px 10px;font-size:13px;white-space:nowrap">${isVenta ? mov.paymentMethod : '—'}</td>
        <td style="padding:8px 10px;text-align:right;font-size:13px">${discountCell}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:700;color:${amountColor};white-space:nowrap;font-size:13px">${amountPrefix}${fmt(mov.amount)}</td>
      </tr>`;
    })
    .join('');

  return `
    <table style="width:100%;border-collapse:collapse;font-family:sans-serif">
      <thead>
        <tr style="background:#F8FBF9">
          <th style="padding:10px;text-align:left;color:#2D6A4F;font-size:12px;border-bottom:2px solid #e0e0e0">Hora</th>
          <th style="padding:10px;text-align:left;color:#2D6A4F;font-size:12px;border-bottom:2px solid #e0e0e0">Tipo / Concepto</th>
          <th style="padding:10px;text-align:left;color:#2D6A4F;font-size:12px;border-bottom:2px solid #e0e0e0">Detalle</th>
          <th style="padding:10px;text-align:left;color:#2D6A4F;font-size:12px;border-bottom:2px solid #e0e0e0">Medio de pago</th>
          <th style="padding:10px;text-align:right;color:#2D6A4F;font-size:12px;border-bottom:2px solid #e0e0e0">Monto desc.</th>
          <th style="padding:10px;text-align:right;color:#2D6A4F;font-size:12px;border-bottom:2px solid #e0e0e0">Importe</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
};

const paymentBreakdown = (paymentTotals) => {
  const entries = Object.entries(paymentTotals);
  if (entries.length === 0) return '';

  const chips = entries
    .map(
      ([method, total]) =>
        `<span style="display:inline-block;background:#E8F5E9;border:1px solid #c8e6c9;border-radius:8px;padding:6px 14px;margin:4px;font-size:13px">
          <strong style="color:#2D6A4F">${method}:</strong>
          <span style="color:#1B4332;font-weight:700"> ${fmt(total)}</span>
        </span>`
    )
    .join('');

  return `
    <div style="margin-top:8px">${chips}</div>`;
};

const topProductsTable = (topProducts) => {
  if (topProducts.length === 0) {
    return `<p style="color:#888;text-align:center;padding:12px">Sin ventas registradas.</p>`;
  }

  const rows = topProducts
    .map(
      (p, i) => `
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:8px 12px;color:#2D6A4F;font-weight:700;font-size:15px">${i + 1}</td>
        <td style="padding:8px 12px;font-size:13px">${p.name}</td>
        <td style="padding:8px 12px;text-align:right;font-weight:700;font-size:13px">${parseFloat(p.total_sold)} unid.</td>
      </tr>`
    )
    .join('');

  return `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#F8FBF9">
          <th style="padding:8px 12px;text-align:left;color:#2D6A4F;font-size:12px;border-bottom:2px solid #e0e0e0">#</th>
          <th style="padding:8px 12px;text-align:left;color:#2D6A4F;font-size:12px;border-bottom:2px solid #e0e0e0">Producto</th>
          <th style="padding:8px 12px;text-align:right;color:#2D6A4F;font-size:12px;border-bottom:2px solid #e0e0e0">Total vendido</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
};

const summaryCards = ({ totalIncome, totalExpenses, netBalance }) => {
  const netColor = netBalance >= 0 ? '#2D6A4F' : '#C62828';
  const netBg = netBalance >= 0 ? '#E8F5E9' : '#FFEBEE';

  return `
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="width:33%;padding:6px">
          <div style="background:#E8F5E9;border-radius:12px;padding:16px;text-align:center">
            <div style="color:#2D6A4F;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Ingresos del día</div>
            <div style="color:#1B4332;font-size:20px;font-weight:800">${fmt(totalIncome)}</div>
          </div>
        </td>
        <td style="width:33%;padding:6px">
          <div style="background:#FFEBEE;border-radius:12px;padding:16px;text-align:center">
            <div style="color:#C62828;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Egresos del día</div>
            <div style="color:#B71C1C;font-size:20px;font-weight:800">${fmt(totalExpenses)}</div>
          </div>
        </td>
        <td style="width:33%;padding:6px">
          <div style="background:${netBg};border-radius:12px;padding:16px;text-align:center">
            <div style="color:${netColor};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Saldo neto</div>
            <div style="color:${netColor};font-size:20px;font-weight:800">${fmt(netBalance)}</div>
          </div>
        </td>
      </tr>
    </table>`;
};

const section = (title, content) => `
  <div style="margin-bottom:28px">
    <div style="display:flex;align-items:center;margin-bottom:12px">
      <div style="width:4px;height:20px;background:#2D6A4F;border-radius:2px;margin-right:10px"></div>
      <h2 style="margin:0;color:#1B4332;font-size:15px;font-weight:700;font-family:sans-serif">${title}</h2>
    </div>
    <div style="background:#ffffff;border-radius:10px;border:1px solid #e8e8e8;overflow:hidden">
      ${content}
    </div>
  </div>`;

/**
 * Build the full HTML email for a given tenant's daily summary.
 */
const buildSummaryEmail = (tenantName, data) => {
  const { date, totalIncome, totalExpenses, netBalance, movements, paymentTotals, topProducts } =
    data;

  const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const capitalizeFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Resumen del día — ${tenantName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f4;font-family:'Helvetica Neue',Arial,sans-serif">
  <table style="width:100%;max-width:680px;margin:0 auto;background:#f4f7f4">
    <tr>
      <td style="padding:24px 16px">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#2D6A4F 0%,#40916C 100%);border-radius:16px;padding:28px 32px;margin-bottom:24px;text-align:center">
          <div style="font-size:28px;margin-bottom:6px">🥚</div>
          <h1 style="margin:0 0 4px;color:#ffffff;font-size:22px;font-weight:800">Huevos Point</h1>
          <div style="color:#B7E4C7;font-size:14px;font-weight:600">${tenantName}</div>
          <div style="color:#D8F3DC;font-size:13px;margin-top:6px">${capitalizeFirst(dateFormatted)}</div>
        </div>

        <!-- Summary cards -->
        ${section('Resumen del día', summaryCards({ totalIncome, totalExpenses, netBalance }))}

        <!-- Payment breakdown -->
        ${
          Object.keys(paymentTotals).length > 0
            ? section(
                'Ventas por medio de pago',
                `<div style="padding:12px 16px">${paymentBreakdown(paymentTotals)}</div>`
              )
            : ''
        }

        <!-- Movements table -->
        ${section(
          `Movimientos del día (${movements.length})`,
          `<div style="overflow-x:auto">${movementsTable(movements)}</div>`
        )}

        <!-- Top 5 products -->
        ${section('Top 5 productos más vendidos', topProductsTable(topProducts))}

        <!-- Footer -->
        <div style="text-align:center;color:#aaa;font-size:11px;margin-top:24px;padding-bottom:16px">
          Este correo fue generado automáticamente por Huevos Point.<br>
          Por favor no respondas a este email.
        </div>

      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Build a consolidated HTML email for superadmins covering ALL tenants.
 * @param {Array<{ tenantName: string, data: object }>} tenantsData
 * @param {string} date - YYYY-MM-DD
 */
const buildConsolidatedEmail = (tenantsData, date) => {
  const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const capitalizeFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // Global totals across all tenants
  const globalIncome = tenantsData.reduce((s, t) => s + t.data.totalIncome, 0);
  const globalExpenses = tenantsData.reduce((s, t) => s + t.data.totalExpenses, 0);
  const globalNet = globalIncome - globalExpenses;

  const globalCards = `
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr>
        <td style="width:33%;padding:6px">
          <div style="background:#E8F5E9;border-radius:12px;padding:14px;text-align:center">
            <div style="color:#2D6A4F;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Ingresos totales</div>
            <div style="color:#1B4332;font-size:18px;font-weight:800">${fmt(globalIncome)}</div>
          </div>
        </td>
        <td style="width:33%;padding:6px">
          <div style="background:#FFEBEE;border-radius:12px;padding:14px;text-align:center">
            <div style="color:#C62828;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Egresos totales</div>
            <div style="color:#B71C1C;font-size:18px;font-weight:800">${fmt(globalExpenses)}</div>
          </div>
        </td>
        <td style="width:33%;padding:6px">
          <div style="background:${globalNet >= 0 ? '#E8F5E9' : '#FFEBEE'};border-radius:12px;padding:14px;text-align:center">
            <div style="color:${globalNet >= 0 ? '#2D6A4F' : '#C62828'};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Saldo neto global</div>
            <div style="color:${globalNet >= 0 ? '#1B4332' : '#B71C1C'};font-size:18px;font-weight:800">${fmt(globalNet)}</div>
          </div>
        </td>
      </tr>
    </table>`;

  // One section block per tenant
  const tenantBlocks = tenantsData
    .map(({ tenantName, data }) => {
      const netColor = data.netBalance >= 0 ? '#2D6A4F' : '#C62828';
      const netBg = data.netBalance >= 0 ? '#E8F5E9' : '#FFEBEE';

      return `
        <!-- Tenant separator -->
        <div style="background:linear-gradient(135deg,#1B4332 0%,#2D6A4F 100%);border-radius:10px;padding:14px 20px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
          <span style="color:#ffffff;font-size:16px;font-weight:800">🏪 ${tenantName}</span>
          <span style="color:#B7E4C7;font-size:12px">${data.movements.length} movimiento${data.movements.length !== 1 ? 's' : ''}</span>
        </div>

        <!-- Tenant summary row -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <tr>
            <td style="width:33%;padding:4px">
              <div style="background:#E8F5E9;border-radius:8px;padding:10px;text-align:center">
                <div style="color:#2D6A4F;font-size:10px;font-weight:600;margin-bottom:2px">Ingresos</div>
                <div style="color:#1B4332;font-size:15px;font-weight:800">${fmt(data.totalIncome)}</div>
              </div>
            </td>
            <td style="width:33%;padding:4px">
              <div style="background:#FFEBEE;border-radius:8px;padding:10px;text-align:center">
                <div style="color:#C62828;font-size:10px;font-weight:600;margin-bottom:2px">Egresos</div>
                <div style="color:#B71C1C;font-size:15px;font-weight:800">${fmt(data.totalExpenses)}</div>
              </div>
            </td>
            <td style="width:33%;padding:4px">
              <div style="background:${netBg};border-radius:8px;padding:10px;text-align:center">
                <div style="color:${netColor};font-size:10px;font-weight:600;margin-bottom:2px">Saldo neto</div>
                <div style="color:${netColor};font-size:15px;font-weight:800">${fmt(data.netBalance)}</div>
              </div>
            </td>
          </tr>
        </table>

        ${Object.keys(data.paymentTotals).length > 0 ? `
        <div style="margin-bottom:12px">${paymentBreakdown(data.paymentTotals)}</div>` : ''}

        <!-- Movements -->
        <div style="background:#fff;border:1px solid #e8e8e8;border-radius:10px;overflow:hidden;margin-bottom:12px">
          <div style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:700;color:#1B4332">
            Movimientos del día (${data.movements.length})
          </div>
          <div style="overflow-x:auto">${movementsTable(data.movements)}</div>
        </div>

        <!-- Top products -->
        ${data.topProducts.length > 0 ? `
        <div style="background:#fff;border:1px solid #e8e8e8;border-radius:10px;overflow:hidden;margin-bottom:24px">
          <div style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:700;color:#1B4332">
            Top 5 productos más vendidos
          </div>
          ${topProductsTable(data.topProducts)}
        </div>` : `<div style="margin-bottom:24px"></div>`}
      `;
    })
    .join('<hr style="border:none;border-top:2px dashed #e0e0e0;margin:8px 0 24px">');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Resumen General — Todas las sucursales</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f4;font-family:'Helvetica Neue',Arial,sans-serif">
  <table style="width:100%;max-width:700px;margin:0 auto;background:#f4f7f4">
    <tr>
      <td style="padding:24px 16px">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1B4332 0%,#2D6A4F 100%);border-radius:16px;padding:28px 32px;margin-bottom:24px;text-align:center">
          <div style="font-size:28px;margin-bottom:6px">🥚</div>
          <h1 style="margin:0 0 4px;color:#ffffff;font-size:22px;font-weight:800">Huevos Point</h1>
          <div style="color:#B7E4C7;font-size:14px;font-weight:600">Resumen General — Super Admin</div>
          <div style="color:#D8F3DC;font-size:13px;margin-top:6px">${capitalizeFirst(dateFormatted)}</div>
          <div style="color:#95D5B2;font-size:12px;margin-top:4px">${tenantsData.length} sucursal${tenantsData.length !== 1 ? 'es' : ''}</div>
        </div>

        <!-- Global totals -->
        <div style="margin-bottom:24px">
          <div style="display:flex;align-items:center;margin-bottom:10px">
            <div style="width:4px;height:20px;background:#2D6A4F;border-radius:2px;margin-right:10px"></div>
            <h2 style="margin:0;color:#1B4332;font-size:15px;font-weight:700">Totales consolidados</h2>
          </div>
          ${globalCards}
        </div>

        <!-- Per-tenant sections -->
        ${tenantBlocks}

        <!-- Footer -->
        <div style="text-align:center;color:#aaa;font-size:11px;margin-top:16px;padding-bottom:16px">
          Este correo fue generado automáticamente por Huevos Point.<br>
          Por favor no respondas a este email.
        </div>

      </td>
    </tr>
  </table>
</body>
</html>`;
};

module.exports = { buildSummaryEmail, buildConsolidatedEmail };
