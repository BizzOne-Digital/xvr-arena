import mongoose, { type Model, type Schema } from "mongoose";

export function defineModel<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}

export const { Schema: S } = mongoose;
export const ObjectId = mongoose.Schema.Types.ObjectId;
