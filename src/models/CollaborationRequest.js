import mongoose from "mongoose";

const CollaborationRequestSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  roomId: { type: String, required: true }, // New field for storing room ID
});

const CollaborationRequest = mongoose.model("CollaborationRequest", CollaborationRequestSchema);
export default CollaborationRequest;
