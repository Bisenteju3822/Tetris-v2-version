import React from "react";

const Piece = ({ piece }) => {
  if (!piece || !piece.rows || piece.rows.length === 0) {
    return <div className="empty-piece">No piece</div>;
  }

  return (
    <div className="piece">
      {piece.rows.map((row, y) => (
        <div key={`piece-row-${y}`} className="piece-row">
          {/* Add check for row.cells */}
          {(row?.cells || []).map((cell, x) => (
            <div
              key={`piece-cell-${x}-${y}`}
              className={`piece-cell ${cell ? "active" : ""}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default Piece;
