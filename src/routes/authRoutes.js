// backend/src/routes/authRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import upload from "../middleware/upload.js"; // Multer + Cloudinary middleware
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// SIGNUP Route (with profile picture upload)
router.post("/signup", upload.single("profilePic"), async (req, res) => {
  try {
    const { name, userId, email, password, dob, bio } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ userId });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get the profile image URL from Cloudinary (if uploaded)
    const profilePicUrl = req.file ? req.file.path : "";

    // Create a new user instance
    const user = new User({
      name,
      userId,
      email,
      password: hashedPassword,
      dob, // Mongoose will cast this to Date if possible
      bio,
      profilePic: profilePicUrl,
    });

    // Save the user to the database
    await user.save();

    // Generate a JWT token for the new user
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // Convert the Mongoose document to a plain object and remove sensitive fields
    const userObj = user.toObject();
    delete userObj.password;

    // Send the response
    res.status(201).json({ token, user: userObj });
  } catch (error) {
    console.error("Signup Error:", error.message);
    console.error(error.stack);
    res.status(500).json({ error: "Server error during signup" });
  }
});

// LOGIN Route
// LOGIN Route
router.post("/login", upload.none(), async (req, res) => {
  try {
    const { userId, password } = req.body;

    // Debug: log req.body to ensure fields are present
    console.log("Login request body:", req.body);

    // Find the user by userId
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Generate a JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // Convert the user document to a plain object and remove the password
    const userObj = user.toObject();
    delete userObj.password;

    // Respond with the token and user information
    res.status(200).json({ token, user: userObj });
  } catch (error) {
    console.error("Login Error:", error.message);
    console.error(error.stack);
    res.status(500).json({ error: "Server error during login" });
  }
});


export default router;
