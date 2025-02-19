// backend/src/models/Painting.js
import mongoose from "mongoose";

const PaintingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  canvasJson: { type: String, required: true }, // The saved canvas state (JSON string)
  thumbnailUrl: { type: String }, // Optional: URL to a thumbnail image
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Painting", PaintingSchema);
