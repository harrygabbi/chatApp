const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json()); // Parse JSON request bodies

// In-memory storage for online users
const onlineUsers = {};

// Serve the home page
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Handle user login
app.post("/login", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  // Check if the user is already online
  if (onlineUsers[email]) {
    return res.status(200).json({ message: "User already logged in", email });
  }

  // Add user to online users
  onlineUsers[email] = { email, socketId: null };
  res.status(200).json({ message: "Logged in successfully", email });
});

// Fetch list of online users
app.get("/users", (req, res) => {
  res.json(Object.values(onlineUsers).map((user) => user.email));
});

const path = require("path");

// Serve the chat page dynamically
app.get("/chat", (req, res) => {
  res.sendFile(path.join(__dirname, "chat.html"));
});


// WebSocket connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Assign the user's socket ID
  socket.on("login", (email) => {
    if (onlineUsers[email]) {
      onlineUsers[email].socketId = socket.id;
      io.emit("updateUsers", Object.values(onlineUsers).map((user) => user.email));
      console.log(`${email} is now online`);
    }
  });

  // Handle message sending
  socket.on("sendMessage", ({ to, from, message }) => {
    const recipient = Object.values(onlineUsers).find((user) => user.email === to);
    if (recipient && recipient.socketId) {
      io.to(recipient.socketId).emit("receiveMessage", { from, message });
    }
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    const email = Object.keys(onlineUsers).find(
      (key) => onlineUsers[key].socketId === socket.id
    );
    if (email) {
      delete onlineUsers[email];
      io.emit("updateUsers", Object.values(onlineUsers).map((user) => user.email));
      console.log(`${email} disconnected`);
    }
  });
});

// Start the server
server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
