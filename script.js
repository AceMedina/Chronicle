// State
let currentMode = "easy";
let failedAttempts = 0;

const MODE_CONFIG = {
  easy: { maxGuesses: 10, hasSilhouette: true, unlockAt: 0 },
  medium: { maxGuesses: 8, hasSilhouette: true, unlockAt: 2 },
  hard: { maxGuesses: 6, hasSilhouette: false, unlockAt: 0 }
};

// UI Elements
const landingView = document.getElementById("landingView");
const gameView = document.getElementById("gameView");
const playBtn = document.getElementById("playBtn");
const navLogoBtn = document.getElementById("navLogoBtn");
const modeButtons = document.querySelectorAll(".mode-btn");

// Help Modal
const helpModal = document.getElementById("helpModal");
const openHelpBtn = document.getElementById("openHelpBtn");
const inGameHelpBtn = document.getElementById("inGameHelpBtn");
const closeHelpBtn = document.getElementById("closeHelpBtn");
const ackHelpBtn = document.getElementById("ackHelpBtn");

// Silhouette Elements
const silhouetteBtn = document.getElementById("silhouetteBtn");
const silhouetteModal = document.getElementById("silhouetteModal");
const closeSilhouetteBtn = document.getElementById("closeSilhouetteBtn");
const ackSilhouetteBtn = document.getElementById("ackSilhouetteBtn");
const gridRowsContainer = document.getElementById("gridRows");

// Help modal toggle
function openHelp() {
  helpModal.classList.add("open");
}

function closeHelp() {
  helpModal.classList.remove("open");
}

openHelpBtn.addEventListener("click", openHelp);
inGameHelpBtn.addEventListener("click", openHelp);
closeHelpBtn.addEventListener("click", closeHelp);
ackHelpBtn.addEventListener("click", closeHelp);

helpModal.addEventListener("click", (e) => {
  if (e.target === helpModal) closeHelp();
});

// Toast message
function showToast(text) {
  const existing = document.querySelector(".toast-msg");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast-msg";
  toast.innerText = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

// Silhouette modal toggle
function openSilhouette() {
  const config = MODE_CONFIG[currentMode];
  if (currentMode === "medium" && failedAttempts < config.unlockAt) {
    const needed = config.unlockAt - failedAttempts;
    showToast(`Unlocks after ${needed} more failed ${needed === 1 ? 'guess' : 'guesses'}!`);
    return;
  }
  silhouetteModal.classList.add("open");
}

function closeSilhouette() {
  silhouetteModal.classList.remove("open");
}

silhouetteBtn.addEventListener("click", openSilhouette);
closeSilhouetteBtn.addEventListener("click", closeSilhouette);
ackSilhouetteBtn.addEventListener("click", closeSilhouette);

silhouetteModal.addEventListener("click", (e) => {
  if (e.target === silhouetteModal) closeSilhouette();
});

// Screen navigation
playBtn.addEventListener("click", () => {
  landingView.style.display = "none";
  openHelpBtn.style.display = "none";
  gameView.style.display = "flex";
  document.getElementById("searchInput").focus();
});

navLogoBtn.addEventListener("click", () => {
  gameView.style.display = "none";
  landingView.style.display = "flex";
  openHelpBtn.style.display = "flex";
});

// Grid rows generator
function renderEmptyRows(count) {
  gridRowsContainer.innerHTML = "";
  for (let i = 1; i <= count; i++) {
    const row = document.createElement("div");
    row.className = "guess-row empty-row";
    row.dataset.row = i;
    row.innerHTML = `<span class="row-num">${i}</span>`;
    gridRowsContainer.appendChild(row);
  }
}

// Silhouette button appearance
function updateSilhouetteButton() {
  const config = MODE_CONFIG[currentMode];
  if (!config.hasSilhouette) {
    silhouetteBtn.classList.add("hidden");
    return;
  }
  silhouetteBtn.classList.remove("hidden");

  if (currentMode === "medium" && failedAttempts < config.unlockAt) {
    silhouetteBtn.classList.add("locked");
  } else {
    silhouetteBtn.classList.remove("locked");
  }
}

// Difficulty toggle handlers
modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    modeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;
    failedAttempts = 0;
    renderEmptyRows(MODE_CONFIG[currentMode].maxGuesses);
    updateSilhouetteButton();
  });
});

// Init
renderEmptyRows(MODE_CONFIG.easy.maxGuesses);
updateSilhouetteButton();