import React, { useEffect, useRef, useState } from "react";

const WS_URL = "ws://localhost:8000"; // Gateway WebSocket

export default function TetrisV2Client() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [players, setPlayers] = useState({});
  const [gameStatus, setGameStatus] = useState("waiting");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      console.log("✅ Connected to Tetris Gateway");
    };

    socket.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      console.log("📩 Message from server:", type, data);

      switch (type) {
        case "joined":
          setSessionId(data.sessionId);
          break;
        case "state":
          setPlayers(data.players);
          setGameStatus(data.gameStatus);
          break;
        case "error":
          setMessages((prev) => [...prev, `❌ ${data}`]);
          break;
        case "gameOver":
          setMessages((prev) => [...prev, `🏁 Game Over: ${data.playerId}`]);
          break;
        case "matchEnded":
          setMessages((prev) => [
            ...prev,
            `🎉 Match Ended! Winner: ${data.winner}`,
          ]);
          break;
        default:
          break;
      }
    };

    socket.onclose = () => {
      setConnected(false);
      console.log("🔌 Disconnected from server");
    };

    return () => socket.close();
  }, []);

  const handleJoin = () => {
    const payload = {
      type: "join",
      data: {
        uniqueId: "user_" + Math.random().toString(36).substring(2),
        userId: "user123",
        name: "Tejas",
        matchOptionId: "match_1",
        useBonus: false,
        isPrivate: false,
        allowedUserIds: [],
        playerCount: 4,
      },
    };
    socketRef.current.send(JSON.stringify(payload));
  };

  const handlePlacePiece = () => {
    socketRef.current.send(
      JSON.stringify({
        type: "place_piece",
        data: { index: currentIndex, x: x, y: y },
      })
    );
  };

  const handleRematch = () => {
    socketRef.current.send(JSON.stringify({ type: "rematch_request" }));
  };

  return (
    <div className="p-4 font-mono">
      <h1 className="text-2xl font-bold mb-4">🧩 Tetris V2 Client</h1>

      <div className="space-x-4 mb-4">
        <button
          onClick={handleJoin}
          disabled={!connected}
          className="bg-green-600 text-white px-3 py-1 rounded"
        >
          Join Game
        </button>
        <button
          onClick={handlePlacePiece}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Place Piece
        </button>
        <button
          onClick={handleRematch}
          className="bg-purple-500 text-white px-3 py-1 rounded"
        >
          Rematch
        </button>
      </div>

      <div className="mb-4">
        <label>Piece Index: </label>
        <input
          type="number"
          value={currentIndex}
          onChange={(e) => setCurrentIndex(Number(e.target.value))}
          className="border px-1 w-12 mr-2"
        />
        <label>X: </label>
        <input
          type="number"
          value={x}
          onChange={(e) => setX(Number(e.target.value))}
          className="border px-1 w-12 mr-2"
        />
        <label>Y: </label>
        <input
          type="number"
          value={y}
          onChange={(e) => setY(Number(e.target.value))}
          className="border px-1 w-12 mr-2"
        />
      </div>

      <div className="border p-2 bg-gray-100">
        <h2 className="text-lg font-semibold">🧍 Players</h2>
        {Object.entries(players).map(([id, p]) => (
          <div key={id} className="p-1 border-b">
            <strong>{p.name}</strong> | Score: {p.score} | Pieces:{" "}
            {p.currentPiecesCount} | {p.gameOver ? "💀" : "🎮"}
          </div>
        ))}
      </div>

      <div className="mt-4">
        <h2 className="text-lg font-semibold">📢 Messages</h2>
        <ul className="text-sm list-disc pl-5">
          {messages.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
