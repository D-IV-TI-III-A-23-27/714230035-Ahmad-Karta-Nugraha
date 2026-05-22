// ═══════════════════════════════════════════════════
//  Collaborative Filtering — Interactive Visualization
//  Ahmad Karta Nugraha — 714230035
// ═══════════════════════════════════════════════════

// ── DATA & STATE ──

const USER_NAMES = ['User A', 'User B', 'User C', 'User D', 'User E', 'User F', 'User G', 'User H'];
const USER_EMOJI = ['👤', '👩', '🧑', '👨', '👧', '🧔', '👵', '🧒'];
const ITEM_NAMES = ['Film A', 'Film B', 'Film C', 'Film D', 'Film E', 'Film F', 'Film G', 'Film H'];
const ITEM_EMOJI = ['🎬', '🎵', '📚', '🎮', '🎭', '🎨', '🏀', '🎯'];

const state = {
  numUsers: 6,
  numItems: 5,
  sparsity: 30,
  targetUser: 0,
  ratings: [],       // numUsers x numItems, 0 = empty
  similarities: [],  // similarity scores to target
  predictions: [],   // predicted ratings for target
  currentStep: 1
};

// ── DOM ELEMENTS ──

const els = {
  inputs: {
    users: document.getElementById('input-users'),
    items: document.getElementById('input-items'),
    sparsity: document.getElementById('input-sparsity'),
    target: document.getElementById('input-target'),
  },
  labels: {
    users: document.getElementById('label-users'),
    items: document.getElementById('label-items'),
    sparsity: document.getElementById('label-sparsity'),
    target: document.getElementById('label-target'),
  },
  tracks: {
    users: document.getElementById('track-users'),
    items: document.getElementById('track-items'),
    sparsity: document.getElementById('track-sparsity'),
    target: document.getElementById('track-target'),
  },
  thumbs: {
    users: document.getElementById('thumb-users'),
    items: document.getElementById('thumb-items'),
    sparsity: document.getElementById('thumb-sparsity'),
    target: document.getElementById('thumb-target'),
  },
  similarityPanel: document.getElementById('similarity-panel'),
  ratingTable: document.getElementById('rating-table'),
  recList: document.getElementById('rec-list'),
  recTargetName: document.getElementById('rec-target-name'),
  svgConnections: document.getElementById('svg-connections'),
  svgUsers: document.getElementById('svg-users'),
  svgItems: document.getElementById('svg-items'),
  graphSvg: document.getElementById('graph-svg'),
  stepFlow: document.getElementById('step-flow'),
  btnRegenerate: document.getElementById('btn-regenerate'),
  tooltip: document.getElementById('tooltip'),
};

// ── UTILITY ──

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function updateSliderUI(id) {
  const input = els.inputs[id];
  const val = parseFloat(input.value);
  const min = parseFloat(input.min);
  const max = parseFloat(input.max);
  const pct = ((val - min) / (max - min)) * 100;

  els.tracks[id].style.width = `${pct}%`;
  els.thumbs[id].style.left = `calc(${pct}% - 5px)`;
}

// ── GENERATE RATINGS ──

function generateRatings() {
  const { numUsers, numItems, sparsity } = state;
  const ratings = [];

  for (let u = 0; u < numUsers; u++) {
    const row = [];
    for (let i = 0; i < numItems; i++) {
      // Decide if this cell is empty based on sparsity
      if (Math.random() * 100 < sparsity) {
        row.push(0); // empty
      } else {
        row.push(rand(1, 5));
      }
    }
    // Ensure each user has rated at least 1 item
    if (row.every(v => v === 0)) {
      row[rand(0, numItems - 1)] = rand(1, 5);
    }
    ratings.push(row);
  }

  // Ensure target user has at least 1 empty rating (to predict)
  const target = state.targetUser;
  if (ratings[target].every(v => v > 0)) {
    // Remove one rating
    const idx = rand(0, numItems - 1);
    ratings[target][idx] = 0;
  }

  state.ratings = ratings;
}

// ── COSINE SIMILARITY ──

function cosineSimilarity(vecA, vecB) {
  // Only consider items rated by BOTH users
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  let commonCount = 0;

  for (let i = 0; i < vecA.length; i++) {
    if (vecA[i] > 0 && vecB[i] > 0) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
      commonCount++;
    }
  }

  if (commonCount === 0 || normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── COMPUTE SIMILARITIES ──

function computeSimilarities() {
  const { ratings, targetUser, numUsers } = state;
  const targetRatings = ratings[targetUser];
  const similarities = [];

  for (let u = 0; u < numUsers; u++) {
    if (u === targetUser) {
      similarities.push({ user: u, score: 1.0, isSelf: true });
    } else {
      const sim = cosineSimilarity(targetRatings, ratings[u]);
      similarities.push({ user: u, score: sim, isSelf: false });
    }
  }

  state.similarities = similarities;
}

// ── PREDICT RATINGS ──

function predictRatings() {
  const { ratings, similarities, targetUser, numItems } = state;
  const targetRatings = ratings[targetUser];
  const predictions = [];

  for (let i = 0; i < numItems; i++) {
    if (targetRatings[i] > 0) {
      // Already rated, no need to predict
      predictions.push({ item: i, score: targetRatings[i], isPrediction: false });
      continue;
    }

    // Weighted average of other users' ratings for this item
    let weightedSum = 0;
    let simSum = 0;

    for (const sim of similarities) {
      if (sim.isSelf) continue;
      if (sim.score <= 0) continue;
      if (ratings[sim.user][i] === 0) continue;

      weightedSum += sim.score * ratings[sim.user][i];
      simSum += sim.score;
    }

    const predicted = simSum > 0 ? weightedSum / simSum : 0;
    predictions.push({ item: i, score: predicted, isPrediction: true });
  }

  state.predictions = predictions;
}

// ── RENDER RATING TABLE ──

function renderRatingTable() {
  const { ratings, predictions, numUsers, numItems, targetUser } = state;
  let html = '<thead><tr><th class="user-col"></th>';

  for (let i = 0; i < numItems; i++) {
    html += `<th class="item-col">${ITEM_EMOJI[i]}<br/>${ITEM_NAMES[i].split(' ')[1]}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (let u = 0; u < numUsers; u++) {
    const isTarget = u === targetUser;
    html += `<tr style="${isTarget ? 'background:rgba(251,191,36,0.04);' : ''}">`;
    html += `<td style="${isTarget ? 'color:#fbbf24;' : ''}">${USER_EMOJI[u]} ${USER_NAMES[u].split(' ')[1]}</td>`;

    for (let i = 0; i < numItems; i++) {
      const val = ratings[u][i];
      if (val > 0) {
        html += `<td><span class="rating-cell has-value">${val}</span></td>`;
      } else if (isTarget) {
        const pred = predictions.find(p => p.item === i);
        if (pred && pred.score > 0) {
          html += `<td><span class="rating-cell predicted">${pred.score.toFixed(1)}</span></td>`;
        } else {
          html += `<td><span class="rating-cell empty">—</span></td>`;
        }
      } else {
        html += `<td><span class="rating-cell empty">—</span></td>`;
      }
    }
    html += '</tr>';
  }
  html += '</tbody>';

  els.ratingTable.innerHTML = html;
}

// ── RENDER SIMILARITY PANEL ──

function renderSimilarity() {
  const { similarities, targetUser } = state;
  let html = '';

  const sorted = [...similarities]
    .filter(s => !s.isSelf)
    .sort((a, b) => b.score - a.score);

  for (const sim of sorted) {
    const pct = Math.max(0, sim.score * 100);
    const color = sim.score > 0.8 ? '#5eead4' :
                  sim.score > 0.5 ? '#fbbf24' :
                  sim.score > 0.2 ? '#fb923c' : '#fb7185';

    html += `
      <div class="sim-bar-row">
        <span class="sim-bar-label">${USER_EMOJI[sim.user]} ${USER_NAMES[sim.user].split(' ')[1]}</span>
        <div class="sim-bar-track">
          <div class="sim-bar-fill" style="width:${pct}%; background:${color};"></div>
        </div>
        <span class="sim-bar-value" style="color:${color};">${sim.score.toFixed(2)}</span>
      </div>`;
  }

  els.similarityPanel.innerHTML = html;
}

// ── RENDER RECOMMENDATIONS ──

function renderRecommendations() {
  const { predictions, targetUser } = state;
  els.recTargetName.textContent = USER_NAMES[targetUser];

  const recs = predictions
    .filter(p => p.isPrediction && p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (recs.length === 0) {
    els.recList.innerHTML = `
      <div class="rec-item" style="color:#555; font-size:12px; font-style:italic;">
        Tidak cukup data untuk membuat rekomendasi. Coba kurangi kelangkaan rating.
      </div>`;
    return;
  }

  let html = '';
  for (const rec of recs) {
    const stars = renderStars(Math.round(rec.score));
    html += `
      <div class="rec-item animate-in">
        <span class="rec-icon">${ITEM_EMOJI[rec.item]}</span>
        <div class="rec-info">
          <div class="rec-name">${ITEM_NAMES[rec.item]}</div>
          <div class="rec-reason">${stars} — dari user serupa</div>
        </div>
        <span class="rec-score">★ ${rec.score.toFixed(1)}</span>
      </div>`;
  }

  els.recList.innerHTML = html;
}

function renderStars(count) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<span class="star ${i <= count ? 'filled' : ''}">★</span>`;
  }
  return `<span class="stars">${html}</span>`;
}

// ── RENDER SVG GRAPH ──

function renderGraph() {
  const { ratings, predictions, similarities, numUsers, numItems, targetUser } = state;

  // Clear
  els.svgConnections.innerHTML = '';
  els.svgUsers.innerHTML = '';
  els.svgItems.innerHTML = '';

  const svgW = 700;
  const svgH = 420;
  const userX = 120;
  const itemX = 560;
  const paddingY = 50;
  const usableH = svgH - paddingY * 2;

  // User positions
  const userPositions = [];
  for (let u = 0; u < numUsers; u++) {
    const y = paddingY + (u / Math.max(1, numUsers - 1)) * usableH;
    userPositions.push({ x: userX, y: numUsers === 1 ? svgH / 2 : y });
  }

  // Item positions
  const itemPositions = [];
  for (let i = 0; i < numItems; i++) {
    const y = paddingY + (i / Math.max(1, numItems - 1)) * usableH;
    itemPositions.push({ x: itemX, y: numItems === 1 ? svgH / 2 : y });
  }

  // Draw connections (ratings)
  for (let u = 0; u < numUsers; u++) {
    for (let i = 0; i < numItems; i++) {
      if (ratings[u][i] > 0) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const isTarget = u === targetUser;
        const opacity = 0.08 + (ratings[u][i] / 5) * 0.35;
        const strokeWidth = 0.5 + (ratings[u][i] / 5) * 2;

        line.setAttribute('x1', userPositions[u].x);
        line.setAttribute('y1', userPositions[u].y);
        line.setAttribute('x2', itemPositions[i].x);
        line.setAttribute('y2', itemPositions[i].y);
        line.setAttribute('stroke', isTarget ? '#fbbf24' : '#5eead4');
        line.setAttribute('stroke-width', strokeWidth);
        line.setAttribute('stroke-opacity', opacity);
        line.setAttribute('stroke-linecap', 'round');

        els.svgConnections.appendChild(line);
      }
    }
  }

  // Draw prediction connections (dashed amber)
  for (const pred of predictions) {
    if (pred.isPrediction && pred.score > 0) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', userPositions[targetUser].x);
      line.setAttribute('y1', userPositions[targetUser].y);
      line.setAttribute('x2', itemPositions[pred.item].x);
      line.setAttribute('y2', itemPositions[pred.item].y);
      line.setAttribute('stroke', '#fbbf24');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('stroke-opacity', '0.5');
      line.setAttribute('stroke-dasharray', '6 4');
      line.setAttribute('stroke-linecap', 'round');

      // Animate
      const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animate.setAttribute('attributeName', 'stroke-dashoffset');
      animate.setAttribute('values', '20;0');
      animate.setAttribute('dur', '1.5s');
      animate.setAttribute('repeatCount', 'indefinite');
      line.appendChild(animate);

      els.svgConnections.appendChild(line);
    }
  }

  // Draw similarity arcs between target user and others
  for (const sim of similarities) {
    if (sim.isSelf || sim.score <= 0.1) continue;

    const fromY = userPositions[targetUser].y;
    const toY = userPositions[sim.user].y;
    const midY = (fromY + toY) / 2;
    const curveX = userX - 30 - sim.score * 40;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${userX} ${fromY} Q ${curveX} ${midY} ${userX} ${toY}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', sim.score > 0.7 ? '#5eead4' : sim.score > 0.4 ? '#fbbf24' : '#fb7185');
    path.setAttribute('stroke-width', 0.5 + sim.score * 1.5);
    path.setAttribute('stroke-opacity', 0.15 + sim.score * 0.3);
    path.setAttribute('stroke-dasharray', '3 3');

    els.svgConnections.appendChild(path);
  }

  // Draw user nodes
  for (let u = 0; u < numUsers; u++) {
    const pos = userPositions[u];
    const isTarget = u === targetUser;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'user-node-svg');
    g.style.cursor = 'pointer';

    // Background circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', pos.x);
    circle.setAttribute('cy', pos.y);
    circle.setAttribute('r', '22');
    circle.setAttribute('fill', '#0c0c0e');
    circle.setAttribute('stroke', isTarget ? '#fbbf24' : '#333');
    circle.setAttribute('stroke-width', isTarget ? '2' : '1');
    if (isTarget) {
      circle.setAttribute('filter', 'url(#glow-amber)');
    }
    g.appendChild(circle);

    // Emoji
    const emoji = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    emoji.setAttribute('x', pos.x);
    emoji.setAttribute('y', pos.y + 1);
    emoji.setAttribute('text-anchor', 'middle');
    emoji.setAttribute('dominant-baseline', 'central');
    emoji.setAttribute('font-size', '16');
    emoji.textContent = USER_EMOJI[u];
    g.appendChild(emoji);

    // Label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', pos.x);
    label.setAttribute('y', pos.y + 34);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', isTarget ? '#fbbf24' : '#555');
    label.setAttribute('font-family', "'JetBrains Mono'");
    label.setAttribute('font-size', '9');
    label.setAttribute('letter-spacing', '0.05em');
    label.textContent = USER_NAMES[u];
    g.appendChild(label);

    // Similarity label (if not self)
    if (!isTarget) {
      const sim = similarities.find(s => s.user === u);
      if (sim && sim.score > 0) {
        const simLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        simLabel.setAttribute('x', pos.x - 32);
        simLabel.setAttribute('y', pos.y + 4);
        simLabel.setAttribute('text-anchor', 'end');
        simLabel.setAttribute('fill', sim.score > 0.7 ? '#5eead4' : sim.score > 0.4 ? '#fbbf24' : '#fb7185');
        simLabel.setAttribute('font-family', "'JetBrains Mono'");
        simLabel.setAttribute('font-size', '9');
        simLabel.setAttribute('opacity', '0.7');
        simLabel.textContent = sim.score.toFixed(2);
        g.appendChild(simLabel);
      }
    }

    els.svgUsers.appendChild(g);
  }

  // Draw item nodes
  for (let i = 0; i < numItems; i++) {
    const pos = itemPositions[i];
    const pred = predictions.find(p => p.item === i);
    const isPredicted = pred && pred.isPrediction && pred.score > 0;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // Background rect
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', pos.x - 22);
    rect.setAttribute('y', pos.y - 22);
    rect.setAttribute('width', '44');
    rect.setAttribute('height', '44');
    rect.setAttribute('rx', '6');
    rect.setAttribute('fill', '#0c0c0e');
    rect.setAttribute('stroke', isPredicted ? '#fbbf24' : '#333');
    rect.setAttribute('stroke-width', isPredicted ? '2' : '1');
    rect.setAttribute('stroke-dasharray', isPredicted ? '4 2' : 'none');
    if (isPredicted) {
      rect.setAttribute('filter', 'url(#glow-amber)');
    }
    g.appendChild(rect);

    // Emoji
    const emoji = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    emoji.setAttribute('x', pos.x);
    emoji.setAttribute('y', pos.y + 1);
    emoji.setAttribute('text-anchor', 'middle');
    emoji.setAttribute('dominant-baseline', 'central');
    emoji.setAttribute('font-size', '18');
    emoji.textContent = ITEM_EMOJI[i];
    g.appendChild(emoji);

    // Label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', pos.x);
    label.setAttribute('y', pos.y + 34);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', isPredicted ? '#fbbf24' : '#555');
    label.setAttribute('font-family', "'JetBrains Mono'");
    label.setAttribute('font-size', '9');
    label.textContent = ITEM_NAMES[i];
    g.appendChild(label);

    // Prediction score label
    if (isPredicted) {
      const scoreLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      scoreLabel.setAttribute('x', pos.x + 30);
      scoreLabel.setAttribute('y', pos.y + 4);
      scoreLabel.setAttribute('text-anchor', 'start');
      scoreLabel.setAttribute('fill', '#fbbf24');
      scoreLabel.setAttribute('font-family', "'JetBrains Mono'");
      scoreLabel.setAttribute('font-size', '10');
      scoreLabel.setAttribute('font-weight', '600');
      scoreLabel.textContent = `★${pred.score.toFixed(1)}`;
      g.appendChild(scoreLabel);
    }

    els.svgItems.appendChild(g);
  }
}

// ── UPDATE STEP FLOW ──

function updateStepFlow(step) {
  state.currentStep = step;
  const badges = els.stepFlow.querySelectorAll('.step-badge');
  badges.forEach(badge => {
    const s = parseInt(badge.dataset.step);
    if (s <= step) {
      badge.classList.add('active');
    } else {
      badge.classList.remove('active');
    }
  });
}

// ── MAIN UPDATE ──

function update() {
  // Step 1: Generate / use existing ratings
  updateStepFlow(1);

  // Step 2: Compute similarities
  computeSimilarities();
  updateStepFlow(2);

  // Step 3: Predict & recommend
  predictRatings();
  updateStepFlow(3);

  // Render everything
  renderRatingTable();
  renderSimilarity();
  renderRecommendations();
  renderGraph();

  // Update labels
  els.labels.users.textContent = state.numUsers;
  els.labels.items.textContent = state.numItems;
  els.labels.sparsity.textContent = state.sparsity + '%';
  els.labels.target.textContent = USER_NAMES[state.targetUser];
}

// ── EVENT HANDLERS ──

function setupSlider(id, callback) {
  els.inputs[id].addEventListener('input', (e) => {
    callback(parseFloat(e.target.value));
    updateSliderUI(id);
  });
}

setupSlider('users', (val) => {
  state.numUsers = val;
  // Ensure target is within bounds
  if (state.targetUser >= val) {
    state.targetUser = val - 1;
    els.inputs.target.value = state.targetUser;
    updateSliderUI('target');
  }
  els.inputs.target.max = val - 1;
  generateRatings();
  update();
});

setupSlider('items', (val) => {
  state.numItems = val;
  generateRatings();
  update();
});

setupSlider('sparsity', (val) => {
  state.sparsity = val;
  generateRatings();
  update();
});

setupSlider('target', (val) => {
  state.targetUser = val;
  update();
});

els.btnRegenerate.addEventListener('click', () => {
  generateRatings();
  update();
});

// ── NAVIGATION ──

const btnNavVis = document.getElementById('nav-vis');
const btnNavExp = document.getElementById('nav-exp');
const viewVisualisasi = document.getElementById('view-visualisasi');
const viewPenjelasan = document.getElementById('view-penjelasan');

function switchView(view) {
  if (view === 'vis') {
    viewVisualisasi.classList.remove('hidden');
    viewPenjelasan.classList.remove('visible');
    viewPenjelasan.style.display = 'none';
    btnNavVis.classList.add('active');
    btnNavExp.classList.remove('active');
  } else {
    viewVisualisasi.classList.add('hidden');
    viewPenjelasan.classList.add('visible');
    viewPenjelasan.style.display = 'block';
    btnNavVis.classList.remove('active');
    btnNavExp.classList.add('active');
  }
}

btnNavVis.addEventListener('click', () => switchView('vis'));
btnNavExp.addEventListener('click', () => switchView('exp'));

// ── INIT ──

function init() {
  // Set slider max for target
  els.inputs.target.max = state.numUsers - 1;

  // Update all slider UIs
  updateSliderUI('users');
  updateSliderUI('items');
  updateSliderUI('sparsity');
  updateSliderUI('target');

  // Generate initial data
  generateRatings();
  update();
}

init();
