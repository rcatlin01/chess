import { Game } from './game';
import { Board } from './board';
import { UI } from './ui';

const game = new Game({
  onMove: () => {
    board.refresh();
    ui.update();
    // Trigger AI after UI updates
    if (game.mode === 'ai' && !game.gameOver) {
      requestAnimationFrame(() => {
        ui.triggerAiMove();
      });
    }
  },
  onGameOver: (result) => {
    ui.update();
    setTimeout(() => alert(result), 50);
  },
  onClockTick: () => {
    ui.updateClocks();
  },
});

const board = new Board(game, 'board');
const ui = new UI(game, board);

// Start the game immediately
ui.startNewGame();
