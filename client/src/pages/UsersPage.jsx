import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, CircularProgress, Alert,
  Select, OutlinedInput, InputLabel, FormControl, Checkbox, ListItemText, FormHelperText
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { useForm, Controller } from 'react-hook-form';
import api from '../services/api';
import { showErrorAlert, showSuccessToast, showConfirmation } from '../utils/sweetAlert';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      username: '',
      fullName: '',
      email: '',
      password: '',
      role: 'employee',
      tenantIds: []
    }
  });

  const selectedRole = watch('role');

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTenants = async () => {
    try {
      const { data } = await api.get('/tenants');
      setTenants(data.data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  useEffect(() => {
    Promise.all([fetchUsers(), fetchTenants()]).finally(() => setLoading(false));
  }, []);

  const handleOpenModal = (user = null) => {
    setErrorMsg('');
    if (user) {
      setEditingUser(user);
      setValue('username', user.username);
      setValue('fullName', user.fullName);
      setValue('email', user.email || '');
      setValue('role', user.role);
      setValue('tenantIds', user.tenants ? user.tenants.map(t => t.id) : []);
      setValue('password', ''); // Don't populate password
    } else {
      setEditingUser(null);
      reset({ username: '', fullName: '', email: '', password: '', role: 'employee', tenantIds: [] });
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingUser(null);
    reset();
  };

  const onSubmit = async (data) => {
    setErrorMsg('');
    try {
      // If superadmin, tenantIds must be empty
      const payload = { ...data };
      if (payload.role === 'superadmin') {
        payload.tenantIds = [];
      }
      
      // If editing and password is empty, don't send it
      if (editingUser && !payload.password) {
        delete payload.password;
      }

      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);
        showSuccessToast('Usuario actualizado correctamente');
      } else {
        await api.post('/users', payload);
        showSuccessToast('Usuario creado correctamente');
      }
      
      handleCloseModal();
      fetchUsers();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Error al guardar el usuario');
    }
  };

  const handleDeactivate = async (id) => {
    const isConfirmed = await showConfirmation(
      '¿Desactivar Usuario?',
      'El usuario no podrá acceder al sistema hasta ser reactivado.',
      'Sí, desactivar'
    );
    
    if (isConfirmed) {
      try {
        await api.delete(`/users/${id}`);
        showSuccessToast('Usuario desactivado');
        fetchUsers();
      } catch (error) {
        showErrorAlert('Error', error.response?.data?.message || 'Error al desactivar');
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress sx={{ color: '#2D6A4F' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1B4332' }}>
          Gestión Global de Usuarios
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => handleOpenModal()}
          sx={{
            background: 'linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%)',
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Nuevo Usuario
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#F8FBF9' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>Usuario</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>Nombre Completo</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>Rol</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>Sucursal</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, color: '#4CAF50' }}>Estado</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, color: '#4CAF50' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>{user.username}</TableCell>
                <TableCell>{user.fullName}</TableCell>
                <TableCell>{user.email || '-'}</TableCell>
                <TableCell>
                  <Chip 
                    label={user.role === 'superadmin' ? 'Super Admin' : user.role === 'admin' ? 'Administrador' : 'Empleado'} 
                    size="small" 
                    color={user.role === 'superadmin' ? 'secondary' : user.role === 'admin' ? 'primary' : 'default'} 
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell>
                  {user.role === 'superadmin' 
                    ? 'Central / Global'
                    : user.tenants?.map(t => <Chip key={t.id} label={t.name} size="small" sx={{ mr: 0.5, mb: 0.5 }} />)
                  }
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={user.isActive ? 'Activo' : 'Inactivo'}
                    size="small"
                    sx={{
                      backgroundColor: user.isActive ? 'rgba(82, 183, 136, 0.1)' : 'rgba(239, 83, 80, 0.1)',
                      color: user.isActive ? '#2D6A4F' : '#D32F2F',
                      fontWeight: 700,
                    }}
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton color="primary" onClick={() => handleOpenModal(user)} disabled={!user.isActive}>
                    <EditRoundedIcon fontSize="small" />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDeactivate(user.id)} disabled={!user.isActive}>
                    <BlockRoundedIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No se encontraron usuarios.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal form */}
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#1B4332' }}>
          {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
            
            <TextField
              label="Nombre Completo"
              fullWidth
              size="small"
              {...register('fullName', { required: 'Requerido' })}
              error={!!errors.fullName}
              helperText={errors.fullName?.message}
            />
            
            <TextField
              label="Nombre de Usuario (Login)"
              fullWidth
              size="small"
              {...register('username', { required: 'Requerido' })}
              error={!!errors.username}
              helperText={errors.username?.message}
            />

            <TextField
              label="Email"
              type="email"
              fullWidth
              size="small"
              {...register('email')}
            />

            <TextField
              label="Contraseña"
              type="password"
              fullWidth
              size="small"
              {...register('password', { required: !editingUser ? 'Requerido para nuevos' : false })}
              error={!!errors.password}
              helperText={errors.password?.message || (editingUser && 'Dejar en blanco para no cambiarla')}
            />

            <Controller
              name="role"
              control={control}
              rules={{ required: 'Obligatorio' }}
              render={({ field }) => (
                <TextField select label="Rol" fullWidth size="small" {...field} error={!!errors.role} helperText={errors.role?.message}>
                  <MenuItem value="employee">Empleado</MenuItem>
                  <MenuItem value="admin">Administrador</MenuItem>
                  <MenuItem value="superadmin">Super Administrador</MenuItem>
                </TextField>
              )}
            />

            {selectedRole !== 'superadmin' && (
              <Controller
                name="tenantIds"
                control={control}
                rules={{ validate: value => selectedRole === 'superadmin' || (value && value.length > 0) || 'Debe asignar al menos una sucursal' }}
                render={({ field }) => (
                  <FormControl fullWidth size="small" error={!!errors.tenantIds}>
                    <InputLabel id="tenant-multiple-label">Sucursales</InputLabel>
                    <Select
                      labelId="tenant-multiple-label"
                      multiple
                      {...field}
                      input={<OutlinedInput label="Sucursales" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => {
                            const tenant = tenants.find(t => t.id === value);
                            return <Chip key={value} label={tenant?.name || value} size="small" />;
                          })}
                        </Box>
                      )}
                    >
                      {tenants.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          <Checkbox checked={(field.value || []).indexOf(t.id) > -1} />
                          <ListItemText primary={t.name} />
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.tenantIds && <FormHelperText>{errors.tenantIds.message}</FormHelperText>}
                  </FormControl>
                )}
              />
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseModal} color="inherit">Cancelar</Button>
            <Button type="submit" variant="contained" sx={{ background: '#2D6A4F', '&:hover': { background: '#1B4332' } }}>
              Guardar
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
