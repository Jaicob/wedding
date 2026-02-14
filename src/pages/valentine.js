import html from './valentine.html?raw';
import { StardewValentine } from '../game/engine.js';

let game = null;

export const valentinePage = {
  html,
  init(container) {
    const canvas = container.querySelector('#game-canvas');
    game = new StardewValentine(canvas);
    game.start();
  },
};

export function destroyValentine() {
  if (game) {
    game.destroy();
    game = null;
  }
}
