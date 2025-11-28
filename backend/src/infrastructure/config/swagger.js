import swaggerJSDoc from 'swagger-jsdoc';
import { config } from './config.js';
import { generateSchemasFromDTOs } from '../../shared/utils/dto-to-openapi.js';
import {
  LoginRequestDto,
  RegisterRequestDto,
  ChangePasswordRequestDto,
  RefreshTokenRequestDto,
  LoginResponseDto,
  RegisterResponseDto,
  TokensDto,
  UserAuthDto,
  CreateUserRequestDto,
  UserResponseDto,
  UserListResponseDto,
  UpdateProfileRequestDto,
} from '../../application/dto/index.js'; // eslint-disable-line no-unused-vars

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ABC Dashboard API',
    version: '1.0.0',
    description:
      'A comprehensive dashboard API with authentication and user management built with Node.js, Express, and MongoDB',
    contact: {
      name: 'API Support',
      email: 'support@abc-dashboard.com',
    },
    license: {
      name: 'ISC',
      url: 'https://opensource.org/licenses/ISC',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.PORT}/api/v1`,
      description: 'Development server (v1)',
    },
    {
      url: `${config.CLIENT_URL}/api/v1`,
      description: 'Production server (v1)',
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
      apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API Key for external integrations',
      },
    },
    schemas: {
      // Manual schemas for complex DTOs that auto-generation struggles with
      UserListResponse: {
        type: 'object',
        properties: {
          users: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/UserResponse',
            },
          },
          pagination: {
            $ref: '#/components/schemas/Pagination',
          },
        },
        required: ['users', 'pagination'],
      },

      // Auto-generated schemas from simpler DTOs
      ...generateSchemasFromDTOs({
        LoginRequest: LoginRequestDto,
        RegisterRequest: RegisterRequestDto,
        ChangePasswordRequest: ChangePasswordRequestDto,
        RefreshTokenRequest: RefreshTokenRequestDto,
        LoginResponse: LoginResponseDto,
        RegisterResponse: RegisterResponseDto,
        Tokens: TokensDto,
        UserAuth: UserAuthDto,
        CreateUserRequest: CreateUserRequestDto,
        UserResponse: UserResponseDto,
        UpdateProfileRequest: UpdateProfileRequestDto,
      }),
      // Note: DTOs are used dynamically in generateSchemasFromDTOs function

      // Custom schemas that don't have DTOs
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
                  description: 'Field name that caused the error',
                },
                message: {
                  type: 'string',
                  description: 'Validation error message',
                },
              },
            },
          },
        },
        required: ['success', 'message'],
      },
      UserStats: {
        type: 'object',
        properties: {
          totalUsers: {
            type: 'integer',
            description: 'Total number of users',
          },
          activeUsers: {
            type: 'integer',
            description: 'Number of active users',
          },
          verifiedUsers: {
            type: 'integer',
            description: 'Number of email-verified users',
          },
          usersByRole: {
            type: 'object',
            description: 'Users grouped by role',
          },
          recentRegistrations: {
            type: 'integer',
            description: 'Recent registrations (last 30 days)',
          },
          verificationRate: {
            type: 'number',
            description: 'Email verification rate percentage',
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            description: 'Current page number',
          },
          limit: {
            type: 'integer',
            description: 'Items per page',
          },
          total: {
            type: 'integer',
            description: 'Total number of items',
          },
          totalPages: {
            type: 'integer',
            description: 'Total number of pages',
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints',
    },
    {
      name: 'Users',
      description: 'User management and profile operations',
    },
    {
      name: 'Profile',
      description: 'User profile management operations',
    },
  ],
  externalDocs: {
    description: 'Find out more about ABC Dashboard',
    url: 'https://github.com/your-org/abc-dashboard',
  },
};

// Swagger options
const options = {
  swaggerDefinition,
  apis: [
    './src/infrastructure/routes/auth-routes.js',
    './src/infrastructure/routes/user-routes.js',
    './src/infrastructure/routes/profile-routes.js',
    './src/infrastructure/controllers/*.js',
  ],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
