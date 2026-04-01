(() => {
  const els = {
    patientName: document.getElementById('patientName'),
    therapistName: document.getElementById('therapistName'),
    staticDuration: document.getElementById('staticDuration'),
    startCameraBtn: document.getElementById('startCameraBtn'),
    startTrackingBtn: document.getElementById('startTrackingBtn'),
    calibrateBtn: document.getElementById('calibrateBtn'),
    openDashboardBtn: document.getElementById('openDashboardBtn'),
    stopBtn: document.getElementById('stopBtn'),
    statusText: document.getElementById('statusText'),
    frameStatus: document.getElementById('frameStatus'),
    swayX: document.getElementById('swayX'),
    swayY: document.getElementById('swayY'),
    confidenceScore: document.getElementById('confidenceScore'),
    trackingModePill: document.getElementById('trackingModePill'),
    video: document.getElementById('video'),
    overlay: document.getElementById('overlay')
  };

  const ctx = els.overlay.getContext('2d');
  const channel = new BroadcastChannel('equithera-premium');

  let stream = null;
  let poseLandmarker = null;
  let filesetResolver = null;
  let tracking = false;
  let rafId = null;
  let calibration = null;
  let state = {
    trackingAvailable: false,
    calibrated: false,
    time: Date.now(),
    centerX: 0.5,
    centerY: 0.5,
    swayX: 0,
    swayY: 0,
    confidence: 0,
    feetUp: { right: false, left: false },
    bodyVisible: false,
    patientName: '',
    therapistName: '',
    staticDuration: 15
  };

  function setStatus(text) { els.statusText.textContent = `Status: ${text}`; }

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false });
      els.video.srcObject = stream;
      await els.video.play();
      resizeCanvas();
      setStatus('câmera ativa');
      els.frameStatus.textContent = 'Em ajuste';
      postState();
      drawLoop();
    } catch (err) {
      console.error(err);
      setStatus('falha ao abrir a câmera');
      alert('Não foi possível acessar a câmera. Use localhost/HTTPS e permita o acesso à webcam.');
    }
  }

  async function ensurePose() {
    if (poseLandmarker) return true;
    try {
      setStatus('carregando leitura corporal');
      const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm');
      filesetResolver = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
      poseLandmarker = await vision.PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1
      });
      state.trackingAvailable = true;
      els.trackingModePill.textContent = 'Leitura corporal ativa';
      setStatus('leitura corporal pronta');
      postState();
      return true;
    } catch (err) {
      console.error(err);
      setStatus('falha na leitura corporal');
      alert('Não foi possível carregar o motor corporal. Verifique a internet ao abrir o projeto.');
      return false;
    }
  }

  async function startTracking() {
    if (!stream) {
      alert('Inicie a câmera primeiro.');
      return;
    }
    const ok = await ensurePose();
    if (!ok) return;
    tracking = true;
    setStatus('rastreamento iniciado');
  }

  function calibrate() {
    if (!state.bodyVisible) {
      alert('Corpo ainda não detectado. Fique visível na câmera e inicie a leitura corporal.');
      return;
    }
    calibration = { centerX: state.centerX, centerY: state.centerY };
    state.calibrated = true;
    setStatus('postura neutra calibrada');
    postState();
  }

  function stopAll() {
    tracking = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    ctx.clearRect(0, 0, els.overlay.width, els.overlay.height);
    setStatus('parado');
    state.bodyVisible = false;
    postState();
  }

  function resizeCanvas() {
    const rect = els.video.getBoundingClientRect();
    els.overlay.width = rect.width;
    els.overlay.height = rect.height;
  }

  function analyzePose(result) {
    const lm = result?.landmarks?.[0];
    if (!lm || lm.length < 33) {
      state.bodyVisible = false;
      els.frameStatus.textContent = 'Corpo não detectado';
      postState();
      return;
    }
    state.bodyVisible = true;
    const leftShoulder = lm[11], rightShoulder = lm[12], leftHip = lm[23], rightHip = lm[24];
    const leftAnkle = lm[27], rightAnkle = lm[28], leftKnee = lm[25], rightKnee = lm[26];
    state.centerX = (leftHip.x + rightHip.x + leftShoulder.x + rightShoulder.x) / 4;
    state.centerY = (leftHip.y + rightHip.y) / 2;
    state.confidence = Math.round((((leftHip.visibility ?? 0.5) + (rightHip.visibility ?? 0.5) + (leftShoulder.visibility ?? 0.5) + (rightShoulder.visibility ?? 0.5)) / 4) * 100);

    const refX = calibration ? calibration.centerX : 0.5;
    const refY = calibration ? calibration.centerY : 0.5;
    state.swayX = Number(((state.centerX - refX) * 100).toFixed(1));
    state.swayY = Number(((state.centerY - refY) * 100).toFixed(1));

    state.feetUp.right = (rightAnkle.y < rightKnee.y + 0.02);
    state.feetUp.left = (leftAnkle.y < leftKnee.y + 0.02);

    els.frameStatus.textContent = state.confidence > 55 ? 'Bom' : 'Baixo';
    els.swayX.textContent = state.swayX.toFixed(1);
    els.swayY.textContent = state.swayY.toFixed(1);
    els.confidenceScore.textContent = `${state.confidence}%`;

    drawSkeleton(lm);
    postState();
  }

  function drawSkeleton(lm) {
    const w = els.overlay.width, h = els.overlay.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.2, h * 0.08, w * 0.6, h * 0.84);

    const pairs = [[11,12],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[11,13],[13,15],[12,14],[14,16]];
    ctx.strokeStyle = 'rgba(33, 214, 167, 0.95)';
    ctx.lineWidth = 3;
    pairs.forEach(([a,b]) => {
      ctx.beginPath();
      ctx.moveTo(lm[a].x * w, lm[a].y * h);
      ctx.lineTo(lm[b].x * w, lm[b].y * h);
      ctx.stroke();
    });

    const cx = state.centerX * w, cy = state.centerY * h;
    ctx.fillStyle = '#69b7ff';
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();

    if (calibration) {
      ctx.strokeStyle = 'rgba(255, 216, 94, 0.9)';
      ctx.beginPath();
      ctx.arc(calibration.centerX * w, calibration.centerY * h, 18, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawLoop() {
    resizeCanvas();
    const loop = async () => {
      if (stream && tracking && poseLandmarker && els.video.readyState >= 2) {
        const result = poseLandmarker.detectForVideo(els.video, performance.now());
        analyzePose(result);
      } else if (stream) {
        ctx.clearRect(0,0,els.overlay.width, els.overlay.height);
      }
      rafId = requestAnimationFrame(loop);
    };
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function postState() {
    state.time = Date.now();
    state.patientName = els.patientName.value.trim();
    state.therapistName = els.therapistName.value.trim();
    state.staticDuration = Number(els.staticDuration.value || 15);
    channel.postMessage({ type: 'camera-state', payload: state });
  }

  function openDashboard() {
    window.open('dashboard.html', '_blank', 'width=1400,height=900');
  }

  ['input','change'].forEach(evt => {
    els.patientName.addEventListener(evt, postState);
    els.therapistName.addEventListener(evt, postState);
    els.staticDuration.addEventListener(evt, postState);
  });

  els.startCameraBtn.addEventListener('click', startCamera);
  els.startTrackingBtn.addEventListener('click', startTracking);
  els.calibrateBtn.addEventListener('click', calibrate);
  els.openDashboardBtn.addEventListener('click', openDashboard);
  els.stopBtn.addEventListener('click', stopAll);
  window.addEventListener('resize', resizeCanvas);
  postState();
})();
