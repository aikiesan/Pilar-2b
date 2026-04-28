module.exports = {
  apps: [
    {
      name: 'pilar-frontend',
      script: '.next/standalone/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    }
  ]
};
