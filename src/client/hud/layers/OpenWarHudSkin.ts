const STYLE_ID = "open-war-tactical-hud-skin";

const HUD_STYLES = `
:root {
  --ow-hud-panel: rgba(8, 19, 33, 0.96);
  --ow-hud-line: rgba(126, 174, 210, 0.28);
  --ow-hud-line-strong: rgba(95, 174, 226, 0.7);
  --ow-hud-blue: #66b9ef;
  --ow-hud-gold: #ffd166;
}

.ow-hud-resource-panel {
  position: relative;
  isolation: isolate;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--ow-hud-line);
  border-radius: 13px;
  background: var(--ow-hud-panel);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(14px);
}

.ow-hud-resource-panel .border-gray-600 {
  border-color: rgba(139, 169, 194, 0.38);
}

.ow-hud-resource-panel .border-yellow-400 {
  border-color: rgba(255, 209, 102, 0.75);
  background: rgba(255, 209, 102, 0.06);
}

.ow-hud-resource-panel input[type="range"] {
  accent-color: var(--ow-hud-blue);
}

.ow-hud-resource-panel input[type="range"]:focus-visible {
  outline: 2px solid var(--ow-hud-blue);
  outline-offset: 3px;
}

.ow-hud-buildbar {
  padding: 0.42rem;
  border: 1px solid var(--ow-hud-line);
  border-radius: 13px;
  background: rgba(7, 17, 30, 0.97);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(14px);
}

.ow-hud-buildbar .ow-hud-build-button {
  appearance: none;
  color: inherit;
  font: inherit;
  text-align: center;
  min-height: 52px;
  border: 1px solid rgba(130, 170, 198, 0.3);
  border-radius: 10px;
  background: rgba(24, 45, 65, 0.94);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition: border-color 140ms ease, transform 140ms ease;
}

.ow-hud-buildbar .ow-hud-build-button:hover {
  border-color: var(--ow-hud-line-strong);
  background: rgba(35, 78, 110, 0.96);
  transform: translateY(-1px);
}

.ow-hud-buildbar .ow-hud-build-button[data-selected="true"] {
  border-color: var(--ow-hud-blue);
  background: rgba(35, 104, 151, 0.65);
  box-shadow: 0 0 0 1px rgba(102, 185, 239, 0.2);
}

.ow-hud-buildbar .ow-hud-build-button:focus-visible {
  outline: 2px solid var(--ow-hud-gold);
  outline-offset: 2px;
}

.ow-hud-buildbar .ow-hud-build-button img {
  max-width: 27px;
  max-height: 27px;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.45));
}

.ow-hud-control-rail {
  gap: 0.3rem;
  padding: 0.42rem;
  border: 1px solid var(--ow-hud-line);
  border-radius: 0 0 0 13px;
  background: rgba(5, 14, 26, 0.97);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(14px);
}

.ow-hud-control-rail > div:has(> img) {
  display: flex;
  min-width: 38px;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.03);
  transition: border-color 140ms ease, background-color 140ms ease;
}

.ow-hud-control-rail > div:has(> img):hover {
  border-color: var(--ow-hud-line-strong);
  background: rgba(59, 130, 180, 0.2);
}

.ow-hud-control-rail > div:has(> img) img {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45));
}

.ow-hud-control-rail [data-game-timer] {
  padding: 0.25rem 0.35rem;
  color: #eef6fc;
  font-variant-numeric: tabular-nums;
}

.ow-hud-player-card {
  border: 1px solid var(--ow-hud-line);
  background: rgba(7, 15, 27, 0.98);
  box-shadow: 0 22px 56px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(16px);
}

player-stats .stats-table,
team-stats .stats-table {
  position: relative;
  isolation: isolate;
  border: 1px solid var(--ow-hud-line);
  border-radius: 0 0 14px 0;
  background: var(--ow-hud-panel);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(14px);
}

.ow-hud-leaderboard-panel [role="button"] {
  border-color: rgba(126, 174, 210, 0.34);
  border-radius: 9px;
  background: rgba(20, 42, 62, 0.92);
  transition: border-color 140ms ease, background-color 140ms ease;
}

.ow-hud-leaderboard-panel [role="button"]:hover {
  border-color: var(--ow-hud-line-strong);
  background: rgba(35, 78, 110, 0.92);
}

.ow-hud-leaderboard-panel [role="button"]:focus-visible {
  outline: 2px solid var(--ow-hud-gold);
  outline-offset: 2px;
}

.ow-hud-leaderboard-panel player-stats,
.ow-hud-leaderboard-panel team-stats {
  min-width: 0;
}

@media (max-width: 1024px) {
  player-stats .stats-table,
team-stats .stats-table {
    border-radius: 0 0 14px 0;
  }

  .ow-hud-buildbar {
    padding: 0.3rem;
    border-radius: 11px;
  }

  .ow-hud-buildbar .ow-hud-build-button {
    min-height: 46px;
    border-radius: 8px;
  }

  .ow-hud-control-rail {
    padding: 0.3rem;
  }

  .ow-hud-control-rail > div:has(> img) {
    min-width: 40px;
    min-height: 40px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ow-hud-buildbar .ow-hud-build-button,
  .ow-hud-control-rail > div:has(> img) {
    transition: none;
  }

  .ow-hud-buildbar .ow-hud-build-button:hover {
    transform: none;
  }
}

/* Tactical match HUD: unify the live leaderboard and communications surfaces. */
player-stats .stats-table,
team-stats .stats-table {
  border: 1px solid var(--ow-hud-line);
  border-radius: 14px;
  background: rgba(7, 17, 30, 0.94);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(14px);
  overflow: hidden;
}

player-stats .stats-table-content,
team-stats .stats-table-content {
  color: #edf5fb;
}

player-stats .stats-table-header,
team-stats .stats-table-header {
  background: linear-gradient(180deg, rgba(26, 52, 75, 0.98), rgba(12, 27, 43, 0.98));
  color: #c8e0f2;
}

player-stats .stats-table-header-cell,
team-stats .stats-table-header-cell {
  border-color: rgba(126, 174, 210, 0.22);
}

player-stats .stats-table-row,
team-stats .stats-table-row {
  background: rgba(12, 26, 41, 0.72);
  transition: background-color 140ms ease;
}

player-stats .stats-table-row:nth-child(even),
team-stats .stats-table-row:nth-child(even) {
  background: rgba(16, 34, 51, 0.84);
}

player-stats .stats-table-row:hover,
team-stats .stats-table-row:hover {
  background: rgba(39, 82, 116, 0.66);
}

player-stats .stats-table-pinned-row,
team-stats .stats-table-pinned-row {
  border-top: 1px solid rgba(102, 185, 239, 0.58);
  background: rgba(25, 78, 112, 0.82) !important;
  color: #ffffff;
}

player-stats .stats-table-scroll,
team-stats .stats-table-scroll {
  scrollbar-color: rgba(102, 185, 239, 0.55) rgba(7, 17, 30, 0.8);
  scrollbar-width: thin;
}

player-stats button:focus-visible,
team-stats button:focus-visible {
  outline: 2px solid var(--ow-hud-gold);
  outline-offset: 2px;
}

chat-display > div {
  border: 1px solid var(--ow-hud-line);
  border-radius: 13px;
  background: rgba(7, 17, 30, 0.94) !important;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(14px);
  overflow: hidden;
}

chat-display > div > div > div:first-child {
  border-bottom: 1px solid rgba(126, 174, 210, 0.2);
  background: rgba(15, 34, 52, 0.98) !important;
}

chat-display button,
.ow-hud-chat-feed__collapsed-toggle {
  color: #d9eafa;
  transition: color 140ms ease, background-color 140ms ease;
}

chat-display button:hover,
.ow-hud-chat-feed__collapsed-toggle:hover {
  color: #ffffff;
}

chat-display table {
  background: transparent;
}

chat-display tr {
  border-color: rgba(126, 174, 210, 0.12);
}

chat-display tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.025);
}

.ow-hud-chat-overlay {
  background: rgba(1, 7, 14, 0.72) !important;
  backdrop-filter: blur(7px);
}

.ow-hud-chat-modal {
  border: 1px solid rgba(102, 185, 239, 0.34);
  border-radius: 16px !important;
  background:
    radial-gradient(ellipse at 10% 0%, rgba(42, 105, 151, 0.24), transparent 52%),
    linear-gradient(145deg, rgba(10, 24, 39, 0.99), rgba(7, 15, 27, 0.99)) !important;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.58) !important;
}

.ow-hud-chat-close {
  border: 1px solid rgba(126, 174, 210, 0.36);
  background: rgba(18, 42, 63, 0.98) !important;
}

.ow-hud-chat-close:hover {
  border-color: rgba(255, 98, 109, 0.7);
}

.ow-hud-chat-modal h2 {
  color: #f2f8fd;
  letter-spacing: 0.015em;
}

.ow-hud-chat-category-title {
  margin-bottom: 0.45rem !important;
  color: #8fc6eb !important;
  letter-spacing: 0.12em !important;
}

.ow-hud-chat-chip {
  border: 1px solid rgba(126, 174, 210, 0.17);
  border-left: 2px solid rgba(102, 185, 239, 0.58);
  border-radius: 8px !important;
  background: rgba(29, 55, 78, 0.72) !important;
  color: #e8f3fb !important;
  transition: border-color 140ms ease, background-color 140ms ease, transform 140ms ease;
}

.ow-hud-chat-chip:hover {
  border-color: rgba(102, 185, 239, 0.64);
  background: rgba(37, 83, 119, 0.92) !important;
  transform: translateY(-1px);
}

.ow-hud-chat-search,
.ow-hud-chat-modal input {
  border: 1px solid rgba(126, 174, 210, 0.25);
  border-radius: 8px;
  background: rgba(5, 15, 26, 0.95) !important;
  color: #f1f7fc !important;
}

.ow-hud-chat-search:focus,
.ow-hud-chat-modal input:focus {
  border-color: var(--ow-hud-blue);
  outline: 2px solid rgba(102, 185, 239, 0.24);
}

.ow-hud-chat-modal button:focus-visible,
chat-display button:focus-visible {
  outline: 2px solid var(--ow-hud-gold);
  outline-offset: 2px;
}

@media (max-width: 600px) {
  chat-display > div {
    max-width: min(100vw - 1rem, 30rem);
    border-radius: 11px;
  }

  .ow-hud-chat-modal {
    width: min(44rem, calc(100vw - 16px));
    max-height: calc(100dvh - 32px - env(safe-area-inset-bottom));
    overflow-y: auto;
  }

  player-stats .stats-table,
team-stats .stats-table {
    max-width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ow-hud-chat-chip,
  chat-display button,
  .ow-hud-chat-feed__collapsed-toggle,
  .ow-hud-chat-modal button {
    transition: none;
  }

  .ow-hud-chat-chip:hover {
    transform: none;
  }
}

`;

if (
  typeof document !== "undefined" &&
  document.head &&
  !document.getElementById(STYLE_ID)
) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = HUD_STYLES;
  document.head.append(style);
}
