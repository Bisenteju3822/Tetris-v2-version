import React from "react";

const GameOverScreen = ({ winner, players, onRematch, onExit }) => {
  const winnerPlayer = winner ? players[winner] : null;
  const sortedPlayers = Object.values(players).sort(
    (a, b) => b.score - a.score
  );

  return (
    <div className="game-over-screen">
      <div className="game-over-container">
        <h1>Game Over</h1>

        {winnerPlayer ? (
          <div className="winner-message">
            <h2>Winner: {winnerPlayer.name}</h2>
            <div className="winner-score">Score: {winnerPlayer.score}</div>
          </div>
        ) : (
          <div className="winner-message">
            <h2>No Winner</h2>
          </div>
        )}

        <div className="leaderboard">
          <h3>Leaderboard</h3>
          <ul>
            {sortedPlayers.map((player, index) => (
              <li
                key={player.sessionId}
                className={winner === player.sessionId ? "winner" : ""}
              >
                <span className="rank">{index + 1}.</span>
                <span className="name">{player.name}</span>
                <span className="score">{player.score} pts</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="action-buttons">
          <button onClick={onRematch} className="rematch-button">
            Rematch
          </button>
          <button onClick={onExit} className="exit-button">
            Exit
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;
