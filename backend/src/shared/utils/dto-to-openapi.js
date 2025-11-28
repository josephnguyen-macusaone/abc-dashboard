/**
 * DTO to OpenAPI Schema Converter
 * Generates OpenAPI schemas from DTO classes
 */

/**
 * Convert a DTO class to OpenAPI schema
 * @param {Function} DtoClass - The DTO class
 * @param {Object} options - Conversion options
 * @returns {Object} OpenAPI schema
 */
export function dtoToOpenAPISchema(DtoClass, options = {}) {
  try {
    // Create instance with minimal valid data instead of empty object
    const mockData = createMockDataForDto(DtoClass);
    const instance = new DtoClass(mockData);

    const schema = {
      type: 'object',
      properties: {},
      required: [],
    };

    // Get all properties from the instance
    Object.keys(instance).forEach((key) => {
      try {
        const value = instance[key];
        const propertySchema = getPropertySchema(value, key);

        if (propertySchema) {
          schema.properties[key] = propertySchema;

          // For response DTOs, mark common properties as required
          if (isLikelyRequired(key, value)) {
            schema.required.push(key);
          }
        }
      } catch (propertyError) {
        console.warn(`Failed to process property ${key} for ${DtoClass.name}:`, propertyError.message);
      }
    });

    // Apply custom options
    if (options.description) {
      schema.description = options.description;
    }

    if (options.required && Array.isArray(options.required)) {
      schema.required = options.required;
    }

    return schema;
  } catch (error) {
    console.warn(`Failed to create schema for ${DtoClass.name}:`, error.message);
    // Return a basic fallback schema
    return {
      type: 'object',
      properties: {},
      description: `Schema for ${DtoClass.name} (auto-generation failed)`,
    };
  }
}

/**
 * Create mock data for DTO instantiation
 * @param {Function} DtoClass - The DTO class
 * @returns {Object} Mock data object
 */
function createMockDataForDto(DtoClass) {
  const className = DtoClass.name.toLowerCase();

  // Handle different DTO types with appropriate mock data
  if (className.includes('response') || className.includes('login') || className.includes('register')) {
    return {
      user: { id: 'mock-id', email: 'user@example.com', username: 'mockuser' },
      tokens: { accessToken: 'mock-token', refreshToken: 'mock-refresh' },
      requiresPasswordChange: false,
      message: 'Mock message',
      success: true,
    };
  }

  if (className.includes('list')) {
    return {
      users: [{ id: 'mock-id', email: 'user@example.com', username: 'mockuser' }],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  if (className.includes('request')) {
    return {
      email: 'user@example.com',
      password: 'mockpassword',
      username: 'mockuser',
      firstName: 'Mock',
      lastName: 'User',
      displayName: 'Mock User',
      currentPassword: 'oldpassword',
      newPassword: 'newpassword',
      refreshToken: 'mock-refresh-token',
      role: 'staff',
    };
  }

  // Default mock data
  return {};
}

/**
 * Determine if a property is likely required based on name and value
 * @param {string} key - Property key
 * @param {*} value - Property value
 * @returns {boolean} Whether the property should be marked as required
 */
function isLikelyRequired(key, value) {
  // Common required properties
  const requiredKeys = ['id', 'email', 'username', 'user', 'tokens', 'users', 'pagination'];
  return requiredKeys.includes(key) && value !== undefined && value !== null;
}

/**
 * Get OpenAPI schema for a property based on its type/value
 * @param {*} value - Property value
 * @param {string} key - Property key
 * @returns {Object|null} OpenAPI property schema
 */
function getPropertySchema(value, key) {
  // Handle null/undefined values
  if (value === null || value === undefined) {
    // For common object properties, create basic object schemas
    if (key === 'user' || key === 'tokens' || key === 'pagination') {
      return { type: 'object' };
    }
    // Default to string for unknown undefined properties
    return { type: 'string' };
  }

  // Handle different types
  if (typeof value === 'string') {
    const schema = { type: 'string' };

    // Email validation
    if (key.toLowerCase().includes('email')) {
      schema.format = 'email';
    }

    // URL validation
    if (key.toLowerCase().includes('url') || key.toLowerCase().includes('avatar')) {
      schema.format = 'uri';
    }

    // Password fields
    if (key.toLowerCase().includes('password')) {
      schema.minLength = 8;
      schema.description = 'User password';
    }

    // Username validation
    if (key.toLowerCase().includes('username')) {
      schema.minLength = 3;
      schema.maxLength = 30;
      schema.pattern = '^[a-zA-Z0-9_]+$';
    }

    // Bio/description fields
    if (key.toLowerCase().includes('bio')) {
      schema.maxLength = 500;
    }

    return schema;
  }

  if (typeof value === 'number') {
    return { type: 'number' };
  }

  if (typeof value === 'boolean') {
    return { type: 'boolean' };
  }

  // Handle arrays
  if (Array.isArray(value)) {
    const itemSchema = value.length > 0 ? getPropertySchema(value[0], key) : { type: 'object' };
    return {
      type: 'array',
      items: itemSchema,
    };
  }

  // Handle objects (nested DTOs)
  if (typeof value === 'object' && value !== null) {
    try {
      // Try to create schema for nested object
      if (value.constructor && value.constructor !== Object) {
        return dtoToOpenAPISchema(value.constructor, {});
      } else {
        // Plain object - create basic schema
        return { type: 'object' };
      }
    } catch (nestedError) {
      console.warn(`Failed to create nested schema for ${key}:`, nestedError.message);
      return { type: 'object' };
    }
  }

  // For unknown types, return string as default
  return { type: 'string' };
}

/**
 * Generate OpenAPI schemas from multiple DTOs
 * @param {Object} dtoMap - Map of schema names to DTO classes
 * @returns {Object} OpenAPI components.schemas object
 */
export function generateSchemasFromDTOs(dtoMap) {
  const schemas = {};

  Object.entries(dtoMap).forEach(([schemaName, DtoClass]) => {
    try {
      schemas[schemaName] = dtoToOpenAPISchema(DtoClass);
    } catch (error) {
      console.warn(`Failed to generate schema for ${schemaName}:`, error.message);
    }
  });

  return schemas;
}

export default {
  dtoToOpenAPISchema,
  generateSchemasFromDTOs,
};
