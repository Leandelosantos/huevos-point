import { Box, Typography, Chip } from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';

const DemoBanner = () => (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: (theme) => theme.zIndex.drawer + 10,
      bgcolor: '#F59E0B',
      color: '#1C1917',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1.5,
      py: 0.75,
      px: 2,
      boxShadow: '0 2px 8px rgba(0,0,0,0.20)',
    }}
  >
    <VisibilityRoundedIcon fontSize="small" />
    <Typography variant="body2" fontWeight={700} letterSpacing={0.3}>
      MODO DEMO
    </Typography>
    <Chip
      label="Los datos son ficticios y no se guardan"
      size="small"
      sx={{ bgcolor: 'rgba(0,0,0,0.12)', color: 'inherit', fontWeight: 500, fontSize: '0.72rem' }}
    />
  </Box>
);

export default DemoBanner;