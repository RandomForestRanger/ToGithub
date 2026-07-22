/* Die Caro-Kann in Blokkie-wêreld — game screen controller. Depends on data.js, audio.js, mastery.js, engine.js. */

(function () {
  const CURRENT_PLAYER_KEY = `${GAME_PREFIX}_currentPlayer`;
  const PIECE_THEME = 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png';
  // chessboard.js's own diff-based animation (board.position(fen)) turned out
  // to be a black box that was hard to guarantee visually — even once DOM
  // measurement confirmed real interpolation, it apparently still didn't read
  // as "sliding" in practice. So piece movement is animated explicitly here
  // instead: a cloned <img> is positioned over the source square and its
  // left/top are transitioned to the destination square via CSS, fully under
  // our control. board.position(fen, false) is then used only to sync the
  // final state instantly (no library animation, avoiding any double-animation).
  const BLACK_SLIDE_MS = 350;
  const WHITE_SLIDE_MS = 2000;
  const MATE_PAUSE_MS = 1800; // let the final (mated) position sit on screen before the end panel covers the board

  // ── DOM refs ────────────────────────────────────────────────────────
  const screens = {
    loading: document.getElementById('screen-loading'),
    tutorial: document.getElementById('screen-tutorial'),
    play: document.getElementById('screen-play'),
    end: document.getElementById('screen-end')
  };
  const modalBackdrop = document.getElementById('reveal-popup-backdrop');
  const modalCard = document.getElementById('modal-card');
  const dissolveOverlay = document.getElementById('dissolve-overlay');
  const victoryOverlay = document.getElementById('victory-overlay');
  const vineField = document.getElementById('vine-field');
  const pgnArtifact = document.getElementById('pgn-artifact');
  const pgnArtifactBody = document.getElementById('pgn-artifact-body');
  const gameBubble = document.getElementById('game-bubble');
  const boardEl = document.getElementById('board');
  const emeraldCountEl = document.getElementById('emerald-count');
  const diamondCountEl = document.getElementById('diamond-count');
  const daglightSun = document.getElementById('daglig-sun');
  const moveCounterEl = document.getElementById('move-counter');
  const moveListEl = document.getElementById('move-list');
  const loadingQuoteEl = document.getElementById('loading-quote');

  // ── Player / persistence ───────────────────────────────────────────
  const player = localStorage.getItem(CURRENT_PLAYER_KEY) || PLAYERS[0];
  let masteryState = KKMastery.load(player);

  // ── Game state ──────────────────────────────────────────────────────
  const game = new Chess();
  let board = null;
  let selectedSquare = null;
  let studentTurnAllowed = false;

  let selectedBiome = KKMastery.pickBiome(masteryState); // hidden from student
  let currentPathId = selectedBiome; // resolves to 'bospad'/'karpov' inside Woud
  let scriptState = KKEngine.newScriptState(selectedBiome);
  const session = { scriptState, uciHistory: [], whiteMoveNumber: 0, graceMove: false };

  let whiteMoveCount = 0;
  let blackMoveCount = 0;
  let wrongTries = 0;
  let hintEscalations = 0;
  let emeralds = 0;
  let diamonds = 0;
  let theoryMovesFound = 0;
  let hadBlunder = false;
  let undoUsed = false;
  let forfeitNextEmerald = false;
  let awaitingBlunderDecision = false;
  let scriptSnapshot = null;
  let revealed = false;
  let ambiguousPending = false;
  let gameOverHandled = false;
  const evalHistory = [];

  // ── Helpers ─────────────────────────────────────────────────────────
  function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  function getSquareFromElement(el) {
    let node = el;
    while (node && node.classList) {
      const cls = Array.from(node.classList).find(c => /^square-[a-h][1-8]$/.test(c));
      if (cls) return cls.replace('square-', '');
      node = node.parentElement;
    }
    return null;
  }

  function sanToSquares(fen, san) {
    try {
      const c = new Chess(fen);
      const m = c.move(san);
      return m ? { from: m.from, to: m.to } : null;
    } catch (e) { return null; }
  }

  function toPerspective(entry, fen, side) {
    if (!entry) return 0;
    const sideToMove = fen.split(' ')[1];
    let raw;
    if (entry.mate !== undefined) raw = entry.mate > 0 ? 100000 : -100000;
    else raw = entry.cp;
    const forSideToMove = raw;
    const forRequestedSide = (sideToMove === side) ? forSideToMove : -forSideToMove;
    return forRequestedSide;
  }

  let bubbleTimeoutId = null;
  function showBubble(text, autoClearMs) {
    clearTimeout(bubbleTimeoutId);
    bubbleTimeoutId = null;
    gameBubble.textContent = text;
    gameBubble.classList.remove('score-pop');
    void gameBubble.offsetWidth;
    gameBubble.classList.add('score-pop');
    if (autoClearMs) {
      bubbleTimeoutId = setTimeout(() => { gameBubble.textContent = ''; }, autoClearMs);
    }
  }

  function showModal(html) {
    modalCard.innerHTML = html;
    modalBackdrop.classList.add('visible');
  }
  function hideModal() {
    modalBackdrop.classList.remove('visible');
    modalCard.innerHTML = '';
  }

  function switchScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active', 'flex-active'));
    screens[name].classList.add(name === 'play' ? 'flex-active' : 'active');
  }

  function clearSquareHighlights(cls) {
    document.querySelectorAll('#board .' + cls).forEach(el => el.classList.remove(cls));
  }
  function clearAllHighlights() {
    ['highlight-selected', 'highlight-legal-move', 'highlight-sword'].forEach(clearSquareHighlights);
  }
  function highlightSquare(square, cls) {
    const el = document.querySelector('#board .square-' + square);
    if (el) el.classList.add(cls);
  }

  function updateInventoryUI() {
    emeraldCountEl.textContent = emeralds;
    diamondCountEl.textContent = diamonds;
    moveCounterEl.textContent = `Skuif ${blackMoveCount}/${SCORE.END_MOVE}`;
    const pct = Math.min(100, Math.round((blackMoveCount / SCORE.END_MOVE) * 100));
    daglightSun.style.left = pct + '%';
  }

  function awardEmerald(n, kind) {
    emeralds = Math.max(0, emeralds + n);
    masteryState.lifetimeEmeralds += Math.max(0, n);
    updateInventoryUI();
    if (n > 0) KKAudio.emerald();
  }
  function awardDiamond() {
    diamonds += 1;
    masteryState.lifetimeEmeralds += SCORE.ENGINE_BEST;
    updateInventoryUI();
    KKAudio.diamond();
  }

  const NOTATION_PAGE_SIZE = 6;
  let notationPage = 0;
  const notationPrevBtn = document.getElementById('notation-prev');
  const notationNextBtn = document.getElementById('notation-next');
  const notationPageLabel = document.getElementById('notation-page-label');

  // No scrolling anywhere in the notation panel — paging is a click, not a scroll.
  function renderMoveList(jumpToLatest) {
    const hist = game.history();
    const totalPairs = Math.max(1, Math.ceil(hist.length / 2));
    const totalPages = Math.max(1, Math.ceil(totalPairs / NOTATION_PAGE_SIZE));
    if (jumpToLatest) notationPage = totalPages - 1;
    notationPage = Math.max(0, Math.min(notationPage, totalPages - 1));

    const startPair = notationPage * NOTATION_PAGE_SIZE;
    const endPair = Math.min(totalPairs, startPair + NOTATION_PAGE_SIZE);
    let html = '';
    for (let i = startPair; i < endPair; i++) {
      html += `<div>${i + 1}. ${hist[i * 2] || ''} ${hist[i * 2 + 1] || ''}</div>`;
    }
    moveListEl.innerHTML = html || '<div style="color:var(--text-muted);">Nog geen skuiwe nie.</div>';

    notationPrevBtn.disabled = notationPage <= 0;
    notationNextBtn.disabled = notationPage >= totalPages - 1;
    notationPageLabel.textContent = `${notationPage + 1}/${totalPages}`;
  }

  // Syncs the DOM to the current game.fen() instantly (no library animation —
  // visible movement is handled beforehand by slideMoveOnBoard()).
  function renderBoard() {
    board.position(game.fen(), false);
    clearSquareHighlights('highlight-lastmove');
    const hist = game.history({ verbose: true });
    if (hist.length) {
      const last = hist[hist.length - 1];
      highlightSquare(last.from, 'highlight-lastmove');
      highlightSquare(last.to, 'highlight-lastmove');
    }
    renderMoveList(true);
  }

  // Slides a cloned piece image from fromSq to toSq over the CURRENT (not yet
  // updated) board DOM, then resolves. Call this BEFORE game.move()/renderBoard()
  // so the source still visibly holds the piece and the destination is still
  // whatever it was (empty, or the captured piece) when the slide starts.
  function slidePiece(fromSq, toSq, pieceCode, durationMs) {
    return new Promise(resolve => {
      const fromEl = document.querySelector('#board .square-' + fromSq);
      const toEl = document.querySelector('#board .square-' + toSq);
      if (!fromEl || !toEl) { resolve(); return; }
      const boardRect = boardEl.getBoundingClientRect();
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      [fromEl, toEl].forEach(sq => {
        const p = sq.querySelector('img');
        if (p) p.style.visibility = 'hidden';
      });

      const clone = document.createElement('img');
      clone.src = PIECE_THEME.replace('{piece}', pieceCode);
      clone.style.position = 'absolute';
      clone.style.width = fromRect.width + 'px';
      clone.style.height = fromRect.height + 'px';
      clone.style.left = (fromRect.left - boardRect.left) + 'px';
      clone.style.top = (fromRect.top - boardRect.top) + 'px';
      clone.style.zIndex = '200';
      clone.style.pointerEvents = 'none';
      clone.style.transition = `left ${durationMs}ms ease-in-out, top ${durationMs}ms ease-in-out`;
      boardEl.style.position = boardEl.style.position || 'relative';
      boardEl.appendChild(clone);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          clone.style.left = (toRect.left - boardRect.left) + 'px';
          clone.style.top = (toRect.top - boardRect.top) + 'px';
        });
      });

      setTimeout(() => { clone.remove(); resolve(); }, durationMs + 30);
    });
  }

  // Kingside/queenside castling moves the rook too — chess.js verbose move
  // flags 'k'/'q' tell us which, and the rook's from/to are fixed per side.
  function castleRookMove(moveObj) {
    if (moveObj.flags.includes('k')) return moveObj.color === 'w' ? { from: 'h1', to: 'f1' } : { from: 'h8', to: 'f8' };
    if (moveObj.flags.includes('q')) return moveObj.color === 'w' ? { from: 'a1', to: 'd1' } : { from: 'a8', to: 'd8' };
    return null;
  }

  async function animateMove(moveObj, durationMs) {
    const pieceCode = moveObj.color + moveObj.piece.toUpperCase();
    const tasks = [slidePiece(moveObj.from, moveObj.to, pieceCode, durationMs)];
    const rookMove = castleRookMove(moveObj);
    if (rookMove) tasks.push(slidePiece(rookMove.from, rookMove.to, moveObj.color + 'R', durationMs));
    await Promise.all(tasks);
  }

  // ── Board interaction (tap-to-move) ────────────────────────────────
  function deselect() {
    selectedSquare = null;
    clearSquareHighlights('highlight-selected');
    clearSquareHighlights('highlight-legal-move');
  }

  function selectSquare(square) {
    const moves = game.moves({ square, verbose: true });
    if (!moves.length) return;
    deselect();
    selectedSquare = square;
    highlightSquare(square, 'highlight-selected');
    moves.forEach(m => highlightSquare(m.to, 'highlight-legal-move'));
  }

  function onBoardClick(e) {
    if (!studentTurnAllowed || game.turn() !== 'b') return;
    const square = getSquareFromElement(e.target);
    if (!square) return;
    const piece = game.get(square);
    if (selectedSquare === square) { deselect(); return; }
    if (selectedSquare) {
      const legal = game.moves({ square: selectedSquare, verbose: true }).find(m => m.to === square);
      if (legal) { handleBlackMove(selectedSquare, square, legal); return; }
    }
    if (piece && piece.color === 'b') { selectSquare(square); return; }
    deselect();
  }

  // ── Rails / scoring ─────────────────────────────────────────────────

  function showHint(acceptedMoves, includeTarget) {
    const fenNow = game.fen();
    const squares = sanToSquares(fenNow, acceptedMoves[0]);
    if (!squares) return;
    clearSquareHighlights('highlight-sword');
    highlightSquare(squares.from, 'highlight-sword');
    if (includeTarget) highlightSquare(squares.to, 'highlight-sword');
  }

  // Returns true if the Karpov trap tutorial must gate before play continues.
  function handleSpecialAcceptance(san, blackMoveNumberJustPlayed) {
    if (selectedBiome === 'woud' && blackMoveNumberJustPlayed === 4) {
      if (san === 'Bf5') { currentPathId = 'bospad'; showBubble(REISIGER.bospadChosen); }
      else if (san === 'Nd7') {
        currentPathId = 'karpov';
        document.body.classList.add('path-karpov');
        showBubble(REISIGER.karpovChosen);
        if (!masteryState.karpovTutorialSeen) return true;
      }
    }
    return false;
  }

  async function handleBlackMove(from, to, legal) {
    clearSquareHighlights('highlight-sword');
    deselect();

    scriptSnapshot = { node: scriptState.node, pendingBMap: scriptState.pendingBMap, pendingTrap: scriptState.pendingTrap };

    const fenBefore = game.fen();
    const blackMoveNumber = blackMoveCount + 1;
    const strictThrough = RAILS_STRICT_THROUGH[currentPathId] || 5;
    const inTree = !KKEngine.scriptIsFreePlay(scriptState);

    if (blackMoveNumber <= strictThrough && inTree) {
      const check = KKEngine.scriptCheckBlackMove(scriptState, legal.san);
      if (check.status === 'accepted') {
        await commitMove(legal);
        blackMoveCount = blackMoveNumber;
        wrongTries = 0;
        theoryMovesFound++;
        awardEmerald(SCORE.THEORY_MOVE, 'theory');
        KKReisiger.setExpression('delighted');
        const needsTutorial = handleSpecialAcceptance(legal.san, blackMoveNumber);
        const isWoudBranchMove = (selectedBiome === 'woud' && blackMoveNumber === 4);
        if (!isWoudBranchMove) {
          const commentary = MOVE_COMMENTARY[currentPathId] && MOVE_COMMENTARY[currentPathId][legal.san];
          if (commentary) showBubble(commentary);
        }
        if (needsTutorial) {
          switchScreen('tutorial');
          runKarpovTutorial(() => { switchScreen('play'); afterBlackMoveAdvance(); });
        } else {
          await afterBlackMoveAdvance();
        }
      } else if (check.status === 'trap') {
        await commitMove(legal);
        blackMoveCount = blackMoveNumber;
        KKReisiger.setExpression('furious');
        triggerTrap(check.trap);
      } else {
        wrongTries++;
        KKAudio.reject();
        KKReisiger.setExpression('angry');
        showBubble(REISIGER.railsWrong, 3000);
        if (wrongTries === 2) { showHint(check.acceptedMoves, false); hintEscalations++; }
        if (wrongTries === 3) { showHint(check.acceptedMoves, true); hintEscalations++; }
        if (wrongTries >= 4) { showHint(check.acceptedMoves, true); }
      }
      return;
    }

    // Scored freedom / free play
    await commitMove(legal);
    blackMoveCount = blackMoveNumber;
    let theoryHandled = false;
    if (inTree) {
      const check = KKEngine.scriptCheckBlackMove(scriptState, legal.san);
      if (check.status === 'accepted') {
        theoryMovesFound++;
        if (forfeitNextEmerald) {
          forfeitNextEmerald = false;
        } else {
          awardEmerald(SCORE.THEORY_MOVE, 'theory');
        }
        handleSpecialAcceptance(legal.san, blackMoveNumber);
        theoryHandled = true;
      } else {
        scriptState.node = null;
      }
    }
    if (!theoryHandled) {
      await scoreFreeMove(fenBefore, legal.san, blackMoveNumber);
      if (awaitingBlunderDecision) return; // paused for undo/continue decision
    }
    await afterBlackMoveAdvance();
  }

  // Awaits its own animation so a following renderBoard() call (e.g. White's
  // reply, fired almost immediately after for script-layer moves) can't
  // interrupt this one mid-flight — overlapping position() calls otherwise
  // cause chessboard.js to visually snap instead of animate.
  async function commitMove(legal) {
    await animateMove(legal, BLACK_SLIDE_MS);
    const needsPromotion = legal.flags.includes('p');
    const moveObj = game.move({ from: legal.from, to: legal.to, promotion: needsPromotion ? 'q' : undefined });
    session.uciHistory.push(moveObj.from + moveObj.to + (moveObj.promotion || ''));
    renderBoard();
  }

  async function scoreFreeMove(fenBefore, sanPlayed, blackMoveNumber) {
    if (game.in_checkmate() || game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) return;
    const isGraceMove = session.graceMove;
    session.graceMove = false;
    const bestAnalysis = await KKEngine.sfAnalyse(fenBefore, KKEngine.ANALYSIS_DEPTH, 1);
    const fenAfter = game.fen();
    const afterAnalysis = await KKEngine.sfAnalyse(fenAfter, KKEngine.ANALYSIS_DEPTH, 1);
    const bestCpForBlack = toPerspective(bestAnalysis && bestAnalysis[0], fenBefore, 'b');
    const actualCpForBlack = toPerspective(afterAnalysis && afterAnalysis[0], fenAfter, 'b');
    evalHistory.push({ fen: fenAfter, cpForBlack: actualCpForBlack, moveNumber: blackMoveNumber, san: sanPlayed });

    if (forfeitNextEmerald) { forfeitNextEmerald = false; return; }

    const bestMoveSan = (bestAnalysis && bestAnalysis[0]) ? KKEngine.uciToSan(fenBefore, bestAnalysis[0].move) : null;
    if (blackMoveNumber >= 9 && bestMoveSan && sanPlayed === bestMoveSan) {
      awardDiamond();
      KKReisiger.setExpression('delighted');
      return;
    }

    const drop = bestCpForBlack - actualCpForBlack;
    if (drop <= SCORE.APPROVED_CP_THRESHOLD) {
      awardEmerald(SCORE.APPROVED_MOVE, 'approved');
      KKReisiger.setExpression('happy');
    } else if (drop <= SCORE.PENALTY_CP_THRESHOLD) {
      // within tolerance, no award/penalty
      KKReisiger.setExpression('happy');
    } else if (drop <= SCORE.BLUNDER_CP_THRESHOLD) {
      if (isGraceMove) {
        KKReisiger.setExpression('happy');
      } else {
        awardEmerald(SCORE.BLUNDER_PENALTY, 'penalty');
        KKAudio.penalty();
        KKReisiger.setExpression('concentrating');
      }
    } else {
      if (isGraceMove) {
        KKReisiger.setExpression('happy');
      } else {
        KKAudio.blunder();
        KKReisiger.setExpression('furious');
        awaitingBlunderDecision = true;
        offerBlunderDecision(drop);
      }
    }
  }

  function offerBlunderDecision(drop) {
    const pawns = (drop / 100).toFixed(1);
    const canUndo = !undoUsed;
    showModal(`
      <h2 class="pixel-font" style="font-size:15px; color:var(--danger);">Eina!</h2>
      <p>${REISIGER.blunder}</p>
      <p>Jy het ongeveer <strong>${pawns}</strong> punte se posisie weggegee met daardie skuif.</p>
      <div class="modal-btn-row">
        ${canUndo ? '<button class="pixel-btn" id="modal-undo-btn">Terugvat</button>' : ''}
        <button class="pixel-btn secondary" id="modal-continue-btn">Gaan voort</button>
      </div>
    `);
    if (canUndo) {
      document.getElementById('modal-undo-btn').addEventListener('click', () => {
        game.undo();
        blackMoveCount--;
        evalHistory.pop();
        session.uciHistory.pop();
        if (scriptSnapshot) {
          scriptState.node = scriptSnapshot.node;
          scriptState.pendingBMap = scriptSnapshot.pendingBMap;
          scriptState.pendingTrap = scriptSnapshot.pendingTrap;
        }
        forfeitNextEmerald = true;
        undoUsed = true;
        awaitingBlunderDecision = false;
        renderBoard();
        updateInventoryUI();
        hideModal();
        studentTurnAllowed = true;
      });
    }
    document.getElementById('modal-continue-btn').addEventListener('click', async () => {
      hadBlunder = true;
      awardEmerald(SCORE.BLUNDER_PENALTY, 'penalty');
      awaitingBlunderDecision = false;
      hideModal();
      await afterBlackMoveAdvance();
    });
  }

  async function triggerTrap(trap) {
    studentTurnAllowed = false;
    showBubble(trap.message);
    await wait(700);
    const moveObj = game.move(trap.reply);
    if (moveObj) {
      session.uciHistory.push(moveObj.from + moveObj.to + (moveObj.promotion || ''));
      await animateMove(moveObj, WHITE_SLIDE_MS);
    }
    renderBoard();
    endGame({ won: false, reason: 'trap', message: trap.message });
  }

  // ── Karpov trap tutorial gate ──────────────────────────────────────
  let tutorialBoard = null;
  function runKarpovTutorial(onDone) {
    switchScreen('tutorial');
    const tutFen = 'r1bqkb1r/pp1npppp/2p2n2/8/4N3/8/PPPP1PPP/R1BQKB1R w KQkq - 4 6'; // after 4...Nd7 5.Qe2 (illustrative)
    const tutGame = new Chess();
    ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nd7', 'Qe2'].forEach(m => tutGame.move(m));
    if (!tutorialBoard) {
      tutorialBoard = Chessboard('tutorial-board', { position: tutGame.fen(), orientation: 'black', draggable: false, pieceTheme: PIECE_THEME });
    } else {
      tutorialBoard.position(tutGame.fen());
    }
    const feedback = document.getElementById('tutorial-feedback');
    feedback.textContent = '';
    let tutSelected = null;
    const tutBoardEl = document.getElementById('tutorial-board');

    function tutClick(e) {
      const square = getSquareFromElement(e.target);
      if (!square) return;
      const piece = tutGame.get(square);
      if (tutSelected === square) { tutSelected = null; return; }
      if (tutSelected) {
        const legal = tutGame.moves({ square: tutSelected, verbose: true }).find(m => m.to === square);
        if (legal) {
          if (legal.san === 'Ngf6') {
            feedback.style.color = 'var(--danger)';
            feedback.textContent = 'Wag! Dit val in die slagyster — probeer weer.';
            tutSelected = null;
            return;
          }
          if (legal.san === 'Ndf6' || legal.san === 'e6') {
            feedback.style.color = 'var(--accent-2)';
            feedback.textContent = 'Reg! Jy het die slagyster raakgesien.';
            tutBoardEl.removeEventListener('click', tutClick);
            setTimeout(() => { masteryState.karpovTutorialSeen = true; KKMastery.save(player, masteryState); onDone(); }, 1200);
            return;
          }
        }
        tutSelected = null;
        return;
      }
      if (piece && piece.color === 'b') tutSelected = square;
    }
    tutBoardEl.addEventListener('click', tutClick);
  }

  // ── Victory sequence (checkmate delivered by Black) ─────────────────
  // Green vines drop over the board (still visible underneath, so the
  // mating position itself is never hidden) and, once they've mostly
  // fallen, a parchment "jy_wen.pgn" artifact fades in with the game's
  // own move list — an Indiana-Jones-flavored payoff for an actual win,
  // distinct from a plain resignation. Modeled on playDissolve() below:
  // build the DOM burst, toggle .active, wait, then tear it down.
  const VINE_COUNT = 34;
  async function playVictorySequence() {
    KKAudio.win();
    KKReisiger.setExpression('delighted');
    showBubble('Skaakmat! Jy het gewen!', null);

    vineField.innerHTML = '';
    for (let i = 0; i < VINE_COUNT; i++) {
      const v = document.createElement('div');
      v.className = 'vine';
      v.style.left = (Math.random() * 98) + '%';
      v.style.height = (150 + Math.random() * 110) + 'px';
      v.style.animationDelay = (Math.random() * 1.1) + 's';
      v.style.animationDuration = (2.2 + Math.random() * 1.2) + 's';
      vineField.appendChild(v);
    }
    victoryOverlay.classList.add('active');

    await wait(900); // let the first vines land before the artifact steals focus
    pgnArtifactBody.textContent = game.pgn({ max_width: 40, newline_char: '\n' });
    pgnArtifact.classList.add('reveal');

    await wait(5200); // hold the artifact on screen roughly double as long as before

    pgnArtifact.classList.remove('reveal');
    victoryOverlay.classList.remove('active');
    vineField.innerHTML = '';
  }

  // ── Reveal logic ──────────────────────────────────────────────────
  function playDissolve(cb) {
    dissolveOverlay.innerHTML = '';
    for (let i = 0; i < 96; i++) {
      const t = document.createElement('div');
      t.className = 'tile';
      t.style.animationDelay = (Math.random() * 0.3) + 's';
      dissolveOverlay.appendChild(t);
    }
    dissolveOverlay.classList.add('active');
    KKAudio.reveal();
    setTimeout(() => {
      cb();
      dissolveOverlay.classList.remove('active');
      dissolveOverlay.classList.add('clearing');
      setTimeout(() => { dissolveOverlay.classList.remove('clearing'); dissolveOverlay.innerHTML = ''; }, 1000);
    }, 1000);
  }

  function showRevealPopup(biomeId) {
    const biome = BIOMES[biomeId];
    showModal(`
      <span class="biome-ore">${biome.ore}</span>
      <h2 class="pixel-font" style="font-size:15px;">${biome.name}</h2>
      <p>${biome.popup}</p>
      ${biome.entryWarning ? `<p style="color:var(--danger);">${biome.entryWarning}</p>` : ''}
      <div class="modal-btn-row"><button class="pixel-btn" id="modal-reveal-dismiss">Reg, kom ons gaan!</button></div>
    `);
    studentTurnAllowed = false;
    document.getElementById('modal-reveal-dismiss').addEventListener('click', () => {
      hideModal();
      studentTurnAllowed = true;
    });
  }

  function doReveal(biomeId) {
    revealed = true;
    ambiguousPending = false;
    document.body.classList.add(BIOMES[biomeId].themeClass);
    playDissolve(() => showRevealPopup(biomeId));
  }

  function checkReveal(moveObj) {
    if (revealed) return;
    if (whiteMoveCount === 3) {
      if (REVEAL_AT_WHITE_MOVE_3[moveObj.san]) {
        doReveal(REVEAL_AT_WHITE_MOVE_3[moveObj.san]);
      } else if (moveObj.san === 'exd5') {
        ambiguousPending = true;
        showBubble(REISIGER.ambiguous);
      }
      return;
    }
    if (whiteMoveCount === 4 && ambiguousPending) {
      const id = REVEAL_AT_WHITE_MOVE_4[moveObj.san] || 'vlakte';
      doReveal(id);
    }
  }

  // ── Turn orchestration ────────────────────────────────────────────
  async function playWhiteTurn() {
    studentTurnAllowed = false;
    KKReisiger.setExpression('concentrating');
    whiteMoveCount++;
    session.whiteMoveNumber = whiteMoveCount;
    const fen = game.fen();
    let result = await KKEngine.getWhiteMove(session, fen);
    if (!result) {
      const legals = game.moves();
      if (!legals.length) return;
      result = { san: legals[Math.floor(Math.random() * legals.length)], source: 'fallback' };
    }
    if (result.source === 'blunder') session.graceMove = true;
    const moveObj = game.move(result.san);
    if (!moveObj) { studentTurnAllowed = true; return; }
    session.uciHistory.push(moveObj.from + moveObj.to + (moveObj.promotion || ''));
    await animateMove(moveObj, WHITE_SLIDE_MS); // board DOM is still pre-move here; game state already updated above
    renderBoard();
    checkReveal(moveObj);

    if (game.in_checkmate()) {
      KKReisiger.setExpression('concentrating');
      showBubble('Skaakmat! Wit het gewen.', null);
      await wait(MATE_PAUSE_MS);
      endGame({ won: false, reason: 'mate-by-white' });
      return;
    }
    if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) { endGame({ won: false, reason: 'draw' }); return; }

    if (whiteMoveCount >= 10) {
      const ev = await KKEngine.evalForWhite(game.fen());
      if (ev <= SCORE.RESIGN_EVAL_FOR_WHITE) { endGame({ won: true, reason: 'resign' }); return; }
    }
    KKReisiger.setExpression('happy');
    studentTurnAllowed = true;
  }

  async function afterBlackMoveAdvance() {
    updateInventoryUI();
    if (game.in_checkmate()) {
      await playVictorySequence();
      endGame({ won: true, reason: 'mate-by-black' });
      return;
    }
    if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) { endGame({ won: false, reason: 'draw' }); return; }
    if (blackMoveCount >= SCORE.END_MOVE) { endGame({ won: false, reason: 'the-end' }); return; }
    await playWhiteTurn();
  }

  // ── End of game ─────────────────────────────────────────────────────
  let endMiniBoard = null;
  async function endGame(info) {
    if (gameOverHandled) return;
    gameOverHandled = true;
    studentTurnAllowed = false;

    let finalEvalWhite = 0;
    try { finalEvalWhite = await KKEngine.evalForWhite(game.fen()); } catch (e) { /* ignore */ }
    const finalEvalBlack = -finalEvalWhite;

    let bonus = 0;
    if (info.won) bonus += SCORE.WIN_BONUS;
    if (info.reason === 'the-end') bonus += SCORE.END_BONUS;
    if (bonus > 0) awardEmerald(bonus, 'bonus');
    // mate-by-black already played its fanfare inside playVictorySequence();
    // avoid a double-trigger, but a resignation win still gets one here.
    if (info.won && info.reason !== 'mate-by-black') KKAudio.win();

    const reachedEndOrWon = info.won || info.reason === 'the-end';
    const result = {
      pathId: currentPathId,
      reachedEndOrWon,
      won: info.won,
      allTheoryCorrect: true,
      hintEscalations,
      emeraldsTotal: emeralds,
      hadBlunder,
      finalEvalForBlack: finalEvalBlack,
      diamondsTotal: diamonds,
      theoryMovesFound
    };
    const achievedTier = KKMastery.evaluateGameResult(masteryState, result);
    KKMastery.recordBiomePlayed(masteryState, selectedBiome);
    KKMastery.save(player, masteryState);

    switchScreen('end');

    // Checkmate and draw are known, definite outcomes — state them outright
    // rather than describing them via a live eval read (which is meaningless
    // on a position with no legal moves anyway, and was previously the source
    // of a real bug: it could report a crushing loss as "Jy staan beter!").
    // The live eval-derived verdict is still the right tool for 'the-end',
    // where the game stopped without a forced result and "how am I doing?"
    // is genuinely an open question.
    let verdict;
    if (finalEvalBlack >= 150) verdict = REISIGER.verdict.winning;
    else if (finalEvalBlack <= -150) verdict = REISIGER.verdict.losing;
    else verdict = REISIGER.verdict.equal;

    let title, msg, endFaceExpr;
    if (info.reason === 'trap') {
      title = 'Die creeper het ontplof!'; msg = info.message; endFaceExpr = 'furious';
    } else if (info.reason === 'mate-by-white') {
      title = 'Skaakmat';
      msg = 'Wit het jou skaakmat gegee. Kom ons kyk mooi na hierdie posisie en probeer weer!';
      endFaceExpr = 'concentrating';
    } else if (info.reason === 'draw') {
      title = 'Gelykspel';
      msg = 'Dis gelykop geëindig — soos twee ewe hoë torings. Niemand het gewen nie.';
      endFaceExpr = 'happy';
    } else if (info.won) {
      title = 'Geluk!'; msg = REISIGER.end + ' Jy het gewen!'; endFaceExpr = 'happy';
    } else if (info.reason === 'the-end') {
      title = 'The End';
      msg = REISIGER.end + ' ' + verdict;
      endFaceExpr = finalEvalBlack >= 150 ? 'delighted' : finalEvalBlack <= -150 ? 'concentrating' : 'happy';
    } else {
      title = 'Speletjie verby'; msg = verdict; endFaceExpr = 'happy';
    }
    document.getElementById('end-title').textContent = title;
    document.getElementById('end-face').src = `images/reisiger/face-${endFaceExpr}.png?v=${ASSET_V}`;
    document.getElementById('end-message').textContent = msg;

    document.getElementById('end-tally').textContent = `🟢 ${emeralds}  💎 ${diamonds}  ·  Skuiwe: ${blackMoveCount}`;
    const pathName = BIOMES[currentPathId] ? BIOMES[currentPathId].name : (WOUD_PATHS[currentPathId] ? WOUD_PATHS[currentPathId].name : currentPathId);
    document.getElementById('end-mastery').textContent = achievedTier && achievedTier !== TIER.GEEN
      ? `Nuwe vlak behaal: ${achievedTier.toUpperCase()} (${pathName})`
      : '';

    const miniWrap = document.getElementById('end-mini-board-wrap');
    if (evalHistory.length >= 2) {
      let biggest = null, biggestDelta = -1;
      for (let i = 1; i < evalHistory.length; i++) {
        const d = Math.abs(evalHistory[i].cpForBlack - evalHistory[i - 1].cpForBlack);
        if (d > biggestDelta) { biggestDelta = d; biggest = evalHistory[i]; }
      }
      if (biggest) {
        miniWrap.style.display = 'block';
        document.getElementById('end-lesson-caption').textContent = `Die groot oomblik: swart se ${biggest.san}`;
        if (!endMiniBoard) endMiniBoard = Chessboard('end-mini-board', { position: biggest.fen, orientation: 'black', draggable: false, pieceTheme: PIECE_THEME });
        else endMiniBoard.position(biggest.fen);
      } else miniWrap.style.display = 'none';
    } else {
      miniWrap.style.display = 'none';
    }
  }

  // ── Boot ──────────────────────────────────────────────────────────
  function attachEndScreenButtons() {
    document.getElementById('end-replay-btn').addEventListener('click', () => window.location.reload());
    document.getElementById('end-home-btn').addEventListener('click', () => { window.location.href = 'index.html'; });
    document.getElementById('home-link-btn').addEventListener('click', () => { window.location.href = 'index.html'; });
  }

  // Dev/testing cheat code — undocumented on purpose (same convention as the
  // move-25 grace mechanic): pressing X while a game is in progress fakes an
  // instant checkmate win, so the victory sequence can be exercised without
  // playing a full game. Keyboard-only and unadvertised so a young player on
  // a touchscreen has no visible affordance to stumble onto it.
  function attachWinCheatCode() {
    document.addEventListener('keydown', async (e) => {
      if (e.key !== 'x' && e.key !== 'X') return;
      if (gameOverHandled || !screens.play.classList.contains('flex-active')) return;
      studentTurnAllowed = false;
      await playVictorySequence();
      endGame({ won: true, reason: 'mate-by-black' });
    });
  }

  function attachNotationPager() {
    notationPrevBtn.addEventListener('click', () => { notationPage--; renderMoveList(false); });
    notationNextBtn.addEventListener('click', () => { notationPage++; renderMoveList(false); });
    renderMoveList(false);
  }

  async function startGame() {
    board = Chessboard('board', {
      position: 'start',
      orientation: 'black',
      draggable: false,
      pieceTheme: PIECE_THEME
    });
    boardEl.addEventListener('click', onBoardClick);
    updateInventoryUI();
    switchScreen('play');
    showBubble('Wit begin die speletjie...');
    await playWhiteTurn();
  }

  function boot() {
    loadingQuoteEl.textContent = REISIGER.loadingKarpov[Math.floor(Math.random() * REISIGER.loadingKarpov.length)];
    attachEndScreenButtons();
    attachNotationPager();
    attachWinCheatCode();
    KKReisiger.mount(document.getElementById('reisiger-face'), 'happy');
    KKEngine.initLocalStockfish(); // lazy-load, kicked off once the game actually starts
    document.body.addEventListener('click', () => KKAudio.unlock(), { once: true });
    startGame();
  }

  boot();
})();
