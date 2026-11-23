// API Configuration
const API_BASE_URL = "https://watch-api-eight.vercel.app";
const API_KEY = "chronicle-api-002";

// Game State
let allWatches = [];
let targetWatch = null;
let currentMode = "easy";
let currentGameType = "daily"; // "daily" or "classic"
let failedAttempts = 0;
let currentGuessIndex = 0;
let isGameOver = false;
let currentDailyDate = null;
let submittedGuesses = [];

let selectedWatch = null;
let debounceTimer = null;
let currentSuggestions = [];
let focusedSuggestionIndex = -1;
let guessedWatchIds = new Set();

// Auth & Leaderboard Filter State
let currentUser = JSON.parse(localStorage.getItem("chronicle_user") || "null");
let lbScope = "all";

const MODE_CONFIG = {
  easy: {
    maxGuesses: 10,
    basePts: 50,
    perUnused: 5,
    hasSilhouette: true,
    unlockAt: 0,
    resistanceTol: 50,
    sizeTol: 1.5,
    yearTol: 5,
    priceTolRatio: 0.25,
    allowArrows: true
  },
  medium: {
    maxGuesses: 8,
    basePts: 80,
    perUnused: 8,
    hasSilhouette: true,
    unlockAt: 2,
    resistanceTol: 30,
    sizeTol: 1.0,
    yearTol: 3,
    priceTolRatio: 0.15,
    allowArrows: true
  },
  hard: {
    maxGuesses: 6,
    basePts: 120,
    perUnused: 12,
    hasSilhouette: false,
    unlockAt: 0,
    resistanceTol: 0,
    sizeTol: 0,
    yearTol: 0,
    priceTolRatio: 0,
    allowArrows: false
  }
};

// UI Elements
const landingView = document.getElementById("landingView");
const landingUtilityBar = document.getElementById("landingUtilityBar");
const landingUserGreeting = document.getElementById("landingUserGreeting");
const gameView = document.getElementById("gameView");
const playDailyBtn = document.getElementById("playDailyBtn");
const playClassicBtn = document.getElementById("playClassicBtn");
const navLogoBtn = document.getElementById("navLogoBtn");
const modeButtons = document.querySelectorAll(".mode-btn[data-mode]");
const typeButtons = document.querySelectorAll(".type-btn");

// Account Labels
const landingAuthLabel = document.getElementById("landingAuthLabel");
const inGameAuthBtn = document.getElementById("inGameAuthBtn");
const inGameAuthLabel = document.getElementById("inGameAuthLabel");

// Leaderboard & Statistics Elements
const leaderboardModal = document.getElementById("leaderboardModal");
const landingLeaderboardBtn = document.getElementById("landingLeaderboardBtn");
const inGameLeaderboardBtn = document.getElementById("inGameLeaderboardBtn");
const closeLeaderboardBtn = document.getElementById("closeLeaderboardBtn");
const leaderboardList = document.getElementById("leaderboardList");

const statsModal = document.getElementById("statsModal");
const landingStatsBtn = document.getElementById("landingStatsBtn");
const inGameStatsBtn = document.getElementById("inGameStatsBtn");
const closeStatsBtn = document.getElementById("closeStatsBtn");
const historyList = document.getElementById("historyList");

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
const earnedPtsBadge = document.getElementById("earnedPtsBadge");
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

// Daily Persistence Key Helpers
function getManilaDateKey() {
  return currentDailyDate || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

function getDailyStorageKey() {
  const userScope = currentUser ? `user_${currentUser.id}` : "guest";
  return `chronicle_daily_state_${userScope}_${getManilaDateKey()}`;
}

function saveDailySnapshot(completedAttempt = null) {
  if (currentGameType !== "daily" || !targetWatch) return;
  const payload = {
    watch_id: targetWatch.id,
    difficulty: currentMode,
    guesses: submittedGuesses,
    completed: Boolean(completedAttempt),
    attempt: completedAttempt
  };
  localStorage.setItem(getDailyStorageKey(), JSON.stringify(payload));
}

function loadDailySnapshot() {
  try {
    const raw = localStorage.getItem(getDailyStorageKey());
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Toast Notification
function showToast(text) {
  const existing = document.querySelector(".toast-msg");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast-msg";
  toast.innerText = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

// Local Image Resolver Helper
function getImageUrl(imgPath) {
  if (!imgPath) return "";
  if (imgPath.startsWith("http")) return imgPath;
  return imgPath.replace(/^\/+/, "");
}

// Sync Account UI State
function syncAuthUI() {
  currentUser = JSON.parse(localStorage.getItem("chronicle_user") || "null");
  if (currentUser) {
    landingAuthLabel.innerText = `@${currentUser.username}`;
    landingStatsBtn.style.display = "inline-flex";
    landingUserGreeting.innerText = `Welcome back, ${currentUser.username}!`;
    inGameAuthLabel.innerText = `@${currentUser.username}`;
    inGameAuthBtn.classList.add("signed-in");
  } else {
    landingAuthLabel.innerText = "Sign In";
    landingStatsBtn.style.display = "none";
    landingUserGreeting.innerText = "Guess the mystery watch!";
    inGameAuthLabel.innerText = "Guest";
    inGameAuthBtn.classList.remove("signed-in");
  }
}

// Help Modal Handlers
function openHelp() { helpModal.classList.add("open"); }
function closeHelp() { helpModal.classList.remove("open"); }

openHelpBtn.addEventListener("click", openHelp);
inGameHelpBtn.addEventListener("click", openHelp);
closeHelpBtn.addEventListener("click", closeHelp);
ackHelpBtn.addEventListener("click", closeHelp);
helpModal.addEventListener("click", (e) => { if (e.target === helpModal) closeHelp(); });

document.querySelectorAll("#helpTabs .mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const page = btn.dataset.helppage;
    document.querySelectorAll("#helpTabs .mode-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".help-page").forEach((p) => {
      p.classList.toggle("active", p.dataset.helppage === page);
    });
  });
});

// Silhouette Modal Handlers
function openSilhouette() {
  const config = MODE_CONFIG[currentMode];
  if (currentMode === "medium" && failedAttempts < config.unlockAt) {
    const needed = config.unlockAt - failedAttempts;
    showToast(`Unlocks after ${needed} more failed ${needed === 1 ? "guess" : "guesses"}!`);
    return;
  }
  silhouetteModal.classList.add("open");
}

function closeSilhouette() {
  silhouetteModal.classList.remove("open");
}

silhouetteBtn.addEventListener("click", openSilhouette);
ackSilhouetteBtn.addEventListener("click", closeSilhouette);
silhouetteModal.addEventListener("click", (e) => { if (e.target === silhouetteModal) closeSilhouette(); });

// Render Empty Rows
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

// Silhouette Button UI State
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

// Sync Difficulty Button Active State
function setDifficultyUI(mode) {
  currentMode = mode;
  modeButtons.forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
}

// Reset Board State
function resetBoardState() {
  isGameOver = false;
  failedAttempts = 0;
  currentGuessIndex = 0;
  submittedGuesses = [];
  selectedWatch = null;
  guessedWatchIds.clear();
  currentSuggestions = [];
  focusedSuggestionIndex = -1;

  searchInput.value = "";
  searchInput.disabled = false;
  guessSubmitBtn.disabled = false;
  autocompleteDropdown.style.display = "none";
  resultModal.classList.remove("open");

  renderEmptyRows(MODE_CONFIG[currentMode].maxGuesses);
  updateSilhouetteButton();
}

// Render a Single Guess Row onto the Grid (used by live play and refresh recovery)
function renderGuessOnGrid(watchGuess, animate = true) {
  const config = MODE_CONFIG[currentMode];
  const rows = gridRowsContainer.querySelectorAll(".guess-row");
  const targetRow = rows[currentGuessIndex];
  if (!targetRow) return;

  guessedWatchIds.add(watchGuess.id);

  // Order: Brand -> Category -> Movement -> Resistance -> Size -> Year -> Price
  const evaluations = [
    evaluateAttribute(watchGuess.brand, targetWatch.brand, "text", config),
    evaluateAttribute(watchGuess.category, targetWatch.category, "text", config),
    evaluateAttribute(watchGuess.movement_type, targetWatch.movement_type, "text", config),
    evaluateAttribute(watchGuess.water_resistance_m, targetWatch.water_resistance_m, "resistance", config),
    evaluateAttribute(watchGuess.case_size_mm, targetWatch.case_size_mm, "size", config),
    evaluateAttribute(watchGuess.year, targetWatch.year, "year", config),
    evaluateAttribute(watchGuess.price_php, targetWatch.price_php, "price", config)
  ];

  targetRow.className = "guess-row";
  targetRow.innerHTML = "";

  evaluations.forEach((evalData, idx) => {
    const tile = document.createElement("div");
    tile.className = `guess-tile ${evalData.status}`;
    if (animate) {
      tile.style.animationDelay = `${idx * 0.1}s`;
    } else {
      tile.style.animation = "none";
    }
    tile.innerHTML = `
      <span>${evalData.display}</span>
      ${evalData.arrow ? `<span class="tile-arrow">${evalData.arrow}</span>` : ""}
    `;
    targetRow.appendChild(tile);
  });

  currentGuessIndex++;
  if (watchGuess.id !== targetWatch.id) {
    failedAttempts++;
  }
  updateSilhouetteButton();
}

// Load Today's Daily Puzzle (with Anti-Refresh & Anti-Switch Recovery)
async function initDailyGame() {
  currentGameType = "daily";
  typeButtons.forEach((b) => b.classList.toggle("active", b.dataset.gametype === "daily"));
  resetBoardState();

  try {
    const params = new URLSearchParams();
    if (currentUser) params.set("user_id", currentUser.id);

    const res = await fetch(`${API_BASE_URL}/api/v1/chronicle/daily?${params.toString()}`, {
      headers: { "x-api-key": API_KEY }
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Failed to load daily watch.");
      return;
    }

    targetWatch = data.watch;
    currentDailyDate = data.date || getManilaDateKey();
    silhouetteImage.src = getImageUrl(targetWatch.image);

    const savedSnapshot = loadDailySnapshot();

    // 1. Completed in Neon DB (authenticated user)
    if (data.already_played && data.attempt) {
      if (savedSnapshot && savedSnapshot.watch_id === targetWatch.id && Array.isArray(savedSnapshot.guesses)) {
        setDifficultyUI(savedSnapshot.difficulty || data.attempt.difficulty);
        renderEmptyRows(MODE_CONFIG[currentMode].maxGuesses);
        savedSnapshot.guesses.forEach((g) => {
          submittedGuesses.push(g);
          renderGuessOnGrid(g, false);
        });
      }
      isGameOver = true;
      searchInput.disabled = true;
      guessSubmitBtn.disabled = true;
      showLockedDailyResult(data.attempt);
      return;
    }

    // 2. Restore active or completed local snapshot for today's Daily watch
    if (savedSnapshot && savedSnapshot.watch_id === targetWatch.id) {
      setDifficultyUI(savedSnapshot.difficulty || currentMode);
      renderEmptyRows(MODE_CONFIG[currentMode].maxGuesses);

      if (Array.isArray(savedSnapshot.guesses)) {
        savedSnapshot.guesses.forEach((g) => {
          submittedGuesses.push(g);
          renderGuessOnGrid(g, false);
        });
      }

      if (savedSnapshot.completed && savedSnapshot.attempt) {
        isGameOver = true;
        searchInput.disabled = true;
        guessSubmitBtn.disabled = true;
        showLockedDailyResult(savedSnapshot.attempt);
      } else if (submittedGuesses.length > 0) {
        showToast(`Resumed today's Daily (${currentMode.toUpperCase()})`);
      }
    }
  } catch {
    showToast("Could not connect to server.");
  }
}

// Load Unlimited Classic Game
async function initClassicGame() {
  currentGameType = "classic";
  typeButtons.forEach((b) => b.classList.toggle("active", b.dataset.gametype === "classic"));
  resetBoardState();

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

  if (allWatches.length > 0) {
    const randomIndex = Math.floor(Math.random() * allWatches.length);
    targetWatch = allWatches[randomIndex];
    silhouetteImage.src = getImageUrl(targetWatch.image);
  }
}

// Show Locked Modal if Today's Daily Was Already Completed
function showLockedDailyResult(attempt) {
  resultTitle.innerText = attempt.won ? "DAILY SOLVED!" : "DAILY COMPLETE";
  resultSubtitle.innerText = `Today's Daily (${attempt.difficulty.toUpperCase()}) • ${attempt.guesses_used}/${attempt.max_guesses}`;
  earnedPtsBadge.innerText = `+${attempt.points_earned} PTS`;
  populateRevealCard();
  playAgainBtn.innerText = "Play Classic";
  resultModal.classList.add("open");
}

// Difficulty Toggle (Locked once a round has started!)
modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const nextMode = btn.dataset.mode;
    if (nextMode === currentMode) return;

    if (!isGameOver && currentGuessIndex > 0) {
      showToast("Finish your current round before changing difficulty!");
      return;
    }

    setDifficultyUI(nextMode);
    if (currentGameType === "daily") {
      initDailyGame();
    } else {
      initClassicGame();
    }
  });
});

// Daily / Classic Toggle
typeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.gametype === "daily") {
      initDailyGame();
    } else {
      initClassicGame();
    }
  });
});

// Landing & Header Navigation
function enterGame(modeType) {
  landingView.style.display = "none";
  landingUtilityBar.style.display = "none";
  gameView.style.display = "flex";
  if (modeType === "daily") {
    initDailyGame();
  } else {
    initClassicGame();
  }
  searchInput.focus();
}

playDailyBtn.addEventListener("click", () => enterGame("daily"));
playClassicBtn.addEventListener("click", () => enterGame("classic"));

navLogoBtn.addEventListener("click", () => {
  gameView.style.display = "none";
  landingView.style.display = "flex";
  landingUtilityBar.style.display = "flex";
  syncAuthUI();
});

playAgainBtn.addEventListener("click", () => {
  initClassicGame();
});

// Leaderboard Modal (All-Time & Daily only)
async function loadLeaderboard() {
  leaderboardList.innerHTML = `<p class="empty-state-text">Loading...</p>`;
  try {
    const params = new URLSearchParams({ scope: lbScope, limit: "20" });
    const res = await fetch(`${API_BASE_URL}/api/v1/chronicle/leaderboard?${params.toString()}`, {
      headers: { "x-api-key": API_KEY }
    });
    const data = await res.json();
    const rows = data.leaderboard || [];

    if (rows.length === 0) {
      leaderboardList.innerHTML = `<p class="empty-state-text">No ranked games yet.</p>`;
      return;
    }

    leaderboardList.innerHTML = "";
    rows.forEach((player, idx) => {
      const rank = idx + 1;
      const row = document.createElement("div");
      row.className = `list-row-card${rank <= 3 ? ` rank-${rank}` : ""}`;
      const subText = lbScope === "today"
        ? `${player.difficulty.toUpperCase()} • ${player.guesses_used}/${player.max_guesses}`
        : `${player.wins}W / ${player.games_played}G (${player.win_rate || 0}%) • Best Streak ${player.best_streak || 0}`;

      row.innerHTML = `
        <div class="list-row-main">
          <span class="list-row-title"><span class="rank-badge">#${rank}</span> ${player.username}</span>
          <span class="list-row-sub">${subText}</span>
        </div>
        <span class="badge-pill won">${player.total_points} PTS</span>
      `;
      leaderboardList.appendChild(row);
    });
  } catch {
    leaderboardList.innerHTML = `<p class="empty-state-text">Failed to load leaderboard.</p>`;
  }
}

function openLeaderboardModal() {
  leaderboardModal.classList.add("open");
  loadLeaderboard();
}

landingLeaderboardBtn.addEventListener("click", openLeaderboardModal);
inGameLeaderboardBtn.addEventListener("click", openLeaderboardModal);
closeLeaderboardBtn.addEventListener("click", () => leaderboardModal.classList.remove("open"));
leaderboardModal.addEventListener("click", (e) => { if (e.target === leaderboardModal) leaderboardModal.classList.remove("open"); });

document.querySelectorAll("#lbScopeToggle .mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#lbScopeToggle .mode-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    lbScope = btn.dataset.scope;
    loadLeaderboard();
  });
});

// Statistics & Match History Modal
async function openStatsModal() {
  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  statsModal.classList.add("open");
  historyList.innerHTML = `<p class="empty-state-text">Loading...</p>`;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/chronicle/users/${currentUser.id}/history`, {
      headers: { "x-api-key": API_KEY }
    });
    const data = await res.json();
    const stats = data.stats || {};
    const games = data.history || [];

    const total = Number(stats.total_games || 0);
    const wins = Number(stats.wins || 0);
    const winPct = total > 0 ? Math.round((wins / total) * 100) : 0;

    document.getElementById("statTotalPoints").innerText = stats.total_points || 0;
    document.getElementById("statWinRate").innerText = `${winPct}%`;
    document.getElementById("statCurrentStreak").innerText = stats.current_streak || 0;
    document.getElementById("statBestStreak").innerText = stats.best_streak || 0;

    if (games.length === 0) {
      historyList.innerHTML = `<p class="empty-state-text">No matches played yet.</p>`;
      return;
    }

    historyList.innerHTML = "";
    games.forEach((g) => {
      const row = document.createElement("div");
      row.className = "list-row-card";
      const modeTag = g.game_mode === "daily" ? "Daily" : "Classic";
      row.innerHTML = `
        <div class="list-row-main">
          <span class="list-row-title">${g.brand} ${g.model}</span>
          <span class="list-row-sub">${modeTag} • ${g.difficulty.toUpperCase()} • ${g.guesses_used}/${g.max_guesses}</span>
        </div>
        <span class="badge-pill ${g.won ? "won" : "lost"}">
          ${g.won ? `+${g.points_earned} PTS` : "LOSS"}
        </span>
      `;
      historyList.appendChild(row);
    });
  } catch {
    historyList.innerHTML = `<p class="empty-state-text">Failed to load statistics.</p>`;
  }
}

landingStatsBtn.addEventListener("click", openStatsModal);
inGameStatsBtn.addEventListener("click", openStatsModal);
closeStatsBtn.addEventListener("click", () => statsModal.classList.remove("open"));
statsModal.addEventListener("click", (e) => { if (e.target === statsModal) statsModal.classList.remove("open"); });

// Autocomplete Logic
async function fetchWatchSuggestions(query) {
  if (!query || query.trim().length === 0) {
    currentSuggestions = [];
    autocompleteDropdown.style.display = "none";
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/watches/search?q=${encodeURIComponent(query.trim())}`, {
      headers: { "x-api-key": API_KEY, "Content-Type": "application/json" }
    });
    if (!response.ok) return;
    const data = await response.json();
    currentSuggestions = data.results || [];
    renderSuggestions(currentSuggestions);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

function selectSuggestion(watch) {
  searchInput.value = `${watch.brand} ${watch.model}`;
  selectedWatch = watch;
  autocompleteDropdown.style.display = "none";
  focusedSuggestionIndex = -1;
}

function updateHighlightedItem() {
  const items = autocompleteDropdown.querySelectorAll(".autocomplete-item");
  items.forEach((item, idx) => {
    if (idx === focusedSuggestionIndex) {
      item.classList.add("selected");
      item.scrollIntoView({ block: "nearest" });
    } else {
      item.classList.remove("selected");
    }
  });
}

function renderSuggestions(watchesList) {
  autocompleteDropdown.innerHTML = "";
  focusedSuggestionIndex = -1;

  if (watchesList.length === 0) {
    autocompleteDropdown.style.display = "none";
    return;
  }

  watchesList.forEach((watch) => {
    const item = document.createElement("div");
    item.className = "autocomplete-item";
    const nicknameDisplay = watch.nickname ? watch.nickname : "";
    item.innerHTML = `
      <span>${watch.brand} ${watch.model}</span>
      <span class="item-sub">${nicknameDisplay}</span>
    `;
    item.addEventListener("click", () => selectSuggestion(watch));
    autocompleteDropdown.appendChild(item);
  });

  autocompleteDropdown.style.display = "block";
}

searchInput.addEventListener("input", (e) => {
  selectedWatch = null;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchWatchSuggestions(e.target.value), 250);
});

searchInput.addEventListener("keydown", (e) => {
  const isDropdownVisible = autocompleteDropdown.style.display === "block";

  if (e.key === "ArrowDown") {
    if (!isDropdownVisible || currentSuggestions.length === 0) return;
    e.preventDefault();
    focusedSuggestionIndex = (focusedSuggestionIndex + 1) % currentSuggestions.length;
    updateHighlightedItem();
  } else if (e.key === "ArrowUp") {
    if (!isDropdownVisible || currentSuggestions.length === 0) return;
    e.preventDefault();
    focusedSuggestionIndex = (focusedSuggestionIndex - 1 + currentSuggestions.length) % currentSuggestions.length;
    updateHighlightedItem();
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (isDropdownVisible && focusedSuggestionIndex >= 0 && currentSuggestions[focusedSuggestionIndex]) {
      selectSuggestion(currentSuggestions[focusedSuggestionIndex]);
    } else {
      guessSubmitBtn.click();
    }
  } else if (e.key === "Escape") {
    autocompleteDropdown.style.display = "none";
    focusedSuggestionIndex = -1;
  }
});

document.addEventListener("click", (e) => {
  if (!searchInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
    autocompleteDropdown.style.display = "none";
  }
});

// 7-Attribute Comparison Engine
function evaluateAttribute(guessVal, targetVal, type, config) {
  function getDisplayVal() {
    if (type === "price") return `₱${guessVal.toLocaleString()}`;
    if (type === "resistance") return `${guessVal}m`;
    if (type === "size") return `${guessVal}mm`;
    return `${guessVal}`;
  }

  if (currentMode === "hard") {
    const match = guessVal === targetVal;
    return { status: match ? "match-green" : "match-grey", display: getDisplayVal(), arrow: "" };
  }

  if (guessVal === targetVal) {
    return { status: "match-green", display: getDisplayVal(), arrow: "" };
  }

  if (type === "text") {
    return { status: "match-grey", display: `${guessVal}`, arrow: "" };
  }

  const arrow = guessVal < targetVal ? "↑" : "↓";
  let isClose = false;

  if (type === "resistance") isClose = Math.abs(guessVal - targetVal) <= config.resistanceTol;
  else if (type === "size") isClose = Math.abs(guessVal - targetVal) <= config.sizeTol;
  else if (type === "year") isClose = Math.abs(guessVal - targetVal) <= config.yearTol;
  else if (type === "price") isClose = Math.abs(guessVal - targetVal) <= (targetVal * config.priceTolRatio);

  return {
    status: isClose ? "match-yellow" : "match-grey",
    display: getDisplayVal(),
    arrow: config.allowArrows ? arrow : ""
  };
}

// Compute Local Base Points (for Guest display)
function computeLocalBasePoints(won) {
  if (!won) return 0;
  const cfg = MODE_CONFIG[currentMode];
  const unused = Math.max(0, cfg.maxGuesses - currentGuessIndex);
  let pts = cfg.basePts + (unused * cfg.perUnused);
  if (currentGameType === "daily") pts += 25;
  return pts;
}

// Populate Watch Reveal Card
function populateRevealCard() {
  if (!targetWatch) return;
  revealWatchImg.src = getImageUrl(targetWatch.image);
  revealBrand.innerText = targetWatch.brand;
  revealModel.innerText = targetWatch.model;
  revealNickname.innerText = targetWatch.nickname ? `"${targetWatch.nickname}"` : "";
  revealRef.innerText = targetWatch.reference_number;
  revealYear.innerText = targetWatch.year;
  revealSize.innerText = `${targetWatch.case_size_mm}mm`;
  revealPrice.innerText = `₱${targetWatch.price_php.toLocaleString()}`;
}

// Persist Finished Game to Neon DB (backend expects "daily" or "practice")
async function saveGameResult(won, fallbackPts) {
  if (!currentUser || !targetWatch) return { points: fallbackPts, streak: 0 };

  const backendGameMode = currentGameType === "daily" ? "daily" : "practice";

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/chronicle/games`, {
      method: "POST",
      headers: { "x-api-key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: currentUser.id,
        watch_id: targetWatch.id,
        difficulty: currentMode,
        game_mode: backendGameMode,
        won,
        guesses_used: currentGuessIndex
      })
    });
    if (res.ok) {
      const data = await res.json();
      return {
        points: data.game ? data.game.points_earned : fallbackPts,
        streak: data.game ? data.game.streak_count : 0
      };
    }
  } catch (err) {
    console.error("Failed to save game result:", err);
  }
  return { points: fallbackPts, streak: 0 };
}

// End-Game Reveal Popup
async function endGame(won) {
  isGameOver = true;
  searchInput.disabled = true;
  guessSubmitBtn.disabled = true;

  const fallbackPts = computeLocalBasePoints(won);
  const saved = await saveGameResult(won, fallbackPts);
  const finalPoints = currentUser ? saved.points : fallbackPts;

  if (currentGameType === "daily") {
    saveDailySnapshot({
      won,
      difficulty: currentMode,
      guesses_used: currentGuessIndex,
      max_guesses: MODE_CONFIG[currentMode].maxGuesses,
      points_earned: finalPoints
    });
  }

  resultTitle.innerText = won ? "VICTORY!" : "GAME OVER";
  resultSubtitle.innerText = won
    ? `Identified in ${currentGuessIndex} ${currentGuessIndex === 1 ? "guess" : "guesses"}!`
    : "Out of attempts! Here is the secret watch:";

  if (currentUser) {
    const streakTag = saved.streak > 1 ? ` • ${saved.streak}x STREAK` : "";
    earnedPtsBadge.innerText = `+${saved.points} PTS${streakTag}`;
  } else {
    earnedPtsBadge.innerText = `+${fallbackPts} PTS (GUEST)`;
  }

  playAgainBtn.innerText = currentGameType === "daily" ? "Play Classic" : "Play Again";
  populateRevealCard();

  setTimeout(() => {
    resultModal.classList.add("open");
  }, 1000);
}

// Guess Submission Handler
guessSubmitBtn.addEventListener("click", () => {
  if (isGameOver) return;

  if (!selectedWatch) {
    showToast("Please pick a watch from the suggestions list!");
    return;
  }

  if (guessedWatchIds.has(selectedWatch.id)) {
    showToast("You already guessed this watch!");
    return;
  }

  const config = MODE_CONFIG[currentMode];
  const maxGuesses = config.maxGuesses;

  submittedGuesses.push(selectedWatch);
  renderGuessOnGrid(selectedWatch, true);
  saveDailySnapshot();

  const isWin = selectedWatch.id === targetWatch.id;

  selectedWatch = null;
  searchInput.value = "";
  searchInput.focus();

  if (isWin) {
    endGame(true);
    return;
  }

  if (currentGuessIndex >= maxGuesses) {
    endGame(false);
  }
});

// Sync Auth State on Load
syncAuthUI();