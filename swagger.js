const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'RT Bus Tracking API',
            version: '1.0.0',
            description: 'API documentation for RT Bus Tracking System',
        },
        servers: [
            {
                url: 'https://rt-bus-tracking.vercel.app/', // your API base URL
            },
        ],
    },
    apis: ['./route_files/*.js'], // Path to route files with Swagger comments
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerUi, swaggerSpec };
