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
    {
      url: 'https://portal.abcsalon.us/api/v1',
      description: 'Production server',
    },
  ],
  security: [
    {
      bearerAuth: [],
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
      BaseResponse: {
        type: 'object',
        required: ['success', 'message', 'timestamp'],
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Success' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      MetaPagination: {
        type: 'object',
        properties: {
          meta: {
            type: 'object',
            properties: {
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer', example: 1 },
                  limit: { type: 'integer', example: 10 },
                  totalPages: { type: 'integer', example: 5 },
                  hasNext: { type: 'boolean', example: true },
                  hasPrev: { type: 'boolean', example: false },
                },
              },
              stats: {
                type: 'object',
                properties: {
                  total: { type: 'integer', example: 42 },
                  admin: { type: 'integer', example: 5 },
                  manager: { type: 'integer', example: 10 },
                  staff: { type: 'integer', example: 27 },
                },
              },
            },
          },
        },
      },
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
      TokenPair: {
        type: 'object',
        required: ['accessToken', 'refreshToken'],
        properties: {
          accessToken: {
            type: 'string',
            description: 'JWT access token',
          },
          refreshToken: {
            type: 'string',
            description: 'JWT refresh token',
          },
        },
      },
      LoginData: {
        type: 'object',
        required: ['user', 'tokens'],
        properties: {
          user: { $ref: '#/components/schemas/User' },
          tokens: { $ref: '#/components/schemas/TokenPair' },
          requiresPasswordChange: {
            type: 'boolean',
            description: 'Indicates if user must change password (first login or reset)',
            example: false,
          },
        },
      },
      LoginResponse: {
        allOf: [
          { $ref: '#/components/schemas/BaseResponse' },
          {
            type: 'object',
            properties: {
              data: { $ref: '#/components/schemas/LoginData' },
            },
          },
        ],
      },
      RefreshResponse: {
        allOf: [
          { $ref: '#/components/schemas/BaseResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  tokens: { $ref: '#/components/schemas/TokenPair' },
                },
              },
            },
          },
        ],
      },
      ProfileData: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          isAuthenticated: { type: 'boolean', example: true },
        },
      },
      ProfileResponse: {
        allOf: [
          { $ref: '#/components/schemas/BaseResponse' },
          {
            type: 'object',
            properties: {
              data: { $ref: '#/components/schemas/ProfileData' },
            },
          },
        ],
      },
      UserListResponse: {
        allOf: [
          { $ref: '#/components/schemas/BaseResponse' },
          { $ref: '#/components/schemas/MetaPagination' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { $ref: '#/components/schemas/User' },
              },
            },
          },
        ],
      },
      UserResponse: {
        allOf: [
          { $ref: '#/components/schemas/BaseResponse' },
          {
            type: 'object',
            properties: {
              data: { $ref: '#/components/schemas/User' },
            },
          },
        ],
      },
      MessageResponse: {
        allOf: [{ $ref: '#/components/schemas/BaseResponse' }],
      },
      License: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'License unique identifier',
            example: '64f8d9e4c5a1b2c3d4e5f678',
          },
          dba: {
            type: 'string',
            description: 'Doing Business As name',
            maxLength: 255,
            example: 'ABC Salon Services',
          },
          zip: {
            type: 'string',
            description: 'ZIP code',
            maxLength: 10,
            nullable: true,
            example: '12345',
          },
          startDay: {
            type: 'string',
            description: 'License start date',
            format: 'date',
            example: '2024-01-15',
          },
          status: {
            type: 'string',
            enum: ['active', 'cancel', 'pending', 'expired'],
            description: 'License status',
            example: 'active',
          },
          plan: {
            type: 'string',
            enum: ['Basic', 'Premium', 'Enterprise'],
            description: 'Subscription plan',
            nullable: true,
            example: 'Premium',
          },
          term: {
            type: 'string',
            enum: ['monthly', 'yearly'],
            description: 'Billing term',
            nullable: true,
            example: 'monthly',
          },
          cancelDate: {
            type: 'string',
            description: 'Cancellation date (only present when status is cancel)',
            format: 'date',
            nullable: true,
            example: '2024-12-31',
          },
          lastPayment: {
            type: 'number',
            description: 'Last payment amount',
            minimum: 0,
            nullable: true,
            example: 99.99,
          },
          lastActive: {
            type: 'string',
            description: 'Last activity timestamp',
            format: 'date-time',
            nullable: true,
            example: '2024-12-01T10:30:00.000Z',
          },
          smsPurchased: {
            type: 'integer',
            description: 'Number of SMS credits purchased',
            minimum: 0,
            nullable: true,
            example: 1000,
          },
          smsSent: {
            type: 'integer',
            description: 'Number of SMS messages sent',
            minimum: 0,
            nullable: true,
            example: 750,
          },
          smsBalance: {
            type: 'integer',
            description: 'Remaining SMS credits',
            minimum: 0,
            nullable: true,
            example: 250,
          },
          agents: {
            type: 'integer',
            description: 'Number of agents/users',
            minimum: 0,
            nullable: true,
            example: 5,
          },
          agentsCost: {
            type: 'number',
            description: 'Monthly cost for agents',
            minimum: 0,
            nullable: true,
            example: 25.0,
          },
          agentsName: {
            type: 'array',
            description: 'Names of agents',
            items: {
              type: 'string',
            },
            nullable: true,
            example: ['John Doe', 'Jane Smith'],
          },
          createdAt: {
            type: 'string',
            description: 'License creation timestamp',
            format: 'date-time',
            example: '2024-01-01T00:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            description: 'Last update timestamp',
            format: 'date-time',
            example: '2024-12-01T10:30:00.000Z',
          },
        },
      },
      LicenseListResponse: {
        allOf: [
          { $ref: '#/components/schemas/BaseResponse' },
          { $ref: '#/components/schemas/MetaPagination' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { $ref: '#/components/schemas/License' },
              },
            },
          },
        ],
      },
      LicenseResponse: {
        allOf: [
          { $ref: '#/components/schemas/BaseResponse' },
          {
            type: 'object',
            properties: {
              data: { $ref: '#/components/schemas/License' },
            },
          },
        ],
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
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        description: 'Returns service health and metrics',
        tags: ['System'],
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/BaseResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          additionalProperties: true,
                          description: 'Health metrics payload',
                        },
                      },
                    },
                  ],
                },
              },
            },
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
    path.join(__dirname, '../routes/license-routes.js'),
  ],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
