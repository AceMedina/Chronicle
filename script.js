// API Configuration
const API_BASE_URL = "https://watch-api-eight.vercel.app";
const API_KEY = "chronicle-api-002";

// Game State
let currentMode = "easy";
let failedAttempts = 0;
let selectedWatch = null;
let debounceTimer = null;

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

// Help Modal Elements
const helpModal = document.getElementById("helpModal");
const openHelpBtn = document.getElementById("openHelpBtn");
const inGameHelpBtn = document.getElementById("inGameHelpBtn");
const closeHelpBtn = document.getElementById("closeHelpBtn");
const ackHelpBtn = document.getElementById("ackHelpBtn");

// Silhouette Elements
const silhouetteBtn = document.getElementById("silhouetteBtn");
const silhouetteModal = document.getElementById("silhouetteModal");
const ackSilhouetteBtn = document.getElementById("ackSilhouetteBtn");
const gridRowsContainer = document.getElementById("gridRows");

// Search & Autocomplete Elements
const searchInput = document.getElementById("searchInput");
const autocompleteDropdown = document.getElementById("autocompleteDropdown");
const guessSubmitBtn = document.getElementById("guessSubmitBtn");

// Help modal handlers
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

// Toast notification
function showToast(text) {
  const existing = document.querySelector(".toast-msg");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast-msg";
  toast.innerText = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

// Silhouette modal handlers
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
ackSilhouetteBtn.addEventListener("click", closeSilhouette);

silhouetteModal.addEventListener("click", (e) => {
  if (e.target === silhouetteModal) closeSilhouette();
});

// View navigation
playBtn.addEventListener("click", () => {
  landingView.style.display = "none";
  openHelpBtn.style.display = "none";
  gameView.style.display = "flex";
  searchInput.focus();
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

// Silhouette button UI state
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

// Difficulty mode toggle
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

// Search & Autocomplete API
async function fetchWatchSuggestions(query) {
  if (!query || query.trim().length === 0) {
    autocompleteDropdown.style.display = "none";
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/watches/search?q=${encodeURIComponent(query.trim())}`, {
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      console.error("API response error:", response.status);
      return;
    }

    const data = await response.json();
    renderSuggestions(data.results || []);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

function renderSuggestions(watchesList) {
  autocompleteDropdown.innerHTML = "";

  if (watchesList.length === 0) {
    autocompleteDropdown.style.display = "none";
    return;
  }

  watchesList.forEach((watch) => {
    const item = document.createElement("div");
    item.className = "autocomplete-item";
    item.innerHTML = `
      <span>${watch.brand} ${watch.model}</span>
      <span class="item-sub">${watch.reference_number}</span>
    `;

    item.addEventListener("click", () => {
      searchInput.value = `${watch.brand} ${watch.model}`;
      selectedWatch = watch;
      autocompleteDropdown.style.display = "none";
    });

    autocompleteDropdown.appendChild(item);
  });

  autocompleteDropdown.style.display = "block";
}

// Typing listener with debounce
searchInput.addEventListener("input", (e) => {
  selectedWatch = null;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchWatchSuggestions(e.target.value);
  }, 250);
});

// Close dropdown on outside click
document.addEventListener("click", (e) => {
  if (!searchInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
    autocompleteDropdown.style.display = "none";
  }
});

// Initial load
renderEmptyRows(MODE_CONFIG.easy.maxGuesses);
updateSilhouetteButton();