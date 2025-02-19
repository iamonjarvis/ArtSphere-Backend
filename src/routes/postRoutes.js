import express from "express";
import mongoose from "mongoose";
import Post from "../models/Post.js";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
// POST /api/posts/:postId/like
// Add or remove a like for a post
// POST /api/posts
// Create a new post
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { caption, imageUrl, paintingId } = req.body;
    const userId = req.user.id;

    const newPost = new Post({
      user: userId,
      caption,
      imageUrl,
      paintingId,
    });

    await newPost.save();
    res.status(201).json({ message: "Post created successfully", post: newPost });
  } catch (error) {
    console.error("Error creating post:", error.message);
    res.status(500).json({ error: "Server error while creating post" });
  }
});

router.post("/:postId/like", authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const { action } = req.body; // Expect action to be either 'add' or 'remove'
    const currentUserId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (action === 'add') {
      // Add the like if it doesn't exist
      if (!post.likes.includes(currentUserId)) {
        post.likes.push(currentUserId);
      }
    } else if (action === 'remove') {
      // Remove the like if it exists
      post.likes = post.likes.filter((like) => like.toString() !== currentUserId);
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    await post.save();
    res.json({ post });
  } catch (error) {
    console.error("Error toggling like:", error.message);
    res.status(500).json({ error: "Server error while toggling like" });
  }
});


// GET /api/posts/following
// Returns posts from users that the current user follows
router.get("/following", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!currentUser.following || currentUser.following.length === 0) {
      return res.json({ posts: [] });
    }
    const posts = await Post.find({
      user: { $in: currentUser.following },
    })
      .sort({ createdAt: -1 })
      .populate("user", "name userId profilePic")
      .populate({
        path: "comments.user",
        select: "name userId profilePic",
      });

    res.json({ posts });
  } catch (error) {
    console.error("Posts Fetch Error:", error.message);
    res.status(500).json({ error: "Server error while fetching posts" });
  }
});

// GET /api/posts/user?userId=...
// Returns posts created by the specified user.
router.get("/user", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId query parameter required" });
    }
    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("user", "name userId profilePic")
      .populate({
        path: "comments.user",
        select: "name userId profilePic",
      });
    res.json({ posts });
  } catch (error) {
    console.error("Error fetching user posts:", error.message);
    res.status(500).json({ error: "Server error while fetching user posts" });
  }
});

// GET /api/posts/:postId
// Fetch a single post by ID
router.get("/:postId", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate("user", "name userId profilePic")
      .populate({
        path: "comments.user",
        select: "name userId profilePic",
      })
      .exec();
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.json({ post });
  } catch (error) {
    console.error("Error fetching post:", error.message);
    res.status(500).json({ error: "Server error while fetching post" });
  }
});

// POST /api/posts/:postId/comment
// Add a comment to a post
router.post("/:postId/comment", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    const { postId } = req.params;
    if (!text) {
      return res.status(400).json({ error: "Comment text is required" });
    }
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    const user = await User.findById(req.user.id).select("name userId profilePic");
    const comment = {
      _id: new mongoose.Types.ObjectId(),
      user: user,
      text,
      replies: [],
      createdAt: new Date(),
    };
    post.comments.push(comment);
    await post.save();
    res.status(201).json({ message: "Comment added", post });
  } catch (error) {
    console.error("Error adding comment:", error.message);
    res.status(500).json({ error: "Server error while adding comment" });
  }
});

// POST /api/posts/:postId/comment/:commentId/reply
// Add a reply to a comment
router.post("/:postId/comment/:commentId/reply", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    const { postId, commentId } = req.params;
    if (!text) {
      return res.status(400).json({ error: "Reply text is required" });
    }
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    const comment = post.comments.find((c) => c._id.toString() === commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    const user = await User.findById(req.user.id).select("name userId profilePic");
    const reply = {
      _id: new mongoose.Types.ObjectId(),
      user: user,
      text,
      createdAt: new Date(),
    };
    comment.replies.push(reply);
    await post.save();
    res.status(201).json({ message: "Reply added", post });
  } catch (error) {
    console.error("Error adding reply:", error.message);
    res.status(500).json({ error: "Server error while adding reply" });
  }
});

export default router;
