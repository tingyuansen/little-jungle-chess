import { ANIMALS, initialState, terrain, legalMoves, move } from "./engine.mjs";
let state = initialState(),
  selected = null,
  history = [],
  soundOn = false;
const $ = (s) => document.querySelector(s);
const art = (rank, cls = "") =>
  `<span class="animal-art ${cls}" data-rank="${rank}"><span>${ANIMALS[rank].emoji}</span></span>`;
function render() {
  const moves = selected ? legalMoves(state, selected) : [];
  $("#board").innerHTML = Array.from({ length: 63 }, (_, i) => {
    const r = Math.floor(i / 7),
      c = i % 7,
      t = terrain(r, c),
      p = state.pieces.find((x) => x.r === r && x.c === c),
      m = moves.find((x) => x.r === r && x.c === c),
      last =
        state.last &&
        ((state.last.from.r === r && state.last.from.c === c) ||
          (state.last.to.r === r && state.last.to.c === c));
    let inside =
      t.type === "water"
        ? '<span class="water-mark">∿∿</span>'
        : t.type === "trap"
          ? '<span class="trap-mark">⊗</span>'
          : t.type === "den"
            ? '<span class="den-mark">⚑<small>DEN</small></span>'
            : "";
    if (p)
      inside = `<span class="piece ${p.team}">${art(p.rank, "portrait")}<span class="rank">${p.rank}</span></span>`;
    return `<button class="cell ${t.type} ${t.owner ?? ""} ${p?.id === selected ? "selected" : ""} ${m ? "legal" : ""} ${m?.capture ? "capture" : ""} ${last ? "last" : ""}" data-r="${r}" data-c="${c}" aria-label="${p ? `${p.team} ${ANIMALS[p.rank].name}, rank ${p.rank}` : `${t.owner ?? ""} ${t.type}`} at ${String.fromCharCode(65 + c)}${9 - r}${m ? ", legal move" : ""}" ${p?.id === selected ? 'aria-pressed="true"' : ""}>${inside}</button>`;
  }).join("");
  $(".board-frame").dataset.turn = state.winner || state.turn;
  $(".board-frame").setAttribute(
    "aria-label",
    state.winner ? state.winner + " team wins" : state.turn + " team’s turn",
  );
  $("#undo").disabled = !history.length;
  document.body.classList.toggle("blue-view", state.turn === "blue");
  const chosen = state.pieces.find((x) => x.id === selected);
  $("#goal-text").textContent = chosen
    ? ANIMALS[chosen.rank].tip
    : "Get an animal into the other team’s den!";
}
$("#board").addEventListener("click", (e) => {
  const cell = e.target.closest(".cell");
  if (!cell || state.winner) return;
  const r = +cell.dataset.r,
    c = +cell.dataset.c;
  const next = selected && move(state, selected, r, c);
  if (next) {
    applyMove(next);
    return;
  }
  const p = state.pieces.find((x) => x.r === r && x.c === c);
  selected = p?.team === state.turn && p.id !== selected ? p.id : null;
  if (!selected && p && p.team !== state.turn)
    announce("It is " + state.turn + " team’s turn.");
  render();
});
$("#roster").innerHTML = [8, 7, 6, 5, 4, 3, 2, 1]
  .map(
    (rank) =>
      `<button class="animal-card" data-animal="${rank}">${art(rank, "mini-art")}<span><strong>${ANIMALS[rank].name}</strong><small>${ANIMALS[rank].zh} · ${rank}</small></span></button>`,
  )
  .join("");
const atlas = new Image();
atlas.onload = () => document.documentElement.classList.add("art-loaded");
atlas.src = "assets/animals.png";
let audioContext;
function chime(kind = "move") {
  if (!soundOn) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    const notes =
      kind === "win"
        ? [523, 659, 784, 1047]
        : kind === "capture"
          ? [660, 880]
          : [460, 620];
    notes.forEach((freq, i) => {
      const oscillator = audioContext.createOscillator(),
        gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(
        0.13,
        audioContext.currentTime + i * 0.1 + 0.015,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + i * 0.1 + 0.19,
      );
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(audioContext.currentTime + i * 0.1);
      oscillator.stop(audioContext.currentTime + i * 0.1 + 0.2);
    });
  } catch {}
}
function announce(message) {
  $("#announcement").textContent = message;
}
function save() {
  try {
    localStorage.setItem(
      "little-jungle-v1",
      JSON.stringify({ state, history: history.slice(-80), soundOn }),
    );
  } catch {}
}
function openModal(html, flip = false) {
  $("#modal-content").innerHTML = html;
  $("#modal").classList.toggle("modal-flipped", flip);
  if (!$("#modal").open) $("#modal").showModal();
  $("#close-modal").focus({ preventScroll: true });
  $("#modal").scrollTop = 0;
}
function closeModal() {
  $("#modal").close();
}
$("#close-modal").onclick = closeModal;
$("#modal").addEventListener("click", (e) => {
  if (e.target === $("#modal")) {
    const b = e.target.getBoundingClientRect();
    if (
      e.clientX < b.left ||
      e.clientX > b.right ||
      e.clientY < b.top ||
      e.clientY > b.bottom
    )
      closeModal();
  }
});
function applyMove(next) {
  history.push(structuredClone(state));
  state = next;
  selected = null;
  save();
  render();
  chime(state.winner ? "win" : state.last.captured ? "capture" : "move");
  const cell = $(`[data-r="${state.last.to.r}"][data-c="${state.last.to.c}"]`);
  cell?.classList.add("arrived");
  announce(
    `${state.last.team} moved ${ANIMALS[state.last.rank].name}. ${state.winner ? state.winner + " wins!" : state.turn + " team’s turn."}`,
  );
  if (state.winner) showWin();
}
function showWin() {
  openModal(
    `<div class="win"><div class="hero-animal animal-art" data-rank="${state.last.rank}"><span>${ANIMALS[state.last.rank].emoji}</span></div><span class="eyebrow" style="color:#718b43">JUNGLE CHAMPION</span><h2>${state.winner === "orange" ? "Orange" : "Blue"} team wins!</h2><p>${state.reason}<br>Give your opponent a high five!</p><div class="dialog-actions"><button class="primary-button" id="play-again">Play again</button><button class="secondary-button" id="see-board">See board</button></div></div>`,
    state.winner === "blue",
  );
  $("#play-again").onclick = reset;
  $("#see-board").onclick = closeModal;
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    $("#confetti").innerHTML = Array.from(
      { length: 42 },
      (_, i) =>
        `<i class="confetti-piece" style="left:${Math.random() * 100}%;background:${["#f7cf63", "#6ed4ee", "#f69e51", "#b1e981"][i % 4]};animation-delay:${Math.random() * 0.5}s"></i>`,
    ).join("");
    setTimeout(() => $("#confetti").replaceChildren(), 3400);
  }
}
function reset() {
  state = initialState();
  history = [];
  selected = null;
  closeModal();
  save();
  render();
  announce("New game. Orange team goes first.");
}
$("#restart").onclick = () => {
  openModal(
    '<h2>A fresh adventure?</h2><p>This will put all the animals back and start a new game.</p><div class="dialog-actions"><button class="secondary-button" id="keep-playing">Keep playing</button><button class="primary-button" id="confirm-restart">New game</button></div>',
    state.turn === "blue",
  );
  $("#keep-playing").onclick = closeModal;
  $("#confirm-restart").onclick = reset;
};
$("#undo").onclick = () => {
  if (history.length) {
    state = history.pop();
    selected = null;
    save();
    render();
    announce("Move undone. " + state.turn + " team’s turn.");
  }
};
function soundLabel() {
  $("#sound").innerHTML = `<span>♫</span> Sound ${soundOn ? "on" : "off"}`;
  $("#sound").setAttribute("aria-pressed", String(soundOn));
}
$("#sound").onclick = () => {
  soundOn = !soundOn;
  soundLabel();
  save();
  chime();
};
function showRules() {
  openModal(
    `<span class="eyebrow" style="color:#6d873e">LET’S PLAY 斗兽棋</span><h2>A race to the den!</h2><div class="goal-banner"><strong>Get one animal into<br>the other team’s den!</strong><span>Look for their flag ⚑ at the far end.</span></div><div class="rule-row"><span>1</span><div><strong>Take turns</strong><p>Orange starts. Tap your animal, then a glowing square. Move one square up, down, left or right. No diagonal moves!</p></div></div><div class="rule-row"><span>2</span><div><strong>Bigger numbers can catch smaller ones</strong><p>Land on an enemy with the same or a smaller number to catch it.</p><div class="rule-pictures">${art(6, "mini-art")}<b>6 › 2</b>${art(2, "mini-art")}</div></div></div><div class="rule-row"><span>3</span><div><strong>Little rat has a big trick!</strong><p>Rat 1 can catch elephant 8 on land. Elephant cannot catch rat.</p><div class="rule-pictures">${art(1, "mini-art")}<b>→</b>${art(8, "mini-art")}</div></div></div><div class="rule-row"><span>∿</span><div><strong>Splash or leap</strong><p>Only rats swim. Lions and tigers leap across rivers—but a rat in their path blocks the jump. Rats can’t catch across the water’s edge.</p></div></div><div class="rule-row"><span>⊗</span><div><strong>Watch out for traps!</strong><p>In an enemy trap, any enemy can catch you. Your own traps are safe. You can’t enter your own den.</p></div></div><details><summary>See all 8 animals</summary><div class="rules-roster">${[8, 7, 6, 5, 4, 3, 2, 1].map((rank) => `<div class="animal-card">${art(rank, "mini-art")}<strong>${ANIMALS[rank].name}</strong><small>${ANIMALS[rank].zh} · ${rank}</small></div>`).join("")}</div></details><p class="rules-note" style="margin-top:20px">Grown-up corner: capturing every enemy or leaving them no legal moves also wins. We use dog 4, wolf 3. Some family sets swap these ranks. Rules and starting layout: <a href="https://ancientchess.com/page/play-doushouqi.htm" target="_blank" rel="noopener">Ancient Chess</a> and <a href="https://www.ymimports.com/pages/how-to-play-jungle" target="_blank" rel="noopener">Yellow Mountain Imports</a>.</p><div class="dialog-actions"><button class="primary-button" id="lets-play">Let’s play!</button></div>`,
    state.turn === "blue",
  );
  $("#lets-play").onclick = closeModal;
}
$("#rules").onclick = showRules;
$("#rules-secondary").onclick = showRules;
$("#roster").onclick = (e) => {
  const card = e.target.closest("[data-animal]");
  if (!card) return;
  const rank = +card.dataset.animal;
  openModal(
    `<div class="win"><div class="hero-animal animal-art" data-rank="${rank}"><span>${ANIMALS[rank].emoji}</span></div><h2>${ANIMALS[rank].name} ${ANIMALS[rank].zh} · ${rank}</h2><p>${ANIMALS[rank].tip}</p></div>`,
  );
};
try {
  const saved = JSON.parse(localStorage.getItem("little-jungle-v1"));
  if (
    saved?.state?.pieces?.length &&
    ["orange", "blue"].includes(saved.state.turn) &&
    saved.state.pieces.every(
      (p) =>
        typeof p.id === "string" &&
        ["orange", "blue"].includes(p.team) &&
        Number.isInteger(p.rank) &&
        p.rank >= 1 &&
        p.rank <= 8 &&
        Number.isInteger(p.r) &&
        p.r >= 0 &&
        p.r < 9 &&
        Number.isInteger(p.c) &&
        p.c >= 0 &&
        p.c < 7,
    )
  ) {
    state = saved.state;
    history = Array.isArray(saved.history) ? saved.history : [];
    soundOn = !!saved.soundOn;
  }
} catch {}
soundLabel();
render();
