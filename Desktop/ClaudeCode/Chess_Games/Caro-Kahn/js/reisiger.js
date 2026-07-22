/* Die Caro-Kann in Blokkie-wêreld — Die Wyse ou Reisiger's expression-swapping face, matching the
   pattern used by Meester Giacomo (Italiaans project): a named "expression"
   drives what's shown, with occasional idle flavour when nothing is happening.
   Static cropped pixel-art images instead of procedural SVG, but same idea. */

const KKReisiger = (function () {
  const FACE_BASE = 'images/reisiger/face-';
  const EXPRESSIONS = ['happy', 'delighted', 'alert', 'concentrating', 'angry', 'furious', 'amused', 'bored'];
  const IDLE_BLIPS = ['amused', 'bored'];

  let imgEl = null;
  let idleTimer = null;
  let blipTimer = null;
  let restExpression = 'happy';

  function mount(imgElement, initial) {
    imgEl = imgElement;
    restExpression = initial || 'happy';
    paint(restExpression);
    scheduleIdle();
  }

  function paint(name) {
    if (!imgEl || EXPRESSIONS.indexOf(name) === -1) return;
    imgEl.src = FACE_BASE + name + '.png?v=' + ASSET_V;
    imgEl.alt = 'Die Reisiger';
  }

  // Sets the expression that idle blips will return to afterward.
  function setExpression(name) {
    if (EXPRESSIONS.indexOf(name) === -1) return;
    restExpression = name;
    clearTimeout(blipTimer);
    paint(name);
    scheduleIdle();
  }

  function scheduleIdle() {
    clearTimeout(idleTimer);
    if (!imgEl) return;
    const delay = 12000 + Math.random() * 14000;
    idleTimer = setTimeout(playIdleBlip, delay);
  }

  function playIdleBlip() {
    if (!imgEl) return;
    const blip = IDLE_BLIPS[Math.floor(Math.random() * IDLE_BLIPS.length)];
    paint(blip);
    blipTimer = setTimeout(() => { paint(restExpression); scheduleIdle(); }, 1600);
  }

  function stop() {
    clearTimeout(idleTimer);
    clearTimeout(blipTimer);
    imgEl = null;
  }

  return { mount, setExpression, stop };
})();
