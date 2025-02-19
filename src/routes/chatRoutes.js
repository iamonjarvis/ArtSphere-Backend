import express from "express";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ⚠️ IMPORTANT: Declare the static /contacts route BEFORE dynamic routes

// ✅ Fetch list of contacts (followers + following) with last chat preview
router.get("/contacts", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user with populated followers and following
    const user = await User.findById(userId)
      .populate("followers", "name userId profilePic")
      .populate("following", "name userId profilePic");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Merge followers and following into a unique contacts list
    const contactsMap = new Map();
    [...user.followers, ...user.following].forEach((contact) => {
      contactsMap.set(contact._id.toString(), contact);
    });
    const contactsArray = Array.from(contactsMap.values());

    // For each contact, get the most recent message (last chat)
    const contactsWithLastMessage = await Promise.all(
      contactsArray.map(async (contact) => {
        const lastChat = await Chat.findOne({
          $or: [
            { from: userId, to: contact._id },
            { from: contact._id, to: userId },
          ],
        }).sort({ createdAt: -1 });
        return {
          ...contact.toObject(),
          lastChat: lastChat
            ? { text: lastChat.text, createdAt: lastChat.createdAt }
            : null,
        };
      })
    );

    res.status(200).json({ contacts: contactsWithLastMessage });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ error: "Server error while fetching contacts" });
  }
});

// ✅ Fetch chat history between the logged-in user & a contact
router.get("/:contactId", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const contactId = req.params.contactId;

    const chatHistory = await Chat.find({
      $or: [
        { from: currentUserId, to: contactId },
        { from: contactId, to: currentUserId },
      ],
    }).sort("createdAt");

    res.json({ chatHistory });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Server error while fetching messages" });
  }
});

// ✅ Send a new message from the logged-in user to a contact
router.post("/:contactId", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const contactId = req.params.contactId;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message text is required" });
    }

    const newMessage = new Chat({
      from: currentUserId,
      to: contactId,
      text: message,
      createdAt: new Date(),
    });

    await newMessage.save();

    res.status(201).json({ message: "Message sent", messageData: newMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Server error while sending message" });
  }
});

export default router;
