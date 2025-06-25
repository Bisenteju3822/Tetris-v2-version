import React, { useState, useEffect, useRef } from "react";
import GameBoard from "./Componets/Gameboard";
import PlayerInfo from "./Componets/Playerinfo";
import Lobby from "./Componets/lobby";
import GameOverScreen from "./Componets/GameScore";
import "./css/tetris.css"; // Assuming you have a CSS file for styles

const App = () => {
  const [gameState, setGameState] = useState(null);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [error, setError] = useState(null);
  const [selectedPieceIndex, setSelectedPieceIndex] = useState(0);
  const socketRef = useRef(null);

  // Connect to WebSocket server
  const connectToServer = (name, uniqueId) => {
    const ws = new WebSocket("ws://localhost:8000");
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to WebSocket server");
      setSocket(ws);
      ws.send(
        JSON.stringify({
          type: "join",
          data: { name, uniqueId },
        })
      );
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Received message:", message);

      switch (message.type) {
        case "joined":
          setRoomId(message.data.roomId);
          setPlayerInfo({
            sessionId: message.data.sessionId,
            name,
            uniqueId,
          });
          break;

        case "state":
          setGameState(message.data);
          break;

        case "error":
          setError(message.data);
          break;

        case "gameOver":
          setGameState((prev) => ({
            ...prev,
            gameStatus: "finished",
            winner: message.data.playerId,
          }));
          break;

        case "matchEnded":
          setGameState((prev) => ({
            ...prev,
            gameStatus: "finished",
            winner: message.data.winnerId,
          }));
          break;

        default:
          console.log("Unhandled message type:", message.type);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setError("Connection error");
    };

    ws.onclose = () => {
      console.log("Disconnected from WebSocket server");
      setSocket(null);
    };
  };

  // Handle piece placement
  const placePiece = (x, y) => {
    if (
      !socketRef.current ||
      !gameState ||
      gameState.gameStatus !== "in-progress"
    )
      return;

    socketRef.current.send(
      JSON.stringify({
        type: "place_piece",
        data: { index: selectedPieceIndex, x, y },
      })
    );
  };

  // Handle piece rotation
  const rotatePiece = () => {
    if (!socketRef.current) return;
    socketRef.current.send(
      JSON.stringify({
        type: "rotate_piece",
        data: { index: selectedPieceIndex },
      })
    );
  };

  // Handle rematch request
  const requestRematch = () => {
    if (!socketRef.current) return;
    socketRef.current.send(
      JSON.stringify({
        type: "rematch_request",
      })
    );
  };

  // Handle exit
  const exitGame = () => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: "exit" }));
      socketRef.current.close();
    }
    setGameState(null);
    setPlayerInfo(null);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "r" || e.key === "R") {
        rotatePiece();
      }
      // Number keys 1-3 to select pieces
      if (e.key >= "1" && e.key <= "3") {
        const index = parseInt(e.key) - 1;
        setSelectedPieceIndex(index);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!playerInfo) {
    return <Lobby onJoin={connectToServer} error={error} />;
  }

  if (gameState?.gameStatus === "finished") {
    return (
      <GameOverScreen
        winner={gameState.winner}
        players={gameState.players}
        onRematch={requestRematch}
        onExit={exitGame}
      />
    );
  }

  return (
    <div className="app">
      <div className="game-container">
        <PlayerInfo
          player={playerInfo}
          gameState={gameState}
          currentPlayer={gameState?.players[playerInfo.sessionId]}
        />

        <GameBoard
          gameState={gameState}
          playerSessionId={playerInfo.sessionId}
          onPlacePiece={placePiece}
          selectedPieceIndex={selectedPieceIndex}
          onSelectPiece={setSelectedPieceIndex}
          onRotatePiece={rotatePiece}
        />
      </div>
    </div>
  );
};

export default App;
