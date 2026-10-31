/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'darkest-navy': '#0A0A14',
        'dark-navy': '#0F0F23',
        'deeper-blue': '#1A1A2E',
        'cyber-blue': '#00D4FF',
        'neon-purple': '#A855F7',
      },
      fontFamily: {
        'logo': ['var(--font-lato)', 'sans-serif'],
        'body': ['var(--font-inter)', 'sans-serif'],
      },
      boxShadow: {
        'neon-purple': '0 0 20px rgba(168, 85, 247, 0.7)',
        'neon-purple-glow': '0 0 20px rgba(168, 85, 247, 0.5), 0 0 35px rgba(168, 85, 247, 0.3)',
        'neon-blue': '0 0 20px rgba(59, 130, 246, 0.7)',
        'neon-blue-glow': '0 0 20px rgba(0, 212, 255, 0.5), 0 0 35px rgba(0, 212, 255, 0.3)',
        'neon-cyan': '0 0 20px rgba(6, 182, 212, 0.7)',
        'neon-green': '0 0 20px rgba(34, 197, 94, 0.7)',
        'neon-orange': '0 0 20px rgba(249, 115, 22, 0.7)',
        'neon-yellow': '0 0 20px rgba(234, 179, 8, 0.7)',
        'neon-pink': '0 0 20px rgba(236, 72, 153, 0.7)',
        'neon-red': '0 0 20px rgba(239, 68, 68, 0.7)',
        'neon-indigo': '0 0 20px rgba(99, 102, 241, 0.7)',
        'neon-white': '0 0 20px rgba(255, 255, 255, 0.7)',
        'neon-gray': '0 0 20px rgba(156, 163, 175, 0.7)',
      },
    },
  },
  plugins: [],
};