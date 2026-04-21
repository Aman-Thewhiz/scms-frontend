import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const scmsThemeConfig = defineConfig({
  globalCss: {
    'html, body, #root': {
      minHeight: '100%',
    },
    body: {
      bgGradient: 'linear(to-br, #ffe4ec 0%, #ffffff 48%, #e5f8ee 100%)',
      color: '#111827',
    },
  },
  theme: {
    tokens: {
      colors: {
        scms: {
          pastelPink: { value: '#ffe4ec' },
          pastelGreen: { value: '#e5f8ee' },
          white: { value: '#ffffff' },
          ink: { value: '#111827' },
          navActive: { value: '#1f2937' },
          statusGreen: { value: '#2f9e44' },
          statusOrange: { value: '#f08c00' },
          statusRed: { value: '#e03131' },
        },
      },
      radii: {
        card: { value: '16px' },
      },
      shadows: {
        card: { value: '0 10px 30px rgba(17, 24, 39, 0.12)' },
      },
    },
  },
});

const theme = createSystem(defaultConfig, scmsThemeConfig);

export default theme;
