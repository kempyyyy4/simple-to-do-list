// A small pong game, opened as an easter egg from the 1964 animation style.
// Move the mouse or use ↑ and ↓. First to 7 wins. Esc closes it.
(() => {
  'use strict';

  const W = 360;
  const H = 220;
  const PADDLE = 40;
  const TO_WIN = 7;

  let overlay = null;
  let frame = 0;

  function colours() {
    const cs = getComputedStyle(document.documentElement);
    return {
      bg: cs.getPropertyValue('--bg').trim() || '#111',
      fg: cs.getPropertyValue('--fg').trim() || '#eee',
      accent: cs.getPropertyValue('--accent').trim() || '#fff',
    };
  }

  function start() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'pong';
    overlay.innerHTML = `
      <div class="pong-bar"><span>Pong</span><button type="button" aria-label="Close">✕</button></div>
      <canvas width="${W}" height="${H}"></canvas>
      <p class="pong-hint">Move the mouse or use ↑ ↓. First to ${TO_WIN}. Click to restart after a game.</p>`;
    document.body.append(overlay);

    const canvas = overlay.querySelector('canvas');
    const g = canvas.getContext('2d');
    const keys = {};
    const state = {};

    function reset(serveTo = 1) {
      state.player = H / 2 - PADDLE / 2;
      state.ai = H / 2 - PADDLE / 2;
      state.ball = { x: W / 2, y: H / 2, vx: 3 * serveTo, vy: (Math.random() - 0.5) * 3 };
      state.paused = 0;
    }

    state.scores = [0, 0];
    state.over = false;
    reset();

    // Mouse position sets the player's paddle directly.
    canvas.addEventListener('pointermove', e => {
      const rect = canvas.getBoundingClientRect();
      const y = (e.clientY - rect.top) * (H / rect.height);
      state.player = Math.min(H - PADDLE, Math.max(0, y - PADDLE / 2));
    });
    canvas.addEventListener('click', () => {
      if (!state.over) return;
      state.scores = [0, 0];
      state.over = false;
      reset();
    });

    const onKey = e => {
      if (e.key === 'Escape') return stop();
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        keys[e.key] = e.type === 'keydown';
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    function step() {
      const b = state.ball;
      if (keys.ArrowUp) state.player = Math.max(0, state.player - 5);
      if (keys.ArrowDown) state.player = Math.min(H - PADDLE, state.player + 5);

      // The AI tracks the ball, a little slower than a perfect player would.
      const aiCentre = state.ai + PADDLE / 2;
      state.ai += Math.sign(b.y - aiCentre) * Math.min(2.4, Math.abs(b.y - aiCentre));
      state.ai = Math.min(H - PADDLE, Math.max(0, state.ai));

      if (state.paused > 0) {
        state.paused--;
      } else {
        b.x += b.vx;
        b.y += b.vy;
        if (b.y < 0 || b.y > H) b.vy = -b.vy;

        // Left paddle is the player, right is the AI.
        if (b.vx < 0 && b.x < 16 && b.y > state.player && b.y < state.player + PADDLE) {
          b.vx = Math.abs(b.vx) * 1.05;
          b.vy += (b.y - (state.player + PADDLE / 2)) * 0.12;
        }
        if (b.vx > 0 && b.x > W - 16 && b.y > state.ai && b.y < state.ai + PADDLE) {
          b.vx = -Math.abs(b.vx) * 1.05;
          b.vy += (b.y - (state.ai + PADDLE / 2)) * 0.12;
        }
        b.vx = Math.max(-7, Math.min(7, b.vx));
        b.vy = Math.max(-5, Math.min(5, b.vy));

        if (b.x < 0 || b.x > W) {
          state.scores[b.x < 0 ? 1 : 0]++;
          if (state.scores.some(s => s >= TO_WIN)) state.over = true;
          reset(b.x < 0 ? 1 : -1);
          state.paused = 40;
        }
      }
      draw();
      if (overlay) frame = requestAnimationFrame(step);
    }

    function draw() {
      const c = colours();
      g.fillStyle = c.bg;
      g.fillRect(0, 0, W, H);
      g.fillStyle = c.fg;
      for (let y = 0; y < H; y += 12) g.fillRect(W / 2 - 1, y, 2, 6); // centre net
      g.fillStyle = c.accent;
      g.fillRect(8, state.player, 6, PADDLE);
      g.fillRect(W - 14, state.ai, 6, PADDLE);
      g.fillStyle = c.fg;
      g.fillRect(state.ball.x - 3, state.ball.y - 3, 6, 6);

      g.font = '28px ui-monospace, Menlo, Consolas, monospace';
      g.textAlign = 'center';
      g.fillText(state.scores[0], W / 2 - 40, 34);
      g.fillText(state.scores[1], W / 2 + 40, 34);

      if (state.over) {
        g.font = '16px ui-monospace, Menlo, Consolas, monospace';
        g.fillStyle = c.accent;
        const winner = state.scores[0] >= TO_WIN ? 'You win' : 'AI wins';
        g.fillText(`${winner}. Click to play again`, W / 2, H / 2 + 6);
      }
    }

    function stop() {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      overlay?.remove();
      overlay = null;
    }

    overlay.querySelector('button').onclick = stop;
    frame = requestAnimationFrame(step);
  }

  window.Todo.Pong = { start };
})();
