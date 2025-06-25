const WebSocket = require("ws");
const colyseus = require("colyseus.js");

const COLYSEUS_ENDPOINT = "ws://localhost:2567";
const FRONTEND_PORT = 8000;

const client = new colyseus.Client(COLYSEUS_ENDPOINT);
const frontendServer = new WebSocket.Server({ port: FRONTEND_PORT });

console.log(`🚀 TetrisV2 WebSocket relay listening on ws://localhost:${FRONTEND_PORT}`);

frontendServer.on("connection", (frontendSocket) => {
  console.log("🌐 Frontend connected");
  let room = null;

  frontendSocket.on("message", async (msg) => {
    try {
      const { type, data } = JSON.parse(msg);
      console.log(`📩 Received [${type}] from frontend`);

      switch (type) {
        case "join":
          await handleJoin(frontendSocket, {
            name: data.name,
            uniqueId: data.uniqueId,
            playerCount: data.playerCount || 2
          });
          break;

        case "place_piece":
          if (!room) return sendError(frontendSocket, "Not in a room");
          room.send("place_piece", data); // Expect data: { index, x, y }
          break;

        case "rematch_request":
          if (!room) return sendError(frontendSocket, "Not in a room");
          room.send("rematch_request");
          break;

        case "exit":
          if (room) {
            await room.leave();
            room = null;
            frontendSocket.send(JSON.stringify({ type: "left" }));
          }
          break;

        default:
          sendError(frontendSocket, `Unknown command: ${type}`);
      }
    } catch (err) {
      console.error("⚠ Error:", err.message);
      sendError(frontendSocket, err.message);
    }
  });

  frontendSocket.on("close", () => {
    console.log("🔌 Frontend disconnected");
    if (room) room.leave();
  });

  async function handleJoin(socket, options) {
    const roomName = "tetris_v2"; // Name used in ColyseusRoom registration

    console.log(`🔗 Joining ${roomName} with uniqueId ${options.uniqueId}`);

    try {
      room = await client.joinOrCreate(roomName, options);

      console.log(`✅ Joined room ${room.roomId}`);
      socket.send(JSON.stringify({
        type: "joined",
        data: {
          roomId: room.roomId,
          sessionId: room.sessionId,
        }
      }));

      // Room Events
      room.onStateChange(state => handleStateChange(socket, state));

      room.onError((code, message) => {
        sendError(socket, `${code}: ${message}`);
      });

      room.onMessage("error", (message) => sendError(socket, message));
      room.onMessage("rematch", () => socket.send(JSON.stringify({ type: "rematchOffered" })));

      room.onMessage("countdown", (data) => {
        socket.send(JSON.stringify({ type: "countdown", data }));
      });

      room.onMessage("game-over", (data) => {
        socket.send(JSON.stringify({ type: "gameOver", data }));
      });

      room.onMessage("match-ended", (data) => {
        socket.send(JSON.stringify({ type: "matchEnded", data }));
      });

      room.onLeave(() => {
        socket.send(JSON.stringify({ type: "left" }));
        room = null;
      });
    } catch (error) {
      console.error("⚠ Join error:", error.message);
      sendError(socket, `Join failed: ${error.message}`);
    }
  }

  function handleStateChange(socket, state) {
    const playersObj = {};
    state.players.forEach((player, sessionId) => {
      playersObj[sessionId] = {
        name: player.name,
        score: player.score,
        gameOver: player.gameOver,
        currentPiecesCount: player.currentPieces ? player.currentPieces.length : 0
      };
    });

    socket.send(JSON.stringify({
      type: "state",
      data: {
        players: playersObj,
        gameStatus: state.gameStatus,
        winner: state.winner
      }
    }));
  }

  function sendError(socket, message) {
    console.error("❌ Error:", message);
    socket.send(JSON.stringify({
      type: "error",
      data: message
    }));
  }
});
