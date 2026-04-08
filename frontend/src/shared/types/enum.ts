export enum Role {
  ADMIN = 'admin',
  ACCOUNTANT = 'accountant',
  ACCOUNT_MANAGER = 'account_manager',
  TECH_MANAGER = 'tech_manager',
  AGENT_MANAGER = 'agent_manager',
  TECH = 'tech',
  AGENT = 'agent',
}

export enum SortBy {
  CREATED_AT = 'createdAt',
  EMAIL = 'email',
  USERNAME = 'username',
  DISPLAY_NAME = 'displayName',
  ROLE = 'role'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}
