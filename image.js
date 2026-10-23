// All crop operations use the same centered object-fit: cover contract as the UI.
export function coverRect(sw, sh, width, height) {
  const scale = Math.max(width / sw, height / sh);
  return [(width - sw * scale) / 2, (height - sh * scale) / 2, sw * scale, sh * scale];
}
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src;
  });
}
// Background acquisition preserves the entire frame; only output photos select a crop.
export function backgroundBlob(source) { return encodePhoto(source, null); }
export function photoBlob(source, ratio) { return encodePhoto(source, ratio); }
async function encodePhoto(source, ratio) {
  const sw = source.videoWidth || source.naturalWidth, sh = source.videoHeight || source.naturalHeight;
  if (!sw || !sh) throw new Error('画像の準備中です');
  const scale = Math.min(1, 1920 / Math.max(sw, sh));
  const [rw, rh] = ratio ? ratio.split('/').map(Number) : [sw, sh];
  const width = Math.round(Math.min(sw, sh * rw / rh) * scale);
  const height = ratio ? Math.round(width * rh / rw) : Math.round(sh * scale);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const rect = ratio ? coverRect(sw, sh, width, height) : [0, 0, width, height];
  canvas.getContext('2d').drawImage(source, ...rect);
  return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('画像を保存できません')), 'image/jpeg', .92));
}
