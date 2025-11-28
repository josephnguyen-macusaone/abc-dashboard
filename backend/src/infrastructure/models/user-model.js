import mongoose from 'mongoose';
import { ROLES } from '../../shared/constants/roles.js';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    hashedPassword: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.STAFF,
      required: true,
    },
    avatarUrl: {
      type: String,
    },
    phone: {
      type: String,
      sparse: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isFirstLogin: {
      type: Boolean,
      default: true,
    },
    langKey: {
      type: String,
      default: 'en',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
// Note: email and username indexes are automatically created by unique: true

// Single field indexes
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Compound indexes for common query patterns
userSchema.index({ role: 1, isActive: 1 }); // Admin user listings
userSchema.index({ email: 1, isActive: 1 }); // Login queries
userSchema.index({ role: 1, createdAt: -1 }); // Role-based user listings sorted by date
userSchema.index({ isActive: 1, createdAt: -1 }); // Active users sorted by date

// Text index for search functionality
userSchema.index({ displayName: 'text', username: 'text', email: 'text' });

const User = mongoose.model('User', userSchema);

export default User;
