import type { Game } from './game';

import { findBestMove } from './ai';
import type { Board } from './board';

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function pieceSymbol(type: string): string {
  const filled: Record<string, string> = {
    k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F',
  };
  return (filled[type] || '') + '\uFE0E';
}

export class UI {
  game: Game;
  board: Board;
  modeSelect: HTMLSelectElement;
  difficultySection: HTMLElement;
  difficultySelect: HTMLSelectElement;
  colorSection: HTMLElement;
  colorSelect: HTMLSelectElement;
  clockWhite: HTMLElement;
  clockBlack: HTMLElement;
  gameStatus: HTMLElement;
  moveHistory: HTMLElement;
  capturedPieces: HTMLElement;
  btnNewGame: HTMLButtonElement;
  btnUndo: HTMLButtonElement;
  btnFlip: HTMLButtonElement;
  btnResign: HTMLButtonElement;
  btnDraw: HTMLButtonElement;
  btnDownloadPgn: HTMLButtonElement;

  constructor(game: Game, board: Board) {
    this.game = game;
    this.board = board;

    this.modeSelect = document.getElementById('mode-select') as HTMLSelectElement;
    this.difficultySection = document.getElementById('difficulty-section')!;
    this.difficultySelect = document.getElementById('difficulty-select') as HTMLSelectElement;
    this.colorSection = document.getElementById('color-section')!;
    this.colorSelect = document.getElementById('color-select') as HTMLSelectElement;
    this.clockWhite = document.getElementById('clock-white')!;
    this.clockBlack = document.getElementById('clock-black')!;
    this.gameStatus = document.getElementById('game-status')!;
    this.moveHistory = document.getElementById('move-history')!;
    this.capturedPieces = document.getElementById('captured-pieces')!;
    this.btnNewGame = document.getElementById('btn-new-game') as HTMLButtonElement;
    this.btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;
    this.btnFlip = document.getElementById('btn-flip') as HTMLButtonElement;
    this.btnResign = document.getElementById('btn-resign') as HTMLButtonElement;
    this.btnDraw = document.getElementById('btn-draw') as HTMLButtonElement;
    this.btnDownloadPgn = document.getElementById('btn-download-pgn') as HTMLButtonElement;

    this.bindEvents();
    this.update();
  }

  bindEvents() {
    this.modeSelect.addEventListener('change', () => {
      const isAi = this.modeSelect.value === 'ai';
      this.difficultySection.style.display = isAi ? 'block' : 'none';
    });

    this.difficultySelect.addEventListener('change', () => {
      // just update setting; user clicks New Game to start
    });

    this.btnNewGame.addEventListener('click', () => this.startNewGame());
    this.btnUndo.addEventListener('click', () => {
      // In AI mode, undo twice to undo AI move too
      this.game.undo();
      if (this.game.mode === 'ai' && this.game.getTurn() !== this.game.playerColor) {
        this.game.undo();
      }
      this.board.refresh();
      this.update();
    });
    this.btnFlip.addEventListener('click', () => {
      this.board.flip();
    });
    this.btnResign.addEventListener('click', () => {
      this.game.resign(this.game.playerColor);
      this.update();
    });
    this.btnDraw.addEventListener('click', () => {
      this.game.offerDraw();
      this.update();
    });
    this.btnDownloadPgn.addEventListener('click', () => {
      const pgn = this.game.getPgn();
      const blob = new Blob([pgn], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'game.pgn';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  startNewGame() {
    const mode = this.modeSelect.value as 'pvp' | 'ai';
    const difficulty = this.difficultySelect.value as 'easy' | 'medium' | 'hard';
    const playerColor = (this.colorSelect.value as 'w' | 'b') || 'w';
    const shouldFlip = playerColor === 'b';
    if (this.game.isFlipped !== shouldFlip) {
      this.board.flip();
    }
    this.board.lastMove = null;
    this.game.newGame(mode, difficulty, { minutes: 10, increment: 0 }, playerColor);
    this.board.refresh();
    this.update();
  }

  update() {
    this.updateClocks();
    this.updateStatus();
    this.updateHistory();
    this.updateCaptured();
    this.board.highlightLastMove();
    this.board.highlightCheck();
  }

  updateClocks() {
    const whiteTime = formatTime(this.game.clock.whiteTime);
    const blackTime = formatTime(this.game.clock.blackTime);
    this.clockWhite.querySelector('.clock-time')!.textContent = whiteTime;
    this.clockBlack.querySelector('.clock-time')!.textContent = blackTime;

    this.clockWhite.classList.toggle('active', this.game.clock.active === 'w');
    this.clockBlack.classList.toggle('active', this.game.clock.active === 'b');
  }

  updateStatus() {
    if (this.game.gameOver) {
      this.gameStatus.textContent = this.game.result;
      return;
    }
    const turn = this.game.getTurn() === 'w' ? 'White' : 'Black';
    if (this.game.isCheckmate()) {
      this.gameStatus.textContent = `${turn} is in checkmate`;
    } else if (this.game.isCheck()) {
      this.gameStatus.textContent = `${turn} to move — Check`;
    } else if (this.game.isStalemate()) {
      this.gameStatus.textContent = 'Stalemate';
    } else {
      this.gameStatus.textContent = `${turn} to move`;
    }
  }

  updateHistory() {
    const history = this.game.getHistory();
    this.moveHistory.innerHTML = '';
    for (let i = 0; i < history.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = history[i];
      const blackMove = history[i + 1] || '';
      const row = document.createElement('div');
      row.className = 'history-row';
      row.innerHTML = `<span class="move-num">${moveNum}.</span> <span class="move">${whiteMove}</span> <span class="move">${blackMove}</span>`;
      this.moveHistory.appendChild(row);
    }
    this.moveHistory.scrollTop = this.moveHistory.scrollHeight;
  }

  updateCaptured() {
    const white = this.game.capturedWhite.map((p) => pieceSymbol(p.type)).join('');
    const black = this.game.capturedBlack.map((p) => pieceSymbol(p.type)).join('');
    this.capturedPieces.innerHTML = '';
    if (white) {
      const div = document.createElement('div');
      div.className = 'captured-group captured-black';
      div.textContent = white;
      this.capturedPieces.appendChild(div);
    }
    if (black) {
      const div = document.createElement('div');
      div.className = 'captured-group captured-white';
      div.textContent = black;
      this.capturedPieces.appendChild(div);
    }
  }

  async triggerAiMove() {
    if (this.game.gameOver) return;
    if (this.game.mode !== 'ai') return;
    if (this.game.getTurn() === this.game.playerColor) return;

    // Small delay so the player sees their move first
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (this.game.gameOver) return;

    const best = findBestMove(this.game.fen(), this.game.difficulty);
    if (best) {
      const success = this.game.makeMove(best.from, best.to, best.promotion);
      if (success) {
        this.board.lastMove = { from: best.from, to: best.to };
        this.board.refresh();
        this.update();
      }
    }
  }
}
