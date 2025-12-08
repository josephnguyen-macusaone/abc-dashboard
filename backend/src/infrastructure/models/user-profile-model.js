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
    lastLoginAt: {
      type: Date,
    },
    lastActivityAt: {
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

// Compound indexes for common query patterns
userProfileSchema.index({ lastLoginAt: -1, userId: 1 }); // Recent login analytics

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

export default UserProfile;
