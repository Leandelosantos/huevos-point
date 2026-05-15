import { useState, useRef } from 'react';
import dayjs from 'dayjs';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ReceiptRoundedIcon from '@mui/icons-material/ReceiptRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import CameraAltRoundedIcon from '@mui/icons-material/CameraAltRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { showErrorAlert } from '../../utils/sweetAlert';

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

const ExpenseModal = ({ open, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receiptData, setReceiptData] = useState(null);
  const [receiptMimeType, setReceiptMimeType] = useState(null);
  const [receiptFileName, setReceiptFileName] = useState('');

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const processFile = (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      showErrorAlert('Archivo demasiado grande', 'El comprobante no puede superar los 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const [header, base64] = reader.result.split(',');
      const mime = header.match(/data:(.*);base64/)[1];
      setReceiptData(base64);
      setReceiptMimeType(mime);
      setReceiptFileName(file.name);
    };
    reader.onerror = () => showErrorAlert('Error', 'No se pudo leer el archivo. Intente nuevamente.');
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    processFile(e.target.files[0]);
    e.target.value = '';
  };

  const handleRemoveReceipt = () => {
    setReceiptData(null);
    setReceiptMimeType(null);
    setReceiptFileName('');
  };

  const onSubmit = async (formData) => {
    setError('');
    setSubmitting(true);
    try {
      await api.post('/expenses', {
        concept: formData.concept,
        amount: parseFloat(formData.amount),
        expenseDate: dayjs().format('YYYY-MM-DD'),
        receiptData: receiptData || null,
        receiptMimeType: receiptMimeType || null,
      });
      reset();
      handleRemoveReceipt();
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar el egreso');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setError('');
    handleRemoveReceipt();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptRoundedIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Registrar Egreso
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Concepto"
            fullWidth
            autoFocus
            sx={{ mb: 2.5 }}
            error={Boolean(errors.concept)}
            helperText={errors.concept?.message}
            {...register('concept', { required: 'El concepto es obligatorio' })}
          />

          <TextField
            label="Monto ($)"
            type="number"
            fullWidth
            error={Boolean(errors.amount)}
            helperText={errors.amount?.message}
            inputProps={{ min: 0, step: 0.01 }}
            {...register('amount', {
              required: 'El monto es obligatorio',
              min: { value: 0.01, message: 'El monto debe ser mayor a 0' },
            })}
          />

          {/* ── Comprobante ─────────────────────────────────────── */}
          <Box sx={{ mt: 2.5 }}>
            {/* Input para archivo (galería / explorador de archivos) */}
            <input
              type="file"
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            {/* Input para cámara directa — capture="environment" abre cámara trasera en móvil */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              ref={cameraInputRef}
              onChange={handleFileChange}
            />

            {receiptFileName ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'success.light',
                  bgcolor: '#E8F5E9',
                }}
              >
                <InsertDriveFileRoundedIcon sx={{ color: '#2D6A4F', flexShrink: 0 }} />
                <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 600, color: '#2D6A4F' }} noWrap>
                  {receiptFileName}
                </Typography>
                <IconButton size="small" onClick={handleRemoveReceipt} sx={{ color: 'text.secondary' }}>
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </Box>
            ) : (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<UploadFileRoundedIcon />}
                  onClick={() => fileInputRef.current.click()}
                  fullWidth
                  sx={{
                    borderStyle: 'dashed',
                    borderColor: 'divider',
                    color: 'text.secondary',
                    py: 1.2,
                    fontSize: '0.78rem',
                    '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                  }}
                >
                  Adjuntar archivo
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CameraAltRoundedIcon />}
                  onClick={() => cameraInputRef.current.click()}
                  fullWidth
                  sx={{
                    borderStyle: 'dashed',
                    borderColor: 'divider',
                    color: 'text.secondary',
                    py: 1.2,
                    fontSize: '0.78rem',
                    '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                  }}
                >
                  Tomar foto
                </Button>
              </Stack>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Opcional · JPG, PNG, PDF · máx. 2 MB
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={22} color="inherit" /> : 'Confirmar Egreso'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ExpenseModal;
