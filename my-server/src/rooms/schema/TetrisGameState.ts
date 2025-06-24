import { Schema, type, ArraySchema,MapSchema } from "@colyseus/schema";

export class PieceRow extends Schema {
  @type(["number"])
  cells = new ArraySchema<number>();
}

export class Piece extends Schema {
  @type([PieceRow])
  rows = new ArraySchema<PieceRow>();
}

export class Player extends Schema {
  @type("string") id: string;
  @type("string") name: string;
  @type("string") uniqueId: string;
  @type("number") score: number = 0;
  @type(["number"]) board = new ArraySchema<number>(); // 1D 10x10 grid
  @type([Piece])
  currentPieces = new ArraySchema<Piece>();
  @type("boolean") gameOver: boolean = false;
}

export class TetrisV2State extends Schema {
  @type("string") gameStatus: "waiting" | "in-progress" | "finished" = "waiting";
  @type("string") winner: string = "";
  @type("number") playerCount: number;
  @type("number") minPlayer: number;
  @type("number") betAmount: number;
  @type("number") winAmount: number;
  @type("string") matchOptionId: string;
  @type("number") countdown: number = 0;
  @type("boolean") everyoneJoined: boolean = false;
  @type({ map: Player }) players = new MapSchema<Player>();
}