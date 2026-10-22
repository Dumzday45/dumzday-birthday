import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, updateDoc, increment, query, orderBy, limit, onSnapshot, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ============ CONFIG ============ */
const BIRTHDAY = new Date("2026-10-26T00:00:00+01:00").getTime(); // midnight WAT
const CANDLES = 5;
const COOLDOWN_MS = 30000;

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAlRTPOLkXr4PzaHoyLCkIS5QHrw4sZmBY",
  authDomain: "dumzday-birthday.firebaseapp.com",
  projectId: "dumzday-birthday",
  storageBucket: "dumzday-birthday.firebasestorage.app",
  messagingSenderId: "410012421030",
  appId: "1:410012421030:web:5e1a26b689cc514eccdd67"
};

/* Put photos in a "photos" folder, named by year. Edit captions, add or delete rows freely. */
const TIMELINE = [
  { year: 2011, photo: "photos/2011.jpg", caption: "Where it started." },
  { year: 2010, photo: "photos/primary.jpg", caption: "Graduation from primary 5" },
  { year: 2012, photo: "photos/2012.jpg", caption: "😂😂😂" },
  { year: 2021, photo: "photos/pop3.jpg", caption: "I and me sis" },
  { year: 2021, photo: "photos/2021.jpg", caption: "Still fair then" },
  { year: 2022, photo: "photos/2022.jpg", caption: "Looking Serious 🔥" },
  { year: 2022, photo: "photos/MD.jpg", caption: "Hunting for rice that day 😂" },
  { year: 2023, photo: "photos/2023.jpg", caption: "My paddy that year" },
  { year: 2022, photo: "photos/blackwhite.jpg", caption: "😂😂" },
  { year: 2023, photo: "photos/hoodie.jpeg", caption: "Christmas Day" },
  { year: 2023, photo: "photos/fat.jpg", caption: "Was looking fat that year" },
  { year: 2023, photo: "photos/inter.jpg", caption: "Interhouse sport that year 🔥" },
  { year: 2024, photo: "photos/die.jpg", caption: "Fine boy" },
  { year: 2024, photo: "photos/dog.jpeg", caption: "See my hair sha 😂" },
  { year: 2024, photo: "photos/tie.jpeg", caption: "The way I like my tie to be" },
  { year: 2025, photo: "photos/matric.jpg", caption: "Matriculation Day" },
  { year: 2025, photo: "photos/first.jpg", caption: "My first lecture day in IMSU" },
  { year: 2025, photo: "photos/chelsea.jpg", caption: "Last year birthday picture 💙" },
  { year: 2025, photo: "photos/CSC.jpg", caption: "I also join my department football team CSC" },
  { year: 2025, photo: "photos/blue.jpg", caption: "My team" },
  { year: 2025, photo: "photos/alvan.jpg", caption: "An away game to Alvan university" },
  { year: 2025, photo: "photos/white.jpg", caption: "Was in anambra that day for my pastor Traditional marriage" },
  { year: 2026, photo: "photos/swag.jpeg", caption: "Blue is my color now" },
  { year: 2026, photo: "photos/code.jpg", caption: "My work space" },
  { year: 2026, photo: "photos/work.png", caption: "How I got here, it was God." },
  { year: 2026, photo: "photos/sound.jpg", caption: "Also a sound engineer in Truelight IMSU Expression" },
  { year: 2026, photo: "photos/foot.jpg", caption: "SPAIN vs ARGENTINA match 😂, that day was fun" },
  { year: 2026, photo: "photos/guys.jpg", caption: "People I call friends" },
  { year: 2026, photo: "photos/guy.jpg", caption: "They were admiring my pose" },
  { year: 2026, photo: "photos/gys.jpg", caption: "We smile" },
  { year: 2026, photo: "photos/2026.jpg", caption: "❤️" },
  { year: 2026, photo: "photos/OG.jpg", caption: "THANK YOU JESUS" },
];

const REACTIONS = [
  { key: "heart", emoji: "❤️" },
  { key: "fire", emoji: "🔥" },
  { key: "laugh", emoji: "😂" },
  { key: "party", emoji: "🎉" },
  { key: "clap", emoji: "👏" },
];

const $ = (id) => document.getElementById(id);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============ CONFETTI ============ */
const cv = $("confetti");
const cx = cv.getContext("2d");
const COLORS = ["#3b82f6", "#22e6a8", "#ffffff"];
let parts = [];
let confettiRaf = null;

function resize() { cv.width = innerWidth; cv.height = innerHeight; }
addEventListener("resize", resize);
resize();

function burst(n = 160) {
  if (reduceMotion) return;
  for (let i = 0; i < n; i++) {
    parts.push({
      x: innerWidth / 2, y: innerHeight * 0.45,
      vx: (Math.random() - 0.5) * 18, vy: Math.random() * -15 - 4,
      s: Math.random() * 8 + 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35,
      c: COLORS[(Math.random() * COLORS.length) | 0],
    });
  }
  if (!confettiRaf) confettiRaf = requestAnimationFrame(drawConfetti);
}

function drawConfetti() {
  cx.clearRect(0, 0, cv.width, cv.height);
  parts = parts.filter((p) => p.y < innerHeight + 30);
  for (const p of parts) {
    p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
    cx.save();
    cx.translate(p.x, p.y);
    cx.rotate(p.r);
    cx.fillStyle = p.c;
    cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
    cx.restore();
  }
  confettiRaf = parts.length ? requestAnimationFrame(drawConfetti) : null;
  if (!parts.length) cx.clearRect(0, 0, cv.width, cv.height);
}

/* ============ COUNTDOWN ============ */
const pad = (n) => String(n).padStart(2, "0");
const preview = new URLSearchParams(location.search).get("preview") === "birthday";
let timer;
let dayStarted = false;

function floatBalloons() {
  if (reduceMotion) return;
  const box = $("balloons");
  const colors = ["#3b82f6", "#22e6a8", "#ffffff"];
  for (let i = 0; i < 18; i++) {
    const b = document.createElement("span");
    b.className = "balloon";
    b.style.left = Math.random() * 95 + "%";
    b.style.background = colors[i % colors.length];
    b.style.animationDuration = 7 + Math.random() * 6 + "s";
    b.style.animationDelay = Math.random() * 4 + "s";
    b.style.setProperty("--sway", Math.random() * 60 - 30 + "px");
    box.appendChild(b);
    setTimeout(() => b.remove(), 18000);
  }
}

function startDay() {
  if (dayStarted) return;
  dayStarted = true;
  clearInterval(timer);
  $("headline").textContent = "Happy Birthday to me 🎉";
  $("countdown").style.display = "none";
  $("subline").textContent = "Thank you for being part of my year. Leave me a wish below 👇";

  let seen = false;
  try { seen = sessionStorage.getItem("ddaySeen") === "1"; } catch {}
  if (seen && !preview) { floatBalloons(); return; }

  const overlay = $("dday");
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
  $("ddayBtn").addEventListener("click", () => {
    overlay.classList.add("gone");
    document.body.style.overflow = "";
    try { sessionStorage.setItem("ddaySeen", "1"); } catch {}
    burst(260);
    setTimeout(() => burst(160), 600);
    floatBalloons();
  }, { once: true });
}

function tick() {
  const diff = preview ? 0 : BIRTHDAY - Date.now();
  if (diff <= 0) return startDay();

  $("days").textContent = pad(Math.floor(diff / 86400000));
  $("hours").textContent = pad(Math.floor((diff / 3600000) % 24));
  $("mins").textContent = pad(Math.floor((diff / 60000) % 60));
  $("secs").textContent = pad(Math.floor((diff / 1000) % 60));
}

tick();
if (!dayStarted) timer = setInterval(tick, 1000);

/* ============ CANDLE GAME ============ */
const candlesEl = $("candles");
const statusEl = $("gameStatus");
const micBtn = $("micBtn");
let outCount = 0;
let micStream = null;
let audioCtx = null;
let micRaf = null;

function buildCandles() {
  candlesEl.innerHTML = "";
  outCount = 0;
  for (let i = 0; i < CANDLES; i++) {
    const c = document.createElement("button");
    c.type = "button";
    c.className = "candle";
    c.setAttribute("aria-label", `Blow out candle ${i + 1}`);
    c.innerHTML = '<span class="flame"></span>';
    c.addEventListener("click", () => snuff(c));
    candlesEl.appendChild(c);
  }
  updateStatus();
}

function updateStatus() {
  const left = CANDLES - outCount;
  statusEl.textContent = left === 0 ? "Make a wish! 🎉" : `${left} candle${left === 1 ? "" : "s"} lit`;
}

function snuff(c) {
  if (c.classList.contains("out")) return;
  c.classList.add("out");
  outCount++;
  updateStatus();
  if (outCount === CANDLES) {
    stopMic();
    burst(200);
  }
}

function snuffNext() {
  const lit = candlesEl.querySelector(".candle:not(.out)");
  if (lit) snuff(lit);
}

async function startMic() {
  if (micStream) return;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    statusEl.textContent = "Mic blocked. Tap the candles instead.";
    return;
  }
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  audioCtx.createMediaStreamSource(micStream).connect(analyser);
  const buf = new Uint8Array(analyser.fftSize);
  let loud = 0;

  micBtn.textContent = "🎤 Listening... blow!";
  micBtn.disabled = true;

  const listen = () => {
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) { const d = (v - 128) / 128; sum += d * d; }
    const rms = Math.sqrt(sum / buf.length);
    if (rms > 0.2) {
      if (++loud >= 10) { snuffNext(); loud = 0; }
    } else {
      loud = 0;
    }
    micRaf = requestAnimationFrame(listen);
  };
  listen();
}

function stopMic() {
  cancelAnimationFrame(micRaf);
  if (micStream) micStream.getTracks().forEach((t) => t.stop());
  if (audioCtx) audioCtx.close();
  micStream = audioCtx = null;
  micBtn.textContent = "🎤 Blow with mic";
  micBtn.disabled = false;
}

micBtn.addEventListener("click", startMic);
$("relightBtn").addEventListener("click", () => { stopMic(); buildCandles(); });
buildCandles();

/* ============ WISH WALL ============ */
const form = $("wishForm");
const msgEl = $("formMsg");
const wishesEl = $("wishes");
const nameIn = $("wishName");
const msgIn = $("wishMsg");

msgIn.addEventListener("input", () => { $("charCount").textContent = `${msgIn.value.length} / 200`; });

function say(text, isError = false) {
  msgEl.textContent = text;
  msgEl.classList.toggle("error", isError);
}

function getReacted() {
  try { return new Set(JSON.parse(localStorage.getItem("reacted") || "[]")); } catch { return new Set(); }
}
function saveReacted(set) {
  try { localStorage.setItem("reacted", JSON.stringify([...set])); } catch {}
}

async function react(id, key) {
  const mine = getReacted();
  const tag = `${id}:${key}`;
  if (mine.has(tag) || !db) return;
  mine.add(tag);
  saveReacted(mine);
  try {
    await updateDoc(doc(db, "wishes", id), { [`reactions.${key}`]: increment(1) });
  } catch {
    mine.delete(tag);
    saveReacted(mine);
    say("Couldn't add your reaction. Try again.", true);
  }
}

function renderWishes(docs) {
  wishesEl.innerHTML = "";
  if (!docs.length) {
    wishesEl.innerHTML = '<p class="empty">No wishes yet. Be the first.</p>';
    return;
  }
  const mine = getReacted();
  for (const d of docs) {
    const { name, message, reactions = {} } = d.data();
    const card = document.createElement("article");
    card.className = "wish";

    const h = document.createElement("h3");
    const p = document.createElement("p");
    h.textContent = name;
    p.textContent = message;

    const bar = document.createElement("div");
    bar.className = "reacts";
    for (const r of REACTIONS) {
      const b = document.createElement("button");
      const done = mine.has(`${d.id}:${r.key}`);
      b.type = "button";
      b.className = "react" + (done ? " on" : "");
      b.disabled = done;
      b.setAttribute("aria-label", `React with ${r.emoji}`);
      b.innerHTML = `<span>${r.emoji}</span><b>${reactions[r.key] || 0}</b>`;
      b.addEventListener("click", () => react(d.id, r.key));
      bar.appendChild(b);
    }

    card.append(h, p, bar);
    wishesEl.appendChild(card);
  }
}

/* ============ TIMELINE ============ */
const tl = $("tl");
const activeObs = new IntersectionObserver((entries) => {
  for (const en of entries) en.target.classList.toggle("active", en.isIntersecting);
}, { root: tl, rootMargin: "0px -40% 0px -40%" });

for (const t of TIMELINE) {
  const li = document.createElement("li");
  li.className = "tl-item";

  const y = document.createElement("div");
  y.className = "tl-year";
  y.textContent = t.year;

  const fig = document.createElement("figure");
  fig.className = "tl-photo";

  const img = document.createElement("img");
  img.src = t.photo;
  img.alt = `Dumzday in ${t.year}`;
  img.loading = "lazy";
  img.addEventListener("error", () => {
    const ph = document.createElement("div");
    ph.className = "ph";
    ph.textContent = `Add photos/${t.year}.jpg`;
    img.replaceWith(ph);
  });
  fig.appendChild(img);

  if (t.caption) {
    const cap = document.createElement("figcaption");
    cap.textContent = t.caption;
    fig.appendChild(cap);
  }

  li.append(y, fig);
  tl.appendChild(li);
  activeObs.observe(li);
}

const tlStep = () => (tl.querySelector(".tl-item")?.offsetWidth || 300) + 16;
const tlMove = (dir) => tl.scrollBy({ left: dir * tlStep(), behavior: reduceMotion ? "auto" : "smooth" });
$("tlPrev").addEventListener("click", () => tlMove(-1));
$("tlNext").addEventListener("click", () => tlMove(1));

const configured = !firebaseConfig.apiKey.startsWith("YOUR_");
let db = null;

if (configured) {
  db = getFirestore(initializeApp(firebaseConfig));
  const q = query(collection(db, "wishes"), orderBy("createdAt", "desc"), limit(60));
  onSnapshot(q, (snap) => renderWishes(snap.docs), () => say("Couldn't load wishes. Refresh and try again.", true));
} else {
  wishesEl.innerHTML = '<p class="empty">Add your Firebase config in script.js to turn on the wall.</p>';
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!db) return say("The wall isn't connected yet.", true);

  const name = nameIn.value.trim().slice(0, 30);
  const message = msgIn.value.trim().slice(0, 200);
  if (!name || !message) return say("Add your name and a message.", true);

  try {
    const last = Number(localStorage.getItem("lastWish") || 0);
    const wait = COOLDOWN_MS - (Date.now() - last);
    if (wait > 0) return say(`Give it ${Math.ceil(wait / 1000)}s before sending another.`, true);
  } catch {}

  $("wishBtn").disabled = true;
  try {
    const reactions = Object.fromEntries(REACTIONS.map((r) => [r.key, 0]));
    await addDoc(collection(db, "wishes"), { name, message, reactions, createdAt: serverTimestamp() });
    try { localStorage.setItem("lastWish", String(Date.now())); } catch {}
    form.reset();
    $("charCount").textContent = "0 / 200";
    say("Wish sent. Thank you! 🎉");
    burst(80);
  } catch {
    say("Couldn't send your wish. Check your connection and try again.", true);
  } finally {
    $("wishBtn").disabled = false;
  }
});


/* ============ EDIT YOUR QUESTIONS HERE ============
   options: list of answers. answer: index (starting at 0) of the correct one.
   fun: one line shown after the person answers. */
const QUESTIONS = [
  {
    q: "What's my favourite food?",
    options: ["Spaghetti", "Jollof rice", "Rice and stwe", "Bread and custard"],
    answer: 0,
    fun: "Spaghetti, always.",
  },
  {
    q: "Which football club do I support?",
    options: ["Chelsea", "Arsenal", "Manchester United", "Real Madrid"],
    answer: 0,
    fun: "Blue is the colour. 💙",
  },
  {
    q: "What's my hobby?",
    options: ["Drawing", "Gaming", "Playing ball", "Cooking"],
    answer: 0,
    fun: "Pencil in hand.",
  },
  {
    q: "What do I like watching?",
    options: ["Anime and horror", "Romance and comedy", "Documentaries", "Cartoon"],
    answer: 0,
    fun: "Anime and horror, every time.",
  },
  {
    q: "What was my first nickname?",
    options: ["Dumclux", "Dumzday", "Flash", "Vic"],
    answer: 0,
    fun: "The original. If you knew this one, you've known me a long time.",
  },
  {
    q: "What's my last name?",
    options: ["Uzordimma", "Azuka", "chinedu", "Chukwudumebi"],
    answer: 0,
    fun: "Now you can say it properly.",
  },
  {
    q: "What are my favourite colours?",
    options: ["Blue and black", "Green", "Green and black", "Blue"],
    answer: 0,
    fun: "Blue and black, no contest.",
  },
];

/* ============ QUIZ ENGINE ============ */
let i = 0;
let score = 0;
let locked = false;

const shuffle = (arr) => {
  const a = [...arr];
  for (let n = a.length - 1; n > 0; n--) {
    const k = Math.floor(Math.random() * (n + 1));
    [a[n], a[k]] = [a[k], a[n]];
  }
  return a;
};

function render() {
  locked = false;
  const item = QUESTIONS[i];
  const opts = shuffle(item.options.map((text, idx) => ({ text, correct: idx === item.answer })));

  $("quizProgress").style.width = `${(i / QUESTIONS.length) * 100}%`;
  $("quizCount").textContent = `Question ${i + 1} of ${QUESTIONS.length}`;
  $("quizQuestion").textContent = item.q;
  $("quizFeedback").textContent = "";
  $("quizFeedback").className = "feedback";
  $("quizNext").hidden = true;

  const list = $("quizOptions");
  list.innerHTML = "";
  for (const o of opts) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "opt";
    b.textContent = o.text;
    b.dataset.correct = o.correct;
    b.addEventListener("click", () => pick(b, o.correct, item));
    list.appendChild(b);
  }
}

function pick(btn, isCorrect, item) {
  if (locked) return;
  locked = true;

  for (const b of $("quizOptions").children) {
    b.disabled = true;
    if (b.dataset.correct === "true") b.classList.add("right");
  }

  const fb = $("quizFeedback");
  if (isCorrect) {
    score++;
    fb.textContent = `Correct! ${item.fun}`;
    fb.classList.add("good");
  } else {
    btn.classList.add("wrong");
    fb.textContent = `Not quite. ${item.fun}`;
    fb.classList.add("bad");
  }

  const next = $("quizNext");
  next.textContent = i === QUESTIONS.length - 1 ? "See my score" : "Next question";
  next.hidden = false;
  next.focus();
}

function finish() {
  $("quizProgress").style.width = "100%";
  $("quizPlay").hidden = true;
  $("quizResult").hidden = false;
  $("quizScore").textContent = `${score} / ${QUESTIONS.length}`;

  const ratio = score / QUESTIONS.length;
  let verdict = "Time to catch up. Leave a wish and ask me anything.";
  if (ratio === 1) verdict = "Perfect score. You know me too well. 🎉";
  else if (ratio >= 0.6) verdict = "Solid. You've been paying attention.";
  $("quizVerdict").textContent = verdict;

  if (ratio === 1) burst(200);
}

function restart() {
  i = 0;
  score = 0;
  $("quizResult").hidden = true;
  $("quizPlay").hidden = false;
  render();
}

$("quizNext").addEventListener("click", () => {
  i++;
  i < QUESTIONS.length ? render() : finish();
});
$("quizRestart").addEventListener("click", restart);

render();

/* ============ BALLOON POP (unlocks on the birthday) ============ */
const popUnlocked = preview || Date.now() >= BIRTHDAY;
$("popLocked").hidden = popUnlocked;
$("popPlay").hidden = !popUnlocked;

if (popUnlocked) {
  const arena = $("arena");
  const scoreEl = $("popScore");
  const timeEl = $("popTime");
  const startBtn = $("popStart");
  const scoreForm = $("scoreForm");
  const GAME_SECONDS = 20;
  let popScore = 0, lastScore = 0, timeLeft = GAME_SECONDS, spawnT, clockT, running = false;

  function spawn() {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pop-balloon";
    b.setAttribute("aria-label", "Pop balloon");
    b.style.left = Math.random() * 85 + "%";
    b.style.background = ["#3b82f6", "#22e6a8", "#ffffff"][(Math.random() * 3) | 0];
    b.style.animationDuration = 2.2 + Math.random() * 2 + "s";
    b.addEventListener("pointerdown", () => {
      if (!running) return;
      popScore++;
      scoreEl.textContent = popScore;
      b.classList.add("popped");
      setTimeout(() => b.remove(), 150);
    });
    b.addEventListener("animationend", () => b.remove());
    arena.appendChild(b);
  }

  function end() {
    running = false;
    clearInterval(spawnT);
    clearInterval(clockT);
    arena.innerHTML = "";
    lastScore = popScore;
    startBtn.hidden = false;
    startBtn.textContent = "Play again";
    $("popResult").textContent = `You popped ${lastScore} balloon${lastScore === 1 ? "" : "s"}!`;
    scoreForm.hidden = lastScore === 0 || !db;
    if (lastScore >= 15) burst(120);
  }

  function start() {
    popScore = 0;
    timeLeft = GAME_SECONDS;
    running = true;
    scoreEl.textContent = 0;
    timeEl.textContent = timeLeft;
    scoreForm.hidden = true;
    startBtn.hidden = true;
    spawnT = setInterval(spawn, 450);
    clockT = setInterval(() => {
      timeEl.textContent = --timeLeft;
      if (timeLeft <= 0) end();
    }, 1000);
  }
  startBtn.addEventListener("click", start);

  scoreForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("scoreName").value.trim().slice(0, 30);
    if (!name || !db) return;
    $("scoreBtn").disabled = true;
    try {
      await addDoc(collection(db, "scores"), { name, score: lastScore, createdAt: serverTimestamp() });
      scoreForm.hidden = true;
      $("popResult").textContent = "Score saved. Check the leaderboard!";
    } catch {
      $("popResult").textContent = "Couldn't save your score. Try again.";
    } finally {
      $("scoreBtn").disabled = false;
    }
  });

  if (db) {
    onSnapshot(query(collection(db, "scores"), orderBy("score", "desc"), limit(10)), (snap) => {
      const board = $("board");
      board.innerHTML = "";
      if (snap.empty) { board.innerHTML = '<li class="empty">No scores yet. Be the first.</li>'; return; }
      snap.forEach((d) => {
        const { name, score } = d.data();
        const li = document.createElement("li");
        const n = document.createElement("span");
        const s = document.createElement("b");
        n.textContent = name;
        s.textContent = score;
        li.append(n, s);
        board.appendChild(li);
      });
    }, () => {});
  }
}