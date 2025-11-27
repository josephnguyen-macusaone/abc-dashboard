import mongoose from "mongoose";

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
userProfileSchema.index({ lastLoginAt: -1 }); // Analytics queries

const UserProfile = mongoose.model("UserProfile", userProfileSchema);

export default UserProfile;
