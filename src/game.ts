import { Chess, type Move, type Square, type Piece } from 'chess.js';
import type { GameMode, Difficulty, Color, ClockConfig, ClockState, GameCallbacks } from './types';

export class Game {
  chess: Chess;
  mode: GameMode = 'pvp';
  difficulty: Difficulty = 'medium';
  playerColor: Color = 'w';
  clock: ClockState;
  clockConfig: ClockConfig = { minutes: 10, increment: 0 };
  timerId: number | null = null;
  callbacks: GameCallbacks;
  isFlipped = false;
  moveStack: Move[] = [];
  capturedWhite: Piece[] = [];
  capturedBlack: Piece[] = [];
  gameOver = false;
  result = '';

  constructor(callbacks: GameCallbacks) {
    this.chess = new Chess();
    this.callbacks = callbacks;
    this.clock = {
      whiteTime: 10 * 60 * 1000,
      blackTime: 10 * 60 * 1000,
      active: null,
      increment: 0,
    };
  }

  newGame(mode: GameMode, difficulty: Difficulty, clockConfig: ClockConfig, playerColor: Color = 'w') {
    this.chess.reset();
    this.mode = mode;
    this.difficulty = difficulty;
    this.playerColor = playerColor;
    this.clockConfig = clockConfig;
    this.clock = {
      whiteTime: clockConfig.minutes * 60 * 1000,
      blackTime: clockConfig.minutes * 60 * 1000,
      active: null,
      increment: clockConfig.increment * 1000,
    };
    this.moveStack = [];
    this.capturedWhite = [];
    this.capturedBlack = [];
    this.gameOver = false;
    this.result = '';
    this.stopClock();
    this.startClock('w');
    this.callbacks.onMove();
  }

  startClock(color: Color) {
    if (this.gameOver) return;
    this.stopClock();
    this.clock.active = color;
    this.timerId = window.setInterval(() => {
      if (this.clock.active === 'w') {
        this.clock.whiteTime -= 100;
        if (this.clock.whiteTime <= 0) {
          this.clock.whiteTime = 0;
          this.endGame('Black wins on time');
        }
      } else if (this.clock.active === 'b') {
        this.clock.blackTime -= 100;
        if (this.clock.blackTime <= 0) {
          this.clock.blackTime = 0;
          this.endGame('White wins on time');
        }
      }
      this.callbacks.onClockTick();
    }, 100);
  }

  stopClock() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.clock.active = null;
  }

  addIncrement(color: Color) {
    if (this.clock.increment > 0) {
      if (color === 'w') {
        this.clock.whiteTime += this.clock.increment;
      } else {
        this.clock.blackTime += this.clock.increment;
      }
    }
  }

  makeMove(from: Square, to: Square, promotion?: string): boolean {
    if (this.gameOver) return false;
    try {
      const move = this.chess.move({ from, to, promotion });
      if (!move) return false;

      this.moveStack.push(move);
      if (move.captured) {
        const piece: Piece = { type: move.captured, color: move.color === 'w' ? 'b' : 'w' };
        if (move.color === 'w') {
          this.capturedWhite.push(piece);
        } else {
          this.capturedBlack.push(piece);
        }
      }

      const prevTurn = move.color;
      this.addIncrement(prevTurn);

      if (this.chess.isGameOver()) {
        if (this.chess.isCheckmate()) {
          const winner = prevTurn === 'w' ? 'White' : 'Black';
          this.endGame(`${winner} wins by checkmate`);
        } else if (this.chess.isStalemate()) {
          this.endGame('Draw by stalemate');
        } else if (this.chess.isInsufficientMaterial()) {
          this.endGame('Draw by insufficient material');
        } else if (this.chess.isThreefoldRepetition()) {
          this.endGame('Draw by repetition');
        } else if (this.chess.isDrawByFiftyMoves()) {
          this.endGame('Draw by 50-move rule');
        } else {
          this.endGame('Draw');
        }
      } else {
        this.startClock(this.chess.turn());
      }

      this.callbacks.onMove();
      return true;
    } catch {
      return false;
    }
  }

  undo(): boolean {
    if (this.gameOver || this.moveStack.length === 0) return false;
    const move = this.chess.undo();
    if (!move) return false;
    this.moveStack.pop();
    if (move.captured) {
      if (move.color === 'w') {
        this.capturedWhite.pop();
      } else {
        this.capturedBlack.pop();
      }
    }
    this.gameOver = false;
    this.result = '';
    this.startClock(this.chess.turn());
    this.callbacks.onMove();
    return true;
  }

  endGame(result: string) {
    this.gameOver = true;
    this.result = result;
    this.stopClock();
    this.callbacks.onGameOver(result);
  }

  resign(color: Color) {
    if (this.gameOver) return;
    const winner = color === 'w' ? 'Black' : 'White';
    this.endGame(`${winner} wins by resignation`);
  }

  offerDraw(): boolean {
    if (this.gameOver) return false;
    this.endGame('Draw by agreement');
    return true;
  }

  getLegalMoves(square: Square): Square[] {
    const moves = this.chess.moves({ square, verbose: true });
    return moves.map((m) => m.to);
  }

  getHistory(): string[] {
    return this.chess.history();
  }

  getPgn(): string {
    return this.chess.pgn();
  }

  getPieceAt(square: Square): Piece | undefined {
    return this.chess.get(square);
  }

  getTurn(): Color {
    return this.chess.turn();
  }

  isCheck(): boolean {
    return this.chess.isCheck();
  }

  isCheckmate(): boolean {
    return this.chess.isCheckmate();
  }

  isDraw(): boolean {
    return this.chess.isDraw();
  }

  isStalemate(): boolean {
    return this.chess.isStalemate();
  }

  fen(): string {
    return this.chess.fen();
  }

  board() {
    return this.chess.board();
  }
}
