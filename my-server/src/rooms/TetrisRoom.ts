import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";
import { Room, Client } from "colyseus";

// ==================== SCHEMA DEFINITIONS ====================
export class SimplePiece extends Schema {
    @type(["number"]) shape = new ArraySchema<number>();
    @type("number") shapeId: number;
    protected _size: number;

    constructor(shape: number[] = [], shapeId: number = 0, size?: number) {
        super();
        this.shapeId = shapeId;
        shape.forEach(val => this.shape.push(val));
        this._size = size || Math.sqrt(shape.length);
    }

    validateCoordinates(sentCoords: [number, number][]): boolean {
        const expectedBlockCount = this.shape.filter(v => v !== 0).length;
        if (sentCoords.length !== expectedBlockCount) return false;

        const minX = Math.min(...sentCoords.map(c => c[0]));
        const minY = Math.min(...sentCoords.map(c => c[1]));

        // Reconstruct expected coordinates
        const expectedCoords: [number, number][] = [];
        for (let y = 0; y < this._size; y++) {
            for (let x = 0; x < this._size; x++) {
                const idx = y * this._size + x;
                if (this.shape[idx] !== 0) {
                    expectedCoords.push([minX + x, minY + y]);
                }
            }
        }

        // Compare coordinate sets
        return JSON.stringify(sentCoords.sort()) === JSON.stringify(expectedCoords.sort());
    }
}

export class Player extends Schema {
    @type("string") id: string;
    @type("string") name: string;
    @type("number") score: number = 0;
    @type(["number"]) board = new ArraySchema<number>();
    @type([SimplePiece]) currentPieces = new ArraySchema<SimplePiece>();
    @type("boolean") gameOver: boolean = false;
}

export class TetrisState extends Schema {
    @type("string") gameStatus: "waiting" | "starting" | "in-progress" | "finished" = "waiting";
    @type("string") winner: string = "";
    @type("number") countdown: number = 3;
    @type({ map: Player }) players = new MapSchema<Player>();
}

// ==================== GAME CONSTANTS ====================
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 10;
const ALL_POSSIBLE_PIECES = [
    // 1. Single block (1x1)
    { shape: [1], shapeId: 1, size: 1 },
    
    // 2. Two-block line (1x2 and 2x1)
    { shape: [2,2], shapeId: 2, size: 2 },     // Horizontal
    { shape: [2,2], shapeId: 2, size: 1 },     // Vertical
    
    // 3. L-shape (3x2)
    { shape: [3,0,3,0,3,3], shapeId: 3, size: 2 },
    { shape: [3,3,3,3,0,0], shapeId: 3, size: 3 }, // Rotated
    { shape: [3,3,0,3,0,3], shapeId: 3, size: 2 }, // Mirrored
    { shape: [0,0,3,3,3,3], shapeId: 3, size: 3 }, // Rotated mirrored
    
    // 4. T-shape (3x2)
    { shape: [4,0,4,4,4,0], shapeId: 4, size: 2 },
    { shape: [4,4,4,0,4,0], shapeId: 4, size: 3 },
    { shape: [0,4,4,4,0,4], shapeId: 4, size: 2 },
    { shape: [0,4,0,4,4,4], shapeId: 4, size: 3 },
    
    // 5. Square (2x2 and 3x3)
    { shape: [5,5,5,5], shapeId: 5, size: 2 },
    { shape: [5,5,5,5,5,5,5,5,5], shapeId: 5, size: 3 },
    
    // 6. Z-shape (3x2)
    { shape: [6,6,0,0,6,6], shapeId: 6, size: 3 },
    { shape: [0,6,6,6,6,0], shapeId: 6, size: 2 },
    
    // 7. S-shape (3x2)
    { shape: [0,7,7,7,7,0], shapeId: 7, size: 3 },
    { shape: [7,7,0,0,7,7], shapeId: 7, size: 2 },
    
    // 8. Four-block line (1x4 and 4x1)
    { shape: [8,8,8,8], shapeId: 8, size: 4 }, // Horizontal
    { shape: [8,8,8,8], shapeId: 8, size: 1 }, // Vertical
    
    // 9. Corner pieces (2x2)
    { shape: [9,0,9,9], shapeId: 9, size: 2 },
    { shape: [9,9,9,0], shapeId: 9, size: 2 },
    { shape: [0,9,9,9], shapeId: 9, size: 2 },
    { shape: [9,9,0,9], shapeId: 9, size: 2 },
    
    // 10. Diagonal pieces (2x2 and 3x3)
    { shape: [10,0,0,10], shapeId: 10, size: 2 },
    { shape: [0,10,10,0], shapeId: 10, size: 2 },
    { shape: [10,0,0,0,10,0,0,0,10], shapeId: 10, size: 3 },
    { shape: [0,0,10,0,10,0,10,0,0], shapeId: 10, size: 3 }
];

// ==================== GAME ROOM IMPLEMENTATION ====================
export class TetrisRoom extends Room<TetrisState> {
    private matchDuration = 3 * 60 * 1000; // 3 minutes
    private matchTimer: NodeJS.Timeout | null = null;
    private countdownInterval: NodeJS.Timeout | null = null;
    private timeLeft: number = this.matchDuration / 1000;
    private initialPieces = new Map<string, SimplePiece[]>(); // Store initial pieces for each player

    // =============== GAME LOGIC METHODS ===============
    private generateRandomPieces(count:number=3): SimplePiece[] {
        return Array.from({ length: count }, () => {
            const randomPiece = ALL_POSSIBLE_PIECES[Math.floor(Math.random() * ALL_POSSIBLE_PIECES.length)];
            return new SimplePiece(randomPiece.shape, randomPiece.shapeId, randomPiece.size);
        });
    }

    private canPlacePiece(board: number[], coordinates: [number, number][]): boolean {
        for (const [x, y] of coordinates) {
            if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT || board[y * BOARD_WIDTH + x] !== 0) {
                return false;
            }
        }
        return true;
    }

    private placePiece(board: ArraySchema<number>, piece: SimplePiece, coordinates: [number, number][]) {
        for (const [x, y] of coordinates) {
            board[y * BOARD_WIDTH + x] = piece.shapeId;
        }
    }

    private clearLines(board: ArraySchema<number>): number {
        let linesCleared = 0;
        const newBoard = Array(BOARD_WIDTH * BOARD_HEIGHT).fill(0);

        // Check for full board clear
        if (Array.from(board).every(cell => cell !== 0)) {
            board.forEach((_, i) => board[i] = 0);
            return 500;
        }

        // Check horizontal lines
        let newRow = BOARD_HEIGHT - 1;
        for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
            let isLineFull = true;
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (board[y * BOARD_WIDTH + x] === 0) {
                    isLineFull = false;
                    break;
                }
            }

            if (!isLineFull) {
                for (let x = 0; x < BOARD_WIDTH; x++) {
                    newBoard[newRow * BOARD_WIDTH + x] = board[y * BOARD_WIDTH + x];
                }
                newRow--;
            } else {
                linesCleared++;
            }
        }

        // Check vertical lines
        let newCol = BOARD_WIDTH - 1;
        for (let x = BOARD_WIDTH - 1; x >= 0; x--) {
            let isLineFull = true;
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                if (board[y * BOARD_WIDTH + x] === 0) {
                    isLineFull = false;
                    break;
                }
            }

            if (!isLineFull) {
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    newBoard[y * BOARD_WIDTH + newCol] = board[y * BOARD_WIDTH + x];
                }
                newCol--;
            } else {
                linesCleared++;
            }
        }

        if (linesCleared > 0) {
            for (let i = 0; i < newBoard.length; i++) {
                board[i] = newBoard[i];
            }
        }

        return linesCleared;
    }

    private isGameOver(board: number[], currentPieces: SimplePiece[]): boolean {
        return !currentPieces.some(piece => {
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                for (let x = 0; x < BOARD_WIDTH; x++) {
                    const coords = piece.shape
                        .map((val, idx) => ({
                            val,
                            x: x + (idx % piece._size),
                            y: y + Math.floor(idx / piece._size)
                        }))
                        .filter(c => c.val !== 0)
                        .map(c => [c.x, c.y] as [number, number]);

                    if (this.canPlacePiece(board, coords)) {
                        return true;
                    }
                }
            }
            return false;
        });
    }

    // =============== ROOM LIFECYCLE METHODS ===============
    onCreate(options: any) {
        this.setState(new TetrisState());
        this.state.gameStatus = "waiting";

        // Message handlers
     this.onMessage("join_game", (client, message) => {
            if (!this.state.players.has(client.sessionId)) {
                const player = new Player();
                player.id = client.sessionId;
                player.name = message.name;
                player.board = new ArraySchema<number>(...Array(BOARD_WIDTH * BOARD_HEIGHT).fill(0));
                
                // Generate and store the initial 3 pieces for this player
                const pieces = this.generateRandomPieces(3);
                this.initialPieces.set(client.sessionId, pieces);
                
                // Show all 3 pieces right away
                player.currentPieces.push(...pieces);
                this.state.players.set(client.sessionId, player);
            }

            if (this.state.players.size >= 2) {
                this.startGameCountdown();
            }
        });

        this.onMessage("place_piece", (client, message) => {
            if (this.state.gameStatus !== "in-progress") return;
            
            const player = this.state.players.get(client.sessionId);
            if (!player || player.gameOver) return;

            try {
                const { pieceIndex, coordinates } = message;
                if (pieceIndex === undefined || !Array.isArray(coordinates)) {
                    client.send("error", { message: "Invalid placement data" });
                    return;
                }

                const piece = player.currentPieces[pieceIndex];
                if (!piece) {
                    client.send("error", { message: "Invalid piece index" });
                    return;
                }

                if (!piece.validateCoordinates(coordinates)) {
                    client.send("error", { message: "Coordinates don't match piece shape" });
                    return;
                }

                if (!this.canPlacePiece(Array.from(player.board), coordinates)) {
                    client.send("error", { message: "Invalid placement" });
                    return;
                }

                // Place piece and update score
                const blocksPlaced = coordinates.length;
                player.score += blocksPlaced * 10;
                this.placePiece(player.board, piece, coordinates);
                
                // Handle line clears
                const clearResult = this.clearLines(player.board);
                if (clearResult === 500) {
                    player.score += 500;
                    this.broadcast("special-clear", {
                        playerId: client.sessionId,
                        type: "board-clear",
                        bonus: 500
                    });
                } else if (clearResult > 0) {
                    player.score += clearResult * clearResult * 100;
                }

                // Manage pieces
                player.currentPieces.splice(pieceIndex, 1);
                if (player.currentPieces.length === 0) {
                    player.currentPieces.push(...this.generateRandomPieces());
                    if (this.isGameOver(Array.from(player.board), [...player.currentPieces])) {
                        player.gameOver = true;
                        this.broadcast("game-over", { playerId: client.sessionId });
                        this.checkWinCondition();
                    }
                }
            } catch (error) {
                console.error("Place piece error:", error);
                client.send("error", { message: "Error processing move" });
            }
        });
    }

    onJoin(client: Client, options: any) {
        console.log(`Player joined: ${options.name}`);
    }

    onLeave(client: Client, consented: boolean) {
        const player = this.state.players.get(client.sessionId);
        if (player) {
            player.gameOver = true;
            this.checkWinCondition();
        }
    }

    onDispose() {
        this.clearTimers();
    }

    // =============== GAME FLOW METHODS ===============
  private startGameCountdown() {
    this.state.gameStatus = "starting";
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    this.state.countdown = 3;
    // Broadcast ONLY the countdown (no other state updates)
    this.broadcast("countdown", { count: this.state.countdown });

    this.countdownInterval = setInterval(() => {
        this.state.countdown--;
        // Broadcast ONLY the countdown number
        this.broadcast("countdown", { count: this.state.countdown });

        if (this.state.countdown <= 0) {
            clearInterval(this.countdownInterval!);
            // Start the game automatically (but still no extra state broadcast)
            this.startMatch();
        }
    }, 1000);
}


    private startMatch() {
        this.state.gameStatus = "in-progress";
        this.broadcast("game_started");

        if (this.countdownInterval) clearInterval(this.countdownInterval);

        this.timeLeft = this.matchDuration / 1000;
        this.matchTimer = setTimeout(() => this.endMatch(), this.matchDuration);
        
        this.countdownInterval = setInterval(() => {
            this.timeLeft--;
            this.broadcast("time-update", { timeLeft: this.timeLeft });
            if (this.timeLeft <= 0) this.endMatch();
        }, 1000);

        // Reset all players with their initial pieces
        this.state.players.forEach((player, sessionId) => {
            if (!player.gameOver) {
                player.currentPieces = new ArraySchema<SimplePiece>();
                // Use the same initial pieces we stored earlier
                const initialPieces = this.initialPieces.get(sessionId) || this.generateRandomPieces(3);
                player.currentPieces.push(...initialPieces);
            }
        });

        this.broadcast("game_started");
    }

    private endMatch() {
        this.clearTimers();
        this.state.gameStatus = "finished";

        const activePlayers = [...this.state.players.values()].filter(p => !p.gameOver && p.score > 0);
        if (activePlayers.length === 0) {
            this.broadcast("match-ended", { winnerId: null, reason: "no-action" });
            return;
        }

        const sortedPlayers = [...activePlayers].sort((a, b) => b.score - a.score);
        const winner = sortedPlayers[0];
        this.state.winner = winner.id;

        this.broadcast("match-ended", {
            winnerId: winner.id,
            score: winner.score,
            leaderboard: sortedPlayers.map(p => ({
                id: p.id,
                name: p.name,
                score: p.score
            }))
        });
    }

    private checkWinCondition() {
        const alivePlayers = Array.from(this.state.players.values()).filter(p => !p.gameOver);
        if (alivePlayers.length <= 1) {
            this.endMatch();
        }
    }

    private clearTimers() {
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        if (this.matchTimer) clearTimeout(this.matchTimer);
        this.countdownInterval = null;
        this.matchTimer = null;
    }
}