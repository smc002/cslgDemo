// Extract complete poses that cross an authored sheet's nominal grid lines.
// Connected silhouettes keep a raised fist out of the neighbouring walk frame.
module.exports = function extractPoses(data, info) {
  const { width, height } = info;
  const labels = new Int32Array(width * height);
  const queue = new Int32Array(labels.length);
  const components = [];
  let label = 0;
  for (let start = 0; start < labels.length; start++) {
    if (labels[start] || data[start * 4 + 3] < 16) continue;
    label++;
    let head = 0,
      tail = 1,
      left = width,
      right = 0,
      top = height,
      bottom = 0;
    queue[0] = start;
    labels[start] = label;
    while (head < tail) {
      const p = queue[head++],
        x = p % width,
        y = Math.floor(p / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      for (const n of [
        x > 0 ? p - 1 : -1,
        x + 1 < width ? p + 1 : -1,
        y > 0 ? p - width : -1,
        y + 1 < height ? p + width : -1,
      ]) {
        if (n >= 0 && !labels[n] && data[n * 4 + 3] >= 16) {
          labels[n] = label;
          queue[tail++] = n;
        }
      }
    }
    if (tail > 2000) components.push({ label, left, right, top, bottom });
  }
  if (components.length !== 8)
    throw Error('Expected eight connected poses, got ' + components.length);
  const poses = Array(8);
  for (const component of components) {
    const { label, left, right, top, bottom } = component;
    const col = Math.min(3, Math.floor(((left + right) / 2 / width) * 4));
    const row = Math.min(1, Math.floor(((top + bottom) / 2 / height) * 2));
    const index = row * 4 + col;
    if (poses[index]) throw Error('Two poses occupy the same grid slot');
    const pixels = Buffer.alloc(data.length);
    // Include the original soft edge within two pixels of the connected silhouette.
    for (
      let y = Math.max(0, top - 2);
      y <= Math.min(height - 1, bottom + 2);
      y++
    ) {
      for (
        let x = Math.max(0, left - 2);
        x <= Math.min(width - 1, right + 2);
        x++
      ) {
        let belongs = labels[y * width + x] === label;
        for (let dy = -2; !belongs && dy <= 2; dy++) {
          for (let dx = -2; !belongs && dx <= 2; dx++) {
            if (x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height)
              belongs = labels[(y + dy) * width + x + dx] === label;
          }
        }
        if (belongs)
          data.copy(
            pixels,
            (y * width + x) * 4,
            (y * width + x) * 4,
            (y * width + x) * 4 + 4,
          );
      }
    }
    poses[index] = pixels;
  }
  return poses;
};
