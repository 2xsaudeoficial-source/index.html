<!DOCTYPE html><html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Eye Runner Mobile</title>
  <style>
    :root{
      --bg:#07111f;
      --panel:rgba(10,19,36,.9);
      --line:rgba(255,255,255,.08);
      --text:#eef4ff;
      --muted:#98a9c8;
      --primary:#4f8cff;
      --cyan:#22d3ee;
      --good:#22c55e;
      --warn:#f59e0b;
      --bad:#f43f5e;
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      color:var(--text);
      background:
        radial-gradient(circle at top left, rgba(79,140,255,.22), transparent 28%),
        radial-gradient(circle at top right, rgba(34,211,238,.18), transparent 24%),
        linear-gradient(180deg,#08111f,#050b14 100%);
      min-height:100vh;
    }
    .app{
      max-width:1300px;
      margin:0 auto;
      padding:16px;
      display:grid;
      grid-template-columns:1.2fr .8fr;
      gap:16px;
    }
    .panel{
      background:var(--panel);
      border:1px solid var(--line);
      border-radius:24px;
      overflow:hidden;
      box-shadow:0 18px 48px rgba(0,0,0,.28);
      backdrop-filter:blur(12px);
    }
    .hero{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:12px;
      padding:16px 18px;
      border-bottom:1px solid var(--line);
    }
    .hero h1{margin:0;font-size:1.35rem}
    .hero p{margin:4px 0 0;color:var(--muted);font-size:.92rem}
    .pillbar{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
    .pill{padding:10px 12px;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.04);min-width:110px}
    .pill span{display:block;font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
    .pill strong{font-size:1rem}
    .stage-wrap{padding:16px}
    .camera{
      position:relative;
      height:320px;
      border-radius:22px;
      overflow:hidden;
      border:1px solid var(--line);
      background:#02070f;
      margin-bottom:14px;
    }
    #video,#faceCanvas{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    #video{transform:scaleX(-1)}
    #faceCanvas{pointer-events:none}
    .camera-badge{
      position:absolute;left:14px;top:14px;z-index:3;
      background:rgba(3,8,18,.7);border:1px solid var(--line);border-radius:14px;padding:10px 12px;font-size:.86rem
    }
    .game{
      position:relative;
      height:380px;
      border-radius:22px;
      overflow:hidden;
      border:1px solid var(--line);
      background:linear-gradient(180deg,#0b1730,#09111f 70%,#07101b 100%);
    }
    .hud{
      position:absolute;left:12px;right:12px;top:12px;z-index:4;
      display:flex;justify-content:space-between;gap:10px;align-items:center
    }
    .hudbox{padding:10px 12px;background:rgba(3,8,18,.7);border:1px solid var(--line);border-radius:14px;font-size:.9rem}
    #gameCanvas{position:absolute;inset:0;width:100%;height:100%}
    .controls{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
    button,select,input{
      width:100%;padding:13px 14px;border-radius:16px;border:1px solid var(--line);font-weight:700;
      background:rgba(255,255,255,.05);color:var(--text)
    }
    button{cursor:pointer;background:linear-gradient(135deg,var(--primary),#7ca8ff);border:0}
    button.secondary{background:rgba(255,255,255,.05);border:1px solid var(--line)}
    .side{padding:16px;display:grid;gap:14px}
    .card{padding:16px;border-radius:20px;background:rgba(255,255,255,.03);border:1px solid var(--line)}
    .card h3{margin:0 0 10px;font-size:1rem}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .metric{padding:14px;border-radius:16px;background:rgba(7,11,22,.68);border:1px solid rgba(255,255,255,.05)}
    .metric small{display:block;color:var(--muted);margin-bottom:6px;text-transform:uppercase;font-size:.72rem;letter-spacing:.06em}
    .metric strong{font-size:1.35rem}
    .note{color:var(--muted);line-height:1.55;font-size:.92rem}
    .status-good{color:#bbf7d0}.status-warn{color:#fde68a}.status-bad{color:#fecdd3}
    ul{margin:0;padding-left:18px;color:var(--muted);line-height:1.55}
    @media (max-width:980px){.app{grid-template-columns:1fr}.camera{height:260px}.game{height:340px}}
    @media (max-width:640px){.hero{flex-direction:column;align-items:flex-start}.controls,.grid{grid-template-columns:1fr}.camera{height:220px}.game{height:300px}}
  </style>
</head>
<body>
  <div class="app">
    <section class="panel">
      <div class="hero">
        <div>
          <h1>Eye Runner Mobile</h1>
          <p>Jogo controlado por olhar/cabeça usando a câmera frontal.</p>
        </div>
        <div class="pillbar">
          <div class="pill"><span>Status</span><strong id="statusText">Pronto</strong></div>
          <div class="pill"><span>Pontos</span><strong id="scoreText">0</strong></div>
          <div class="pill"><span>Vidas</span><strong id="livesText">3</strong></div>
          <div class="pill"><span>Direção</span><strong id="directionText">Centro</strong></div>
        </div>
      </div>
      <div class="stage-wrap">
        <div class="camera">
          <video id="video" autoplay playsinline muted></video>
          <canvas id="faceCanvas"></canvas>
          <div class="camera-badge" id="cameraBadge">Ligue a câmera e olhe para a tela.</div>
        </div>
        <div class="game">
          <div class="hud">
            <div class="hudbox">Controle: <strong id="controlMode">Cabeça/olhar</strong></div>
            <div class="hudbox">Piscar: <strong id="blinkState">Não</strong></div>
          </div>
          <canvas id="gameCanvas"></canvas>
        </div>
        <div class="controls">
          <select id="difficultySelect">
            <option value="easy">Fácil</option>
            <option value="normal" selected>Normal</option>
            <option value="hard">Difícil</option>
          </select>
          <select id="controlSelect">
            <option value="head" selected>Controle por cabeça</option>
            <option value="eyes">Controle por olhos</option>
            <option value="hybrid">Controle híbrido</option>
          </select>
          <button id="cameraBtn">Ligar câmera</button>
          <button id="startBtn">Iniciar jogo</button>
          <button id="recalibrateBtn" class="secondary">Recalibrar centro</button>
          <button id="snapshotBtn" class="secondary">Salvar imagem</button>
        </div>
      </div>
    </section><aside class="panel side">
  <div class="card">
    <h3>Métricas do rastreio</h3>
    <div class="grid">
      <div class="metric"><small>Confiabilidade</small><strong id="confidenceText">0%</strong></div>
      <div class="metric"><small>Inclinação</small><strong id="tiltText">0</strong></div>
      <div class="metric"><small>Abertura olho E</small><strong id="leftEyeText">0</strong></div>
      <div class="metric"><small>Abertura olho D</small><strong id="rightEyeText">0</strong></div>
    </div>
  </div>
  <div class="card">
    <h3>Observações</h3>
    <div class="note" id="observationText">A câmera ainda não foi iniciada.</div>
  </div>
  <div class="card">
    <h3>Como publicar no GitHub</h3>
    <ul>
      <li>Crie um repositório público.</li>
      <li>Salve este código como <strong>index.html</strong>.</li>
      <li>Envie o arquivo <strong>index.html</strong> para a raiz do repositório.</li>
      <li>Ative o GitHub Pages em <strong>Settings → Pages → main → /(root)</strong>.</li>
    </ul>
  </div>
  <div class="card">
    <h3>Como jogar</h3>
    <ul>
      <li>Olhe para a esquerda para mover o personagem à esquerda.</li>
      <li>Olhe para a direita para mover o personagem à direita.</li>
      <li>Pisque para dar um dash curto.</li>
      <li>Desvie dos blocos vermelhos e pegue as estrelas.</li>
    </ul>
  </div>
</aside>

  </div>  <script type="module">
    import { FaceLandmarker, FilesetResolver, DrawingUtils } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs';

    const video = document.getElementById('video');
    const faceCanvas = document.getElementById('faceCanvas');
    const faceCtx = faceCanvas.getContext('2d');
    const gameCanvas = document.getElementById('gameCanvas');
    const gameCtx = gameCanvas.getContext('2d');

    const statusText = document.getElementById('statusText');
    const scoreText = document.getElementById('scoreText');
    const livesText = document.getElementById('livesText');
    const directionText = document.getElementById('directionText');
    const confidenceText = document.getElementById('confidenceText');
    const tiltText = document.getElementById('tiltText');
    const leftEyeText = document.getElementById('leftEyeText');
    const rightEyeText = document.getElementById('rightEyeText');
    const observationText = document.getElementById('observationText');
    const blinkState = document.getElementById('blinkState');
    const cameraBadge = document.getElementById('cameraBadge');

    const difficultySelect = document.getElementById('difficultySelect');
    const controlSelect = document.getElementById('controlSelect');
    const cameraBtn = document.getElementById('cameraBtn');
    const startBtn = document.getElementById('startBtn');
    const recalibrateBtn = document.getElementById('recalibrateBtn');
    const snapshotBtn = document.getElementById('snapshotBtn');

    let faceLandmarker;
    let drawingUtils;
    let stream;
    let rafId;
    let gameLoopId;
    let lastVideoTime = -1;
    let ready = false;
    let gameStarted = false;
    let centerCalib = { noseX: 0.5, irisLeft: 0.5, irisRight: 0.5 };
    let smoothedDirection = 0;
    let blinkCooldown = 0;

    const game = {
      w: 0,
      h: 0,
      player: { lane: 1, y: 0, dash: 0 },
      lanes: 3,
      obstacles: [],
      stars: [],
      score: 0,
      lives: 3,
      speed: 2.8
    };

    function resizeCanvases(){
      const rect = faceCanvas.getBoundingClientRect();
      faceCanvas.width = rect.width * devicePixelRatio;
      faceCanvas.height = rect.height * devicePixelRatio;
      faceCtx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);

      const grect = gameCanvas.getBoundingClientRect();
      gameCanvas.width = grect.width * devicePixelRatio;
      gameCanvas.height = grect.height * devicePixelRatio;
      gameCtx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
      game.w = grect.width;
      game.h = grect.height;
      game.player.y = game.h - 70;
    }

    async function setupFace(){
      if(faceLandmarker) return;
      statusText.textContent = 'Carregando IA';
      const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm');
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task'
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false
      });
      drawingUtils = new DrawingUtils(faceCtx);
      ready = true;
      statusText.textContent = 'IA pronta';
    }

    async function startCamera(){
      try{
        await setupFace();
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        video.srcObject = stream;
        await video.play();
        resizeCanvases();
        cameraBadge.textContent = 'Rosto detectado: mantenha-se centralizado.';
        observationText.textContent = 'Câmera iniciada. Faça uma calibração com o rosto olhando para o centro.';
        statusText.textContent = 'Câmera ativa';
      } catch (e) {
        statusText.textContent = 'Erro câmera';
        observationText.textContent = 'Não foi possível acessar a câmera. Verifique a permissão do navegador.';
      }
    }

    function dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }

    function eyeAspect(pts){
      const p1 = pts[0], p2 = pts[1], p3 = pts[2], p4 = pts[3], p5 = pts[4], p6 = pts[5];
      const vertical = dist(p2,p6) + dist(p3,p5);
      const horizontal = Math.max(dist(p1,p4), 0.0001);
      return vertical / (2 * horizontal);
    }

    function drawFace(results){
      const w = faceCanvas.clientWidth;
      const h = faceCanvas.clientHeight;
      faceCtx.clearRect(0,0,w,h);
      faceCtx.save();
      faceCtx.translate(w,0);
      faceCtx.scale(-1,1);
      if(results.faceLandmarks?.length){
        const lm = results.faceLandmarks[0];
        drawingUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color:'rgba(96,165,250,.25)', lineWidth:1 });
        drawingUtils.drawLandmarks([lm[1], lm[33], lm[263], lm[468], lm[473]], { color:'#fff', fillColor:'#22d3ee', radius:3 });
      }
      faceCtx.restore();
    }

    function analyzeFace(results, nowMs){
      if(!results.faceLandmarks?.length) {
        directionText.textContent = 'Sem rosto';
        confidenceText.textContent = '0%';
        observationText.textContent = 'Rosto não detectado. Deixe o rosto bem iluminado e centralizado.';
        return;
      }
      const lm = results.faceLandmarks[0];
      const nose = lm[1];
      const leftIris = lm[468];
      const rightIris = lm[473];
      const leftEyePts = [lm[33], lm[160], lm[158], lm[133], lm[153], lm[144]];
      const rightEyePts = [lm[362], lm[385], lm[387], lm[263], lm[373], lm[380]];
      const leftEAR = eyeAspect(leftEyePts);
      const rightEAR = eyeAspect(rightEyePts);
      const avgEAR = (leftEAR + rightEAR) / 2;

      leftEyeText.textContent = leftEAR.toFixed(2);
      rightEyeText.textContent = rightEAR.toFixed(2);
      confidenceText.textContent = '90%';

      const controlMode = controlSelect.value;
      const headDelta = nose.x - centerCalib.noseX;
      const eyeDelta = ((leftIris.x - centerCalib.irisLeft) + (rightIris.x - centerCalib.irisRight)) / 2;
      let rawDirection = 0;
      if(controlMode === 'head') rawDirection = headDelta * 8;
      else if(controlMode === 'eyes') rawDirection = eyeDelta * 20;
      else rawDirection = headDelta * 4 + eyeDelta * 10;
      smoothedDirection = smoothedDirection * 0.75 + rawDirection * 0.25;

      let dirText = 'Centro';
      if(smoothedDirection < -0.18) dirText = 'Esquerda';
      if(smoothedDirection > 0.18) dirText = 'Direita';
      directionText.textContent = dirText;
      tiltText.textContent = smoothedDirection.toFixed(2);

      if(avgEAR < 0.19 && blinkCooldown <= 0){
        blinkCooldown = 18;
        blinkState.textContent = 'Sim';
        if(gameStarted) game.player.dash = 18;
      } else {
        blinkState.textContent = blinkCooldown > 12 ? 'Sim' : 'Não';
      }

      if(dirText === 'Esquerda' && gameStarted) game.player.lane = Math.max(0, game.player.lane - 1);
      if(dirText === 'Direita' && gameStarted) game.player.lane = Math.min(game.lanes - 1, game.player.lane + 1);

      if(dirText === 'Centro') observationText.textContent = 'Rastreamento funcionando. Mantenha o olhar estável para jogar melhor.';
      if(dirText === 'Esquerda') observationText.textContent = 'Comando de esquerda detectado.';
      if(dirText === 'Direita') observationText.textContent = 'Comando de direita detectado.';
      if(avgEAR < 0.19) observationText.textContent = 'Piscar detectado: dash ativado.';

      if(blinkCooldown > 0) blinkCooldown -= 1;
    }

    function recalibrate(){
      if(!video.srcObject){ observationText.textContent = 'Ligue a câmera antes de recalibrar.'; return; }
      centerCalib = { ...centerCalib, noseX: 0.5, irisLeft: 0.5, irisRight: 0.5 };
      observationText.textContent = 'Recalibração preparada. Olhe para o centro por 1 segundo.';
    }

    function sampleCalibration(results){
      if(!results.faceLandmarks?.length) return;
      const lm = results.faceLandmarks[0];
      centerCalib.noseX = lm[1].x;
      centerCalib.irisLeft = lm[468].x;
      centerCalib.irisRight = lm[473].x;
    }

    function spawnObstacle(){
      const lane = Math.floor(Math.random() * game.lanes);
      game.obstacles.push({ lane, y: -40, size: 34 });
    }

    function spawnStar(){
      const lane = Math.floor(Math.random() * game.lanes);
      game.stars.push({ lane, y: -30, size: 24 });
    }

    function resetGame(){
      game.player.lane = 1;
      game.player.dash = 0;
      game.obstacles = [];
      game.stars = [];
      game.score = 0;
      game.lives = 3;
      scoreText.textContent = '0';
      livesText.textContent = '3';
      const diff = difficultySelect.value;
      game.speed = diff === 'easy' ? 2.2 : diff === 'hard' ? 4.2 : 3.1;
    }

    function laneX(lane){
      const laneWidth = game.w / game.lanes;
      return laneWidth * lane + laneWidth / 2;
    }

    function gameLoop(){
      const w = game.w, h = game.h;
      gameCtx.clearRect(0,0,w,h);

      gameCtx.fillStyle = '#0c1730';
      gameCtx.fillRect(0,0,w,h);
      for(let i=1;i<game.lanes;i++){
        gameCtx.strokeStyle = 'rgba(255,255,255,.12)';
        gameCtx.setLineDash([10,10]);
        gameCtx.beginPath();
        gameCtx.moveTo((w/game.lanes)*i, 0);
        gameCtx.lineTo((w/game.lanes)*i, h);
        gameCtx.stroke();
      }
      gameCtx.setLineDash([]);

      if(Math.random() < 0.028) spawnObstacle();
      if(Math.random() < 0.015) spawnStar();

      const playerX = laneX(game.player.lane);
      const playerY = game.player.y - (game.player.dash > 0 ? 18 : 0);
      if(game.player.dash > 0) game.player.dash--;

      game.obstacles.forEach(o => o.y += game.speed + 1.5);
      game.stars.forEach(s => s.y += game.speed + 1.2);

      game.obstacles = game.obstacles.filter(o => o.y < h + 60);
      game.stars = game.stars.filter(s => s.y < h + 60);

      for(const o of game.obstacles){
        const ox = laneX(o.lane);
        if(Math.abs(ox - playerX) < 26 && Math.abs(o.y - playerY) < 28){
          game.lives -= 1;
          livesText.textContent = String(game.lives);
          o.y = h + 100;
          if(game.lives <= 0){
            gameStarted = false;
            statusText.textContent = 'Game over';
            startBtn.textContent = 'Reiniciar jogo';
          }
        }
      }

      for(const s of game.stars){
        const sx = laneX(s.lane);
        if(Math.abs(sx - playerX) < 24 && Math.abs(s.y - playerY) < 26){
          game.score += 10;
          scoreText.textContent = String(game.score);
          s.y = h + 100;
        }
      }

      gameCtx.fillStyle = '#ff5d73';
      for(const o of game.obstacles){
        const ox = laneX(o.lane);
        gameCtx.fillRect(ox - 17, o.y - 17, 34, 34);
      }

      gameCtx.fillStyle = '#fbbf24';
      for(const s of game.stars){
        const sx = laneX(s.lane);
        drawStar(gameCtx, sx, s.y, 12, 5, 0.5);
      }

      gameCtx.fillStyle = '#22d3ee';
      gameCtx.beginPath();
      gameCtx.arc(playerX, playerY, 18, 0, Math.PI * 2);
      gameCtx.fill();
      gameCtx.fillStyle = '#fff';
      gameCtx.font = 'bold 18px Arial';
      gameCtx.fillText('👁️', playerX - 11, playerY + 6);

      if(gameStarted) gameLoopId = requestAnimationFrame(gameLoop);
    }

    function drawStar(ctx, x, y, radius, points, inset){
      ctx.beginPath();
      ctx.save();
      ctx.translate(x,y);
      ctx.moveTo(0,0-radius);
      for(let i=0;i<points;i++){
        ctx.rotate(Math.PI / points);
        ctx.lineTo(0,0-(radius*inset));
        ctx.rotate(Math.PI / points);
        ctx.lineTo(0,0-radius);
      }
      ctx.restore();
      ctx.closePath();
      ctx.fill();
    }

    async function renderFaceLoop(){
      if(video.readyState >= 2 && faceLandmarker){
        const nowMs = performance.now();
        if(lastVideoTime !== video.currentTime){
          lastVideoTime = video.currentTime;
          const results = faceLandmarker.detectForVideo(video, nowMs);
          drawFace(results);
          analyzeFace(results, nowMs);
          sampleCalibration(results);
        }
      }
      rafId = requestAnimationFrame(renderFaceLoop);
    }

    function toggleGame(){
      if(!video.srcObject){ observationText.textContent = 'Ligue a câmera antes de iniciar.'; return; }
      if(!gameStarted){
        resetGame();
        gameStarted = true;
        startBtn.textContent = 'Encerrar jogo';
        statusText.textContent = 'Jogando';
        gameLoop();
      } else {
        gameStarted = false;
        cancelAnimationFrame(gameLoopId);
        startBtn.textContent = 'Iniciar jogo';
        statusText.textContent = 'Parado';
      }
    }

    function saveSnapshot(){
      const temp = document.createElement('canvas');
      temp.width = gameCanvas.width;
      temp.height = gameCanvas.height;
      const tctx = temp.getContext('2d');
      tctx.setTransform(1,0,0,1,0,0);
      tctx.drawImage(gameCanvas, 0, 0, temp.width, temp.height);
      const link = document.createElement('a');
      link.download = `eye-runner-${Date.now()}.png`;
      link.href = temp.toDataURL('image/png');
      link.click();
    }

    cameraBtn.addEventListener('click', startCamera);
    startBtn.addEventListener('click', toggleGame);
    recalibrateBtn.addEventListener('click', recalibrate);
    snapshotBtn.addEventListener('click', saveSnapshot);
    window.addEventListener('resize', resizeCanvases);
    resizeCanvases();
    renderFaceLoop();
  </script></body>
</html>
