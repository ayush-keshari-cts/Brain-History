import mongoose, { Document, Model, Schema } from "mongoose";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string;
  image?: string;
  emailVerified?: Date;
  /** OAuth providers linked to this account */
  accounts: {
    provider: string;
    providerAccountId: string;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  }[];
  settings: {
    defaultAiProvider: "openai" | "anthropic";
    largeContentThreshold: number;   // chars, overrides env default
    searchResultsLimit: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: String,
    emailVerified: Date,

    accounts: [
      {
        provider:          { type: String, required: true },
        providerAccountId: { type: String, required: true },
        access_token:      String,
        refresh_token:     String,
        expires_at:        Number,
      },
    ],

    settings: {
      defaultAiProvider:    { type: String, enum: ["openai", "anthropic"], default: "openai" },
      largeContentThreshold:{ type: Number, default: 10_000 },
      searchResultsLimit:   { type: Number, default: 10 },
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ "accounts.provider": 1, "accounts.providerAccountId": 1 });

// ─── Model (safe re-use in hot-reload) ────────────────────────────────────────

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);

export default User;
