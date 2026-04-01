(() => {
  const channel = new BroadcastChannel('equithera-premium');
  const storageKey = 'equithera-premium-attempts';
  const els = {
    attemptNumber: document.getElementById('attemptNumber'),
    dashboardStatus: document.getElementById('dashboardStatus'),
    missionTitle: document.getElementById('missionTitle'),
    missionHelp: document.getElementById('missionHelp'),
    targetCanvas: document.getElementById('targetCanvas'),
    phaseTime: document.getElementById('phaseTime'),
    stabilityPct: document.getElementById('stabilityPct'),
    rightFootState: document.getElementById('rightFootState'),
    leftFootState: document.getElementById('leftFootState'),
    startAttemptBtn: document.getElementById('startAttemptBtn'),
    resetAttemptBtn: document.getElementById('resetAttemptBtn'),
    saveAttemptBtn: document.getElementById('saveAttemptBtn'),
    exportChartBtn: document.getElementById('exportChartBtn'),
    globalScore: document.getElementById('globalScore'),
    attemptLabel: document.getElementById('attemptLabel'),
    staticScore: document.getElementById('staticScore'),
    rightScore: document.getElementById('rightScore'),
    leftScore: document.getElementById('leftScore'),
    attemptDate: document.getElementById('attemptDate'),
    clinicalNotes: document.getElementById('clinicalNotes'),
    reportChart: document.getElementById('reportChart')
  };
  const tctx = els.targetCanvas.getContext('2d');
  let chart = null;
  let cameraState = null;
  let rafId = null;

  const protocol = [
    { id: 'static', title: 'Centro estático', help: 'Mantenha o tronco no alvo central sem levantar os pés.', durationField: 'staticDuration', scoreWeight: 40 },
    { id: 'right', title: 'Levantar pé direito', help: 'Eleve o pé direito e mantenha por 3 segundos.', fixedDuration: 3, scoreWeight: 30 },
    { id: 'return', title: 'Retorno ao centro', help: 'Volte ao centro e estabilize o corpo.', fixedDuration: 3, scoreWeight: 10 },
    { id: 'left', title: 'Levantar pé esquerdo', help: 'Eleve o pé esquerdo e mantenha por 3 segundos.', fixedDuration: 3, scoreWeight: 20 }
  ];

  const attempt = {
    running: false,
    phaseIndex: 0,
    phaseStart: 0,
    metrics: { staticStableMs: 0, rightHeldMs: 0, leftHeldMs: 0, returnStableMs: 0, swaySamples: [] },
    startedAt: null,
    savedCount: loadAttempts().length + 1
  };

  function loadAttempts() {
    return JSON.parse(localStorage.getItem(storageKey) || '[]');
  }
  function saveAttempts(data) {
    localStorage.setItem(storageKey, JSON.stringify(data));
  }

  function updateAttemptLabels() {
    els.attemptNumber.textContent = String(attempt.savedCount);
    els.attemptLabel.textContent = `Tentativa ${attempt.savedCount}`;
  }

  function setMission(index) {
    const phase = protocol[index];
    els.missionTitle.textContent = phase ? phase.title : 'Teste concluído';
    els.missionHelp.textContent = phase ? phase.help : 'Salve a tentativa para registrar no gráfico clínico.';
  }

  function phaseDuration(phase) {
    if (!phase) return 0;
    if (phase.fixedDuration) return phase.fixedDuration;
    return Number(cameraState?.staticDuration || 15);
  }

  function startAttempt() {
    if (!cameraState?.bodyVisible) {
      alert('A câmera precisa estar ativa com o corpo detectado antes de iniciar a tentativa.');
      return;
    }
    attempt.running = true;
    attempt.phaseIndex = 0;
    attempt.phaseStart = performance.now();
    attempt.startedAt = new Date();
    attempt.metrics = { staticStableMs: 0, rightHeldMs: 0, leftHeldMs: 0, returnStableMs: 0, swaySamples: [] };
    els.dashboardStatus.textContent = 'Tentativa em andamento';
    setMission(0);
    runLoop();
  }

  function resetAttempt() {
    attempt.running = false;
    if (rafId) cancelAnimationFrame(rafId);
    attempt.phaseIndex = 0;
    attempt.metrics = { staticStableMs: 0, rightHeldMs: 0, leftHeldMs: 0, returnStableMs: 0, swaySamples: [] };
    els.dashboardStatus.textContent = 'Tentativa resetada';
    els.phaseTime.textContent = '0.0 s';
    els.stabilityPct.textContent = '0%';
    els.globalScore.textContent = '0';
    els.staticScore.textContent = '0';
    els.rightScore.textContent = '0';
    els.leftScore.textContent = '0';
    setMission(null);
    drawStage();
  }

  function saveAttempt() {
    const scores = computeScores();
    if (!attempt.startedAt) {
      alert('Faça uma tentativa antes de salvar.');
      return;
    }
    const entries = loadAttempts();
    const now = attempt.startedAt;
    entries.push({
      attempt: entries.length + 1,
      date: now.toLocaleDateString('pt-BR'),
      datetimeISO: now.toISOString(),
      patientName: cameraState?.patientName || '',
      therapistName: cameraState?.therapistName || '',
      notes: els.clinicalNotes.value.trim(),
      scores
    });
    saveAttempts(entries);
    attempt.savedCount = entries.length + 1;
    updateAttemptLabels();
    buildChart();
    els.dashboardStatus.textContent = 'Tentativa salva';
  }

  function computeScores() {
    const staticTarget = Number(cameraState?.staticDuration || 15) * 1000;
    const staticScore = Math.round(Math.min(100, (attempt.metrics.staticStableMs / staticTarget) * 100));
    const rightScore = Math.round(Math.min(100, (attempt.metrics.rightHeldMs / 3000) * 100));
    const leftScore = Math.round(Math.min(100, (attempt.metrics.leftHeldMs / 3000) * 100));
    const globalScore = Math.round(staticScore * 0.4 + rightScore * 0.3 + leftScore * 0.2 + Math.min(100, (attempt.metrics.returnStableMs / 3000) * 100) * 0.1);
    return { globalScore, staticScore, rightScore, leftScore };
  }

  function updateScoreUI() {
    const scores = computeScores();
    els.globalScore.textContent = String(scores.globalScore);
    els.staticScore.textContent = String(scores.staticScore);
    els.rightScore.textContent = String(scores.rightScore);
    els.leftScore.textContent = String(scores.leftScore);
    els.attemptDate.textContent = attempt.startedAt ? attempt.startedAt.toLocaleDateString('pt-BR') : '—';
  }

  function runLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    const tick = (now) => {
      if (!attempt.running) return;
      const phase = protocol[attempt.phaseIndex];
      if (!phase || !cameraState) return;
      const elapsedPhase = (now - attempt.phaseStart) / 1000;
      els.phaseTime.textContent = `${elapsedPhase.toFixed(1)} s`;

      const swayMagnitude = Math.abs(cameraState.swayX) + Math.abs(cameraState.swayY);
      attempt.metrics.swaySamples.push(swayMagnitude);
      const stability = Math.max(0, Math.min(100, 100 - swayMagnitude * 4));
      els.stabilityPct.textContent = `${Math.round(stability)}%`;
      els.rightFootState.textContent = cameraState.feetUp?.right ? 'Elevado' : 'Baixo';
      els.leftFootState.textContent = cameraState.feetUp?.left ? 'Elevado' : 'Baixo';

      const frameMs = 16;
      if (phase.id === 'static' && !cameraState.feetUp?.right && !cameraState.feetUp?.left && swayMagnitude < 6) {
        attempt.metrics.staticStableMs += frameMs;
      }
      if (phase.id === 'right' && cameraState.feetUp?.right) {
        attempt.metrics.rightHeldMs += frameMs;
      }
      if (phase.id === 'return' && !cameraState.feetUp?.right && !cameraState.feetUp?.left && swayMagnitude < 6) {
        attempt.metrics.returnStableMs += frameMs;
      }
      if (phase.id === 'left' && cameraState.feetUp?.left) {
        attempt.metrics.leftHeldMs += frameMs;
      }

      updateScoreUI();
      drawStage();

      if (elapsedPhase >= phaseDuration(phase)) {
        attempt.phaseIndex += 1;
        attempt.phaseStart = now;
        const next = protocol[attempt.phaseIndex];
        if (next) {
          setMission(attempt.phaseIndex);
        } else {
          attempt.running = false;
          els.dashboardStatus.textContent = 'Tentativa concluída';
          setMission(null);
          updateScoreUI();
          return;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function drawStage() {
    const w = els.targetCanvas.width, h = els.targetCanvas.height;
    tctx.clearRect(0, 0, w, h);
    const grad = tctx.createRadialGradient(w/2, h/2, 40, w/2, h/2, h);
    grad.addColorStop(0, '#1a3c6c'); grad.addColorStop(0.65, '#13233f'); grad.addColorStop(1, '#0d1423');
    tctx.fillStyle = grad; tctx.fillRect(0,0,w,h);

    let target = { x: 0.5, y: 0.55, label: 'Centro' };
    const phase = protocol[attempt.phaseIndex];
    if (phase?.id === 'right') target = { x: 0.7, y: 0.45, label: 'Pé direito' };
    if (phase?.id === 'left') target = { x: 0.3, y: 0.45, label: 'Pé esquerdo' };

    for (let i=0;i<4;i++) {
      tctx.strokeStyle = 'rgba(255,255,255,0.08)';
      tctx.beginPath(); tctx.arc(w/2,h/2,60 + i*50,0,Math.PI*2); tctx.stroke();
    }

    const tx = target.x * w, ty = target.y * h;
    tctx.strokeStyle = 'rgba(28, 233, 176, 0.95)';
    tctx.lineWidth = 4; tctx.beginPath(); tctx.arc(tx, ty, 28, 0, Math.PI*2); tctx.stroke();

    if (cameraState) {
      const px = cameraState.centerX * w;
      const py = cameraState.centerY * h;
      tctx.strokeStyle = 'rgba(255,255,255,0.22)';
      tctx.beginPath(); tctx.moveTo(px, py); tctx.lineTo(tx, ty); tctx.stroke();
      tctx.fillStyle = '#7ec8ff'; tctx.beginPath(); tctx.arc(px, py, 14, 0, Math.PI*2); tctx.fill();
    }

    tctx.fillStyle = 'rgba(255,255,255,0.92)';
    tctx.font = '700 22px Inter, sans-serif';
    tctx.fillText('Visor clínico do teste', 24, 34);
  }

  function buildChart() {
    const attempts = loadAttempts();
    const labels = attempts.map(a => `Tentativa ${a.attempt} • ${a.date}`);
    const global = attempts.map(a => a.scores.globalScore);
    const stat = attempts.map(a => a.scores.staticScore);
    const right = attempts.map(a => a.scores.rightScore);
    const left = attempts.map(a => a.scores.leftScore);
    if (chart) chart.destroy();
    chart = new Chart(els.reportChart.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Score global', data: global, borderWidth: 3, tension: 0.35, borderColor: '#2558ff', backgroundColor: 'rgba(37,88,255,0.08)', fill: true },
          { label: 'Centro estático', data: stat, borderWidth: 2, tension: 0.35, borderColor: '#0da88b' },
          { label: 'Pé direito', data: right, borderWidth: 2, tension: 0.35, borderColor: '#ff9a3d' },
          { label: 'Pé esquerdo', data: left, borderWidth: 2, tension: 0.35, borderColor: '#c05dff' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { min: 0, max: 100 } }
      }
    });
  }

  function exportChart() {
    if (!chart) return;
    const a = document.createElement('a');
    a.href = chart.toBase64Image();
    a.download = 'grafico_clinico_tentativas.png';
    a.click();
  }

  channel.onmessage = (event) => {
    if (event.data?.type === 'camera-state') {
      cameraState = event.data.payload;
      els.dashboardStatus.textContent = cameraState.bodyVisible ? 'Câmera pronta' : 'Aguardando corpo';
      drawStage();
    }
  };

  els.startAttemptBtn.addEventListener('click', startAttempt);
  els.resetAttemptBtn.addEventListener('click', resetAttempt);
  els.saveAttemptBtn.addEventListener('click', saveAttempt);
  els.exportChartBtn.addEventListener('click', exportChart);

  updateAttemptLabels();
  setMission(null);
  buildChart();
  drawStage();
})();
