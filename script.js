// === Variables globales ===
let intervalId = null;
let isPlaying = false;
let showHeatmap = false;
let pieceConflicts = [];
let conflictEdges = [];
let currentStep = 0;
let instructions = [];
let pieces = [];
let N = 4;

// === Ajout bouton thermique ===
const heatBtn = document.createElement('button');
heatBtn.textContent = 'Activer mode thermique';
heatBtn.onclick = () => {
  showHeatmap = !showHeatmap;
  heatBtn.textContent = showHeatmap ? 'Désactiver mode thermique' : 'Activer mode thermique';
  drawGrid(N, pieces);
};
document.body.insertBefore(heatBtn, document.getElementById("puzzleCanvas"));

// === Sélection fichier ===
document.getElementById('fileInput').addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const content = e.target.result;
    document.getElementById('output').textContent = content;
    parseAnimationData(content);
  };
  reader.readAsText(file);
}

function parseAnimationData(data) {
  const values = data.trim().split(/\s+/).map(Number);
  N = values[0];
  const numPieces = N * N;
  pieces = [];
  for (let i = 0; i < numPieces; i++) {
    const base = 2 + i * 4;
    pieces.push({
      id: i,
      sides: [values[base], values[base + 1], values[base + 2], values[base + 3]],
      rotation: 0
    });
  }
  instructions = [];
  let i = 2 + numPieces * 4;
  while (i < values.length) {
    const type = values[i];
    if (type === 1) {
      instructions.push({ type: 1, index: values[i + 1], rotation: values[i + 2] });
      i += 3;
    } else if (type === 2) {
      instructions.push({ type: 2, from: values[i + 1], rotFrom: values[i + 2], to: values[i + 3], rotTo: values[i + 4] });
      i += 5;
    } else {
      break;
    }
  }
  currentStep = 0;
  drawGrid(N, pieces);
  updateConflictCount();
}

// === Lecture auto ===
document.getElementById("nextStepBtn").addEventListener("click", () => {
  if (currentStep >= instructions.length) return alert("Fin de l'animation !");
  applyStep();
});

document.getElementById("autoBtn").addEventListener("click", () => {
  if (!isPlaying) {
    startAutoPlay();
    document.getElementById("autoBtn").textContent = "Pause";
  } else {
    stopAutoPlay();
    document.getElementById("autoBtn").textContent = "Lancer l'animation";
  }
});

function applyStep() {
  const instr = instructions[currentStep];
  if (instr.type === 1) {
    pieces[instr.index].rotation = (pieces[instr.index].rotation + instr.rotation) % 4;
  } else if (instr.type === 2) {
    const temp = { ...pieces[instr.from] };
    pieces[instr.from] = { ...pieces[instr.to] };
    pieces[instr.to] = temp;
    pieces[instr.from].rotation = (pieces[instr.from].rotation + instr.rotTo) % 4;
    pieces[instr.to].rotation = (pieces[instr.to].rotation + instr.rotFrom) % 4;
  }
  drawGrid(N, pieces);
  updateConflictCount();
  currentStep++;
}

function startAutoPlay() {
  const speed = document.getElementById("speedRange").value;
  isPlaying = true;
  intervalId = setInterval(() => {
    if (currentStep >= instructions.length) {
      stopAutoPlay();
      alert("Fin de l'animation !");
    } else {
      applyStep();
    }
  }, speed);
}

function stopAutoPlay() {
  isPlaying = false;
  clearInterval(intervalId);
}

// === Dessin ===
const canvas = document.getElementById("puzzleCanvas");
const ctx = canvas.getContext("2d");
const colorMap = { 0: "#ccc", 1: "#e74c3c", 2: "#2ecc71", 3: "#3498db", 4: "#f1c40f" };

function drawGrid(N, pieces) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const size = canvas.width / N;
  pieces.forEach((piece, index) => {
    const row = Math.floor(index / N);
    const col = index % N;
    const x = col * size;
    const y = row * size;
    drawPiece(piece, x, y, size, index);
  });
  ctx.strokeStyle = "red";
  ctx.lineWidth = 3;
  conflictEdges.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
}

function drawPiece(piece, x, y, size, gridIndex)
 {
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.rotate((Math.PI / 2) * piece.rotation);
  ctx.translate(-size / 2, -size / 2);
  ctx.strokeStyle = "#333";
  ctx.strokeRect(0, 0, size, size);
  const h = size / 2;
  const dirs = [
    [[0, 0], [size, 0]],
    [[size, 0], [size, size]],
    [[size, size], [0, size]],
    [[0, size], [0, 0]]
  ];
  for (let d = 0; d < 4; d++) {
    ctx.beginPath();
    ctx.moveTo(h, h);
    ctx.lineTo(...dirs[d][0]);
    ctx.lineTo(...dirs[d][1]);
    ctx.closePath();

    let fillColor = colorMap[piece.sides[d]];

    if (showHeatmap) {
        const row = Math.floor(gridIndex / N);
        const col = gridIndex % N;        
      const neighborOffsets = [
        [-1, 0, 2], [0, 1, 3], [1, 0, 0], [0, -1, 1]
      ];
      const [dy, dx, ndir] = neighborOffsets[d];
      const nr = row + dy;
      const nc = col + dx;
      let conflict = false;
      const c1 = getRotatedSide(piece, d);
      if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
        const neighbor = pieces[nr * N + nc];
        const c2 = getRotatedSide(neighbor, ndir);
        conflict = c1 !== c2 && c1 !== 0 && c2 !== 0;
      }
      fillColor = conflict ? "#e74c3c" : "#3498db";
    }

    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  ctx.restore();
}

function getRotatedSide(piece, dir) {
  return piece.sides[(dir - piece.rotation + 4) % 4];
}

function updateConflictCount() {
  let count = 0;
  const size = canvas.width / N;
  conflictEdges = [];
  pieceConflicts = Array(N * N).fill(0);
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      const i = row * N + col;
      const p = pieces[i];
      if (col < N - 1) {
        const rIdx = row * N + (col + 1);
        const p2 = pieces[rIdx];
        const c1 = getRotatedSide(p, 1);
        const c2 = getRotatedSide(p2, 3);
        if (c1 !== c2 && c1 !== 0 && c2 !== 0) {
          pieceConflicts[i]++;
          pieceConflicts[rIdx]++;
          count++;
          conflictEdges.push([(col + 1) * size, row * size, (col + 1) * size, (row + 1) * size]);
        }
      }
      if (row < N - 1) {
        const bIdx = (row + 1) * N + col;
        const p2 = pieces[bIdx];
        const c1 = getRotatedSide(p, 2);
        const c2 = getRotatedSide(p2, 0);
        if (c1 !== c2 && c1 !== 0 && c2 !== 0) {
          pieceConflicts[i]++;
          pieceConflicts[bIdx]++;
          count++;
          conflictEdges.push([col * size, (row + 1) * size, (col + 1) * size, (row + 1) * size]);
        }
      }
    }
  }
  document.getElementById("conflictCount").textContent = `Conflits : ${count}`;
}