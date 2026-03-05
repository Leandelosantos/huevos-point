import { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import * as XLSX from 'xlsx';
import api from '../../services/api';

const REQUIRED_COLUMNS = ['nombre_producto', 'cantidad', 'precio'];

const ImportStockDialog = ({ open, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const fileInputRef = useRef(null);

  const handleClose = () => {
    if (loading) return;
    setFile(null);
    setError('');
    setSuccessResult(null);
    setValidationErrors([]);
    onClose();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setValidationErrors([]);
      setSuccessResult(null);
    }
  };

  const processFile = () => {
    if (!file) {
      setError('Por favor, selecciona un archivo.');
      return;
    }

    setLoading(true);
    setError('');
    setValidationErrors([]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          throw new Error('El archivo está vacío o no contiene datos válidos.');
        }

        const headers = jsonData[0].map((h) => String(h).toLowerCase().trim());

        const missingColumns = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
        if (missingColumns.length > 0) {
          throw new Error(`Faltan las siguientes columnas requeridas: ${missingColumns.join(', ')}`);
        }

        const nameIndex = headers.indexOf('nombre_producto');
        const qtyIndex = headers.indexOf('cantidad');
        const priceIndex = headers.indexOf('precio');

        const productsData = [];
        const errors = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];

          // Skip empty rows
          if (!row || row.length === 0 || (!row[nameIndex] && !row[qtyIndex] && !row[priceIndex])) {
            continue;
          }

          const name = row[nameIndex];
          const qty = row[qtyIndex];
          const price = row[priceIndex];

          const rowErrors = [];

          if (!name || String(name).trim() === '') rowErrors.push('Nombre vacío');
          if (qty === undefined || qty === null || isNaN(parseFloat(qty))) {
            rowErrors.push('Cantidad inválida');
          } else if (!Number.isInteger(parseFloat(qty))) {
            rowErrors.push('La cantidad debe ser un número entero');
          }
          if (price === undefined || price === null || isNaN(parseFloat(price))) {
             rowErrors.push('Precio inválido');
          }

          if (rowErrors.length > 0) {
            errors.push(`Fila ${i + 1} (${name || 'Sin nombre'}): ${rowErrors.join(', ')}`);
          } else {
            productsData.push({
              name: String(name).trim(),
              stockQuantity: parseFloat(qty),
              unitPrice: parseFloat(price),
            });
          }
        }

        if (errors.length > 0) {
          setValidationErrors(errors);
          setLoading(false);
          return;
        }

        if (productsData.length === 0) {
          throw new Error('No se encontraron productos válidos para importar.');
        }

        // Send to backend
        const response = await api.post('/products/bulk', productsData);
        setSuccessResult(response.data.data);
      } catch (err) {
        setError(err.message || 'Error al procesar el archivo. Verifica el formato e intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Error al leer el archivo.');
      setLoading(false);
    };

    reader.readAsBinaryString(file);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Importar Stock Masivo</DialogTitle>
      <DialogContent dividers>
        {!successResult ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Alert icon={<InfoRoundedIcon />} severity="info">
              Sube un archivo Excel (.xlsx) o CSV. Debe contener al menos estas columnas (en la primera fila):{' '}
              <strong>nombre_producto, cantidad, precio</strong>.
            </Alert>

            <Box
              sx={{
                border: '2px dashed',
                borderColor: file ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                bgcolor: file ? 'primary.50' : 'background.default',
                transition: 'all 0.2s',
              }}
            >
              <CloudUploadRoundedIcon
                sx={{ fontSize: 48, color: file ? 'primary.main' : 'text.secondary', mb: 1 }}
              />
              <Typography variant="h6" gutterBottom color={file ? 'primary.main' : 'text.primary'}>
                {file ? file.name : 'Selecciona un archivo'}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Formatos soportados: .xlsx, .csv
              </Typography>

              <input
                type="file"
                accept=".xlsx, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <Button
                variant={file ? 'outlined' : 'contained'}
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                {file ? 'Cambiar Archivo' : 'Buscar Archivo'}
              </Button>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            {validationErrors.length > 0 && (
              <Alert severity="warning" sx={{ maxHeight: 200, overflow: 'auto' }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Errores de validación en el archivo ({validationErrors.length}):
                </Typography>
                <List dense disablePadding>
                  {validationErrors.map((err, i) => (
                    <ListItem key={i} disablePadding>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <ErrorRoundedIcon color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={err} />
                    </ListItem>
                  ))}
                </List>
                <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                  Por favor, corrige los errores e intenta subir el archivo nuevamente.
                </Typography>
              </Alert>
            )}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleRoundedIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight="bold">
              ¡Importación Exitosa!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Se procesaron correctamente los datos del archivo.
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
              <Box>
                <Typography variant="h4" color="primary.main" fontWeight="bold">
                  {successResult.created}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Productos Nuevos
                </Typography>
              </Box>
              <Box>
                <Typography variant="h4" color="secondary.main" fontWeight="bold">
                  {successResult.updated}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Stock Actualizado
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {!successResult ? (
          <>
            <Button onClick={handleClose} disabled={loading} color="inherit">
              Cancelar
            </Button>
            <Button
              onClick={processFile}
              variant="contained"
              disabled={!file || loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Procesando...' : 'Importar'}
            </Button>
          </>
        ) : (
          <Button
            onClick={() => {
              handleClose();
              onSuccess();
            }}
            variant="contained"
            color="success"
            autoFocus
          >
            Aceptar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportStockDialog;
