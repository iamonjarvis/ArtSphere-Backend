import express from "express";
import http from "http";
import { ApolloServer } from "apollo-server-express";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import userTypeDefs from "./typeDefs/user.js";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import paintingRoutes from "./routes/paintingRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import collaborationRoutes from "./routes/collaborationRoutes.js";

dotenv.config();
const app = express();

// ✅ Global CORS Configuration
app.use(
  cors({
    origin: "*", // Allows requests from any origin; adjust for production if needed
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/paintings", paintingRoutes);
app.use("/api/messages", chatRoutes); // Chat Routes
app.use("/api/collaborate", collaborationRoutes);

// Apollo Server setup (if using GraphQL)
const apolloServer = new ApolloServer({ typeDefs: [userTypeDefs], resolvers: {} });
await apolloServer.start();
apolloServer.applyMiddleware({ app });

// Create HTTP server and attach Socket.IO
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", credentials: true },
});

// In-memory map to keep track of online users for chat
const onlineUsers = new Map();

// Socket.IO setup
io.on("connection", (socket) => {
  console.log("A client connected, socket id:", socket.id);

  // Allow clients to join a specific room for collaborative canvas sessions
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  // Collaborative canvas update event with room support
  socket.on("canvas:update", (data) => {
    const { roomId, lines } = data;
    if (roomId) {
      console.log(`Broadcasting canvas update from ${socket.id} to room ${roomId}`);
      // Emit to everyone in the room except the sender
      socket.to(roomId).emit("canvas:update", { lines });
    } else {
      console.log(`Broadcasting canvas update from ${socket.id} without a room`);
      // Fallback: broadcast to all other connected clients
      socket.broadcast.emit("canvas:update", data);
    }
  });

  // Chat: Register user with their socket ID
  socket.on("register", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`User registered: ${userId} with socket id ${socket.id}`);
  });

  // Chat: Handle sending a message
  socket.on("sendMessage", async (data) => {
    // data should contain: { from, to, text }
    try {
      // Dynamically import the Chat model
      const Chat = (await import("./models/Chat.js")).default;
      const newMessage = new Chat({
        from: data.from,
        to: data.to,
        text: data.text,
        createdAt: new Date(),
      });
      await newMessage.save();

      // If the recipient is online, emit the new message to them
      const receiverSocketId = onlineUsers.get(data.to);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receiveMessage", newMessage);
      }
      // Optionally, send an acknowledgment back to the sender
      socket.emit("messageSent", newMessage);
    } catch (error) {
      console.error("Error in sendMessage:", error);
    }
  });

  // Remove disconnected users from the onlineUsers map
  socket.on("disconnect", () => {
    console.log("A client disconnected, socket id:", socket.id);
    for (const [userId, sId] of onlineUsers.entries()) {
      if (sId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

// Bind to all network interfaces so that your backend is accessible from other devices
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://<your-ip>:${PORT}${apolloServer.graphqlPath}`);
});
