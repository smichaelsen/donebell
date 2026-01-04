const STORAGE_KEY = 'donebell.inventory.v1';
const STORAGE_RANGE_KEY = 'donebell.range.v1';
const STEP = 0.25;

const inventoryTableBody = document.querySelector('#inventory-table tbody');
const addRowBtn = document.querySelector('#add-row');
const resetBtn = document.querySelector('#reset-data');
const minInput = document.querySelector('#min-kg');
const maxInput = document.querySelector('#max-kg');
const generateBtn = document.querySelector('#generate');
const messageEl = document.querySelector('#message');
const singleTableBody = document.querySelector('#single-table tbody');
const pairTableBody = document.querySelector('#pair-table tbody');

function snapWeight(value) {
  return Math.round(value / STEP) * STEP;
}

function setMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.className = `small ${isError ? 'text-danger' : 'text-muted'}`;
}

function createRow(weight = '', quantity = '') {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="number" step="${STEP}" min="0" class="form-control form-control-sm weight-input" value="${weight}"></td>
    <td><input type="number" step="1" min="0" class="form-control form-control-sm qty-input" value="${quantity}"></td>
    <td class="text-end">
      <button class="btn btn-outline-danger btn-sm remove-row">Remove</button>
    </td>
  `;
  tr.querySelector('.weight-input').addEventListener('change', saveState);
  tr.querySelector('.qty-input').addEventListener('change', saveState);
  tr.querySelector('.remove-row').addEventListener('click', () => {
    tr.remove();
    saveState();
  });
  return tr;
}

function loadState() {
  inventoryTableBody.innerHTML = '';
  const saved = localStorage.getItem(STORAGE_KEY);
  const rows = saved ? JSON.parse(saved) : [{ weightKg: 1, quantity: 2 }];
  rows.forEach((row) => inventoryTableBody.appendChild(createRow(row.weightKg, row.quantity)));

  const rangeSaved = localStorage.getItem(STORAGE_RANGE_KEY);
  if (rangeSaved) {
    const { minKg, maxKg } = JSON.parse(rangeSaved);
    minInput.value = minKg ?? '';
    maxInput.value = maxKg ?? '';
  } else {
    minInput.value = 10;
    maxInput.value = 24;
  }
}

function saveState() {
  const rows = Array.from(inventoryTableBody.querySelectorAll('tr')).map((tr) => {
    const weight = parseFloat(tr.querySelector('.weight-input').value);
    const qty = parseInt(tr.querySelector('.qty-input').value, 10);
    return { weightKg: isFinite(weight) ? weight : 0, quantity: isFinite(qty) ? qty : 0 };
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));

  const minKg = parseInt(minInput.value, 10);
  const maxKg = parseInt(maxInput.value, 10);
  if (isFinite(minKg) && isFinite(maxKg)) {
    localStorage.setItem(STORAGE_RANGE_KEY, JSON.stringify({ minKg, maxKg }));
  }
}

function validateInventory(rows) {
  const cleaned = [];
  for (const row of rows) {
    if (!isFinite(row.weightKg) || row.weightKg <= 0) return { error: 'Plate weights must be positive.' };
    const snapped = snapWeight(row.weightKg);
    if (Math.abs(snapped - row.weightKg) > 1e-6) return { error: `Plate weights must be multiples of ${STEP} kg.` };
    if (!Number.isInteger(row.quantity) || row.quantity < 0) return { error: 'Quantities must be whole numbers ≥ 0.' };
    if (row.quantity === 0) continue;
    cleaned.push({ weightKg: snapped, quantity: row.quantity });
  }
  if (!cleaned.length) return { error: 'Add at least one plate.' };
  cleaned.sort((a, b) => b.weightKg - a.weightKg);
  return { data: cleaned };
}

function readInventory() {
  const rows = Array.from(inventoryTableBody.querySelectorAll('tr')).map((tr) => ({
    weightKg: parseFloat(tr.querySelector('.weight-input').value),
    quantity: parseInt(tr.querySelector('.qty-input').value, 10),
  }));
  return validateInventory(rows);
}

function readRange() {
  const minKg = parseInt(minInput.value, 10);
  const maxKg = parseInt(maxInput.value, 10);
  if (!isFinite(minKg) || !isFinite(maxKg)) return { error: 'Enter min/max total weight.' };
  if (minKg < 0 || maxKg < 0) return { error: 'Range must be non-negative.' };
  if (minKg > maxKg) return { error: 'Min must be ≤ max.' };
  return { data: { minKg, maxKg } };
}

function formatStack(counts, weights) {
  const parts = [];
  for (let i = 0; i < counts.length; i += 1) {
    const c = counts[i];
    if (!c) continue;
    const w = weights[i];
    parts.push(c === 1 ? `${w}kg` : `${c}×${w}kg`);
  }
  return parts.length ? parts.join(', ') : '—';
}

function comboScore(counts) {
  // Higher weight preference: encode counts weighted by index.
  return counts.reduce((acc, c, idx) => acc + c * Math.pow(100, counts.length - idx), 0);
}

function generatePerSideCombos(inventory) {
  const weights = inventory.map((p) => p.weightKg);
  const maxCounts = inventory.map((p) => Math.floor(p.quantity / 2));
  const combos = [];

  function dfs(idx, counts, weightSum, plateCount) {
    if (idx === weights.length) {
      combos.push({ counts: [...counts], sideWeight: Number(weightSum.toFixed(4)), platesPerSide: plateCount });
      return;
    }
    const max = maxCounts[idx];
    for (let c = 0; c <= max; c += 1) {
      counts[idx] = c;
      dfs(idx + 1, counts, weightSum + c * weights[idx], plateCount + c);
    }
  }

  dfs(0, new Array(weights.length).fill(0), 0, 0);
  return { weights, combos };
}

function pickBestCombo(combos) {
  return combos.reduce((best, cur) => {
    if (!best) return cur;
    const platesBest = best.platesPerSide * 2;
    const platesCur = cur.platesPerSide * 2;
    if (platesCur < platesBest) return cur;
    if (platesCur > platesBest) return best;
    // tie-break: prefer heavier plates (higher score)
    return comboScore(cur.counts) > comboScore(best.counts) ? cur : best;
  }, null);
}

function renderSingleTable(weights, combosBySideWeight) {
  const totals = Array.from(combosBySideWeight.keys())
    .map((side) => side * 2)
    .sort((a, b) => a - b);
  if (!totals.length) {
    singleTableBody.innerHTML = '<tr><td colspan="3" class="text-muted">No achievable weights in range.</td></tr>';
    return;
  }
  const rows = totals.map((total) => {
    const side = total / 2;
    const list = combosBySideWeight.get(side) || [];
    const best = pickBestCombo(list);
    const platesUsed = best.platesPerSide * 2;
    return `<tr><td>${total}</td><td class="stack">${formatStack(best.counts, weights)}</td><td>${platesUsed}</td></tr>`;
  });
  singleTableBody.innerHTML = rows.join('');
}

function renderPairTable(weights, combosBySideWeight, inventory, minKg, maxKg) {
  const qty = inventory.map((p) => p.quantity);
  const totals = Array.from(combosBySideWeight.keys())
    .map((side) => side * 2)
    .filter((total) => total >= minKg && total <= maxKg)
    .sort((a, b) => a - b);

  const rows = [];
  for (const total of totals) {
    const side = total / 2;
    const list = combosBySideWeight.get(side);
    if (!list || !list.length) continue;
    let best = null;
    for (let i = 0; i < list.length; i += 1) {
      const a = list[i];
      for (let j = 0; j < list.length; j += 1) {
        const b = list[j];
        let ok = true;
        for (let k = 0; k < weights.length; k += 1) {
          if (2 * (a.counts[k] + b.counts[k]) > qty[k]) { ok = false; break; }
        }
        if (!ok) continue;
        const platesUsed = 2 * (a.platesPerSide + b.platesPerSide);
        const score = comboScore(a.counts) + comboScore(b.counts);
        if (!best || platesUsed < best.platesUsed || (platesUsed === best.platesUsed && score > best.score)) {
          best = { a, b, platesUsed, score };
        }
      }
    }
    if (best) {
      rows.push(`<tr><td>${total}</td><td class="stack">${formatStack(best.a.counts, weights)}</td><td class="stack">${formatStack(best.b.counts, weights)}</td><td>${best.platesUsed}</td></tr>`);
    }
  }

  pairTableBody.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="4" class="text-muted">No valid pairs in range.</td></tr>';
}

function onGenerate() {
  setMessage('');
  const invResult = readInventory();
  if (invResult.error) { setMessage(invResult.error, true); return; }
  const rangeResult = readRange();
  if (rangeResult.error) { setMessage(rangeResult.error, true); return; }

  saveState();
  const inventory = invResult.data;
  const { minKg, maxKg } = rangeResult.data;
  const { weights, combos } = generatePerSideCombos(inventory);
  const combosBySideWeight = new Map();
  combos.forEach((c) => {
    // Only consider totals that make whole-kg dumbbells
    const total = c.sideWeight * 2;
    if (Math.abs(total - Math.round(total)) > 1e-6) return;
    if (total < minKg || total > maxKg) return;
    const key = c.sideWeight;
    if (!combosBySideWeight.has(key)) combosBySideWeight.set(key, []);
    combosBySideWeight.get(key).push(c);
  });

  renderSingleTable(weights, combosBySideWeight);
  renderPairTable(weights, combosBySideWeight, inventory, minKg, maxKg);
  setMessage('Tables updated.');
}

addRowBtn.addEventListener('click', () => {
  inventoryTableBody.appendChild(createRow());
});

resetBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_RANGE_KEY);
  loadState();
  setMessage('Reset to defaults.');
});

generateBtn.addEventListener('click', onGenerate);
minInput.addEventListener('change', saveState);
maxInput.addEventListener('change', saveState);

loadState();
setMessage('Ready.');
