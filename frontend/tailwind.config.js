export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 900: '#101a2e', 800: '#182541', 700: '#22335a' },
        teal: { 500: '#0f9e94', 600: '#0c847b' },
        paper: '#f4f6f9'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
