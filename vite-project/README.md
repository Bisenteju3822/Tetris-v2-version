The game has an inactivity timer that automatically ends the match if no players make moves for a certain period. Here's how it works:

1. Inactivity Timeout Configuration
typescript
private inactivityTimer: NodeJS.Timeout | null = null;
private startInactivityTimer() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    
    this.inactivityTimer = setTimeout(() => {
        console.log("[Inactivity] Timeout - ending match");
        this.endMatch();
    }, 60000); // 60 seconds (1 minute)
}
2. Key Behavior
Time	Action
60 seconds	Match automatically ends if no pieces are placed
Every move	Timer resets (when place_piece is handled)
Game end	Timer is cleared
3. Where Timer is Managed
Started when:

Match begins (startMatch())

Any player places a piece (handlePlacePiece())

Cancelled when:

Match ends (endMatch())

Room disposes (onDispose())

4. Player Scenarios
Scenario	Result
All players inactive	Match ends after 60s
Some players active	Timer keeps resetting
Network disconnect	Player marked gameOver
5. Technical Implementation
The timer is reset on every valid piece placement:

typescript
private handlePlacePiece(client: Client, pieceIndex: number, x: number, y: number) {
    // ... (piece placement logic)
    this.startInactivityTimer(); // Resets the 60s countdown
}
This ensures the game only ends if all players stop interacting for a full minute. The timeout is server-enforced to prevent stalled matches.

now make doc of al please proer for explantation
TetrisV2 Game Server - Complete Technical Documentation
1. Overview
A multiplayer Tetris-style game built with:

Backend: Node.js + Colyseus (WebSocket game server)

Frontend: React (not covered in this doc)

Database: MongoDB (for match configurations)

Features:

Real-time multiplayer

Wallet integration (Kafka)

Custom Tetris mechanics with Block Blast rules

Private/public rooms

2. Core Architecture
Diagram
Code







3. Data Structures
3.1 Schema Definitions
PieceRow
typescript
export class PieceRow extends Schema {
    @type(["number"])
    cells = new ArraySchema<number>(); 
    // Represents one row of a Tetris piece
    // Example: [1,0,1] = filled, empty, filled
}
Piece
typescript
export class Piece extends Schema {
    @type([PieceRow])
    rows = new ArraySchema<PieceRow>();
    // Complete piece composed of multiple rows
    // Example: L-shape = [[1,0],[1,0],[1,1]]
}
Player
typescript
export class Player extends Schema {
    @type("string") id: string;          // Session ID
    @type("string") name: string;        // Display name
    @type("number") score: number = 0;   // Current score
    @type(["number"]) board = new ArraySchema<number>(); // 10x10 grid (1D array)
    @type([Piece]) currentPieces = new ArraySchema<Piece>(); // 3 available pieces
    @type("boolean") gameOver: boolean = false;
}
Game State
typescript
export class TetrisV2State extends Schema {
    @type("string") gameStatus: "waiting" | "in-progress" | "finished";
    @type({ map: Player }) players = new MapSchema<Player>();
    // ... other metadata fields
}
4. Game Loop & Timing
4.1 Match Timeline
Event	Time	Description
Countdown	3s	Starts when minimum players join
Match Duration	3min	Total game time
Inactivity Timeout	60s	Ends match if no moves made
Game Over	Immediate	When no valid moves remain
4.2 Timer Management
typescript
private startInactivityTimer() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    
    this.inactivityTimer = setTimeout(() => {
        this.endMatch(); // Force-end game
    }, 60000); // 60 seconds
}

// Reset on any player action:
private handlePlacePiece() {
    // ... game logic
    this.startInactivityTimer(); // Reset 60s counter
}
5. Piece Placement & Scoring
5.1 Placement Logic
Client Sends:

json
{
  "type": "place_piece",
  "data": {
    "index": 1,
    "x": 3,
    "y": 5
  }
}
Server Validates:

Checks board boundaries

Verifies no overlaps

Board Update:

typescript
// Before: [0,0,0...]
// After placing L-shape at (3,5):
[
  0,0,0,0,0,0,0,0,0,0, // Row 0
  ...
  0,0,0,1,0,0,0,0,0,0, // Row 5 (x=3,y=5)
  0,0,0,1,0,0,0,0,0,0,
  0,0,0,1,1,0,0,0,0,0
]
5.2 Scoring System
Action	Points	Calculation
Block Placement	10	filled_cells * 10
Line Clear	100	completed_lines * 100
Example:

Placing a T-block (4 cells) = 40 points

Clearing 2 lines = 200 points

Total = 240 points

6. Multiplayer Sync
6.1 State Synchronization
Diagram
Code
6.2 Reconnection Handling
typescript
onJoin(client: Client, options: any) {
    if (client.reconnecting) {
        // Restore player state
        this.state.players.set(client.sessionId, existingPlayer);
    }
}
7. Error Handling
Error Case	Resolution
Invalid Position	Returns error, keeps piece
Wallet Failure	Prevents joining
Network Issues	Auto-reconnect
Full Room	Rejects new players
8. Key Methods
8.1 Game Flow
Method	Description
onCreate()	Room initialization
onJoin()	Player connection
handlePlacePiece()	Core game logic
endMatch()	Cleanup & winner calc
8.2 Utility Functions
Method	Purpose
canPlacePiece()	Validates moves
clearLines()	Checks for completed rows/columns
generateRandomPieces()	Creates new pieces
9. Example Scenarios
9.1 Normal Gameplay
Player joins → gets 3 pieces

Places piece → scores points

Clears lines → bonus points

Receives new pieces

Repeats until game over

9.2 Timeout Cases
Scenario	Result
No moves for 60s	Match ends
All players leave	Room disposes
Server crash	Clients reconnect
10. Dependencies
Package	Purpose
colyseus	Game server
mongoose	MongoDB ORM
kafkajs	Wallet service
uuid	Player IDs
This documentation provides a complete technical reference for the TetrisV2 game server implementation. The system combines traditional Tetris mechanics with multiplayer synchronization and custom scoring rules.