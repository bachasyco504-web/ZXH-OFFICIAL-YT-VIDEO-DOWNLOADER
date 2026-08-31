/* ---------------------------------------------------
   THREE.JS — animated anime-style particle background
--------------------------------------------------- */
const canvas = document.getElementById('bg-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 30;

// Floating "sakura petal" particles
const PARTICLE_COUNT = 400;
const positions = new Float32Array(PARTICLE_COUNT * 3);
for (let i = 0; i < PARTICLE_COUNT; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 80;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
}
const particlesGeo = new THREE.BufferGeometry();
particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const particlesMat = new THREE.PointsMaterial({
  color: 0xff2e63,
  size: 0.35,
  transparent: true,
  opacity: 0.8
});
const particles = new THREE.Points(particlesGeo, particlesMat);
scene.add(particles);

// Decorative rotating torus knot ("energy portal" vibe)
const torusGeo = new THREE.TorusKnotGeometry(6, 1.4, 120, 16);
const torusMat = new THREE.MeshBasicMaterial({
  color: 0x7b2ff7,
  wireframe: true,
  transparent: true,
  opacity: 0.25
});
const torusKnot = new THREE.Mesh(torusGeo, torusMat);
scene.add(torusKnot);

let mouseX = 0;
let mouseY = 0;
window.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

function animate3D() {
  requestAnimationFrame(animate3D);

  particles.rotation.y += 0.0008;
  particles.rotation.x += 0.0003;

  torusKnot.rotation.x += 0.0025;
  torusKnot.rotation.y += 0.0035;

  camera.position.x += (mouseX * 3 - camera.position.x) * 0.02;
  camera.position.y += (-mouseY * 3 - camera.position.y) * 0.02;
  camera.lookAt(scene.position);

  renderer.render(scene, camera);
}
animate3D();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------------------------------------------------
   ANIME.JS — entrance + UI micro-interactions
--------------------------------------------------- */
anime({
  targets: '.logo-zxh',
  opacity: [0, 1],
  translateY: [-20, 0],
  easing: 'easeOutElastic(1, .6)',
  duration: 1400
});

anime({
  targets: '.search-card',
  opacity: [0, 1],
  translateY: [20, 0],
  easing: 'easeOutQuad',
  duration: 800,
  delay: 300
});

function pulseButton(el) {
  anime({
    targets: el,
    scale: [1, 0.94, 1],
    duration: 300,
    easing: 'easeInOutQuad'
  });
}

function revealResultCard() {
  const card = document.getElementById('result-card');
  card.hidden = false;
  anime({
    targets: card,
    opacity: [0, 1],
    translateY: [15, 0],
    duration: 600,
    easing: 'easeOutQuad'
  });
}

/* ---------------------------------------------------
   APP LOGIC — talk to backend API
--------------------------------------------------- */
const form = document.getElementById('download-form');
const urlInput = document.getElementById('video-url');
const fetchBtn = document.getElementById('fetch-btn');
const statusEl = document.getElementById('status');
const resultCard = document.getElementById('result-card');
const resultThumb = document.getElementById('result-thumb');
const resultTitle = document.getElementById('result-title');
const resultAuthor = document.getElementById('result-author');
const resultLength = document.getElementById('result-length');
const formatSelect = document.getElementById('format-select');
const downloadLink = document.getElementById('download-link');

let currentUrl = '';

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function showStatus(message, isError = false) {
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

function hideStatus() {
  statusEl.hidden = true;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  pulseButton(fetchBtn);

  const url = urlInput.value.trim();
  if (!url) return;

  currentUrl = url;
  resultCard.hidden = true;
  showStatus('Fetching video info...');

  try {
    const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
    const data = await res.json();

    if (!res.ok) {
      showStatus(data.error || 'Something went wrong.', true);
      return;
    }

    hideStatus();
    resultThumb.src = data.thumbnail;
    resultTitle.textContent = data.title;
    resultAuthor.textContent = `Channel: ${data.author}`;
    resultLength.textContent = `Duration: ${formatDuration(data.lengthSeconds)}`;

    formatSelect.innerHTML = '';
    data.formats.forEach((f) => {
      const opt = document.createElement('option');
      opt.value = f.itag;
      opt.textContent = `${f.qualityLabel} (${f.container})`;
      formatSelect.appendChild(opt);
    });

    updateDownloadLink();
    revealResultCard();
  } catch (err) {
    showStatus('Network error. Is the backend server running?', true);
  }
});

formatSelect.addEventListener('change', updateDownloadLink);

function updateDownloadLink() {
  const itag = formatSelect.value;
  downloadLink.href = `/api/download?url=${encodeURIComponent(currentUrl)}&itag=${itag}`;
}

downloadLink.addEventListener('click', () => pulseButton(downloadLink));

/* Register service worker for installable "web app" behavior */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}