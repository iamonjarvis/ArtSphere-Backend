import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import CollaborationRequest from "../models/CollaborationRequest.js";

const router = express.Router();
import { v4 as uuidv4 } from "uuid"; // Import UUID for unique room ID generation

router.post("/request", authMiddleware, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: "targetUserId is required" });
    }

    if (senderId === targetUserId) {
      return res.status(400).json({ error: "Cannot send collaboration request to yourself" });
    }

    // Check if a pending request already exists
    const existingRequest = await CollaborationRequest.findOne({
      sender: senderId,
      receiver: targetUserId,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({ error: "Collaboration request already sent" });
    }

    // Generate a unique room ID
    const roomId = `collab_${uuidv4()}`;

    const newRequest = new CollaborationRequest({
      sender: senderId,
      receiver: targetUserId,
      roomId, // Store room ID
    });

    await newRequest.save();
    res.json({ message: "Collaboration request sent successfully", roomId });
  } catch (error) {
    console.error("Error sending collaboration request:", error.message);
    res.status(500).json({ error: "Server error while sending collaboration request" });
  }
});

/**
 * GET /api/users/mutualFollowers
 * Returns mutual followers for the logged-in user (i.e. users who both follow and are followed by the user)
 */
router.get("/mutualFollowers", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId)
      .populate("followers", "name userId profilePic")
      .populate("following", "name userId profilePic");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Mutual followers: those that appear in both followers and following arrays
    const followersSet = new Set(user.followers.map((f) => f._id.toString()));
    const mutualFollowers = user.following.filter((u) =>
      followersSet.has(u._id.toString())
    );

    res.json({ mutualFollowers });
  } catch (error) {
    console.error("Error fetching mutual followers:", error.message);
    res.status(500).json({ error: "Server error while fetching mutual followers" });
  }
});

/**
 * POST /api/collaborate/request
 * Creates a collaboration request from the logged-in user (sender) to a target user (receiver)
 * Request body should include: { targetUserId: "..." }
 */


/**
 * GET /api/collaborate/received
 * Returns pending collaboration requests received by the logged-in user.
 */
router.get("/received", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    // Populate sender and explicitly include _id along with other fields
    const requests = await CollaborationRequest.find({
      receiver: userId,
      status: "pending",
    }).populate("sender", "name userId profilePic _id");

    res.json({ requests });
  } catch (error) {
    console.error("Error fetching collaboration requests:", error.message);
    res.status(500).json({ error: "Server error while fetching collaboration requests" });
  }
});

/**
 * POST /api/collaborate/accept
 * Accepts a collaboration request. Request body should include: { requestId: "..." }
 */
router.post("/accept", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const { requestId } = req.body;
  
      if (!requestId) {
        return res.status(400).json({ error: "requestId is required" });
      }
  
      const collabRequest = await CollaborationRequest.findById(requestId);
      if (!collabRequest) {
        return res.status(404).json({ error: "Collaboration request not found" });
      }
  
      if (collabRequest.receiver.toString() !== userId) {
        return res.status(403).json({ error: "Not authorized to accept this request" });
      }
  
      collabRequest.status = "accepted";
      await collabRequest.save();
  
      res.json({ message: "Collaboration request accepted", roomId: collabRequest.roomId });
    } catch (error) {
      console.error("Error accepting collaboration request:", error.message);
      res.status(500).json({ error: "Server error while accepting collaboration request" });
    }
  });
  

/**
 * POST /api/collaborate/reject
 * Rejects a collaboration request. Request body should include: { requestId: "..." }
 */
router.post("/reject", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: "requestId is required" });
    }

    const collabRequest = await CollaborationRequest.findById(requestId);
    if (!collabRequest) {
      return res.status(404).json({ error: "Collaboration request not found" });
    }

    if (collabRequest.receiver.toString() !== userId) {
      return res.status(403).json({ error: "Not authorized to reject this request" });
    }

    collabRequest.status = "rejected";
    await collabRequest.save();

    res.json({ message: "Collaboration request rejected", request: collabRequest });
  } catch (error) {
    console.error("Error rejecting collaboration request:", error.message);
    res.status(500).json({ error: "Server error while rejecting collaboration request" });
  }
});

export default router;
