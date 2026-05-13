export function randomGaussian() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function generateBaseData(n) {
  return Array.from({ length: n }, () => ({
    x: randomGaussian(),
    y: randomGaussian()
  }));
}

export function computePCA(data) {
  const n = data.length;
  if (n === 0) {
    return {
      mean: { x: 0, y: 0 },
      e1: { v: { x: 1, y: 0 }, l: 0, mag: 0 },
      e2: { v: { x: 0, y: 1 }, l: 0, mag: 0 },
      varianceExplained: { pc1: 0, pc2: 0 },
      c_xx: 0, c_yy: 0, c_xy: 0
    };
  }

  // 1. Mean
  let mx = 0, my = 0;
  for (const p of data) {
    mx += p.x;
    my += p.y;
  }
  mx /= n;
  my /= n;

  // 2. Covariance Matrix
  let c_xx = 0, c_yy = 0, c_xy = 0;
  for (const p of data) {
    const dx = p.x - mx;
    const dy = p.y - my;
    c_xx += dx * dx;
    c_yy += dy * dy;
    c_xy += dx * dy;
  }
  const denom = n - 1 > 0 ? n - 1 : 1;
  c_xx /= denom;
  c_yy /= denom;
  c_xy /= denom;

  // 3. Eigenvalues
  const T = c_xx + c_yy;
  const D = c_xx * c_yy - c_xy * c_xy;
  
  const discriminant = Math.max(0, T * T - 4 * D);
  
  let L1 = (T + Math.sqrt(discriminant)) / 2;
  let L2 = (T - Math.sqrt(discriminant)) / 2;

  // 4. Eigenvectors
  let v1_x = 1, v1_y = 0;
  let v2_x = 0, v2_y = 1;

  if (Math.abs(c_xy) > 1e-10) {
    const mag1 = Math.sqrt(c_xy * c_xy + Math.pow(L1 - c_xx, 2));
    v1_x = c_xy / mag1;
    v1_y = (L1 - c_xx) / mag1;

    const mag2 = Math.sqrt(c_xy * c_xy + Math.pow(L2 - c_xx, 2));
    v2_x = c_xy / mag2;
    v2_y = (L2 - c_xx) / mag2;
  } else {
    if (c_xx < c_yy) {
      const temp = L1;
      L1 = L2;
      L2 = temp;
      v1_x = 0; v1_y = 1;
      v2_x = 1; v2_y = 0;
    }
  }

  const totalVar = L1 + L2;
  const pc1Exp = totalVar > 0 ? L1 / totalVar : 0;
  const pc2Exp = totalVar > 0 ? L2 / totalVar : 0;

  return {
    mean: { x: mx, y: my },
    e1: { v: { x: v1_x, y: v1_y }, l: L1, mag: Math.sqrt(L1) },
    e2: { v: { x: v2_x, y: v2_y }, l: L2, mag: Math.sqrt(L2) },
    varianceExplained: { pc1: pc1Exp, pc2: pc2Exp },
    c_xx, c_yy, c_xy
  };
}
