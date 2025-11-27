import swaggerJSDoc from 'swagger-jsdoc';
import { config } from './config.js';

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ABC Dashboard API',
    version: '1.0.0',
    description: 'A comprehensive dashboard API with authentication and user management built with Node.js, Express, and MongoDB',
    contact: {
      name: 'API Support',
      email: 'support@abc-dashboard.com'
    },
    license: {
      name: 'ISC',
      url: 'https://opensource.org/licenses/ISC'
    }
  },
  servers: [
    {
      url: `http://localhost:${config.PORT}/api/v1`,
      description: 'Development server (v1)'
    },
    {
      url: `${config.CLIENT_URL}/api/v1`,
      description: 'Production server (v1)'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"'
      },
      apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API Key for external integrations'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Auto-generated MongoDB ObjectId'
          },
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 50,
            description: 'User full name'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          role: {
            type: 'string',
            enum: ['admin', 'manager', 'staff'],
            description: 'User role'
          },
          isActive: {
            type: 'boolean',
            description: 'Account active status'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          }
        },
        required: ['id', 'name', 'email', 'role', 'isActive']
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user: {
            $ref: '#/components/schemas/User'
          },
          tokens: {
            type: 'object',
            properties: {
              accessToken: {
                type: 'string',
                description: 'JWT access token'
              },
              refreshToken: {
                type: 'string',
                description: 'JWT refresh token'
              },
              tokenType: {
                type: 'string',
                example: 'Bearer'
              }
            },
            required: ['accessToken', 'refreshToken', 'tokenType']
          }
        },
        required: ['user', 'tokens']
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            description: 'Error message'
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  description: 'Field name that caused the error'
                },
                message: {
                  type: 'string',
                  description: 'Validation error message'
                }
              }
            }
          }
        },
        required: ['success', 'message']
      },
      RegisterRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          password: {
            type: 'string',
            minLength: 8,
            description: 'User password'
          },
          firstName: {
            type: 'string',
            minLength: 1,
            description: 'User first name'
          },
          lastName: {
            type: 'string',
            minLength: 1,
            description: 'User last name'
          },
          role: {
            type: 'string',
            enum: ['admin', 'manager', 'staff'],
            default: 'staff',
            description: 'User role'
          }
        },
        required: ['email', 'password', 'firstName', 'lastName']
      },
      LoginRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          password: {
            type: 'string',
            description: 'User password'
          }
        },
        required: ['email', 'password']
      },
      UpdateProfileRequest: {
        type: 'object',
        properties: {
          firstName: {
            type: 'string',
            minLength: 1,
            description: 'User first name'
          },
          lastName: {
            type: 'string',
            minLength: 1,
            description: 'User last name'
          }
        }
      },
      UserStats: {
        type: 'object',
        properties: {
          totalUsers: {
            type: 'integer',
            description: 'Total number of users'
          },
          activeUsers: {
            type: 'integer',
            description: 'Number of active users'
          },
          verifiedUsers: {
            type: 'integer',
            description: 'Number of email-verified users'
          },
          usersByRole: {
            type: 'object',
            description: 'Users grouped by role'
          },
          recentRegistrations: {
            type: 'integer',
            description: 'Recent registrations (last 30 days)'
          },
          verificationRate: {
            type: 'number',
            description: 'Email verification rate percentage'
          }
        }
      },
      Pagination: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            description: 'Current page number'
          },
          limit: {
            type: 'integer',
            description: 'Items per page'
          },
          total: {
            type: 'integer',
            description: 'Total number of items'
          },
          totalPages: {
            type: 'integer',
            description: 'Total number of pages'
          }
        }
      },
      CreateUserRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          password: {
            type: 'string',
            minLength: 8,
            description: 'User password'
          },
          firstName: {
            type: 'string',
            minLength: 1,
            description: 'User first name'
          },
          lastName: {
            type: 'string',
            minLength: 1,
            description: 'User last name'
          },
          role: {
            type: 'string',
            enum: ['admin', 'manager', 'staff'],
            default: 'staff',
            description: 'User role'
          }
        },
        required: ['email', 'password', 'firstName', 'lastName']
      },
      UpdateUserRequest: {
        type: 'object',
        properties: {
          firstName: {
            type: 'string',
            minLength: 1,
            description: 'User first name'
          },
          lastName: {
            type: 'string',
            minLength: 1,
            description: 'User last name'
          },
          role: {
            type: 'string',
            enum: ['admin', 'manager', 'staff'],
            description: 'User role'
          },
          isActive: {
            type: 'boolean',
            description: 'Account active status'
          }
        }
      },
    }
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints'
    },
    {
      name: 'Users',
      description: 'User management and profile operations'
    },
    {
      name: 'Profile',
      description: 'User profile management operations'
    }
  ],
  externalDocs: {
    description: 'Find out more about ABC Dashboard',
    url: 'https://github.com/your-org/abc-dashboard'
  }
};

// Swagger options
const options = {
  swaggerDefinition,
  apis: [
    './src/infrastructure/routes/auth-routes.js',
    './src/infrastructure/routes/user-routes.js',
    './src/infrastructure/routes/profile-routes.js',
    './src/infrastructure/controllers/*.js'
  ]
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
