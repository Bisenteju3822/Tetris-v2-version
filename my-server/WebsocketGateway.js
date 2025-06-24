const WebSocket = require("ws");
const { joinTetrisRoom } = require("./colyseusClient");
const { handleRoomEvents } = require("./handlers/roomHandlers");
const sendError = require("./utils/sendError");

const FRONTEND_PORT = 8000;
const wss = new WebSocket.Server({ port: FRONTEND_PORT });

console.log(`🚀 TetrisV2 Gateway running at ws://localhost:${FRONTEND_PORT}`);

wss.on("connection", (frontendSocket) => {
  console.log("🌐 New frontend connected");
  let room = null;

  frontendSocket.on("message", async (msg) => {
    try {
      const { type, data } = JSON.parse(msg);

      switch (type) {
        case "join":
          room = await joinTetrisRoom(data);
          frontendSocket.send(JSON.stringify({
            type: "joined",
            data: {
              roomId: room.roomId,
              sessionId: room.sessionId,
              betAmount: room.state.betAmount,
              winAmount: room.state.winAmount
            }
          }));
          handleRoomEvents(room, frontendSocket);
          break;

        case "place_piece":
          if (!room) return sendError(frontendSocket, "Not in a room");
          room.send("place_piece", data);
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
      console.error("❌ Error handling message:", err.message);
      sendError(frontendSocket, err.message);
    }
  });

  frontendSocket.on("close", () => {
    console.log("🔌 Frontend disconnected");
    if (room) room.leave();
  });
});
