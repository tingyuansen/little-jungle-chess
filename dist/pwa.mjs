const $ = (selector) => document.querySelector(selector);
const installed = () =>
  matchMedia("(display-mode: standalone)").matches ||
  matchMedia("(display-mode: fullscreen)").matches ||
  navigator.standalone === true;
let installEvent = null;
let installing = false;
let offeredThisVisit = false;
const installButton = $("#install");
const installDialog = $("#install-dialog");
const installNow = $("#install-now");
const installMessage = $("#install-message");
function postpone() {
  try {
    localStorage.setItem("little-jungle-install-later", String(Date.now()));
  } catch {}
}
function postponed() {
  try {
    return (
      Date.now() - Number(localStorage.getItem("little-jungle-install-later")) <
      7 * 24 * 60 * 60 * 1000
    );
  } catch {
    return false;
  }
}
function closeOffer() {
  installDialog.close();
}
function showOffer() {
  if (installed() || installDialog.open) return;
  installMessage.textContent = installEvent
    ? "Add Little Jungle to your home screen. Play full screen, even without internet after your first visit."
    : "On Android, open this page in Chrome and choose “Install app” or “Add to Home screen” from its ⋮ menu. If installation is still getting ready, play a few moves and try again.";
  installNow.hidden = !installEvent;
  installDialog.showModal();
  $("#install-later").focus({ preventScroll: true });
}
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installEvent = event;
  if (installed()) return;
  installButton.hidden = false;
  if (!offeredThisVisit && !postponed()) {
    offeredThisVisit = true;
    // Avoid covering the board while a child is picking a move or reading help.
    const offer = () => {
      if (
        document.visibilityState === "hidden" ||
        $("#modal").open ||
        document.querySelector(".cell.selected")
      ) {
        setTimeout(offer, 4000);
        return;
      }
      showOffer();
    };
    setTimeout(offer, 1200);
  }
});
installButton.addEventListener("click", showOffer);
$("#install-later").addEventListener("click", () => {
  postpone();
  closeOffer();
});
installDialog.addEventListener("cancel", postpone);
installNow.addEventListener("click", async () => {
  if (!installEvent || installing) return;
  installing = true;
  installNow.disabled = true;
  const prompt = installEvent;
  installEvent = null;
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome !== "accepted") postpone();
    closeOffer();
  } catch {
    installMessage.textContent =
      "Use Chrome’s ⋮ menu and choose “Install app” or “Add to Home screen”.";
    installNow.hidden = true;
  } finally {
    installing = false;
    installNow.disabled = false;
  }
});
window.addEventListener("appinstalled", () => {
  installEvent = null;
  installButton.hidden = true;
  closeOffer();
});
installButton.hidden = installed();

const fullscreenButton = $("#fullscreen");
const nativeFullscreen = () => !!document.fullscreenElement;
let focusMode = false;
function updateScreenMode() {
  const full = nativeFullscreen();
  document.body.classList.toggle(
    "focus-mode",
    full || focusMode || installed(),
  );
  fullscreenButton.setAttribute("aria-pressed", String(full || focusMode));
  fullscreenButton.innerHTML = `<span aria-hidden="true">${full || focusMode ? "⊡" : "⛶"}</span><span>${full || focusMode ? "Exit" : "Full screen"}</span>`;
  fullscreenButton.setAttribute(
    "aria-label",
    full || focusMode ? "Exit full screen" : "Play full screen",
  );
  fitBoard();
}
fullscreenButton.addEventListener("click", async () => {
  try {
    if (nativeFullscreen()) await document.exitFullscreen();
    else if (focusMode) {
      focusMode = false;
      updateScreenMode();
    } else if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({
        navigationUI: "hide",
      });
    } else {
      focusMode = true;
      updateScreenMode();
      $("#screen-message").textContent =
        "Board focus is on. Install the app to hide browser controls on this browser.";
    }
  } catch {
    focusMode = true;
    updateScreenMode();
    $("#screen-message").textContent =
      "Board focus is on. Your browser did not allow full screen; installing the app can hide its controls.";
  }
});
document.addEventListener("fullscreenchange", () => {
  focusMode = false;
  updateScreenMode();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && focusMode) {
    focusMode = false;
    updateScreenMode();
  }
});

// Size the whole board from the space left by the actual controls and labels,
// including browser bars, notches and two-line animal hints.
let fitScheduled = false;
function fitBoard() {
  if (fitScheduled) return;
  fitScheduled = true;
  requestAnimationFrame(() => {
    fitScheduled = false;
    const focus = document.body.classList.contains("focus-mode");
    const compact =
      innerWidth <= 740 || (innerHeight <= 520 && innerWidth <= 1000) || focus;
    document.body.classList.toggle("compact-game", compact);
    const area = $(".play-area");
    if (!compact) area.style.removeProperty("width");
    const app = $(".app"),
      frame = $(".board-frame"),
      board = $("#board"),
      nav = $(".game-controls"),
      goal = $("#goal-text");
    const style = getComputedStyle(app),
      frameStyle = getComputedStyle(frame);
    const paddingX =
      parseFloat(frameStyle.paddingLeft) +
      parseFloat(frameStyle.paddingRight) +
      parseFloat(frameStyle.borderLeftWidth) +
      parseFloat(frameStyle.borderRightWidth);
    const overhead =
      frame.getBoundingClientRect().height -
      board.getBoundingClientRect().height;
    const landscape = compact && innerHeight <= 520 && innerWidth > innerHeight;
    // Wide full-screen views park the controls beside the board (see the
    // focus-mode overlay styles), so they no longer consume board height.
    const sideControls =
      landscape || (focus && innerWidth >= 700 && innerHeight > 520);
    const controlsHeight = sideControls
      ? 0
      : nav.getBoundingClientRect().height +
        parseFloat(getComputedStyle(nav).marginTop) +
        goal.getBoundingClientRect().height +
        parseFloat(getComputedStyle(goal).marginTop);
    const caption = $(".board-caption"),
      footer = $("footer");
    const desktopExtra = compact
      ? 0
      : caption.getBoundingClientRect().height +
        parseFloat(getComputedStyle(caption).marginTop) +
        footer.getBoundingClientRect().height +
        parseFloat(getComputedStyle(footer).marginTop);
    // With side controls the game block is vertically centered, so its
    // measured top offset is self-referential; budget the whole viewport.
    const areaTop = sideControls ? 0 : area.getBoundingClientRect().top;
    const remaining =
      (window.visualViewport?.height || innerHeight) -
      areaTop -
      parseFloat(style.paddingBottom) -
      controlsHeight -
      desktopExtra -
      overhead -
      10;
    // Full screen lets the board grow past the usual phone cap so it fills
    // the available height; normal views keep the compact width limit.
    const maxWidth = compact
      ? Math.min(
          focus ? Infinity : 460,
          app.clientWidth -
            parseFloat(style.paddingLeft) -
            parseFloat(style.paddingRight) -
            (sideControls ? 270 : 0),
        )
      : area.getBoundingClientRect().width;
    area.style.width = `${Math.max(160, Math.min(maxWidth, (remaining * 7) / 9 + paddingX))}px`;
  });
}
window.addEventListener("resize", fitBoard);
window.visualViewport?.addEventListener("resize", fitBoard);
new ResizeObserver(fitBoard).observe($("#goal-text"));
document.fonts?.ready.then(fitBoard);
updateScreenMode();
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js", { scope: "./", updateViaCache: "none" })
    .catch(() => {
      $("#screen-message").textContent =
        "Online play is ready. Offline saving is unavailable in this browser.";
    });
}
