// 5 temas predefinidos para Huevos Point
// Cada tema define: paleta principal, sidebar y apariencia general

export const THEMES = {
  'verde-bosque': {
    id: 'verde-bosque',
    label: 'Verde Bosque',
    description: 'Clásico del sistema. Tonos naturales y profesionales.',
    preview: ['#1B4332', '#2D6A4F', '#52B788'],
    palette: {
      primary: { main: '#2D6A4F', light: '#40916C', dark: '#1B4332', contrastText: '#FFFFFF' },
      secondary: { main: '#52B788', light: '#74C69D', dark: '#40916C', contrastText: '#FFFFFF' },
      background: { default: '#F0F4F0', paper: '#FFFFFF' },
    },
    sidebar: {
      bg: 'linear-gradient(180deg, #1B4332 0%, #2D6A4F 100%)',
      chip: { bg: '#B7E4C7', color: '#1B4332' },
      accent: '#B7E4C7',
      avatar: '#52B788',
    },
  },
  'azul-corporativo': {
    id: 'azul-corporativo',
    label: 'Azul Corporativo',
    description: 'Serio y confiable. Ideal para entornos empresariales.',
    preview: ['#0D47A1', '#1565C0', '#42A5F5'],
    palette: {
      primary: { main: '#1565C0', light: '#1976D2', dark: '#0D47A1', contrastText: '#FFFFFF' },
      secondary: { main: '#42A5F5', light: '#64B5F6', dark: '#1976D2', contrastText: '#FFFFFF' },
      background: { default: '#F0F4FA', paper: '#FFFFFF' },
    },
    sidebar: {
      bg: 'linear-gradient(180deg, #0D47A1 0%, #1565C0 100%)',
      chip: { bg: '#BBDEFB', color: '#0D47A1' },
      accent: '#BBDEFB',
      avatar: '#42A5F5',
    },
  },
  'indigo-profundo': {
    id: 'indigo-profundo',
    label: 'Índigo Profundo',
    description: 'Elegante y moderno. Transmite sofisticación.',
    preview: ['#311B92', '#4527A0', '#7C4DFF'],
    palette: {
      primary: { main: '#4527A0', light: '#512DA8', dark: '#311B92', contrastText: '#FFFFFF' },
      secondary: { main: '#7C4DFF', light: '#9E6DFF', dark: '#651FFF', contrastText: '#FFFFFF' },
      background: { default: '#F3F0FA', paper: '#FFFFFF' },
    },
    sidebar: {
      bg: 'linear-gradient(180deg, #311B92 0%, #4527A0 100%)',
      chip: { bg: '#D1C4E9', color: '#311B92' },
      accent: '#D1C4E9',
      avatar: '#7C4DFF',
    },
  },
  'granate-ejecutivo': {
    id: 'granate-ejecutivo',
    label: 'Granate Ejecutivo',
    description: 'Fuerte y decisivo. Liderazgo y confianza.',
    preview: ['#880E4F', '#AD1457', '#F06292'],
    palette: {
      primary: { main: '#AD1457', light: '#C2185B', dark: '#880E4F', contrastText: '#FFFFFF' },
      secondary: { main: '#F06292', light: '#F48FB1', dark: '#E91E63', contrastText: '#FFFFFF' },
      background: { default: '#FAF0F4', paper: '#FFFFFF' },
    },
    sidebar: {
      bg: 'linear-gradient(180deg, #880E4F 0%, #AD1457 100%)',
      chip: { bg: '#FCE4EC', color: '#880E4F' },
      accent: '#FCE4EC',
      avatar: '#F06292',
    },
  },
  'slate-neutro': {
    id: 'slate-neutro',
    label: 'Slate Neutro',
    description: 'Minimalista y limpio. Foco en el contenido.',
    preview: ['#263238', '#37474F', '#78909C'],
    palette: {
      primary: { main: '#37474F', light: '#455A64', dark: '#263238', contrastText: '#FFFFFF' },
      secondary: { main: '#78909C', light: '#90A4AE', dark: '#546E7A', contrastText: '#FFFFFF' },
      background: { default: '#F2F4F5', paper: '#FFFFFF' },
    },
    sidebar: {
      bg: 'linear-gradient(180deg, #263238 0%, #37474F 100%)',
      chip: { bg: '#CFD8DC', color: '#263238' },
      accent: '#CFD8DC',
      avatar: '#78909C',
    },
  },
};

export const DEFAULT_THEME_ID = 'verde-bosque';
