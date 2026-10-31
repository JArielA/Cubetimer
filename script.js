(() => {
  'use strict';

  // ---------- Configuración ----------
  const SCRAMBLE_LENGTH = 20;
  const HOLD_MS = 1000;          // tiempo de pulsación para iniciar (reposo e inspección)
  const INSPECTION_MS = 15000;   // tiempo de inspección
  const STORAGE_KEY = 'speedcube-timer:solves';

  const HOLD_S = HOLD_MS / 1000;
  const TXT_IDLE = `Mantén ESPACIO o la pantalla pulsada ${HOLD_S} s para iniciar la inspección`;
  const TXT_INSPECTION = `Inspección · mantén ${HOLD_S} s para empezar a resolver`;
  const TXT_RUNNING = 'Resolviendo · pulsa ESPACIO o toca la pantalla para detener';

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
  let holdReadyShown = false;
  let holdStart = 0;
  let inspectionStart = 0;
  let solveStart = 0;
  let rafId = 0;       // bucle de inspección / resolución
  let holdRaf = 0;     // bucle de la pulsación larga
  let pressSource = null; // 'key' | 'pointer' | null
  let currentScramble = '';
  let solves = load();

  function setState(next) {
    state = next;
    const idle = next === 'idle';
    document.body.classList.toggle('busy', !idle);
    el.newScramble.disabled = !idle;
    el.clear.disabled = !idle;
