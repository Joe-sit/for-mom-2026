// ===== SECTION 1: เปิดซองจดหมาย (แตะเพื่อเปิด, เล่นเป็นฉาก ๆ) =====
const envelope = document.getElementById('envelope');
let opened = false;

// ล็อกการเลื่อนจนกว่าจะเปิดจดหมาย
// กัน browser จำตำแหน่ง scroll เดิมตอน reload แล้วติดล็อกอยู่ล่างสุด
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
document.body.classList.add('locked');

function burstConfetti() {
  const b = document.createElement('div');
  b.className = 'burst';
  envelope.appendChild(b);
  const colors = ['#ff8fab', '#f2c14e', '#9ad0c2', '#b39ddb', '#ff6f91'];
  for (let i = 0; i < 28; i++) {
    const s = document.createElement('span');
    const angle = Math.random() * Math.PI * 2;
    const dist = 70 + Math.random() * 130;
    s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    s.style.setProperty('--dy', (Math.sin(angle) * dist - 50) + 'px');
    s.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = (Math.random() * 0.12) + 's';
    b.appendChild(s);
  }
  setTimeout(() => b.remove(), 1800);
}

function openEnvelope() {
  if (opened) return;
  opened = true;
  envelope.classList.add('opening');                     // 1) flap พลิก + wax หาย
  setTimeout(() => {                                     // 2) จดหมายจริงเลื่อนออกต่อเนื่อง
    envelope.classList.add('rising');
    // เซ็ตความสูงเป้าหมายเป๊ะ ๆ (จดหมาย + ที่ว่างซอง) -> transition นิ่งตลอดทาง
    const letter = envelope.querySelector('.letter');
    envelope.style.height = (letter.scrollHeight + 210) + 'px';
  }, 380);
  setTimeout(() => {                                     // 3) ซองหล่นหาย confetti ปลดล็อก
    envelope.classList.add('open');
    burstConfetti();
    document.body.classList.remove('locked');
  }, 1600);
  setTimeout(() => {
    envelope.style.height = 'auto'; // จบแล้วปล่อย auto รองรับ resize
    measure();                      // ความสูงหน้าเปลี่ยน -> วัดตำแหน่ง section ใหม่
  }, 2100);
  if (!playing) startMusic(); // แตะ = gesture -> เริ่มเพลงได้เลย
}
envelope.addEventListener('click', openEnvelope);

// ===== SECTION 2: เลื่อนแนวตั้ง -> ขยับการ์ดแนวนอน =====
// ระยะ scroll ภายใน .string-section ถูก map เป็น translateX ของ .track
const stringSection = document.getElementById('s2');
const track = document.getElementById('track');

const cards = track.querySelectorAll('.card');
const stage = stringSection.querySelector('.sticky-stage');
const eraLabel = document.getElementById('eraLabel');
const ERAS = ['จุดเริ่มต้น', 'ค่อย ๆ เติบโต', 'จนถึงวันนี้'];

// scroll แบบ smooth: scroll จริงเป็นแค่ "เป้าหมาย" แล้วค่อย ๆ ไล่ตามใน rAF (lerp)
let targetP = 0, smoothP = 0;   // progress ของ section แนวนอน
let targetY = 0, smoothY = 0;   // scrollY สำหรับ parallax
const confettis = document.querySelectorAll('.confetti');

// วัดตำแหน่งการ์ดครั้งเดียว (ไม่เรียก getBoundingClientRect ทุกเฟรม -> ไม่ force layout)
let cardMeta = [], maxShift = 0, sectionTop = 0, pinTotal = 1;
function measure() {
  maxShift = track.scrollWidth - window.innerWidth;
  sectionTop = stringSection.offsetTop;
  pinTotal = stringSection.offsetHeight - window.innerHeight;
  cardMeta = [...cards].map(c => ({ el: c, center: c.offsetLeft + c.offsetWidth / 2, w: c.offsetWidth }));
}
window.addEventListener('load', measure);
measure();

function onScroll() {
  targetY = window.scrollY;
  targetP = Math.min(1, Math.max(0, (targetY - sectionTop) / pinTotal));
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => { measure(); onScroll(); });
onScroll();

// ===== SNAP SCROLL: หนึ่ง gesture = ไหลไปจุดถัดไปเลย ไม่ต้องลากเอง =====
let wheelTarget = null;
let stepping = false;          // กำลังไหลอยู่ ห้ามสั่งซ้ำ
let streamStepped = false;     // กัน momentum ของ trackpad ยิงรัว ๆ
let lastWheelAt = 0;

// จุดจอดทั้งหมด: จดหมาย, interlude, ทีละใบ/แผ่นใน section แนวนอน, ลายมือ, ทุเรียน
function snapPoints() {
  const pts = [0, document.getElementById('i1').offsetTop];
  const pin = stringSection.offsetHeight - window.innerHeight;
  const maxShift = track.scrollWidth - window.innerWidth;

  // จอดให้ "แต่ละใบอยู่กลางจอพอดี": progress = (จุดกลางไอเทม - กลางจอ) / ระยะเลื่อนทั้งหมด
  for (const item of track.children) {
    const center = item.offsetLeft + item.offsetWidth / 2;
    const p = Math.min(1, Math.max(0, (center - window.innerWidth / 2) / maxShift));
    pts.push(stringSection.offsetTop + pin * p);
  }

  pts.push(document.getElementById('s3').offsetTop);
  pts.push(document.getElementById('s4').offsetTop);
  // ตัดจุดที่ซ้ำ/ใกล้กันเกิน กันต้องปัดซ้ำหนึ่งทีฟรี ๆ
  return pts.filter((p, i) => i === 0 || p - pts[i - 1] > 10);
}

function stepTo(dir) {
  if (stepping || document.body.classList.contains('locked')) return;
  const pts = snapPoints();
  const y = window.scrollY;
  // หาจุดที่ใกล้ปัจจุบันสุด แล้วก้าวไปทิศที่ขอ
  let idx = 0, best = Infinity;
  pts.forEach((p, i) => {
    const d = Math.abs(p - y);
    if (d < best) { best = d; idx = i; }
  });
  idx = Math.min(pts.length - 1, Math.max(0, idx + dir));
  wheelTarget = pts[idx];
  stepping = true;
}

window.addEventListener('wheel', (e) => {
  e.preventDefault();
  const now = performance.now();
  if (now - lastWheelAt > 150) streamStepped = false; // เว้นช่วง = gesture ใหม่
  lastWheelAt = now;
  // ใน section แนวนอน trackpad ปัดซ้าย/ขวา (deltaX) ก็ใช้ได้
  const d = (inStringSection() && Math.abs(e.deltaX) > Math.abs(e.deltaY)) ? e.deltaX : e.deltaY;
  if (streamStepped || Math.abs(d) < 8) return;
  streamStepped = true;
  stepTo(Math.sign(d));
}, { passive: false });

// มือถือ: ปัดขึ้น/ลง = ก้าวหนึ่ง section
// ใน section แนวนอน รองรับปัดซ้าย/ขวาด้วย (ซ้าย = ไปต่อ, ขวา = ย้อน)
let touchStartY = null, touchStartX = null;

function inStringSection() {
  const pin = stringSection.offsetHeight - window.innerHeight;
  const y = window.scrollY;
  return y >= stringSection.offsetTop - 10 && y <= stringSection.offsetTop + pin + 10;
}

window.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
  touchStartX = e.touches[0].clientX;
}, { passive: true });
window.addEventListener('touchmove', (e) => {
  if (!document.body.classList.contains('locked')) e.preventDefault(); // ปิด scroll ปกติ ใช้ snap แทน
}, { passive: false });
window.addEventListener('touchend', (e) => {
  if (touchStartY === null) return;
  const dy = touchStartY - e.changedTouches[0].clientY;
  const dx = touchStartX - e.changedTouches[0].clientX;

  if (inStringSection() && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
    stepTo(dx > 0 ? 1 : -1); // ปัดซ้าย (dx>0) = การ์ดถัดไป
  } else if (Math.abs(dy) > 40) {
    stepTo(dy > 0 ? 1 : -1);
  }
  touchStartY = touchStartX = null;
});

// คีย์บอร์ด: ลูกศร/space ก็ก้าวได้
window.addEventListener('keydown', (e) => {
  if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); stepTo(1); }
  if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); stepTo(-1); }
});

function tick() {
  // ไล่ scroll จริงไปยังจุดจอด
  if (wheelTarget !== null) {
    const diff = wheelTarget - window.scrollY;
    if (Math.abs(diff) <= 2) {
      // ใกล้พอแล้ว -> จอดเลย (scrollTo ปัดเป็นจำนวนเต็ม เดินทีละเศษ px ไม่ได้)
      window.scrollTo(0, wheelTarget);
      wheelTarget = null;
      stepping = false; // ถึงแล้ว รับ gesture ถัดไปได้
    } else {
      // ความเร็วขั้นต่ำ 1px/เฟรม กันค้างตอนระยะเหลือน้อย
      const step = Math.sign(diff) * Math.max(Math.abs(diff) * 0.09, 1);
      window.scrollTo(0, window.scrollY + step);
    }
  }

  // ถ้าไม่มีอะไรขยับ -> ข้ามงาน DOM ทั้งหมด (ประหยัดแบตและ GPU ตอนอยู่นิ่ง)
  const busy = Math.abs(targetP - smoothP) > 0.0004 || Math.abs(targetY - smoothY) > 0.4;
  if (!busy) { requestAnimationFrame(tick); return; }

  // lerp: ขยับ 8% ของระยะที่เหลือต่อเฟรม -> นุ่ม มีแรงเฉื่อย
  smoothP += (targetP - smoothP) * 0.08;
  smoothY += (targetY - smoothY) * 0.1;

  const shift = smoothP * maxShift;
  if (maxShift > 0) track.style.transform = `translateX(${-shift}px)`;

  // การ์ดใกล้กลางจอ -> active (คำนวณจากตำแหน่งที่วัดไว้ ไม่แตะ layout)
  const mid = window.innerWidth / 2;
  for (const m of cardMeta) {
    m.el.classList.toggle('active', Math.abs(m.center - shift - mid) < m.w * 0.6);
  }

  // ฉากหลังไล่สี: อดีต (sepia อุ่น) -> ปัจจุบัน (ชมพูสดใส)
  const hue = 35 - 55 * smoothP; // 35° -> -20° ≡ 340° ผ่านโทนแดง ไม่ผ่านเขียว
  const sat = 55 + 45 * smoothP;
  stage.style.backgroundColor = `hsl(${hue} ${sat}% 94%)`;

  // ป้ายยุคใต้หัวข้อ เปลี่ยนตามช่วงเรื่อง
  const era = ERAS[Math.min(ERAS.length - 1, Math.floor(smoothP * ERAS.length))];
  if (eraLabel.textContent !== era) eraLabel.textContent = era;

  // parallax: confetti เลื่อนช้ากว่า scroll จริง
  confettis.forEach(c => {
    c.style.transform = `translateY(${smoothY * 0.08}px)`;
  });

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// ===== SCROLL REVEAL ทั่วไป (.reveal -> .shown, ไล่ทีละอัน) =====
const revealEls = document.querySelectorAll('.reveal');
const revealIO = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      // stagger ตามลำดับพี่น้องใน section เดียวกัน
      const sibs = [...e.target.parentElement.querySelectorAll('.reveal')];
      const idx = sibs.indexOf(e.target);
      e.target.style.transitionDelay = `${idx * 0.25}s`;
      e.target.classList.add('shown');
      revealIO.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });
revealEls.forEach(el => revealIO.observe(el));

// ===== SECTION 3: เผยลายมือ + หัวใจลอย เมื่อเลื่อนถึง =====
const handLines = document.querySelectorAll('.hand-line');
const heartsBox = document.getElementById('hearts');
let heartsTimer = null;

function spawnHeart() {
  const h = document.createElement('span');
  h.textContent = ['💗', '💕', '🩷', '💖'][Math.floor(Math.random() * 4)];
  h.style.left = Math.random() * 92 + 'vw';
  h.style.fontSize = 14 + Math.random() * 16 + 'px';
  h.style.animationDuration = 4 + Math.random() * 3 + 's';
  heartsBox.appendChild(h);
  setTimeout(() => h.remove(), 7500); // เก็บกวาด DOM
}

const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      handLines.forEach(l => l.classList.add('draw'));
      if (!heartsTimer) heartsTimer = setInterval(spawnHeart, 600);
    } else if (heartsTimer) {
      clearInterval(heartsTimer); // หยุดตอนเลื่อนออก ประหยัดเครื่อง
      heartsTimer = null;
    }
  });
}, { threshold: 0.4 });
if (handLines.length) io.observe(document.getElementById('s3'));

// ===== ปุ่มเซฟรูป + แชร์ LINE ใต้ทุก photo card =====
document.querySelectorAll('.card').forEach(card => {
  const img = card.querySelector('img');
  if (!img) return;
  const bar = document.createElement('div');
  bar.className = 'card-actions';
  bar.innerHTML = `<button class="act save" type="button">⬇ เซฟรูป</button>`;
  card.appendChild(bar);

  // เซฟ: ดาวน์โหลดไฟล์รูปตรง ๆ
  bar.querySelector('.save').addEventListener('click', (e) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = img.src;
    a.download = img.src.split('/').pop();
    a.click();
  });
});

// ===== ส่งต่อ URL เว็บนี้ใน LINE =====
document.getElementById('shareBtn').addEventListener('click', async () => {
  const url = location.href;
  // มือถือ: share sheet ของเครื่อง -> เลือก LINE ส่ง url เป็นข้อความแชท
  if (navigator.share) {
    try {
      await navigator.share({ title: 'สุขสันต์วันเกิดนะแม่ 🎂', url });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // ผู้ใช้กดยกเลิกเอง
    }
  }
  // fallback: เปิดแอป LINE พร้อมข้อความ url ให้เลือกห้องส่งต่อ
  window.open('https://line.me/R/share?text=' + encodeURIComponent(url), '_blank');
});

// ===== SECTION 4: ทุเรียนผ่าซีก แตะกินทีละพู =====
const cake = document.getElementById('cake');
const cakeMsg = document.getElementById('cakeMsg');
const cakeHint = document.getElementById('cakeHint');
const slices = [...cake.querySelectorAll('.pod')];
let bites = 0;

// สร้างจุดเปลือกหนาม: ครึ่งวงรีล่าง สลับรัศมีเข้า-ออกเป็นหนามแหลม
(function buildHusk() {
  const cx = 170, cy = 100, rx = 148, ry = 118, spikes = 26;
  const pts = [];
  for (let i = 0; i <= spikes; i++) {
    const a = Math.PI * (i / spikes);            // 0..π = ครึ่งล่าง
    const k = i % 2 === 0 ? 1 : 0.86;            // สลับปลายหนาม/โคนหนาม
    pts.push((cx + rx * k * Math.cos(a)).toFixed(1) + ',' +
             (cy + ry * k * Math.sin(a)).toFixed(1));
  }
  document.getElementById('husk').setAttribute('points', pts.join(' '));
})();

// ลำดับกิน: พูข้าง ๆ ก่อน เก็บพูกลางไว้ท้าย (มีเทียนปัก)
const eatOrder = [4, 0, 3, 1, 2];

cake.addEventListener('click', () => {
  if (bites >= slices.length) return;
  slices[eatOrder[bites]].classList.add('eaten');
  bites++;

  // คำลอย "หม่ำ"
  const y = document.createElement('span');
  y.className = 'yum';
  y.textContent = ['หม่ำ 😋', 'อร่อย!', 'หอมม 🤤', 'ฟินเวอร์'][bites % 4];
  cake.appendChild(y);
  setTimeout(() => y.remove(), 1100);

  if (bites === slices.length) {
    cake.classList.add('finished'); // เทียนดับ
    cakeMsg.classList.add('show');
    cakeHint.textContent = 'เค้กหมดแล้ว 🍽️';
    document.querySelector('.end-actions').classList.add('show'); // เผยปุ่มแชร์ + กลับขึ้นบน
  }
});

// ===== เพลง Happy Birthday (สังเคราะห์ด้วย Web Audio, ไม่ต้องมีไฟล์) =====
const N = { C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00,
            A4:440.00, B4:493.88, C5:523.25, D5:587.33, E5:659.25,
            F5:698.46, G5:783.99 };
// [ความถี่, จำนวนจังหวะ] — จังหวะ swing: คู่โน้ตสั้นเป็น triplet (2/3 + 1/3)
const SW = 2 / 3, SH = 1 / 3;
const MELODY = [
  ['G4',SW],['G4',SH],['A4',1],['G4',1],['C5',1],['B4',2],
  ['G4',SW],['G4',SH],['A4',1],['G4',1],['D5',1],['C5',2],
  ['G4',SW],['G4',SH],['G5',1],['E5',1],['C5',1],['B4',1],['A4',1],
  ['F5',SW],['F5',SH],['E5',1],['C5',1],['D5',1],['C5',2],
];
const BEAT = 0.58; // วินาทีต่อจังหวะ (ช้าลงจากเดิม)

// โน้ตต่ำสำหรับคอร์ด
const NL = { E3:164.81, F3:174.61, G3:196.00, A3:220.00, Bb3:233.08, B3:246.94 };

// โน้ตเบสต่ำ
const NB = { B1:61.74, C2:65.41, Cs2:69.30, D2:73.42, E2:82.41,
             F2:87.31, Fs2:92.50, G2:98.00, A2:110.00, B2:123.47 };

// walking bass 3 จังหวะ/ห้อง: root -> สี -> โน้ตนำเข้าคอร์ดถัดไป
// [จังหวะ, ความถี่, ความยาว(จังหวะ)]
const BASS = [
  [1, NB.C2, 1], [2, NB.E2, 1], [3, NB.Fs2, 1],   // C -> เดินเข้า G
  [4, NB.G2, 1], [5, NB.B2, 1], [6, NB.Cs2, 1],   // G7 -> เข้า Dm
  [7, NB.D2, 1], [8, NB.F2, 1], [9, NB.B1, 1],    // Dm7 -> เข้า C
  [10, NB.C2, 1], [11, NB.E2, 1], [12, NB.G2, 1], // C
  [13, NB.C2, 1], [14, NB.G2, 1], [15, NB.E2, 1], // C7 -> เข้า F
  [16, NB.F2, 1], [17, NB.A2, 1], [18, NB.Fs2, 1],// F -> เข้า G
  [19, NB.G2, 1], [20, NB.B2, 1], [21, NB.B1, 1], // G13 -> เข้า C
  [22, NB.C2, 2],                                  // C ปิดท้าย
];

// harmony แนว jazz: คอร์ด 7th/9th หนึ่งคอร์ดต่อห้อง (3/4, pickup 1 จังหวะ)
// [จังหวะเริ่ม, โน้ตในคอร์ด, ความยาว(จังหวะ)]
const CHORDS = [
  [1,  [NL.E3, NL.G3, NL.B3],  3], // Cmaj7
  [4,  [NL.F3, NL.A3, NL.B3],  3], // G9 (rootless)
  [7,  [NL.F3, NL.A3, N.C4],   3], // Dm7
  [10, [NL.E3, NL.G3, NL.B3],  3], // Cmaj7
  [13, [NL.E3, NL.Bb3, N.C4],  3], // C7 -> ส่งเข้า F
  [16, [NL.F3, NL.A3, N.E4],   3], // Fmaj7
  [19, [NL.F3, NL.B3, N.E4],   3], // G13
  [22, [NL.E3, NL.A3, N.D4],   2], // C6/9 ปิดท้าย
];

let audioCtx = null, playing = false, loopTimer = null, noiseBuf = null;
const musicBtn = document.getElementById('musicBtn');

// white noise buffer สำหรับ hi-hat
function getNoiseBuf() {
  if (!noiseBuf) {
    noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// hi-hat: noise สั้น ผ่าน highpass
function hat(t, loud = 0.05) {
  const src = audioCtx.createBufferSource();
  src.buffer = getNoiseBuf();
  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 6500;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(loud, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  src.connect(hp).connect(g).connect(audioCtx.destination);
  src.start(t);
  src.stop(t + 0.08);
}

// kick 8-bit: sine ดิ่งความถี่ลงเร็ว ๆ
function kick(t) {
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  osc.connect(g).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.16);
}

function scheduleMelody(startAt) {
  let t = startAt;
  let totalBeats = 0;

  // ทำนองหลัก: square wave = เสียง 8-bit
  for (const [name, beats] of MELODY) {
    const dur = beats * BEAT;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = N[name];
    // envelope กันเสียงป๊อป (square ดังกว่า triangle -> gain ต่ำลง)
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.05, t + 0.02);
    gain.gain.setValueAtTime(0.05, t + dur - 0.07);
    gain.gain.linearRampToValueAtTime(0, t + dur - 0.015);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur);
    t += dur;
    totalBeats += beats;
  }

  // harmony แบบ acapella: 3 เสียงร้องลากยาวต่อเนื่อง เปลี่ยนโน้ตแบบ legato (ไม่ตีทีละคอร์ด)
  const lastChord = CHORDS[CHORDS.length - 1];
  const vStart = startAt + CHORDS[0][0] * BEAT;
  const vEnd = startAt + (lastChord[0] + lastChord[2]) * BEAT;
  for (let v = 0; v < 3; v++) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine'; // เสียงเรียบนุ่มแบบเสียงร้อง "อาา"
    osc.frequency.setValueAtTime(CHORDS[0][1][v], vStart);

    // vibrato เบา ๆ ให้เหมือนเสียงคน (ความเร็วต่างกันเล็กน้อยแต่ละเสียง)
    const lfo = audioCtx.createOscillator();
    const lfoG = audioCtx.createGain();
    lfo.frequency.value = 4.4 + v * 0.4;
    lfoG.gain.value = 6; // cents
    lfo.connect(lfoG).connect(osc.detune);

    // ไล่โน้ตตามคอร์ด: glide สั้น ๆ ตอนเปลี่ยน
    for (const [beat, freqs] of CHORDS) {
      osc.frequency.setTargetAtTime(freqs[v], startAt + beat * BEAT, 0.07);
    }

    // swell เข้า-ออกเหมือนลมหายใจ
    g.gain.setValueAtTime(0, vStart);
    g.gain.linearRampToValueAtTime(0.032, vStart + 0.5);
    g.gain.setValueAtTime(0.032, vEnd - 0.6);
    g.gain.linearRampToValueAtTime(0, vEnd);

    osc.connect(g).connect(audioCtx.destination);
    osc.start(vStart); osc.stop(vEnd + 0.1);
    lfo.start(vStart); lfo.stop(vEnd + 0.1);
  }

  // เบสเดิน (walking bass): triangle ทุ้ม เด้งทีละจังหวะ
  for (const [beat, freq, beats] of BASS) {
    const bt = startAt + beat * BEAT;
    const dur = beats * BEAT * 0.92; // เว้นช่องนิดให้เด้งแบบ pizzicato
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.16, bt);
    g.gain.exponentialRampToValueAtTime(0.04, bt + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, bt + dur);
    osc.connect(g).connect(audioCtx.destination);
    osc.start(bt);
    osc.stop(bt + dur);
  }

  // จังหวะกลอง swing: off-beat ตกที่ 2/3 ของจังหวะ (triplet feel)
  for (let b = 0; b < totalBeats; b++) {
    const bt = startAt + b * BEAT;
    hat(bt, b >= 1 && (b - 1) % 3 === 0 ? 0.07 : 0.035); // เน้น downbeat
    hat(bt + BEAT * (2 / 3), 0.022); // off-beat แบบ swing
    if (b >= 1 && (b - 1) % 3 === 0) kick(bt);
  }

  return t; // เวลาจบเพลง
}

function startMusic() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  playing = true;
  musicBtn.classList.add('playing');
  musicBtn.textContent = '🎶';

  const end = scheduleMelody(audioCtx.currentTime + 0.15);
  const ms = (end - audioCtx.currentTime + 0.6) * 1000; // เว้นวรรคก่อนวนซ้ำ
  loopTimer = setTimeout(() => { if (playing) startMusic(); }, ms);
}

function stopMusic() {
  playing = false;
  clearTimeout(loopTimer);
  musicBtn.classList.remove('playing');
  musicBtn.textContent = '🎵';
  if (audioCtx) { audioCtx.close(); audioCtx = null; } // ปิด context กันโน้ตค้างเล่นซ้อน
}

musicBtn.addEventListener('click', () => playing ? stopMusic() : startMusic());

// ===== ปุ่มกลับไปด้านบน: ไหลขึ้นแบบ smooth ผ่าน wheelTarget เดียวกัน =====
document.getElementById('topBtn').addEventListener('click', () => {
  wheelTarget = 0;
  stepping = true; // กัน gesture แทรกระหว่างไหลกลับ
});
