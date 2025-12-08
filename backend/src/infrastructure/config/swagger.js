import swaggerJSDoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Swagger definition (OpenAPI 3.0)
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ABC Dashboard API',
    version: '1.0.0',
    description:
      'A comprehensive dashboard API with authentication and user management built with Node.js, Express, and MongoDB',
  },
  servers: [
    {
      url: `http://localhost:${config.PORT}/api/v1`,
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'User ID',
            example: '507f1f77bcf86cd799439011',
          },
          username: {
            type: 'string',
            description: 'Username',
            example: 'johndoe',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email',
            example: 'john.doe@example.com',
          },
          displayName: {
            type: 'string',
            description: 'Display name',
            example: 'John Doe',
          },
          role: {
            type: 'string',
            enum: ['admin', 'manager', 'staff'],
            description: 'User role',
            example: 'staff',
          },
          avatarUrl: {
            type: 'string',
            format: 'uri',
            description: 'Avatar URL',
            nullable: true,
          },
          phone: {
            type: 'string',
            description: 'Phone number',
            nullable: true,
          },
          isActive: {
            type: 'boolean',
            description: 'Whether the user account is active',
            example: true,
          },
          isFirstLogin: {
            type: 'boolean',
            description: "Whether this is the user's first login",
            example: false,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          message: {
            type: 'string',
            description: 'Error message',
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  description: 'Field name that failed validation',
                },
                message: {
                  type: 'string',
                  description: 'Validation error message',
                },
              },
            },
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
    },
  },
};

// Swagger options with absolute paths
const options = {
  swaggerDefinition,
  apis: [
    path.join(__dirname, '../routes/auth-routes.js'),
    path.join(__dirname, '../routes/user-routes.js'),
    path.join(__dirname, '../routes/profile-routes.js'),
  ],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
