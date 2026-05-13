import { generateBaseData, computePCA } from './mathUtils.js';

const MAX_POINTS = 1000;
let baseData = generateBaseData(MAX_POINTS);

const state = {
  numPoints: 200,
  spreadX: 5,
  spreadY: 2,
  rotation: 30
};

const els = {
  inputs: {
    points: document.getElementById('input-points'),
    spreadX: document.getElementById('input-spreadx'),
    spreadY: document.getElementById('input-spready'),
    rotation: document.getElementById('input-rotation'),
  },
  labels: {
    points: document.getElementById('label-points'),
    spreadX: document.getElementById('label-spreadx'),
    spreadY: document.getElementById('label-spready'),
    rotation: document.getElementById('label-rotation'),
  },
  tracks: {
    points: document.getElementById('track-points'),
    spreadX: document.getElementById('track-spreadx'),
    spreadY: document.getElementById('track-spready'),
    rotation: document.getElementById('track-rotation'),
  },
  thumbs: {
    points: document.getElementById('thumb-points'),
    spreadX: document.getElementById('thumb-spreadx'),
    spreadY: document.getElementById('thumb-spready'),
    rotation: document.getElementById('thumb-rotation'),
  },
  btnRecalculate: document.getElementById('btn-recalculate'),
  
  valPc1: document.getElementById('val-pc1'),
  valPc2: document.getElementById('val-pc2'),
  barPc1: document.getElementById('bar-pc1'),
  barPc2: document.getElementById('bar-pc2'),
  percPc1: document.getElementById('perc-pc1'),
  percPc2: document.getElementById('perc-pc2'),
  
  valCxx: document.getElementById('val-cxx'),
  valCxy1: document.getElementById('val-cxy1'),
  valCxy2: document.getElementById('val-cxy2'),
  valCyy: document.getElementById('val-cyy'),
  
  svgPoints: document.getElementById('svg-points'),
  linePc1Fwd: document.getElementById('line-pc1-fwd'),
  linePc1Bwd: document.getElementById('line-pc1-bwd'),
  linePc2Fwd: document.getElementById('line-pc2-fwd'),
  linePc2Bwd: document.getElementById('line-pc2-bwd'),
  meanDot: document.getElementById('mean-dot')
};

const fmt = (num) => num.toFixed(3);
const fmtPercent = (num) => (num * 100).toFixed(1) + '%';

function updateSliderUI(id, valStr, unit = '') {
  const elInput = els.inputs[id];
  const val = parseFloat(elInput.value);
  const min = parseFloat(elInput.min);
  const max = parseFloat(elInput.max);
  
  const percentage = ((val - min) / (max - min)) * 100;
  
  els.labels[id].textContent = `${val}${unit}`;
  els.tracks[id].style.width = `${percentage}%`;
  els.thumbs[id].style.left = `calc(${percentage}% - 4px)`;
}

function processData() {
  const rad = (state.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const transformedData = baseData.slice(0, state.numPoints).map(p => {
    const sx = p.x * state.spreadX;
    const sy = p.y * state.spreadY;
    return {
      x: sx * cos - sy * sin,
      y: sx * sin + sy * cos
    };
  });

  const pca = computePCA(transformedData);
  updateView(transformedData, pca);
}

const SVG_NS = "http://www.w3.org/2000/svg";

function updateView(data, pca) {
  els.valCxx.textContent = fmt(pca.c_xx);
  els.valCxy1.textContent = fmt(pca.c_xy);
  els.valCxy2.textContent = fmt(pca.c_xy);
  els.valCyy.textContent = fmt(pca.c_yy);
  
  els.valPc1.textContent = fmt(pca.e1.l);
  els.valPc2.textContent = fmt(pca.e2.l);
  
  els.barPc1.style.width = `${pca.varianceExplained.pc1 * 100}%`;
  els.barPc2.style.width = `${pca.varianceExplained.pc2 * 100}%`;
  
  els.percPc1.textContent = fmtPercent(pca.varianceExplained.pc1);
  els.percPc2.textContent = fmtPercent(pca.varianceExplained.pc2);

  els.svgPoints.innerHTML = ''; 
  const fragment = document.createDocumentFragment();
  for(let i = 0; i < data.length; i++) {
    const p = data[i];
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", p.x);
    circle.setAttribute("cy", -p.y);
    circle.setAttribute("r", "0.8");
    circle.setAttribute("fill", "#5eead4");
    circle.setAttribute("class", "opacity-40 mix-blend-screen");
    fragment.appendChild(circle);
  }
  els.svgPoints.appendChild(fragment);

  const e1Mag = pca.e1.mag * 3;
  const e2Mag = pca.e2.mag * 3;
  
  const mX = pca.mean.x;
  const mY = -pca.mean.y; // flipped Y for Cartesian

  els.linePc1Fwd.setAttribute("x1", mX);
  els.linePc1Fwd.setAttribute("y1", mY);
  els.linePc1Fwd.setAttribute("x2", String(mX + pca.e1.v.x * e1Mag));
  els.linePc1Fwd.setAttribute("y2", String(mY - pca.e1.v.y * e1Mag));

  els.linePc1Bwd.setAttribute("x1", mX);
  els.linePc1Bwd.setAttribute("y1", mY);
  els.linePc1Bwd.setAttribute("x2", String(mX - pca.e1.v.x * e1Mag));
  els.linePc1Bwd.setAttribute("y2", String(mY + pca.e1.v.y * e1Mag));

  els.linePc2Fwd.setAttribute("x1", mX);
  els.linePc2Fwd.setAttribute("y1", mY);
  els.linePc2Fwd.setAttribute("x2", String(mX + pca.e2.v.x * e2Mag));
  els.linePc2Fwd.setAttribute("y2", String(mY - pca.e2.v.y * e2Mag));

  els.linePc2Bwd.setAttribute("x1", mX);
  els.linePc2Bwd.setAttribute("y1", mY);
  els.linePc2Bwd.setAttribute("x2", String(mX - pca.e2.v.x * e2Mag));
  els.linePc2Bwd.setAttribute("y2", String(mY + pca.e2.v.y * e2Mag));

  els.meanDot.setAttribute("cx", mX);
  els.meanDot.setAttribute("cy", mY);
}

function handleInputChange(id, propName, unit = '') {
  els.inputs[id].addEventListener('input', (e) => {
    state[propName] = parseFloat(e.target.value);
    updateSliderUI(id, state[propName], unit);
    processData();
  });
}

handleInputChange('points', 'numPoints', ' pts');
handleInputChange('spreadX', 'spreadX', '');
handleInputChange('spreadY', 'spreadY', '');
handleInputChange('rotation', 'rotation', '°');

els.btnRecalculate.addEventListener('click', () => {
  baseData = generateBaseData(MAX_POINTS);
  processData();
});

// Init
updateSliderUI('points', state.numPoints, ' pts');
updateSliderUI('spreadX', state.spreadX, '');
updateSliderUI('spreadY', state.spreadY, '');
updateSliderUI('rotation', state.rotation, '°');
processData();

// Navigation Logic
const btnNavVis = document.getElementById('nav-vis');
const btnNavExp = document.getElementById('nav-exp');
const viewVisualisasi = document.getElementById('view-visualisasi');
const viewPenjelasan = document.getElementById('view-penjelasan');

function switchView(view) {
  if (view === 'vis') {
    viewVisualisasi.classList.remove('hidden');
    viewPenjelasan.classList.add('hidden');
    btnNavVis.classList.add('text-[#5eead4]');
    btnNavExp.classList.remove('text-[#5eead4]');
  } else {
    viewVisualisasi.classList.add('hidden');
    viewPenjelasan.classList.remove('hidden');
    btnNavVis.classList.remove('text-[#5eead4]');
    btnNavExp.classList.add('text-[#5eead4]');
  }
}

btnNavVis.addEventListener('click', () => switchView('vis'));
btnNavExp.addEventListener('click', () => switchView('exp'));
