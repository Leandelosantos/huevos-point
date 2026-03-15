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

export const showErrorAlert = (title, text) => {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonColor: '#2D6A4F',
    confirmButtonText: 'Entendido',
  });
};

export const showWarningAlert = (title, text) => {
  return Swal.fire({
    icon: 'warning',
    title,
    text,
    confirmButtonColor: '#F57C00',
    confirmButtonText: 'Entendido',
  });
};

export const showConfirmation = async (title, text, confirmText = 'Sí, continuar', revertText = 'Cancelar') => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#C62828', // Destructivo por defecto
    cancelButtonColor: '#757575',
    confirmButtonText: confirmText,
    cancelButtonText: revertText,
  });
  return result.isConfirmed;
};

export default Swal;
