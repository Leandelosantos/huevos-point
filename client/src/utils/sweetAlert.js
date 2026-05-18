import Swal from 'sweetalert2';
import '@sweetalert2/theme-material-ui/material-ui.css';

// Configuración general para que coincida con el tema premium del sistema (Material UI)
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

export const showSuccessToast = (title) => {
  return Toast.fire({
    icon: 'success',
    title,
  });
};

export const showErrorToast = (title) => {
  return Toast.fire({
    icon: 'error',
    title,
  });
};

// z-index mayor que MUI Dialog (1300) para que SweetAlert aparezca siempre al frente
const ABOVE_MODAL = { container: 'swal-above-modal' };

// Inyectar el estilo globalmente una sola vez
if (typeof document !== 'undefined' && !document.getElementById('swal-above-modal-style')) {
  const style = document.createElement('style');
  style.id = 'swal-above-modal-style';
  style.textContent = '.swal-above-modal { z-index: 9999 !important; }';
  document.head.appendChild(style);
}

export const showErrorAlert = (title, text) => {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonColor: '#2D6A4F',
    confirmButtonText: 'Entendido',
    customClass: ABOVE_MODAL,
  });
};

export const showWarningAlert = (title, text) => {
  return Swal.fire({
    icon: 'warning',
    title,
    text,
    confirmButtonColor: '#F57C00',
    confirmButtonText: 'Entendido',
    customClass: ABOVE_MODAL,
  });
};

export const showConfirmation = async (title, text, confirmText = 'Sí, continuar', revertText = 'Cancelar') => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#C62828',
    cancelButtonColor: '#757575',
    confirmButtonText: confirmText,
    cancelButtonText: revertText,
    customClass: ABOVE_MODAL,
  });
  return result.isConfirmed;
};

export default Swal;
