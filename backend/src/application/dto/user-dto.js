/**
 * User Data Transfer Objects
 * For transferring user data between layers
 */

export class UserDTO {
  constructor(user) {
    this.id = user.id;
    this.username = user.username;
    this.email = user.email;
    this.displayName = user.displayName;
    this.avatarUrl = user.avatarUrl;
    this.avatarId = user.avatarId;
    this.bio = user.bio;
    this.phone = user.phone;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }

  static fromEntity(user) {
    return new UserDTO(user);
  }

  static fromEntities(users) {
    return users.map(user => UserDTO.fromEntity(user));
  }
}

export class CreateUserDTO {
  constructor(data) {
    this.username = data.username;
    this.hashedPassword = data.hashedPassword;
    this.email = data.email;
    this.displayName = data.displayName;
    this.avatarUrl = data.avatarUrl;
    this.avatarId = data.avatarId;
    this.bio = data.bio;
    this.phone = data.phone;
  }

  validate() {
    if (!this.email || !this.email.includes('@')) {
      throw new Error('Valid email is required');
    }

    if (!this.username || this.username.trim().length === 0) {
      throw new Error('Username is required');
    }

    if (!this.displayName || this.displayName.trim().length === 0) {
      throw new Error('Display name is required');
    }

    if (!this.hashedPassword || this.hashedPassword.length === 0) {
      throw new Error('Password is required');
    }

    // Username validation
    if (this.username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(this.username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }

    // Bio length validation
    if (this.bio && this.bio.length > 500) {
      throw new Error('Bio cannot exceed 500 characters');
    }
  }
}

export class UpdateUserDTO {
  constructor(data) {
    this.displayName = data.displayName;
    this.avatarUrl = data.avatarUrl;
    this.avatarId = data.avatarId;
    this.bio = data.bio;
    this.phone = data.phone;
  }

  validate() {
    if (this.displayName !== undefined && (!this.displayName || this.displayName.trim().length === 0)) {
      throw new Error('Display name cannot be empty');
    }

    // Bio length validation
    if (this.bio && this.bio.length > 500) {
      throw new Error('Bio cannot exceed 500 characters');
    }
  }
}

export class UpdateAvatarDTO {
  constructor(data) {
    this.avatarUrl = data.avatarUrl;
    this.avatarId = data.avatarId;
  }

  validate() {
    // Avatar URL and ID can be empty to remove avatar
  }
}

export class UserStatsDTO {
  constructor(stats) {
    this.totalUsers = stats.totalUsers || 0;
    this.usersWithAvatars = stats.usersWithAvatars || 0;
    this.usersWithBio = stats.usersWithBio || 0;
    this.usersWithPhone = stats.usersWithPhone || 0;
    this.recentRegistrations = stats.recentRegistrations || 0;
  }
}
