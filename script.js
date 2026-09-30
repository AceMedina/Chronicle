// API Configuration
const API_BASE_URL = "https://watch-api-eight.vercel.app";
const API_KEY = "chronicle-api-002";

// Game State
let allWatches = [];
let targetWatch = null;
let currentMode = "easy";
let failedAttempts = 0;
let currentGuessIndex = 0;
let isGameOver = false;

let selectedWatch = null;
let debounceTimer = null;

const MODE_CONFIG = {
  easy: {
    maxGuesses: 10,
    hasSilhouette: true,
    unlockAt: 0,
    sizeTol: 1.5,
    yearTol: 5,
    priceTolRatio: 0.25,
    allowArrows: true
  },
  medium: {
    maxGuesses: 8,
    hasSilhouette: true,
    unlockAt: 2,
    sizeTol: 1.0,
    yearTol: 3,
    priceTolRatio: 0.15,
    allowArrows: true
  },
  hard: {
    maxGuesses: 6,
    hasSilhouette: false,
    unlockAt: 0,
    sizeTol: 0,
    yearTol: 0,
    priceTolRatio: 0,
    allowArrows: false
  }
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
const silhouetteImage = document.getElementById("silhouetteImage");
const ackSilhouetteBtn = document.getElementById("ackSilhouetteBtn");

// Result Modal Elements
const resultModal = document.getElementById("resultModal");
const resultTitle = document.getElementById("resultTitle");
const resultSubtitle = document.getElementById("resultSubtitle");
const revealWatchImg = document.getElementById("revealWatchImg");
const revealBrand = document.getElementById("revealBrand");
const revealModel = document.getElementById("revealModel");
const revealNickname = document.getElementById("revealNickname");
const revealRef = document.getElementById("revealRef");
const revealYear = document.getElementById("revealYear");
const revealSize = document.getElementById("revealSize");
const revealPrice = document.getElementById("revealPrice");
const playAgainBtn = document.getElementById("playAgainBtn");

// Search & Grid Elements
const searchInput = document.getElementById("searchInput");
const autocompleteDropdown = document.getElementById("autocompleteDropdown");
const guessSubmitBtn = document.getElementById("guessSubmitBtn");
const gridRowsContainer = document.getElementById("gridRows");

// Help modal handlers
function openHelp() { helpModal.classList.add("open"); }
function closeHelp() { helpModal.classList.remove("open"); }

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

// Full image resolver helper
function getImageUrl(imgPath) {
  if (!imgPath) return "";
  if (imgPath.startsWith("http")) return imgPath;
  return `${API_BASE_URL}/${imgPath.replace(/^\/+/, "")}`;
}

// Render empty rows
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

// Start a fresh game with a random target
async function initNewGame() {
  isGameOver = false;
  failedAttempts = 0;
  currentGuessIndex = 0;
  selectedWatch = null;
  searchInput.value = "";
  searchInput.disabled = false;
  guessSubmitBtn.disabled = false;
  autocompleteDropdown.style.display = "none";
  resultModal.classList.remove("open");

  renderEmptyRows(MODE_CONFIG[currentMode].maxGuesses);
  updateSilhouetteButton();

  // Fetch full catalog if not loaded yet
  if (allWatches.length === 0) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/watches`, {
        headers: { "x-api-key": API_KEY }
      });
      if (res.ok) {
        const data = await res.json();
        allWatches = data.watches || [];
      }
    } catch (err) {
      console.error("Failed to load catalog:", err);
    }
  }

  // Pick random target watch
  if (allWatches.length > 0) {
    const randomIndex = Math.floor(Math.random() * allWatches.length);
    targetWatch = allWatches[randomIndex];
    silhouetteImage.src = getImageUrl(targetWatch.image);
    console.log("Mystery target loaded:", targetWatch.brand, targetWatch.model);
  }
}

// Mode toggle
modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    modeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;
    initNewGame();
  });
});

// Navigation
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

playAgainBtn.addEventListener("click", () => {
  initNewGame();
});

// Autocomplete logic
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

    if (!response.ok) return;

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

searchInput.addEventListener("input", (e) => {
  selectedWatch = null;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchWatchSuggestions(e.target.value);
  }, 250);
});

document.addEventListener("click", (e) => {
  if (!searchInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
    autocompleteDropdown.style.display = "none";
  }
});

// 7-Attribute Comparison Engine
function evaluateAttribute(guessVal, targetVal, type, config) {
  // Hard mode: Green if exact, else Grey. No Yellows, no arrows.
  if (currentMode === "hard") {
    const match = guessVal === targetVal;
    return {
      status: match ? "match-green" : "match-grey",
      display: type === "price" ? `₱${guessVal.toLocaleString()}` : `${guessVal}`,
      arrow: ""
    };
  }

  // Exact Match
  if (guessVal === targetVal) {
    return {
      status: "match-green",
      display: type === "price" ? `₱${guessVal.toLocaleString()}` : `${guessVal}`,
      arrow: ""
    };
  }

  // Text values that missed
  if (type === "text") {
    return {
      status: "match-grey",
      display: `${guessVal}`,
      arrow: ""
    };
  }

  // Numeric comparisons with directional arrows
  const arrow = guessVal < targetVal ? "↑" : "↓";
  let isClose = false;

  if (type === "size") {
    isClose = Math.abs(guessVal - targetVal) <= config.sizeTol;
  } else if (type === "year") {
    isClose = Math.abs(guessVal - targetVal) <= config.yearTol;
  } else if (type === "price") {
    const diff = Math.abs(guessVal - targetVal);
    isClose = diff <= (targetVal * config.priceTolRatio);
  }

  const status = isClose ? "match-yellow" : "match-grey";
  const displayVal = type === "price" ? `₱${guessVal.toLocaleString()}` : `${guessVal}`;

  return {
    status,
    display: displayVal,
    arrow: config.allowArrows ? arrow : ""
  };
}

// End-game reveal popup
function endGame(won) {
  isGameOver = true;
  searchInput.disabled = true;
  guessSubmitBtn.disabled = true;

  resultTitle.innerText = won ? "VICTORY!" : "GAME OVER";
  resultSubtitle.innerText = won
    ? `Identified in ${currentGuessIndex} ${currentGuessIndex === 1 ? 'guess' : 'guesses'}!`
    : "Out of attempts! Here is the secret watch:";

  revealWatchImg.src = getImageUrl(targetWatch.image);
  revealBrand.innerText = targetWatch.brand;
  revealModel.innerText = targetWatch.model;
  revealNickname.innerText = targetWatch.nickname ? `"${targetWatch.nickname}"` : "";
  revealRef.innerText = targetWatch.reference_number;
  revealYear.innerText = targetWatch.year;
  revealSize.innerText = `${targetWatch.case_size_mm}mm`;
  revealPrice.innerText = `₱${targetWatch.price_php.toLocaleString()}`;

  setTimeout(() => {
    resultModal.classList.add("open");
  }, 1000);
}

// Guess submission handler
guessSubmitBtn.addEventListener("click", () => {
  if (isGameOver) return;

  if (!selectedWatch) {
    showToast("Please pick a watch from the suggestions list!");
    return;
  }

  const config = MODE_CONFIG[currentMode];
  const maxGuesses = config.maxGuesses;

  // Retrieve current row element
  const rows = gridRowsContainer.querySelectorAll(".guess-row");
  const targetRow = rows[currentGuessIndex];
  if (!targetRow) return;

  // Attribute evaluations
  const evaluations = [
    evaluateAttribute(selectedWatch.brand, targetWatch.brand, "text", config),
    evaluateAttribute(selectedWatch.origin, targetWatch.origin, "text", config),
    evaluateAttribute(selectedWatch.category, targetWatch.category, "text", config),
    evaluateAttribute(selectedWatch.movement_type, targetWatch.movement_type, "text", config),
    evaluateAttribute(selectedWatch.case_size_mm, targetWatch.case_size_mm, "size", config),
    evaluateAttribute(selectedWatch.year, targetWatch.year, "year", config),
    evaluateAttribute(selectedWatch.price_php, targetWatch.price_php, "price", config)
  ];

  // Populate row tiles
  targetRow.className = "guess-row";
  targetRow.innerHTML = "";

  evaluations.forEach((evalData, idx) => {
    const tile = document.createElement("div");
    tile.className = `guess-tile ${evalData.status}`;
    tile.style.animationDelay = `${idx * 0.1}s`;
    tile.innerHTML = `
      <span>${evalData.display}</span>
      ${evalData.arrow ? `<span class="tile-arrow">${evalData.arrow}</span>` : ""}
    `;
    targetRow.appendChild(tile);
  });

  currentGuessIndex++;

  const isExactWin = selectedWatch.id === targetWatch.id;

  if (isExactWin) {
    endGame(true);
    return;
  }

  // Failed guess handling
  failedAttempts++;
  updateSilhouetteButton();

  // Clear inputs
  selectedWatch = null;
  searchInput.value = "";
  searchInput.focus();

  // Check out of guesses
  if (currentGuessIndex >= maxGuesses) {
    endGame(false);
  }
});

// Initialize game on script load
initNewGame();