export default [
  // Ignore build artifacts
  { ignores: ['.next/**', 'node_modules/**'] },

  // Next.js recommended config
  ...next,

  // Disable the noisy rule that blocks your build
  {
    rules: {
      'react/no-unescaped-entities': 'off',
    },
  },
];
