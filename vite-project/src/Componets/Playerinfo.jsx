import React from "react";

const PlayerInfo = ({ player, gameState, currentPlayer }) => {
  if (!player || !gameState) return null;

  return (
    <div className="player-info">
      <div className="player-header">
        <h2>{player.name}</h2>
        <div className="player-score">Score: {currentPlayer?.score || 0}</div>
      </div>

      <div className="game-status">
        {gameState.gameStatus === "waiting" && (
          <div className="waiting-message">Waiting for players...</div>
        )}
        {gameState.gameStatus === "in-progress" && (
          <div className="in-progress-message">Game in progress!</div>
        )}
      </div>

      {currentPlayer?.gameOver && (
        <div className="game-over-banner">GAME OVER</div>
      )}
    </div>
  );
};

export default PlayerInfo;
