import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
    lastActivityAt: {
      type: Date,
    },
    emailVerifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
// Note: userId index is automatically created by unique: true

// Single field indexes
userProfileSchema.index({ lastLoginAt: -1 }); // Analytics queries
userProfileSchema.index({ lastActivityAt: -1 }); // Activity tracking
userProfileSchema.index({ emailVerified: 1 }); // Verification status queries

// Compound indexes for common query patterns
userProfileSchema.index({ userId: 1, emailVerified: 1 }); // Auth verification queries
userProfileSchema.index({ lastLoginAt: -1, userId: 1 }); // Recent login analytics

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

export default UserProfile;
