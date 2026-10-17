import './style.css';
import { createGame } from './game';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('game-container');
  if (container) {
    createGame(container);
  }
});
