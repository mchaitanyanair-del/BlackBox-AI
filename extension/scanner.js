const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const statusEl = document.getElementById('status');
const debugEl = document.getElementById('debug');
const resultEl = document.getElementById('result');

let scanning = true;
let frameCount = 0;
const jsQRLoaded = typeof jsQR === 'function';

debugEl.textContent = 'jsQR library loaded: ' + jsQRLoaded;

if (!jsQRLoaded) {
  statusEl.textContent = '❌ jsQR failed to load — check that libs/jsqr.min.js exists in the extension folder.';
}

navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: 'environment',
    width: { ideal: 640 },
    height: { ideal: 480 }
  }
})
  .then(stream => {
    video.srcObject = stream;
    return video.play();
  })
  .then(() => {
    statusEl.textContent = 'Point camera at a UPI QR code...';
    requestAnimationFrame(tick);
  })
  .catch(err => {
    statusEl.textContent = '❌ Camera error: ' + err.name + ' — ' + err.message;
    debugEl.textContent = 'Full error: ' + err.toString();
  });

function tick() {
  if (!scanning) return;

  if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
    const scale = 480 / video.videoWidth;
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth'
    });

    frameCount++;
    debugEl.textContent = `Frames scanned: ${frameCount} | Video: ${video.videoWidth}x${video.videoHeight} | jsQR: ${jsQRLoaded}`;

    if (code && code.data) {
      handleScan(code.data);
      return;
    }
  } else {
    debugEl.textContent = 'Waiting for video data... readyState=' + video.readyState;
  }

  requestAnimationFrame(tick);
}

function handleScan(text) {
  scanning = false;
  resultEl.style.display = 'block';
  statusEl.textContent = '✅ QR code detected!';

  let parsed;
  try {
    const url = new URL(text);
    if (url.protocol !== 'upi:') throw new Error('not upi');
    const intent = (url.hostname || url.pathname.replace(/^\/+/, '')).toLowerCase();
    const params = url.searchParams;
    parsed = {
      intent,
      pa: params.get('pa') || '—',
      pn: params.get('pn') || '—',
      am: params.get('am') || ''
    };
  } catch (e) {
    resultEl.className = 'warn';
    resultEl.innerHTML = '<p><b>⚠️ Not a UPI QR code</b></p><p>Raw content: ' + text + '</p><button id="againBtn">Scan Again</button>';
    document.getElementById('againBtn').addEventListener('click', () => location.reload());
    return;
  }

  const isDangerous = parsed.intent === 'collect' || parsed.intent === 'mandate';

  if (isDangerous) {
    resultEl.className = 'danger';
    resultEl.innerHTML = `
      <p><b>🚨 THIS WILL CHARGE YOU${parsed.am ? ' ₹' + parsed.am : ''}</b></p>
      <p>Intent: ${parsed.intent}</p>
      <p>Payee: ${parsed.pa}</p>
      <p>Name: ${parsed.pn}</p>
      <p>This is NOT sending you money — approving it deducts from your account.</p>
      <button id="againBtn">Scan Again</button>`;
  } else if (parsed.intent === 'pay') {
    resultEl.className = 'safe';
    resultEl.innerHTML = `
      <p><b>✅ Normal payment QR</b></p>
      <p>You are sending${parsed.am ? ' ₹' + parsed.am : ' money'} to:</p>
      <p>${parsed.pn} (${parsed.pa})</p>
      <button id="againBtn">Scan Again</button>`;
  } else {
    resultEl.className = 'warn';
    resultEl.innerHTML = `
      <p><b>⚠️ Unknown UPI intent: ${parsed.intent}</b></p>
      <p>Proceed with caution.</p>
      <button id="againBtn">Scan Again</button>`;
  }

  document.getElementById('againBtn').addEventListener('click', () => location.reload());
}