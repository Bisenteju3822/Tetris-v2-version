// import { Schema, type, ArraySchema ,MapSchema} from "@colyseus/schema";
// import { Room, Client } from "colyseus";

// // Schema Definitions
// export class PieceRow extends Schema {
//     @type(["number"])
//     cells = new ArraySchema<number>();
// }

// export class Piece extends Schema {
//     @type([PieceRow])
//     rows = new ArraySchema<PieceRow>();
// }

// export class Player extends Schema {
//     @type("string") id: string;
//     @type("string") name: string;
//     @type("number") score: number = 0;
//     @type(["number"]) board = new ArraySchema<number>(); // 1D 10x10 grid
//     @type([Piece])
//     currentPieces = new ArraySchema<Piece>();
//     @type("boolean") gameOver: boolean = false;
// }

// export class TetrisV2State extends Schema {
//     @type("string") gameStatus: "waiting" | "in-progress" | "finished" = "waiting";
//     @type("string") winner: string = "";
//     @type({ map: Player }) players = new MapSchema<Player>();
// }

// // Board dimensions constants
// const BOARD_WIDTH = 10;
// const BOARD_HEIGHT = 10;

// // Block Blast-style pieces (various shapes)
// // All possible piece shapes with their rotations
// const PIECE_SHAPES = [
//   // Single block (only one orientation)
//   { name: 'single', rotations: [[[1]]] },

//   // 2-block pieces
//   { name: 'horizontal2', rotations: [[[1, 1]]] },
//   { name: 'vertical2', rotations: [[[1], [1]]] },

//   // 3-block pieces
//   { 
//     name: 'L-shape', 
//     rotations: [
//       [[1, 0], [1, 0], [1, 1]],  // Original L
//       [[1, 1, 1], [1, 0, 0]],     // Rotated 90°
//       [[1, 1], [0, 1], [0, 1]],   // Rotated 180°
//       [[0, 0, 1], [1, 1, 1]]      // Rotated 270°
//     ]
//   },
//   {
//     name: 'J-shape',
//     rotations: [
//       [[0, 1], [0, 1], [1, 1]],   // Original J
//       [[1, 0, 0], [1, 1, 1]],     // Rotated 90°
//       [[1, 1], [1, 0], [1, 0]],    // Rotated 180°
//       [[1, 1, 1], [0, 0, 1]]      // Rotated 270°
//     ]
//   },
//   {
//     name: 'T-shape',
//     rotations: [
//       [[1, 1, 1], [0, 1, 0]],     // Original T
//       [[0, 1], [1, 1], [0, 1]],    // Rotated 90°
//       [[0, 1, 0], [1, 1, 1]],      // Rotated 180°
//       [[1, 0], [1, 1], [1, 0]]     // Rotated 270°
//     ]
//   },
//   // Square (only one orientation)
//   { name: 'square', rotations: [[[1, 1], [1, 1]]] },

//   // Line pieces
//   { name: 'horizontal4', rotations: [[[1, 1, 1, 1]]] },
//   { name: 'vertical4', rotations: [[[1], [1], [1], [1]]] },

//   // Z and S shapes
//   {
//     name: 'Z-shape',
//     rotations: [
//       [[1, 1, 0], [0, 1, 1]],     // Original Z
//       [[0, 1], [1, 1], [1, 0]]     // Rotated 90°
//     ]
//   },
//   {
//     name: 'S-shape',
//     rotations: [
//       [[0, 1, 1], [1, 1, 0]],      // Original S
//       [[1, 0], [1, 1], [0, 1]]     // Rotated 90°
//     ]
//   }
// ];

// // Flatten all rotations into one big pool of possible pieces
// const ALL_POSSIBLE_PIECES = PIECE_SHAPES.flatMap(shape => shape.rotations);

// export class TetrisV2Room extends Room<TetrisV2State> {
//     maxClients = 4;
//     private matchDuration = 3 * 60 * 1000; // 3 minutes in ms

//     onCreate() {
//         this.setState(new TetrisV2State());
//         this.state.gameStatus = "waiting";

//         this.onMessage("place_piece", (client, message) => {
//             this.handlePlacePiece(client, message.index, message.x, message.y);
//         });
//     }

//     onJoin(client: Client, options: any) {
//         const player = new Player();
//         player.id = client.sessionId;
//         player.name = options.name;
//         player.board = new ArraySchema<number>(...Array(BOARD_WIDTH * BOARD_HEIGHT).fill(0));
//         player.currentPieces.push(...this.generateRandomPieces());
        
//         this.state.players.set(client.sessionId, player);

//         if (this.state.players.size >= 2 && this.state.gameStatus === "waiting") {
//             this.startGame();
//         }
//     }

//     onLeave(client: Client) {
//         const player = this.state.players.get(client.sessionId);
//         if (player) {
//             player.gameOver = true;
//             this.checkWinCondition();
//         }
//     }

//     private startGame() {
//         this.state.gameStatus = "in-progress";
//         setTimeout(() => this.endMatch(), this.matchDuration);
//     }

//     private generateRandomPieces(): Piece[] {
//         return Array.from({ length: 3 }, () => {
//             const rawPiece = ALL_POSSIBLE_PIECES[Math.floor(Math.random() * ALL_POSSIBLE_PIECES.length)];
//             const piece = new Piece();
            
//             for (const row of rawPiece) {
//                 const pieceRow = new PieceRow();
//                 pieceRow.cells = new ArraySchema<number>(...row);
//                 piece.rows.push(pieceRow);
//             }
            
//             return piece;
//         });
//     }

//     private handlePlacePiece(client: Client, pieceIndex: number, x: number, y: number) {
//         const player = this.state.players.get(client.sessionId);
//         if (!player || player.gameOver) return;

//         if (pieceIndex < 0 || pieceIndex >= player.currentPieces.length) {
//             return;
//         }

//         const piece = player.currentPieces[pieceIndex];
//         if (!this.canPlacePiece(Array.from(player.board), piece, x, y)) {
//             return;
//         }

//         // Calculate points from placed blocks (10 points per block)
//         const blocksPlaced = this.countBlocksInPiece(piece);
//         player.score += blocksPlaced * 10;

//         this.placePiece(player.board, piece, x, y);
        
//         // Calculate line clear bonus (100 points per line)
//         const linesCleared = this.clearLines(player.board);
//         player.score += linesCleared * 100;

//         player.currentPieces.splice(pieceIndex, 1);

//         if (player.currentPieces.length === 0) {
//             player.currentPieces.push(...this.generateRandomPieces());
            
//             if (this.isGameOver(Array.from(player.board), [...player.currentPieces])) {
//                 player.gameOver = true;
//                 this.checkWinCondition();
//             }
//         }
//     }

//     private countBlocksInPiece(piece: Piece): number {
//         let count = 0;
//         for (const row of piece.rows) {
//             for (const cell of row.cells) {
//                 if (cell === 1) count++;
//             }
//         }
//         return count;
//     }

//     private canPlacePiece(board: number[], piece: Piece, x: number, y: number): boolean {
//         for (let py = 0; py < piece.rows.length; py++) {
//             const row = piece.rows[py].cells;
//             for (let px = 0; px < row.length; px++) {
//                 if (row[px] === 1) {
//                     const boardX = x + px;
//                     const boardY = y + py;

//                     if (boardX < 0 || boardX >= BOARD_WIDTH || boardY < 0 || boardY >= BOARD_HEIGHT) {
//                         return false;
//                     }

//                     if (board[boardY * BOARD_WIDTH + boardX] !== 0) {
//                         return false;
//                     }
//                 }
//             }
//         }
//         return true;
//     }

//     private placePiece(board: ArraySchema<number>, piece: Piece, x: number, y: number) {
//         for (let py = 0; py < piece.rows.length; py++) {
//             const row = piece.rows[py].cells;
//             for (let px = 0; px < row.length; px++) {
//                 if (row[px] === 1) {
//                     const boardX = x + px;
//                     const boardY = y + py;
//                     board[boardY * BOARD_WIDTH + boardX] = 1;
//                 }
//             }
//         }
//     }

//     private clearLines(board: ArraySchema<number>): number {
//         let linesCleared = 0;
//         let newBoard = Array(BOARD_WIDTH * BOARD_HEIGHT).fill(0);

//         // Clear full rows
//         let newRow = BOARD_HEIGHT - 1;
//         for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
//             let isFull = true;
//             for (let x = 0; x < BOARD_WIDTH; x++) {
//                 if (board[y * BOARD_WIDTH + x] === 0) {
//                     isFull = false;
//                     break;
//                 }
//             }

//             if (!isFull) {
//                 for (let x = 0; x < BOARD_WIDTH; x++) {
//                     newBoard[newRow * BOARD_WIDTH + x] = board[y * BOARD_WIDTH + x];
//                 }
//                 newRow--;
//             } else {
//                 linesCleared++;
//             }
//         }

//         // Copy newBoard back to board
//         for (let i = 0; i < newBoard.length; i++) {
//             board[i] = newBoard[i];
//         }

//         return linesCleared;
//     }

//     private isGameOver(board: number[], currentPieces: Piece[]): boolean {
//         return !currentPieces.some(piece => {
//             for (let y = 0; y < BOARD_HEIGHT; y++) {
//                 for (let x = 0; x < BOARD_WIDTH; x++) {
//                     if (this.canPlacePiece(board, piece, x, y)) {
//                         return true;
//                     }
//                 }
//             }
//             return false;
//         });
//     }

//     private endMatch() {
//         const sortedPlayers = [...this.state.players.values()].sort((a, b) => b.score - a.score);
//         this.state.winner = sortedPlayers[0]?.id || "";
//         this.state.gameStatus = "finished";
//     }

//     private checkWinCondition() {
//         const alivePlayers = Array.from(this.state.players.values()).filter(p => !p.gameOver);
//         if (alivePlayers.length <= 1) {
//             this.endMatch();
//         }
//     }
// }