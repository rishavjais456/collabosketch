const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use((req, res, next) => {
  console.log("Request received:", req.method, req.url);
  next();
});

app.get("/", (req, res) => {
  const roomId = uuidv4().slice(0, 6);
  res.redirect(`/room/${roomId}`);
});

app.get("/room/:room", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "main.html"));
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);

    socket.on("draw", (data) => socket.to(roomId).emit("draw", data));
    socket.on("erase", (data) => socket.to(roomId).emit("erase", data));
    socket.on("clear", () => io.to(roomId).emit("clear"));
    socket.on("chat message", (msg) => io.to(roomId).emit("chat message", msg));

    socket.on("offer", (data) => socket.to(roomId).emit("offer", data));
    socket.on("answer", (data) => socket.to(roomId).emit("answer", data));
    socket.on("ice-candidate", (data) => socket.to(roomId).emit("ice-candidate", data));
  });
});

http.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
