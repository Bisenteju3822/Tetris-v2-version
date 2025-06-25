import React, { useState } from "react";

const Lobby = ({ onJoin, error }) => {
  const [name, setName] = useState("");
  const [uniqueId, setUniqueId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onJoin(name, uniqueId || `player-${Date.now()}`);
  };

  return (
    <div className="lobby">
      <div className="lobby-container">
        <h1>Block Blast Tetris</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Player Name:</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="uniqueId">Unique ID (optional):</label>
            <input
              id="uniqueId"
              type="text"
              value={uniqueId}
              onChange={(e) => setUniqueId(e.target.value)}
              placeholder="Leave blank for random ID"
            />
          </div>

          <button type="submit" className="join-button">
            Join Game
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
};

export default Lobby;
