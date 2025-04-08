const socket = io();
const roomId = window.location.pathname.split("/").pop();
socket.emit("join-room", roomId);

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const colorPicker = document.getElementById("colorPicker");
const brushSize = document.getElementById("brushSize");
const eraser = document.getElementById("eraser");
const clear = document.getElementById("clear");
const toggleChat = document.getElementById("toggleChat");
const chatPopup = document.getElementById("chatPopup");
const closeChat = document.getElementById("closeChat");
const username = document.getElementById("username");
const message = document.getElementById("message");
const send = document.getElementById("send");
const messages = document.getElementById("messages");

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

let drawing = false;
let current = {
  color: colorPicker.value,
  size: brushSize.value,
};

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  draw(e.clientX, e.clientY, false);
});
canvas.addEventListener("mousemove", (e) => {
  if (drawing) draw(e.clientX, e.clientY, true);
});
canvas.addEventListener("mouseup", () => (drawing = false));
canvas.addEventListener("mouseout", () => (drawing = false));

function draw(x, y, drag) {
  if (!drag) ctx.beginPath();
  ctx.strokeStyle = current.color;
  ctx.lineWidth = current.size;
  ctx.lineCap = "round";
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  if (drag)
    socket.emit("draw", {
      x,
      y,
      color: current.color,
      size: current.size,
    });
}

socket.on("draw", ({ x, y, color, size }) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
});

clear.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  socket.emit("clear");
});

socket.on("clear", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

eraser.addEventListener("click", () => {
  current.color = "#ffffff";
});

colorPicker.addEventListener("input", (e) => {
  current.color = e.target.value;
});

brushSize.addEventListener("input", (e) => {
  current.size = e.target.value;
});

toggleChat.addEventListener("click", () => {
  chatPopup.style.display = chatPopup.style.display === "flex" ? "none" : "flex";
});
closeChat.addEventListener("click", () => {
  chatPopup.style.display = "none";
});

send.addEventListener("click", () => {
  const user = username.value.trim();
  const msg = message.value.trim();
  if (user && msg) {
    socket.emit("chat message", { user, message: msg });
    message.value = "";
  }
});

socket.on("chat message", ({ user, message }) => {
  const div = document.createElement("div");
  div.innerHTML = `<strong>${user}:</strong> ${message}`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});

// WebRTC
let localStream;
let peerConnection;
const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localVideo.srcObject = stream;
    localStream = stream;
    initializePeerConnection();
  })
  .catch(err => console.error("Error accessing camera:", err));

function initializePeerConnection() {
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = ({ streams: [stream] }) => {
    remoteVideo.srcObject = stream;
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("ice-candidate", event.candidate);
    }
  };

  createOffer();
}

function createOffer() {
  peerConnection.createOffer()
    .then(offer => {
      peerConnection.setLocalDescription(offer);
      socket.emit("offer", offer);
    });
}

socket.on("offer", (offer) => {
  if (!peerConnection) initializePeerConnection();
  peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  peerConnection.createAnswer()
    .then(answer => {
      peerConnection.setLocalDescription(answer);
      socket.emit("answer", answer);
    });
});

socket.on("answer", (answer) => {
  peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("ice-candidate", (candidate) => {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});