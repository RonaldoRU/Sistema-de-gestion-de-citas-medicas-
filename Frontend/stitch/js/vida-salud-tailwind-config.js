/* Config compartida — cargar después de cdn.tailwindcss.com */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: '#0369a1',
        'on-primary': '#ffffff',
        vs: {
          ink: '#1e293b',
          muted: '#64748b',
          paper: '#f4f9fc',
          rail: '#e3f0f7',
          railLine: '#c5dce8',
          forest: '#0369a1',
          moss: '#0d9488',
          clay: '#0891b2',
          claySoft: '#bae6fd',
          card: '#ffffff',
          line: '#cbd5e1',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        vs: '0 1px 0 rgba(15, 23, 42, 0.05), 0 12px 40px -20px rgba(3, 105, 161, 0.18)',
      },
    },
  },
};
