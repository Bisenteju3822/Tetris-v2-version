// import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";
// import { Room, Client } from "colyseus";
// import { v4 as uuidv4 } from "uuid";
// import KafkaWalletService from "../kafka/walletKafka";
// import MatchOption from "../models/MatchOption.model";
// import mongoose from "mongoose";

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
//     @type("string") uniqueId: string;
//     @type("number") score: number = 0;
//     @type(["number"]) board = new ArraySchema<number>(); // 1D 10x10 grid
//     @type([Piece])
//     currentPieces = new ArraySchema<Piece>();
//     @type("boolean") gameOver: boolean = false;
// }

// export class TetrisV2State extends Schema {
//     @type("string") gameStatus: "waiting" | "in-progress" | "finished" = "waiting";
//     @type("string") winner: string = "";
//     @type("number") playerCount: number;
//     @type("number") minPlayer: number;
//     @type("number") betAmount: number;
//     @type("number") winAmount: number;
//     @type("string") matchOptionId: string;
//     @type("number") countdown: number = 0;
//     @type("boolean") everyoneJoined: boolean = false;
//     @type({ map: Player }) players = new MapSchema<Player>();
// }

// // Board dimensions constants
// const BOARD_WIDTH = 10;
// const BOARD_HEIGHT = 10;

// // Block Blast-style pieces (various shapes)
// const BLOCK_PIECES = [
//     [[1]],                           // Single block
//     [[1, 1]],                         // 2-block horizontal
//     [[1], [1]],                       // 2-block vertical
//     [[1, 1, 1]],                       // 3-block horizontal
//     [[1], [1], [1]],                   // 3-block vertical
//     [[1, 1], [1, 1]],                   // 2x2 square
//     [[1, 1, 1, 1]],                     // 4-block horizontal
//     [[1], [1], [1], [1]],               // 4-block vertical
//     [[1, 1, 0], [0, 1, 1]],             // Z-shape
//     [[0, 1, 1], [1, 1, 0]],             // S-shape
//     [[1, 1, 1], [0, 1, 0]],             // T-shape
//     [[1, 0], [1, 1], [1, 0]],           // + shape
//     [[1, 1, 1, 1, 1]],                 // 5-block horizontal
//     [[1], [1], [1], [1], [1]],         // 5-block vertical
//     [[1, 1, 1], [1, 0, 0], [1, 0, 0]],  // L-shape
//     [[1, 1, 1], [0, 0, 1], [0, 0, 1]],  // J-shape
// ];

// export class TetrisV2Room extends Room<TetrisV2State> {
//     maxClients = 4;
//     autoDispose = false;

//     private matchDuration = 3 * 60 * 1000; // 3 minutes in ms
//     private matchTimer: NodeJS.Timeout | null = null;
//     private countdownInterval: NodeJS.Timeout | null = null;
//     private inactivityTimer: NodeJS.Timeout | null = null;

//     private timeLeft: number = this.matchDuration / 1000;

//     private rematchVotes: Set<string> = new Set();

//     private betAmount: number = 0;
//     private winAmount: number = 0;

//     private minPlayer: number = 2;
//     private playerCount: number = 4;

//     private isPrivate: boolean = false;
//     private allowedUserIds: string[] = [];

//     async onAuth(client: Client, options: any): Promise<any> {
//         console.log(`[onAuth] UserId: ${options.userId}, UniqueId: ${options.uniqueId}`);

//         const userId = options.userId;
//         const uniqueId = options.uniqueId;
//         this.isPrivate = this.metadata?.isPrivate || false;
//         this.allowedUserIds = this.metadata?.allowedUserIds || [];
//         const useBonus = options.useBonus;

//         if (this.isPrivate && !this.allowedUserIds.includes(userId)) {
//             console.log(`[onAuth] Access denied for userId ${userId} in private room.`);
//             throw new Error("You are not allowed to join this private room.");
//         }

//         const existingPlayer = Array.from(this.state.players.values()).find(
//             (p) => p.uniqueId === uniqueId
//         );

//         if (existingPlayer) {
//             (client as any).isReconnecting = true;
//             (client as any).reconnectUniqueId = uniqueId;
//             console.log(`[onAuth] Player reconnecting with uniqueId ${uniqueId}`);
//             return true;
//         }

//         const isGameInProgress = this.state.gameStatus === "in-progress";
//         if ((this.state.everyoneJoined || isGameInProgress) && !existingPlayer) {
//             console.log(`[onAuth] Room full or game in progress. Rejecting userId ${userId}`);
//             throw new Error("Room is full or game already in progress.");
//         }

//         try {
//             const roomId = this.roomId;
//             const walletResponse = await KafkaWalletService.sendWalletRequestAndWait(
//                 uniqueId,
//                 Number(this.betAmount),
//                 useBonus,
//                 roomId
//             );
//             if (!walletResponse.success) {
//                 console.log(`[onAuth] Wallet deduction failed for uniqueId ${uniqueId}: ${walletResponse.message}`);
//                 throw new Error(walletResponse.message || "Wallet deduction failed.");
//             }
//             console.log(`[onAuth] Wallet deduction successful for uniqueId ${uniqueId}`);
//         } catch (err) {
//             console.error(`[onAuth] Wallet Error:`, err);
//             throw new Error("Unable to join: Wallet validation failed.");
//         }

//         return true;
//     }

//     async onCreate(options: any) {
//         console.log("[onCreate] Room creating with options:", options);

//         try {
//             if (!options.matchOptionId || !mongoose.Types.ObjectId.isValid(options.matchOptionId)) {
//                 throw new Error(`Invalid matchOptionId provided: ${options.matchOptionId}`);
//             }

//             const matchOptionId = new mongoose.Types.ObjectId(options.matchOptionId);
//             const matchOption = await MatchOption.findById(matchOptionId);

//             if (!matchOption) {
//                 console.error(`[onCreate] MatchOption not found for ID: ${matchOptionId}`);
//                 throw new Error("MatchOption not found");
//             }

//             const { numberOfPlayers, winningAmount, bettingAmount, minimumPlayers } = matchOption;

//             this.playerCount = numberOfPlayers;
//             this.minPlayer = minimumPlayers;
//             this.betAmount = bettingAmount;
//             this.winAmount = winningAmount;

//             this.setMetadata({
//                 playerCount: numberOfPlayers,
//                 isPrivate: options.isPrivate || false,
//                 allowedUserIds: options.allowedUserIds || [],
//             });

//             this.isPrivate = options.isPrivate || false;
//             this.allowedUserIds = options.allowedUserIds || [];

//             this.setState(new TetrisV2State());
//             this.state.gameStatus = "waiting";
//             this.state.playerCount = numberOfPlayers;
//             this.state.betAmount = bettingAmount;
//             this.state.winAmount = winningAmount;
//             this.state.matchOptionId = matchOptionId.toHexString();
//             this.state.minPlayer = minimumPlayers;
//             this.maxClients = numberOfPlayers;

//             // Register messages
//             this.onMessage("place_piece", (client, message) => {
//                 try {
//                     const index = message?.data?.index ?? message?.index;
//                     const x = message?.data?.x ?? message?.x;
//                     const y = message?.data?.y ?? message?.y;

//                     if (index === undefined || x === undefined || y === undefined) {
//                         console.error("Invalid piece placement data:", message);
//                         client.send("error", { message: "Invalid piece placement data." });
//                         return;
//                     }

//                     console.log(`[place_piece] Client ${client.sessionId} placing piece ${index} at (${x},${y})`);
//                     this.handlePlacePiece(client, index, x, y);
//                 } catch (error) {
//                     console.error("Error handling place_piece:", error);
//                     client.send("error", { message: "Error processing your move." });
//                 }
//             });

//             this.onMessage("rematch_request", (client) => {
//                 console.log(`[rematch_request] Client ${client.sessionId} requested rematch`);
//                 this.rematchVotes.add(client.sessionId);
//                 if (this.rematchVotes.size === this.state.players.size) {
//                     console.log("[rematch_request] All players voted, resetting game");
//                     this.resetGame();
//                 }
//             });

//         } catch (err: any) {
//             console.error("[onCreate] Error during room creation:", err.message);
//             throw new Error(err.message || "Failed to create room");
//         }
//     }

//     onJoin(client: Client, options: any) {
//         const uniqueId = options.uniqueId;
//         const playerName = options.name;

//         // Reconnection logic
//         if ((client as any).isReconnecting && (client as any).reconnectUniqueId) {
//             const reconnectingId = (client as any).reconnectUniqueId;
//             const oldPlayerEntry = Array.from(this.state.players.entries()).find(
//                 ([_, player]) => player.uniqueId === reconnectingId
//             );

//             if (oldPlayerEntry) {
//                 const [oldSessionId, oldPlayer] = oldPlayerEntry;
//                 this.state.players.delete(oldSessionId);
//                 this.state.players.set(client.sessionId, oldPlayer);

//                 console.log(`✅ Player reconnected: ${oldPlayer.name} (uniqueId: ${oldPlayer.uniqueId})`);
//                 return;
//             }
//         }

//         console.log(`🆕 New client connected: ${playerName} (uniqueId: ${uniqueId})`);

//         // Add new player if not already present
//         if (!this.state.players.has(client.sessionId)) {
//             const player = new Player();
//             player.id = client.sessionId;
//             player.uniqueId = uniqueId;
//             player.name = playerName;
//             player.board = new ArraySchema<number>(...Array(BOARD_WIDTH * BOARD_HEIGHT).fill(0));
//             player.score = 0;
//             player.currentPieces = new ArraySchema<Piece>();
//             player.currentPieces.push(...this.generateRandomPieces());
//             player.gameOver = false;

//             this.state.players.set(client.sessionId, player);
//             console.log(`[onJoin] Player added: ${player.name} (${player.uniqueId})`);
//         }

//         // Start match when minimum players join
//         if (!this.state.everyoneJoined && this.state.players.size >= this.minPlayer) {
//             this.state.everyoneJoined = true;
//             console.log("[onJoin] Enough players joined. Starting 3-second countdown...");

//             let countdown = 3;
//             this.state.countdown = countdown;

//             this.countdownInterval = setInterval(() => {
//                 countdown -= 1;
//                 this.state.countdown = countdown;

//                 if (countdown <= 0) {
//                     if (this.countdownInterval) clearInterval(this.countdownInterval);
//                     this.countdownInterval = null;

//                     this.state.gameStatus = "in-progress";
//                     console.log("[Countdown] Match starting now!");

//                     const users = Array.from(this.state.players.values()).map(p => p.uniqueId);
//                     KafkaWalletService.sendGameStartRequest(users, this.betAmount, this.state.matchOptionId, this.roomId);
//                     this.startMatch();
//                 }
//             }, 1000);
//         }

//         this.broadcastState();
//     }

//     onLeave(client: Client, consented: boolean) {
//         console.log(`[onLeave] Client ${client.sessionId} leaving, consented: ${consented}`);

//         if (this.state.gameStatus === "finished") {
//             this.state.players.delete(client.sessionId);
//             console.log(`[onLeave] Player removed after finished game: ${client.sessionId}`);
//             return;
//         }

//         const player = this.state.players.get(client.sessionId);
//         if (player) {
//             player.gameOver = true;
//             console.log(`[onLeave] Marked player ${player.name} gameOver=true`);
//             this.broadcast("info", { message: `${player.name} disconnected.` });
//         }

//         this.checkWinCondition();
//     }

//     onDispose() {
//         console.log(`[onDispose] Room ${this.roomId} disposed`);
//         this.clearTimers();
//     }

//     private startMatch() {
//         console.log("🚀 Match starting...");
//         this.broadcast("match-start");

//         this.timeLeft = this.matchDuration / 1000;

//         // Reset pieces for all players
//         this.state.players.forEach((player) => {
//             if (!player.gameOver) {
//                 player.currentPieces = new ArraySchema<Piece>();
//                 player.currentPieces.push(...this.generateRandomPieces());
//                 console.log(`[startMatch] Gave initial pieces to player ${player.name}`);
//             }
//         });

//         this.countdownInterval = setInterval(() => {
//             const minutes = Math.floor(this.timeLeft / 60);
//             const seconds = this.timeLeft % 60;
//             const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

//             this.broadcast("timer-tick", {
//                 timeLeft: this.timeLeft,
//                 formatted: formatted,
//             });

//             this.timeLeft--;

//             if (this.timeLeft < 0) {
//                 if (this.countdownInterval) clearInterval(this.countdownInterval);
//                 this.countdownInterval = null;
//                 console.log("[startMatch] Time's up! Ending match.");
//                 this.endMatch();
//             }
//         }, 1000);

//         this.matchTimer = setTimeout(() => this.endMatch(), this.matchDuration);
//         this.startInactivityTimer();
//     }

//     private generateRandomPieces(): Piece[] {
//         return Array.from({ length: 3 }, () => {
//             const rawPiece = BLOCK_PIECES[Math.floor(Math.random() * BLOCK_PIECES.length)];
//             const piece = new Piece();
            
//             for (const row of rawPiece) {
//                 const pieceRow = new PieceRow();
//                 pieceRow.cells = new ArraySchema<number>(...row);
//                 piece.rows.push(pieceRow);
//             }
            
//             return piece;
//         });
//     }

// private handlePlacePiece(client: Client, pieceIndex: number, x: number, y: number) {
//     const player = this.state.players.get(client.sessionId);
//     if (!player || player.gameOver) return;

//     if (pieceIndex < 0 || pieceIndex >= player.currentPieces.length) {
//         client.send("error", { message: "Invalid piece index." });
//         return;
//     }

//     const piece = player.currentPieces[pieceIndex];
//     if (!this.canPlacePiece(Array.from(player.board), piece, x, y)) {
//         client.send("error", { message: "Cannot place piece there." });
//         return;
//     }

//     // Calculate points from placed blocks (10 points per block)
//     const blocksPlaced = this.countBlocksInPiece(piece);
//     player.score += blocksPlaced * 10;

//     this.placePiece(player.board, piece, x, y);
    
//     // Calculate line clear bonus (100 points per line)
//     const linesCleared = this.clearLines(player.board);
//     player.score += linesCleared * 100;

//     player.currentPieces.splice(pieceIndex, 1);

//     if (player.currentPieces.length === 0) {
//         player.currentPieces.push(...this.generateRandomPieces());
        
//         if (this.isGameOver(Array.from(player.board), [...player.currentPieces])) {
//             player.gameOver = true;
//             this.broadcast("game-over", { playerId: client.sessionId });
//             this.checkWinCondition();
//         }
//     }

//     this.startInactivityTimer();
//     this.broadcastState();
// }

// // Helper method to count blocks in a piece
// private countBlocksInPiece(piece: Piece): number {
//     let count = 0;
//     for (const row of piece.rows) {
//         for (const cell of row.cells) {
//             if (cell === 1) count++;
//         }
//     }
//     return count;
// }

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

//         // Clear full columns
//         let newCol = BOARD_WIDTH - 1;
//         for (let x = BOARD_WIDTH - 1; x >= 0; x--) {
//             let isFull = true;
//             for (let y = 0; y < BOARD_HEIGHT; y++) {
//                 if (board[y * BOARD_WIDTH + x] === 0) {
//                     isFull = false;
//                     break;
//                 }
//             }

//             if (!isFull) {
//                 for (let y = 0; y < BOARD_HEIGHT; y++) {
//                     newBoard[y * BOARD_WIDTH + newCol] = board[y * BOARD_WIDTH + x];
//                 }
//                 newCol--;
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
//         console.log("Match ended.");
//         this.clearTimers();

//         const meaningfulPlayers = [...this.state.players.values()].filter(
//             p => p.score > 0
//         );

//         if (meaningfulPlayers.length === 0) {
//             console.log("⚠ No meaningful gameplay — no winner.");
//             this.broadcast("match-ended", { winnerId: null, reason: "no-action" });
//             this.disconnect();
//             return;
//         }

//         const sortedPlayers = [...meaningfulPlayers].sort((a, b) => b.score - a.score);
//         const winner = sortedPlayers[0];
//         this.state.gameStatus = "finished";
//         this.state.winner = winner?.id || "";

//         console.log(`[endMatch] Winner: ${winner?.name} (score: ${winner?.score})`);

//         this.broadcast("match-ended", {
//             winnerId: winner?.id,
//             score: winner?.score,
//             leaderboard: sortedPlayers.map(p => ({
//                 id: p.id,
//                 name: p.name,
//                 score: p.score
//             }))
//         });

//         if (winner?.uniqueId) {
//             const users = Array.from(this.state.players.values()).map(player => player.uniqueId);
//             KafkaWalletService.sendGameEndRequest(
//                 users,
//                 winner.uniqueId,
//                 "68219aec39a3ab04b1b5f8ab",
//                 this.roomId,
//                 this.winAmount
//             );
//             console.log("[endMatch] Game end request sent to KafkaWalletService");
//         }

//         this.clock.setTimeout(() => this.disconnect(), 10000);
//     }

//     private checkWinCondition() {
//         const alivePlayers = Array.from(this.state.players.values()).filter(p => !p.gameOver);
//         console.log(`[checkWinCondition] Alive players: ${alivePlayers.length}`);

//         if (alivePlayers.length <= 1) {
//             console.log("[checkWinCondition] Win condition met, ending match");
//             this.endMatch();
//         }
//     }

//     private startInactivityTimer() {
//         if (this.inactivityTimer) clearTimeout(this.inactivityTimer);

//         this.inactivityTimer = setTimeout(() => {
//             console.log("[startInactivityTimer] Inactivity timeout. Ending match.");
//             this.endMatch();
//         }, 60000); // 1 minute inactivity timeout
//     }

//     private clearTimers() {
//         if (this.matchTimer) {
//             clearTimeout(this.matchTimer);
//             this.matchTimer = null;
//         }
//         if (this.countdownInterval) {
//             clearInterval(this.countdownInterval);
//             this.countdownInterval = null;
//         }
//         if (this.inactivityTimer) {
//             clearTimeout(this.inactivityTimer);
//             this.inactivityTimer = null;
//         }
//     }

//     private resetGame() {
//         console.log("[resetGame] Resetting game state for rematch");
//         this.state.gameStatus = "waiting";
//         this.state.countdown = 3;
//         this.state.everyoneJoined = false;
//         this.rematchVotes.clear();

//         this.state.players.forEach(player => {
//             player.board = new ArraySchema<number>(...Array(BOARD_WIDTH * BOARD_HEIGHT).fill(0));
//             player.score = 0;
//             player.gameOver = false;
//             player.currentPieces = new ArraySchema<Piece>();
//             player.currentPieces.push(...this.generateRandomPieces());
//         });

//         this.broadcastState();
//     }

//     private broadcastState() {
//         this.broadcast("state", this.state);
//     }
// }
// When a player places a Tetris piece at a position (x, y) on the game board, the backend needs to:

// Understand the shape of the piece.

// Calculate how many individual blocks (or cells) are filled within that piece.

// Award score based on the number of filled blocks.