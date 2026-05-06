import type { Game } from './game';
import type { Square } from 'chess.js';

const PIECE_UNICODE: Record<string, string> = {
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
};

export class Board {
  game: Game;
  element: HTMLElement;
  squares: Map<Square, HTMLElement> = new Map();
  selectedSquare: Square | null = null;
  legalDestinations: Square[] = [];
  lastMove: { from: Square; to: Square } | null = null;
  promotionCallback: ((from: Square, to: Square) => void) | null = null;

  constructor(game: Game, elementId: string) {
    this.game = game;
    this.element = document.getElementById(elementId)!;
    this.render();
  }

  render() {
    this.element.innerHTML = '';
    this.squares.clear();
    const board = this.game.board();

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const r = this.game.isFlipped ? 7 - rank : rank;
        const f = this.game.isFlipped ? 7 - file : file;
        const square = `${String.fromCharCode(97 + f)}${r + 1}` as Square;
        const piece = board[r][f];

        const sq = document.createElement('div');
        sq.className = 'square';
        sq.dataset.square = square;
        sq.classList.add((rank + file) % 2 === 0 ? 'light' : 'dark');

        if (piece) {
          const key = `${piece.color}${piece.type}`;
          const span = document.createElement('span');
          span.className = `piece ${piece.color === 'w' ? 'white' : 'black'}`;
          span.textContent = PIECE_UNICODE[key];
          span.draggable = true;
          span.dataset.square = square;
          span.addEventListener('dragstart', (e) => this.onDragStart(e, square));
          sq.appendChild(span);
        }

        sq.addEventListener('dragover', (e) => this.onDragOver(e));
        sq.addEventListener('drop', (e) => this.onDrop(e));
        sq.addEventListener('click', () => this.onClick(square));

        this.element.appendChild(sq);
        this.squares.set(square, sq);
      }
    }

    this.highlightLastMove();
    this.highlightCheck();
    this.updateSelection();
  }

  onDragStart(e: DragEvent, square: Square) {
    if (this.game.gameOver) {
      e.preventDefault();
      return;
    }
    const piece = this.game.getPieceAt(square);
    if (!piece || piece.color !== this.game.getTurn()) {
      e.preventDefault();
      return;
    }
    if (this.game.mode === 'ai' && piece.color !== this.game.playerColor) {
      e.preventDefault();
      return;
    }
    e.dataTransfer?.setData('text/plain', square);
    this.selectSquare(square);
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    const from = e.dataTransfer?.getData('text/plain') as Square;
    const target = e.currentTarget as HTMLElement;
    const to = target.dataset.square as Square;
    if (from && to) {
      this.attemptMove(from, to);
    }
  }

  onClick(square: Square) {
    if (this.game.gameOver) return;

    const piece = this.game.getPieceAt(square);

    if (this.selectedSquare) {
      if (this.legalDestinations.includes(square)) {
        this.attemptMove(this.selectedSquare, square);
        return;
      }
      if (piece && piece.color === this.game.getTurn()) {
        if (this.game.mode === 'ai' && piece.color !== this.game.playerColor) {
          this.deselect();
          return;
        }
        this.selectSquare(square);
        return;
      }
      this.deselect();
      return;
    }

    if (piece && piece.color === this.game.getTurn()) {
      if (this.game.mode === 'ai' && piece.color !== this.game.playerColor) return;
      this.selectSquare(square);
    }
  }

  selectSquare(square: Square) {
    this.selectedSquare = square;
    this.legalDestinations = this.game.getLegalMoves(square);
    this.updateSelection();
  }

  deselect() {
    this.selectedSquare = null;
    this.legalDestinations = [];
    this.updateSelection();
  }

  updateSelection() {
    for (const sq of this.squares.values()) {
      sq.classList.remove('selected', 'legal-move');
    }
    if (this.selectedSquare) {
      const sq = this.squares.get(this.selectedSquare);
      if (sq) sq.classList.add('selected');
      for (const dest of this.legalDestinations) {
        const d = this.squares.get(dest);
        if (d) d.classList.add('legal-move');
      }
    }
  }

  attemptMove(from: Square, to: Square) {
    this.deselect();

    const piece = this.game.getPieceAt(from);
    if (piece?.type === 'p') {
      const toRank = parseInt(to[1]);
      if ((piece.color === 'w' && toRank === 8) || (piece.color === 'b' && toRank === 1)) {
        this.showPromotionDialog(from, to);
        return;
      }
    }

    const success = this.game.makeMove(from, to);
    if (success) {
      this.lastMove = { from, to };
    }
  }

  showPromotionDialog(from: Square, to: Square) {
    if (this.promotionCallback) return;
    this.promotionCallback = (f, t) => {
      this.promotionCallback = null;
      this.game.makeMove(f, t, 'q');
    };

    // Auto-promote to queen for now; could add a dialog later
    this.game.makeMove(from, to, 'q');
    this.lastMove = { from, to };
    this.promotionCallback = null;
  }

  highlightLastMove() {
    for (const sq of this.squares.values()) {
      sq.classList.remove('last-move');
    }
    if (this.lastMove) {
      const fromSq = this.squares.get(this.lastMove.from);
      const toSq = this.squares.get(this.lastMove.to);
      if (fromSq) fromSq.classList.add('last-move');
      if (toSq) toSq.classList.add('last-move');
    }
  }

  highlightCheck() {
    for (const sq of this.squares.values()) {
      sq.classList.remove('check');
    }
    if (this.game.isCheck()) {
      const board = this.game.board();
      const color = this.game.getTurn();
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const piece = board[r][f];
          if (piece && piece.type === 'k' && piece.color === color) {
            const square = `${String.fromCharCode(97 + f)}${r + 1}` as Square;
            const sq = this.squares.get(square);
            if (sq) sq.classList.add('check');
            return;
          }
        }
      }
    }
  }

  refresh() {
    this.render();
  }

  flip() {
    this.game.isFlipped = !this.game.isFlipped;
    this.render();
  }
}
