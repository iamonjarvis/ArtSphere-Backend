// backend/src/routes/paintingRoutes.js
import express from "express";
import Painting from "../models/Painting.js";
import authMiddleware from "../middleware/authMiddleware.js";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

// Save a new painting
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { canvas, imageData } = req.body;
    if (!canvas) {
      return res.status(400).json({ error: "No canvas data provided" });
    }
    let thumbnailUrl = "";
    if (imageData) {
      // Upload the base64 image to Cloudinary
      const result = await cloudinary.uploader.upload(imageData, {
        folder: "paintings",
      });
      thumbnailUrl = result.secure_url;
    }
    const newPainting = new Painting({
      user: req.user.id,
      canvasJson: canvas,
      thumbnailUrl,
    });
    await newPainting.save();
    res.status(201).json({ message: "Painting saved", painting: newPainting });
  } catch (error) {
    console.error("Error saving painting:", error);
    res.status(500).json({ error: "Server error saving painting" });
  }
});

// Get all paintings for the current user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const paintings = await Painting.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ paintings });
  } catch (error) {
    console.error("Error fetching paintings:", error);
    res.status(500).json({ error: "Server error fetching paintings" });
  }
});

// DELETE /api/paintings/:id - Delete a painting
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
      const painting = await Painting.findOneAndDelete({
        _id: req.params.id,
        user: req.user.id,
      });
      if (!painting) {
        return res.status(404).json({ error: "Painting not found" });
      }
      res.status(200).json({ message: "Painting deleted" });
    } catch (error) {
      console.error("Error deleting painting:", error);
      res.status(500).json({ error: "Server error deleting painting" });
    }
  });
  

export default router;
