import React, { useState } from "react";

function Controls({ send }) {
  const [index, setIndex] = useState(0);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  return (
    <div className="bg-gray-800 p-4 rounded mb-4">
      <h2 className="font-bold mb-2">Controls</h2>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          placeholder="Piece index"
          className="p-2 rounded bg-gray-700 w-24"
        />
        <input
          type="number"
          value={x}
          onChange={(e) => setX(Number(e.target.value))}
          placeholder="X"
          className="p-2 rounded bg-gray-700 w-16"
        />
        <input
          type="number"
          value={y}
          onChange={(e) => setY(Number(e.target.value))}
          placeholder="Y"
          className="p-2 rounded bg-gray-700 w-16"
        />
        <button
          onClick={() => send("place_piece", { index, x, y })}
          className="bg-green-600 px-3 py-2 rounded hover:bg-green-700"
        >
          Place
        </button>
        <button
          onClick={() => send("rematch_request")}
          className="bg-yellow-600 px-3 py-2 rounded hover:bg-yellow-700"
        >
          Rematch
        </button>
        <button
          onClick={() => send("exit")}
          className="bg-red-600 px-3 py-2 rounded hover:bg-red-700"
        >
          Exit
        </button>
      </div>
    </div>
  );
}

export default Controls;
