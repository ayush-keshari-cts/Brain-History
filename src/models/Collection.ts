import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICollection extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  emoji: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const CollectionSchema = new Schema<ICollection>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name:   { type: String, required: true, trim: true, maxlength: 50 },
    emoji:  { type: String, default: "📁" },
    color:  { type: String, default: "violet" },
  },
  { timestamps: true, collection: "collections" }
);

CollectionSchema.index({ userId: 1, name: 1 }, { unique: true });

const Collection: Model<ICollection> =
  mongoose.models.Collection ?? mongoose.model<ICollection>("Collection", CollectionSchema);

export default Collection;
