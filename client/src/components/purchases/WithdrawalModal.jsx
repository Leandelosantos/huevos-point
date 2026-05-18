import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, FormControl, InputLabel, Select, MenuItem,
  TextField, InputAdornment, Typography, Box, Alert,
  CircularProgress,
} from '@mui/material';
import MonetizationOnRoundedIcon from '@mui/icons-material/MonetizationOnRounded';
import { showConfirmation } from '../../utils/sweetAlert';
import { CURRENCY_FORMAT } from '../../utils/formatters';

const SOURCE_LABELS = {
  efectivo: 'Efectivo',
  digital: 'Mercado Pago / Posnet / Transferencia / Cuenta DNI',
  rappi: 'Rappi',
};

/**
 * Modal para registrar un retiro de una caja diaria.
 *
 * Props:
 *  open          boolean
 *  onClose       () => void
 *  onSuccess     () => void
 *  source        'efectivo' | 'digital' | 'rappi'
 *  dates         string[]  — fechas seleccionadas (YYYY-MM-DD)
 *  maxAmount     number    — suma disponible en esas fechas (informativo)
 *  onSubmit      ({ source, type, amount, concept, dates }) => Promise<void>
 */
const WithdrawalModal = ({ open, onClose, onSuccess, source, dates = [], maxAmount = 0, onSubmit }) => {
  const [type, setType] = useState('');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setType('');
      setAmount('');
      setConcept('');
      setError('');
    }
  }, [open]);

  const sourceLabel = SOURCE_LABELS[source] || source;
  const multiDay = dates.length > 1;

  const validate = () => {
    if (!type) return 'Seleccioná el destino del retiro.';
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) return 'Ingresá un importe válido mayor a 0.';
    if (type === 'otros' && !concept.trim()) return 'El detalle es obligatorio cuando el destino es "Otros".';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');

    const amt = parseFloat(amount);
    const typeLabel = type === 'deuda_huevos' ? 'Deuda de huevos' : `Otros — ${concept.trim()}`;
    const dateStr = multiDay
      ? `${dates.length} cajas seleccionadas`
      : dates[0];

    const confirmed = await showConfirmation(
      'Confirmar retiro',
      `Se dará por retirado ${CURRENCY_FORMAT.format(amt)} de ${sourceLabel} (${dateStr}) con destino: ${typeLabel}. ¿Confirmar?`,
      'Sí, retirar',
      'Cancelar',
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      await onSubmit({ source, type, amount: amt, concept: concept.trim() || null, dates });
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.message || 'Error al registrar el retiro');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
        <MonetizationOnRoundedIcon sx={{ color: 'primary.main' }} />
        Registrar retiro
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
        {/* Context info */}
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            ORIGEN
          </Typography>
          <Typography variant="body2" fontWeight={700}>{sourceLabel}</Typography>
          {dates.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mt: 0.5, display: 'block' }}>
                {multiDay ? `CAJAS SELECCIONADAS (${dates.length})` : 'FECHA DE CAJA'}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {multiDay ? dates.join(', ') : dates[0]}
              </Typography>
            </>
          )}
          {maxAmount > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Disponible en {multiDay ? 'esas cajas' : 'esta caja'}: {CURRENCY_FORMAT.format(maxAmount)}
            </Typography>
          )}
        </Box>

        {/* Type selector */}
        <FormControl size="small" fullWidth required>
          <InputLabel>Destino del retiro</InputLabel>
          <Select
            value={type}
            label="Destino del retiro"
            onChange={(e) => { setType(e.target.value); setError(''); }}
          >
            <MenuItem value="deuda_huevos">Deuda de huevos</MenuItem>
            <MenuItem value="otros">Otros</MenuItem>
          </Select>
        </FormControl>

        {/* Amount */}
        <TextField
          label="Importe a retirar"
          type="number"
          size="small"
          fullWidth
          required
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setError(''); }}
          inputProps={{ min: 0, step: '0.01' }}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
        />

        {/* Concept — only for 'otros' */}
        {type === 'otros' && (
          <TextField
            label="Detalle"
            multiline
            minRows={2}
            size="small"
            fullWidth
            required
            placeholder="Describí el destino del retiro..."
            value={concept}
            onChange={(e) => { setConcept(e.target.value); setError(''); }}
          />
        )}

        {error && <Alert severity="error" sx={{ py: 0.5 }}>{error}</Alert>}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={saving} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : <MonetizationOnRoundedIcon />}
        >
          {saving ? 'Guardando...' : 'Guardar retiro'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WithdrawalModal;
