import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kizuna Rail API',
      version: '1.0.0',
      description: 'API documentation for the Kizuna Rail application.'
    },
    servers: [
      {
        url: '/api',
        description: 'Kizuna Rail API'
      }
    ]
  },
  apis: ['./src/routes/api-routes.js']
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;