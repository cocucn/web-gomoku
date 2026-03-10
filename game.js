const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];
const LEVEL_LABELS = {
  easy: "低级",
  medium: "中级",
  hard: "高级",
};
const HARD_SEARCH_DEPTH = 3;
const HARD_ROOT_WIDTH = 6;
const HARD_BRANCH_WIDTH = 5;
const SEARCH_WIN_SCORE = 100000000;

const state = {
  board: createBoard(),
  moves: [],
  currentPlayer: BLACK,
  humanColor: BLACK,
  aiColor: WHITE,
  aiLevel: "medium",
  humanAssistEnabled: false,
  humanAssistLevel: "medium",
  forbidBlack: false,
  showMoveNumbers: false,
  gameOver: false,
  winner: null,
  message: "准备开始一局新游戏。",
  lastMoveAt: null,
};

const elements = {
  canvas: document.getElementById("boardCanvas"),
  statusText: document.getElementById("statusText"),
  turnText: document.getElementById("turnText"),
  messageBar: document.getElementById("messageBar"),
  humanColor: document.getElementById("humanColor"),
  aiLevel: document.getElementById("aiLevel"),
  forbidBlack: document.getElementById("forbidBlack"),
  showMoveNumbers: document.getElementById("showMoveNumbers"),
  humanAssistEnabled: document.getElementById("humanAssistEnabled"),
  humanAssistLevel: document.getElementById("humanAssistLevel"),
  newGameBtn: document.getElementById("newGameBtn"),
  undoBtn: document.getElementById("undoBtn"),
  assistMoveBtn: document.getElementById("assistMoveBtn"),
};

const ctx = elements.canvas.getContext("2d");
let boardGeometry = null;
let autoMoveTimer = null;

function createBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
}

function resetStateFromControls() {
  state.board = createBoard();
  state.moves = [];
  state.currentPlayer = BLACK;
  state.humanColor = Number(elements.humanColor.value);
  state.aiColor = state.humanColor === BLACK ? WHITE : BLACK;
  state.aiLevel = elements.aiLevel.value;
  state.humanAssistEnabled = elements.humanAssistEnabled.checked;
  state.humanAssistLevel = elements.humanAssistLevel.value;
  state.forbidBlack = elements.forbidBlack.checked;
  state.showMoveNumbers = elements.showMoveNumbers.checked;
  state.gameOver = false;
  state.winner = null;
  state.message = "新对局已开始。";
  state.lastMoveAt = null;
}

function syncStateFromControls() {
  state.humanColor = Number(elements.humanColor.value);
  state.aiColor = state.humanColor === BLACK ? WHITE : BLACK;
  state.aiLevel = elements.aiLevel.value;
  state.humanAssistEnabled = elements.humanAssistEnabled.checked;
  state.humanAssistLevel = elements.humanAssistLevel.value;
  state.forbidBlack = elements.forbidBlack.checked;
  state.showMoveNumbers = elements.showMoveNumbers.checked;
}

function startNewGame() {
  clearAutoMove();
  resetStateFromControls();
  updateStatus();
  resizeCanvas();
  drawBoard();
  scheduleAutoIfNeeded();
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = elements.canvas.getBoundingClientRect();
  const size = Math.floor(Math.min(rect.width, rect.height));
  elements.canvas.width = size * dpr;
  elements.canvas.height = size * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  const padding = Math.max(18, size * 0.055);
  const cell = (size - padding * 2) / (BOARD_SIZE - 1);
  boardGeometry = { size, padding, cell };
}

function drawBoard() {
  const { size, padding, cell } = boardGeometry;
  ctx.clearRect(0, 0, size, size);

  ctx.fillStyle = "#e0ba73";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(77, 43, 19, 0.82)";
  ctx.lineWidth = 1;
  for (let i = 0; i < BOARD_SIZE; i += 1) {
    const pos = padding + i * cell;
    ctx.beginPath();
    ctx.moveTo(padding, pos);
    ctx.lineTo(size - padding, pos);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pos, padding);
    ctx.lineTo(pos, size - padding);
    ctx.stroke();
  }

  drawStarPoints();
  drawMoves();
}

function drawStarPoints() {
  const stars = [3, 7, 11];
  ctx.fillStyle = "#5d2f14";
  for (const row of stars) {
    for (const col of stars) {
      const { x, y } = toCanvasPoint(row, col);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(3, boardGeometry.cell * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawMoves() {
  const radius = boardGeometry.cell * 0.42;
  for (const move of state.moves) {
    const { x, y } = toCanvasPoint(move.row, move.col);
    const gradient = ctx.createRadialGradient(
      x - radius * 0.25,
      y - radius * 0.25,
      radius * 0.2,
      x,
      y,
      radius
    );

    if (move.player === BLACK) {
      gradient.addColorStop(0, "#5c5c5c");
      gradient.addColorStop(0.25, "#2f2f2f");
      gradient.addColorStop(1, "#060606");
    } else {
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.7, "#ece8df");
      gradient.addColorStop(1, "#c8c3bb");
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (state.lastMoveAt && state.lastMoveAt.row === move.row && state.lastMoveAt.col === move.col) {
      ctx.strokeStyle = move.player === BLACK ? "#ffdf7b" : "#cb4a1e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (state.showMoveNumbers) {
      ctx.fillStyle = move.player === BLACK ? "#f6f1de" : "#2b1c12";
      ctx.font = `600 ${Math.max(10, radius * 0.9)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(move.moveNo), x, y + 0.5);
    }
  }
}

function toCanvasPoint(row, col) {
  return {
    x: boardGeometry.padding + col * boardGeometry.cell,
    y: boardGeometry.padding + row * boardGeometry.cell,
  };
}

function getBoardPosition(event) {
  const rect = elements.canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const col = Math.round((x - boardGeometry.padding) / boardGeometry.cell);
  const row = Math.round((y - boardGeometry.padding) / boardGeometry.cell);
  if (!isInside(row, col)) {
    return null;
  }
  const point = toCanvasPoint(row, col);
  const threshold = boardGeometry.cell * 0.46;
  if (Math.abs(point.x - x) > threshold || Math.abs(point.y - y) > threshold) {
    return null;
  }
  return { row, col };
}

function isInside(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function handleCanvasClick(event) {
  if (!boardGeometry || state.gameOver) {
    return;
  }
  if (state.currentPlayer !== state.humanColor) {
    setMessage("当前不是玩家手动回合。");
    return;
  }
  if (state.humanAssistEnabled) {
    setMessage("玩家托管已开启，当前回合由托管 AI 执行。");
    return;
  }
  const pos = getBoardPosition(event);
  if (!pos) {
    return;
  }
  attemptMove(pos.row, pos.col, state.currentPlayer, false);
}

function attemptMove(row, col, player, force = false) {
  if (state.gameOver || !isInside(row, col) || state.board[row][col] !== EMPTY) {
    return false;
  }

  if (!force && player === BLACK && state.forbidBlack) {
    const forbidden = getForbiddenReason(state.board, row, col, player);
    if (forbidden) {
      setMessage(`该位置为黑棋禁手：${forbidden}`);
      updateStatus();
      return false;
    }
  }

  placeMove(row, col, player);
  return true;
}

function placeMove(row, col, player) {
  state.board[row][col] = player;
  const move = { row, col, player, moveNo: state.moves.length + 1 };
  state.moves.push(move);
  state.lastMoveAt = { row, col };

  const result = evaluateResult(row, col, player);
  if (result.win) {
    state.gameOver = true;
    state.winner = player;
    setMessage(`${playerLabel(player)}获胜。`);
  } else if (state.moves.length === BOARD_SIZE * BOARD_SIZE) {
    state.gameOver = true;
    state.winner = "draw";
    setMessage("棋盘已满，平局。");
  } else {
    state.currentPlayer = opponentOf(player);
    setMessage(`${playerLabel(player)}已落子，轮到${playerLabel(state.currentPlayer)}。`);
  }

  updateStatus();
  drawBoard();
  scheduleAutoIfNeeded();
}

function evaluateResult(row, col, player) {
  for (const [dr, dc] of DIRECTIONS) {
    const count = countContinuous(state.board, row, col, dr, dc, player);
    if (count >= 5) {
      return { win: true };
    }
  }
  return { win: false };
}

function countContinuous(board, row, col, dr, dc, player) {
  let count = 1;
  count += countDirection(board, row, col, dr, dc, player);
  count += countDirection(board, row, col, -dr, -dc, player);
  return count;
}

function countDirection(board, row, col, dr, dc, player) {
  let r = row + dr;
  let c = col + dc;
  let count = 0;
  while (isInside(r, c) && board[r][c] === player) {
    count += 1;
    r += dr;
    c += dc;
  }
  return count;
}

function opponentOf(player) {
  return player === BLACK ? WHITE : BLACK;
}

function playerLabel(player) {
  return player === BLACK ? "黑棋" : "白棋";
}

function updateStatus() {
  if (state.gameOver) {
    if (state.winner === "draw") {
      elements.statusText.textContent = "平局";
      elements.turnText.textContent = "本局结束，可重新开始或悔棋。";
    } else {
      elements.statusText.textContent = `${playerLabel(state.winner)}胜`;
      elements.turnText.textContent = "本局结束，可重新开始或悔棋返回。";
    }
  } else {
    elements.statusText.textContent = `${playerLabel(state.currentPlayer)}回合`;
    const sideText = `玩家：${playerLabel(state.humanColor)}｜AI：${playerLabel(state.aiColor)}（${LEVEL_LABELS[state.aiLevel]}）`;
    const assistText = state.humanAssistEnabled ? `｜托管：${LEVEL_LABELS[state.humanAssistLevel]}` : "";
    elements.turnText.textContent = `${sideText}${assistText}`;
  }

  elements.messageBar.textContent = state.message;
  elements.undoBtn.disabled = state.moves.length === 0;
  elements.assistMoveBtn.disabled = state.gameOver;
}

function setMessage(message) {
  state.message = message;
}

function undoMoves() {
  if (!state.moves.length) {
    return;
  }
  clearAutoMove();
  const steps = state.moves.length >= 2 ? 2 : 1;
  for (let i = 0; i < steps; i += 1) {
    const move = state.moves.pop();
    state.board[move.row][move.col] = EMPTY;
  }
  state.gameOver = false;
  state.winner = null;
  state.currentPlayer = state.moves.length ? opponentOf(state.moves[state.moves.length - 1].player) : BLACK;
  state.lastMoveAt = state.moves.length
    ? { row: state.moves[state.moves.length - 1].row, col: state.moves[state.moves.length - 1].col }
    : null;
  setMessage(`已悔棋，回退${steps}步。`);
  updateStatus();
  drawBoard();
  scheduleAutoIfNeeded();
}

function getPlayableCandidates(board) {
  if (!hasAnyStone(board)) {
    const center = Math.floor(BOARD_SIZE / 2);
    return [{ row: center, col: center }];
  }

  const candidates = [];
  const visited = new Set();
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col] !== EMPTY) {
        continue;
      }
      if (!hasNeighbor(board, row, col, 2)) {
        continue;
      }
      const key = `${row},${col}`;
      if (!visited.has(key)) {
        visited.add(key);
        candidates.push({ row, col });
      }
    }
  }
  return candidates;
}

function hasAnyStone(board) {
  return board.some((line) => line.some((cell) => cell !== EMPTY));
}

function hasNeighbor(board, row, col, distance) {
  for (let dr = -distance; dr <= distance; dr += 1) {
    for (let dc = -distance; dc <= distance; dc += 1) {
      if (!dr && !dc) {
        continue;
      }
      const r = row + dr;
      const c = col + dc;
      if (isInside(r, c) && board[r][c] !== EMPTY) {
        return true;
      }
    }
  }
  return false;
}

function cloneBoard(board) {
  return board.map((line) => line.slice());
}

function chooseAiMove(level, player) {
  const board = state.board;
  const candidates = getPlayableCandidates(board);
  const legalCandidates = candidates.filter(({ row, col }) => (
    !(state.forbidBlack && player === BLACK && getForbiddenReason(board, row, col, player))
  ));
  const pool = legalCandidates.length ? legalCandidates : candidates;

  if (!state.moves.length) {
    return chooseOpeningMove(pool);
  }

  for (const move of pool) {
    const testBoard = cloneBoard(board);
    testBoard[move.row][move.col] = player;
    if (isWinningMove(testBoard, move.row, move.col, player)) {
      return move;
    }
  }

  const enemy = opponentOf(player);
  for (const move of pool) {
    const testBoard = cloneBoard(board);
    testBoard[move.row][move.col] = enemy;
    if (isWinningMove(testBoard, move.row, move.col, enemy)) {
      return move;
    }
  }

  const scored = pool.map((move) => scoreCandidate(board, move.row, move.col, player, level));
  scored.sort((a, b) => b.score - a.score);
  if (!scored.length) {
    return null;
  }

  if (level === "easy") {
    return pickWeightedMove(scored, 5, 0.22);
  }

  if (level === "medium") {
    return pickWeightedMove(scored, 4, 0.08);
  }

  return selectHardMove(board, scored, player);
}

function selectHardMove(board, scoredCandidates, player) {
  const shortlist = scoredCandidates.slice(0, Math.min(HARD_ROOT_WIDTH, scoredCandidates.length));
  const evaluated = [];

  for (const move of shortlist) {
    const testBoard = cloneBoard(board);
    testBoard[move.row][move.col] = player;
    const value = searchBestMove(
      testBoard,
      HARD_SEARCH_DEPTH - 1,
      opponentOf(player),
      player,
      { row: move.row, col: move.col, player },
      -SEARCH_WIN_SCORE,
      SEARCH_WIN_SCORE
    );
    evaluated.push({ row: move.row, col: move.col, score: value });
  }

  evaluated.sort((a, b) => b.score - a.score);
  return pickWeightedMove(evaluated, 2, 0.015);
}

function scoreCandidate(board, row, col, player, level) {
  const enemy = opponentOf(player);
  const attack = evaluatePositionScore(board, row, col, player);
  const defend = evaluatePositionScore(board, row, col, enemy);
  const centerBias = 7 - (Math.abs(7 - row) + Math.abs(7 - col)) * 0.35;

  let score = attack * 1.05 + defend * 0.95 + centerBias;
  if (level === "easy") {
    score = attack * 0.8 + defend * 0.65 + centerBias + Math.random() * 28;
  } else if (level === "hard") {
    score = attack * 1.18 + defend * 1.08 + centerBias;
  }

  if (state.forbidBlack && player === BLACK) {
    const reason = getForbiddenReason(board, row, col, player);
    if (reason) {
      score = -Infinity;
    }
  }

  return { row, col, score };
}

function chooseOpeningMove(pool) {
  const center = Math.floor(BOARD_SIZE / 2);
  const preferred = pool.filter(({ row, col }) => (
    Math.abs(row - center) <= 1 && Math.abs(col - center) <= 1
  ));
  const openingPool = preferred.length ? preferred : pool;
  return openingPool[Math.floor(Math.random() * openingPool.length)];
}

function pickWeightedMove(sortedMoves, limit, spreadRatio) {
  const shortlist = sortedMoves.slice(0, Math.min(limit, sortedMoves.length));
  if (shortlist.length === 1) {
    return shortlist[0];
  }

  const bestScore = shortlist[0].score;
  const threshold = Math.max(1, Math.abs(bestScore) * spreadRatio);
  const nearBest = shortlist.filter((move) => bestScore - move.score <= threshold);
  const selectionPool = nearBest.length ? nearBest : shortlist;
  return selectionPool[Math.floor(Math.random() * selectionPool.length)];
}

function searchBestMove(board, depth, currentPlayer, rootPlayer, lastMove, alpha, beta) {
  if (lastMove && isWinningMove(board, lastMove.row, lastMove.col, lastMove.player)) {
    const wonByRoot = lastMove.player === rootPlayer;
    const depthBias = depth * 1000;
    return wonByRoot ? SEARCH_WIN_SCORE + depthBias : -SEARCH_WIN_SCORE - depthBias;
  }

  const candidates = getScoredMovesForBoard(board, currentPlayer, "hard", HARD_BRANCH_WIDTH);
  if (depth === 0 || !candidates.length) {
    return evaluateBoardForPlayer(board, rootPlayer);
  }

  if (currentPlayer === rootPlayer) {
    let best = -SEARCH_WIN_SCORE;
    for (const move of candidates) {
      const nextBoard = cloneBoard(board);
      nextBoard[move.row][move.col] = currentPlayer;
      const value = searchBestMove(
        nextBoard,
        depth - 1,
        opponentOf(currentPlayer),
        rootPlayer,
        { row: move.row, col: move.col, player: currentPlayer },
        alpha,
        beta
      );
      best = Math.max(best, value);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) {
        break;
      }
    }
    return best;
  }

  let best = SEARCH_WIN_SCORE;
  for (const move of candidates) {
    const nextBoard = cloneBoard(board);
    nextBoard[move.row][move.col] = currentPlayer;
    const value = searchBestMove(
      nextBoard,
      depth - 1,
      opponentOf(currentPlayer),
      rootPlayer,
      { row: move.row, col: move.col, player: currentPlayer },
      alpha,
      beta
    );
    best = Math.min(best, value);
    beta = Math.min(beta, best);
    if (beta <= alpha) {
      break;
    }
  }
  return best;
}

function getScoredMovesForBoard(board, player, level, width) {
  const candidates = getPlayableCandidates(board)
    .filter(({ row, col }) => !(state.forbidBlack && player === BLACK && getForbiddenReason(board, row, col, player)))
    .map(({ row, col }) => scoreCandidate(board, row, col, player, level))
    .filter((move) => Number.isFinite(move.score));

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, Math.min(width, candidates.length));
}

function evaluateBoardForPlayer(board, player) {
  const ownMoves = getScoredMovesForBoard(board, player, "hard", 4);
  const enemyMoves = getScoredMovesForBoard(board, opponentOf(player), "hard", 4);
  const ownScore = ownMoves.length ? ownMoves[0].score + (ownMoves[1]?.score || 0) * 0.45 : 0;
  const enemyScore = enemyMoves.length ? enemyMoves[0].score + (enemyMoves[1]?.score || 0) * 0.45 : 0;
  return ownScore - enemyScore * 1.08;
}

function evaluatePositionScore(board, row, col, player) {
  const testBoard = cloneBoard(board);
  testBoard[row][col] = player;
  let score = 0;

  for (const [dr, dc] of DIRECTIONS) {
    const pattern = getLinePattern(testBoard, row, col, dr, dc, player);
    score += lineScore(pattern.count, pattern.openEnds);
  }

  if (isWinningMove(testBoard, row, col, player)) {
    score += 1000000;
  }

  const openThrees = countOpenThrees(testBoard, row, col, player);
  const fours = countFours(testBoard, row, col, player);
  score += openThrees * 850 + fours * 2200;

  return score;
}

function getLinePattern(board, row, col, dr, dc, player) {
  let count = 1;
  let openEnds = 0;

  let step = 1;
  while (isInside(row + dr * step, col + dc * step) && board[row + dr * step][col + dc * step] === player) {
    count += 1;
    step += 1;
  }
  if (isInside(row + dr * step, col + dc * step) && board[row + dr * step][col + dc * step] === EMPTY) {
    openEnds += 1;
  }

  step = 1;
  while (isInside(row - dr * step, col - dc * step) && board[row - dr * step][col - dc * step] === player) {
    count += 1;
    step += 1;
  }
  if (isInside(row - dr * step, col - dc * step) && board[row - dr * step][col - dc * step] === EMPTY) {
    openEnds += 1;
  }

  return { count, openEnds };
}

function lineScore(count, openEnds) {
  if (count >= 5) return 100000;
  if (count === 4 && openEnds === 2) return 18000;
  if (count === 4 && openEnds === 1) return 5200;
  if (count === 3 && openEnds === 2) return 2400;
  if (count === 3 && openEnds === 1) return 520;
  if (count === 2 && openEnds === 2) return 180;
  if (count === 2 && openEnds === 1) return 60;
  if (count === 1 && openEnds === 2) return 14;
  return 5;
}

function isWinningMove(board, row, col, player) {
  return DIRECTIONS.some(([dr, dc]) => countContinuous(board, row, col, dr, dc, player) >= 5);
}

function scheduleAutoIfNeeded() {
  clearAutoMove();
  if (state.gameOver) {
    return;
  }

  const aiTurn = state.currentPlayer === state.aiColor;
  const assistTurn = state.currentPlayer === state.humanColor && state.humanAssistEnabled;
  if (!aiTurn && !assistTurn) {
    return;
  }

  autoMoveTimer = window.setTimeout(() => {
    const level = aiTurn ? state.aiLevel : state.humanAssistLevel;
    const actor = aiTurn ? "AI" : "托管 AI";
    const move = chooseAiMove(level, state.currentPlayer);
    if (!move) {
      state.gameOver = true;
      state.winner = "draw";
      setMessage("没有可用落点，平局。");
      updateStatus();
      drawBoard();
      return;
    }
    setMessage(`${actor}（${LEVEL_LABELS[level]}）正在落子。`);
    updateStatus();
    attemptMove(move.row, move.col, state.currentPlayer, false);
  }, 360);
}

function clearAutoMove() {
  if (autoMoveTimer) {
    window.clearTimeout(autoMoveTimer);
    autoMoveTimer = null;
  }
}

function getForbiddenReason(board, row, col, player) {
  if (player !== BLACK || board[row][col] !== EMPTY) {
    return null;
  }
  const testBoard = cloneBoard(board);
  testBoard[row][col] = player;

  if (hasOverline(testBoard, row, col, player)) {
    return "长连";
  }
  const fours = countFours(testBoard, row, col, player);
  if (fours >= 2) {
    return "双四";
  }
  const threes = countOpenThrees(testBoard, row, col, player);
  if (threes >= 2) {
    return "双三";
  }
  return null;
}

function hasOverline(board, row, col, player) {
  return DIRECTIONS.some(([dr, dc]) => countContinuous(board, row, col, dr, dc, player) >= 6);
}

function countFours(board, row, col, player) {
  let total = 0;
  for (const [dr, dc] of DIRECTIONS) {
    const line = buildLine(board, row, col, dr, dc, player);
    total += countLinePatterns(line, [
      ".XXXX.",
      ".XXXXO",
      "OXXXX.",
      ".XXX.X.",
      ".XX.XX.",
      ".X.XXX.",
      "OXXX.X.",
      "OXX.XX.",
      "OX.XXX.",
      ".XXX.XO",
      ".XX.XXO",
      ".X.XXXO",
    ]);
  }
  return total;
}

function countOpenThrees(board, row, col, player) {
  let total = 0;
  for (const [dr, dc] of DIRECTIONS) {
    const line = buildLine(board, row, col, dr, dc, player);
    total += countLinePatterns(line, [
      ".XXX.",
      ".XX.X.",
      ".X.XX.",
      ".X.X.X.",
    ]);
  }
  return total;
}

function buildLine(board, row, col, dr, dc, player) {
  const chars = [];
  for (let step = -4; step <= 4; step += 1) {
    const r = row + dr * step;
    const c = col + dc * step;
    if (!isInside(r, c)) {
      chars.push("O");
    } else if (board[r][c] === EMPTY) {
      chars.push(".");
    } else if (board[r][c] === player) {
      chars.push("X");
    } else {
      chars.push("O");
    }
  }
  return chars.join("");
}

function countLinePatterns(line, patterns) {
  let count = 0;
  for (const pattern of patterns) {
    if (line.includes(pattern)) {
      count += 1;
    }
  }
  return count;
}

function handleAssistMove() {
  if (state.gameOver) {
    return;
  }
  const isAiTurn = state.currentPlayer === state.aiColor;
  const isHumanAssistTurn = state.currentPlayer === state.humanColor;
  if (!isAiTurn && !isHumanAssistTurn) {
    return;
  }
  clearAutoMove();
  const level = isAiTurn ? state.aiLevel : state.humanAssistLevel;
  const move = chooseAiMove(level, state.currentPlayer);
  if (move) {
    attemptMove(move.row, move.col, state.currentPlayer, false);
  }
}

function bindEvents() {
  elements.canvas.addEventListener("click", handleCanvasClick);
  elements.newGameBtn.addEventListener("click", startNewGame);
  elements.undoBtn.addEventListener("click", undoMoves);
  elements.assistMoveBtn.addEventListener("click", handleAssistMove);

  elements.showMoveNumbers.addEventListener("change", () => {
    syncStateFromControls();
    drawBoard();
    updateStatus();
  });

  elements.humanColor.addEventListener("change", () => {
    if (state.moves.length) {
      setMessage("玩家执子变更将在下一局生效。");
      updateStatus();
      return;
    }
    syncStateFromControls();
    updateStatus();
    scheduleAutoIfNeeded();
  });

  [elements.aiLevel, elements.forbidBlack, elements.humanAssistEnabled, elements.humanAssistLevel].forEach((element) => {
    element.addEventListener("change", () => {
      syncStateFromControls();
      updateStatus();
      scheduleAutoIfNeeded();
    });
  });

  window.addEventListener("resize", () => {
    resizeCanvas();
    drawBoard();
  });
}

bindEvents();
resizeCanvas();
drawBoard();
updateStatus();
startNewGame();
