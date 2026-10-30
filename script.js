(() => {
  'use strict';

  // ---------- Configuración ----------
  const SCRAMBLE_LENGTH = 20;
  const HOLD_MS = 2000;          // tiempo de pulsación para iniciar
  const INSPECTION_MS = 15000;   // tiempo de inspección
  const STORAGE_KEY = 'speedcube-timer:solves';

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const el = {
    scramble: $('scramble'), newScramble: $('newScramble'),
    status: $('status'), timer: $('timer'),
    holdFill: $('holdFill'), holdTrack: document.querySelector('.hold-track'),
    best: $('best'), ao5: $('ao5'), mean: $('mean'), count: $('count'),
    history: $('history'), clear: $('clear'),
  };

  // ---------- Estado ----------
  // 'idle' | 'inspection' | 'running'
  let state = 'idle';
  let holding = false;
  let holdStart = 2;
  let inspectionStart = 0;
  let solveStart = 0;
  let rafId = 0;
  let currentScramble = '';
  let solves = load();

  // ---------- Scramble ----------
  const FACES = ['U', 'D', 'L', 'R', 'F', 'B'];
  const AXIS = { U: 0, D: 0, L: 1, R: 1, F: 2, B: 2 };
  const SUFFIX = ['', "'", '2'];

  function generateScramble(length = SCRAMBLE_LENGTH) {
    const moves = [];
    while (moves.length < length) {
      const face = FACES[Math.floor(Math.random() * FACES.length)];
      const last = moves[moves.length - 1];
      const last2 = moves[moves.length - 2];
      // Nunca la misma cara dos veces seguidas (R R2, U U')
      if (last && last === face) continue;
      // Nunca tres movimientos seguidos sobre el mismo eje (R L R)
      if (last && last2 && AXIS[last] === AXIS[face] && AXIS[last2] === AXIS[face]) continue;
      moves.push(face);
    }
    // Se guardan caras y luego se asigna sufijo, así la validación usa solo la cara
    return moves
      .map((f) => f + SUFFIX[Math.floor(Math.random() * SUFFIX.length)])
      .join(' ');
  }

  function newScramble() {
    currentScramble = generateScramble();
    el.scramble.textContent = currentScramble;
  }

  // ---------- Formato ----------
  function fmt(ms) {
    if (ms == null) return '–';
    const total = ms / 1000;
    if (total >= 60) {
      const m = Math.floor(total / 60);
      const s = (total - m * 60).toFixed(2).padStart(5, '0');
      return `${m}:${s}`;
    }
    return total.toFixed(2);
  }

  // ---------- UI helpers ----------
  function setStatus(text) { el.status.textContent = text; }
  function setTimer(text, st) {
    el.timer.textContent = text;
    if (st !== undefined) el.timer.dataset.state = st;
  }
  function setBackground(color) { document.body.style.backgroundColor = color || ''; }
  function setHoldUI(progress, ready, visible) {
    el.holdTrack.classList.toggle('active', visible);
    el.holdFill.style.width = `${Math.min(progress, 1) * 100}%`;
    el.holdFill.classList.toggle('ready', ready);
  }

  // ---------- Pulsación larga (estado idle) ----------
  function holdLoop() {
    if (!holding) return;
    const elapsed = performance.now() - holdStart;
    const ready = elapsed >= HOLD_MS;
    setHoldUI(elapsed / HOLD_MS, ready, true);
    if (ready) {
      setTimer('Listo', 'ready');
      setStatus('Suelta ESPACIO para iniciar la inspección');
    }
    rafId = requestAnimationFrame(holdLoop);
  }

  function beginHold() {
    holding = true;
    holdStart = performance.now();
    setTimer('Mantén…', 'holding');
    setStatus('Sigue pulsando ESPACIO');
    rafId = requestAnimationFrame(holdLoop);
  }

  function cancelHold() {
    holding = false;
    cancelAnimationFrame(rafId);
    setHoldUI(0, false, false);
    setTimer(solves.length ? fmt(solves[solves.length - 1].ms) : '0.00', 'idle');
    setStatus('Mantén ESPACIO 2 s para iniciar la inspección');
  }

  // ---------- Inspección ----------
  function startInspection() {
    holding = false;
    cancelAnimationFrame(rafId);
    setHoldUI(0, false, false);
    state = 'inspection';
    inspectionStart = performance.now();
    el.newScramble.disabled = true;
    setStatus('Inspección · pulsa ESPACIO para empezar a resolver');
    rafId = requestAnimationFrame(inspectionLoop);
  }

  function inspectionLoop() {
    if (state !== 'inspection') return;
    const remaining = INSPECTION_MS - (performance.now() - inspectionStart);
    if (remaining <= 0) { startSolve(); return; }

    setTimer(String(Math.ceil(remaining / 1000)), 'inspection');
    // Verde (120°) → rojo (0°) a medida que se agota el tiempo
    const hue = Math.max(0, (remaining / INSPECTION_MS) * 120);
    setBackground(`hsl(${hue.toFixed(0)}, 62%, 32%)`);
    rafId = requestAnimationFrame(inspectionLoop);
  }

  // ---------- Resolución ----------
  function startSolve() {
    cancelAnimationFrame(rafId);
    state = 'running';
    solveStart = performance.now();
    setBackground('');
    setStatus('Resolviendo · pulsa ESPACIO para detener');
    el.timer.dataset.state = 'running';
    rafId = requestAnimationFrame(solveLoop);
  }

  function solveLoop() {
    if (state !== 'running') return;
    setTimer(fmt(performance.now() - solveStart));
    rafId = requestAnimationFrame(solveLoop);
  }

  function stopSolve() {
    const ms = performance.now() - solveStart;
    cancelAnimationFrame(rafId);
    state = 'idle';
    solves.push({ ms, scramble: currentScramble, date: Date.now() });
    save();
    setTimer(fmt(ms), 'idle');
    setStatus('Mantén ESPACIO 2 s para iniciar la inspección');
    el.newScramble.disabled = false;
    newScramble();
    renderStats();
  }

  // ---------- Estadísticas ----------
  function average(times) {
    if (!times.length) return null;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  function ao(n) {
    if (solves.length < n) return null;
    const last = solves.slice(-n).map((s) => s.ms).sort((a, b) => a - b);
    return average(last.slice(1, -1)); // descarta mejor y peor
  }

  function renderStats() {
    const times = solves.map((s) => s.ms);
    el.best.textContent = fmt(times.length ? Math.min(...times) : null);
    el.ao5.textContent = fmt(ao(5));
    el.mean.textContent = fmt(average(times));
    el.count.textContent = String(solves.length);

    el.history.replaceChildren();
    if (!solves.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'Aún no hay solves. Mantén ESPACIO para empezar.';
      el.history.append(li);
      return;
    }
    [...solves].reverse().forEach((s, i) => {
      const li = document.createElement('li');
      const t = document.createElement('span');
      t.textContent = `${solves.length - i}. ${fmt(s.ms)}`;
      const scr = document.createElement('span');
      scr.className = 't-scr';
      scr.textContent = s.scramble;
      scr.title = s.scramble;
      li.append(t, scr);
      el.history.append(li);
    });
  }

  // ---------- Persistencia ----------
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(solves)); } catch { /* sin storage */ }
  }

  // ---------- Teclado ----------
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    e.preventDefault();
    if (e.repeat) return;

    if (state === 'idle') beginHold();
    else if (state === 'inspection') startSolve();   // pulsación rápida corta la inspección
    else if (state === 'running') stopSolve();       // pulsación rápida detiene el tiempo
  });

  window.addEventListener('keyup', (e) => {
    if (e.code !== 'Space') return;
    e.preventDefault();
    if (state === 'idle' && holding) {
      if (performance.now() - holdStart >= HOLD_MS) startInspection();
      else cancelHold();
    }
  });

  // Si la ventana pierde el foco mientras se mantiene pulsado, se cancela
  window.addEventListener('blur', () => { if (state === 'idle' && holding) cancelHold(); });

  // ---------- Botones ----------
  el.newScramble.addEventListener('click', (e) => { newScramble(); e.currentTarget.blur(); });
  el.clear.addEventListener('click', (e) => {
    e.currentTarget.blur();
    if (solves.length && confirm('¿Borrar todos los solves?')) {
      solves = [];
      save();
      setTimer('0.00', 'idle');
      renderStats();
    }
  });

  // ---------- Init ----------
  newScramble();
  renderStats();
  setTimer(solves.length ? fmt(solves[solves.length - 1].ms) : '0.00', 'idle');
})();
