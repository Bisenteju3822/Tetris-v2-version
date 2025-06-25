import React from "react";
import Piece from "./pieace";

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 10;
const CELL_SIZE = 30;

const GameBoard = ({
  gameState,
  playerSessionId,
  onPlacePiece,
  selectedPieceIndex,
  onSelectPiece,
  onRotatePiece,
}) => {
  if (!gameState || !playerSessionId) return null;

  const player = gameState.players[playerSessionId];
  if (!player || !player.board) return null;

  const handleBoardClick = (e) => {
    if (gameState.gameStatus !== "in-progress") return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);

    onPlacePiece(x, y);
  };

  // Safely get current pieces or empty array
  const currentPieces = player.currentPieces || [];

  return (
    <div className="game-area">
      <div className="game-board" onClick={handleBoardClick}>
        {Array(BOARD_HEIGHT)
          .fill()
          .map((_, y) => (
            <div key={`row-${y}`} className="board-row">
              {Array(BOARD_WIDTH)
                .fill()
                .map((_, x) => (
                  <div
                    key={`cell-${x}-${y}`}
                    className={`cell ${
                      player.board[y * BOARD_WIDTH + x] ? "filled" : ""
                    }`}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                    }}
                  />
                ))}
            </div>
          ))}
      </div>

      <div className="pieces-panel">
        <h3>Your Pieces</h3>
        <div className="pieces-container">
          {currentPieces.map((piece, index) => (
            <div
              key={`piece-${index}`}
              className={`piece-wrapper ${
                selectedPieceIndex === index ? "selected" : ""
              }`}
              onClick={() => onSelectPiece(index)}
            >
              {/* Add null check for piece */}
              {piece ? (
                <Piece piece={piece} />
              ) : (
                <div className="empty-piece">Empty</div>
              )}
            </div>
          ))}
        </div>
        <button
          className="rotate-button"
          onClick={onRotatePiece}
          disabled={gameState.gameStatus !== "in-progress"}
        >
          Rotate (R)
        </button>
      </div>
    </div>
  );
};

export default GameBoard;
