import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Post from "../models/Post.js"; // Needed for the /following route
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/users/following
// Returns posts from users that the current user follows
router.get("/following", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    // Find the current user
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!currentUser.following || currentUser.following.length === 0) {
      return res.json({ posts: [] });
    }
    // Use the following array directly (they are stored as ObjectIds)
    const posts = await Post.find({
      user: { $in: currentUser.following },
    }).sort({ createdAt: -1 }); // Latest posts first

    res.json({ posts });
  } catch (error) {
    console.error("Posts Fetch Error:", error.message);
    res.status(500).json({ error: "Server error while fetching posts" });
  }
});

// GET /api/users/search?query=...
router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.json({ users: [] });
    }
    const regex = new RegExp(query, "i");
    const users = await User.find({
      $or: [{ name: { $regex: regex } }, { userId: { $regex: regex } }],
    }).select("-password");
    res.json({ users });
  } catch (error) {
    console.error("User Search Error:", error.message);
    res.status(500).json({ error: "Server error during user search" });
  }
});

// GET /api/users/profile
// Now populates the followers and following fields
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("followers", "name userId profilePic")
      .populate("following", "name userId profilePic");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    console.error("Error fetching profile:", error.message);
    res.status(500).json({ error: "Server error while fetching profile" });
  }
});

// GET /api/users/public/:id
// Returns public profile data (without sensitive fields) and populates followers and following
router.get("/public/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -email")
      .populate("followers", "name userId profilePic")
      .populate("following", "name userId profilePic");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    console.error("Error fetching public profile:", error.message);
    res.status(500).json({ error: "Server error while fetching public profile" });
  }
});

// GET /api/users/followers/:id
// Returns the followers list for the specified user (populated)
router.get("/followers/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("followers")
      .populate("followers", "name userId profilePic");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ followers: user.followers });
  } catch (error) {
    console.error("Error fetching followers:", error.message);
    res.status(500).json({ error: "Server error while fetching followers" });
  }
});

// GET /api/users/followinglist/:id
// Returns the following list for the specified user (populated)
router.get("/followinglist/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("following")
      .populate("following", "name userId profilePic");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ following: user.following });
  } catch (error) {
    console.error("Error fetching following:", error.message);
    res.status(500).json({ error: "Server error while fetching following" });
  }
});

// POST /api/users/follow/:id
// Toggle follow/unfollow for a target user
router.post("/follow/:id", authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: "You cannot follow yourself." });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ error: "Current user not found." });
    }

    // Check if current user already follows the target user
    const isFollowing = targetUser.followers.some(
      (id) => id.toString() === currentUserId
    );

    if (isFollowing) {
      // Unfollow: Remove currentUserId from targetUser.followers and targetUserId from currentUser.following
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== currentUserId
      );
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== targetUserId
      );
    } else {
      // Follow: Add currentUserId to targetUser.followers and targetUserId to currentUser.following
      targetUser.followers.push(currentUserId);
      currentUser.following.push(targetUserId);
    }

    await targetUser.save();
    await currentUser.save();

    res.json({
      message: isFollowing ? "Unfollowed successfully" : "Followed successfully",
      isFollowing: !isFollowing,
      followers: targetUser.followers,
    });
  } catch (error) {
    console.error("Error toggling follow:", error.message);
    res.status(500).json({ error: "Server error while toggling follow" });
  }
});

export default router;
