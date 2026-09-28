// Elements
const landingView = document.getElementById("landingView");
const gameView = document.getElementById("gameView");
const helpModal = document.getElementById("helpModal");

const playBtn = document.getElementById("playBtn");
const openHelpBtn = document.getElementById("openHelpBtn");
const inGameHelpBtn = document.getElementById("inGameHelpBtn");
const closeHelpBtn = document.getElementById("closeHelpBtn");
const ackHelpBtn = document.getElementById("ackHelpBtn");

const navLogoBtn = document.getElementById("navLogoBtn");
const modeButtons = document.querySelectorAll(".mode-btn");

// Modal toggle
function openModal() {
  helpModal.classList.add("open");
}

function closeModal() {
  helpModal.classList.remove("open");
}

openHelpBtn.addEventListener("click", openModal);
inGameHelpBtn.addEventListener("click", openModal);
closeHelpBtn.addEventListener("click", closeModal);
ackHelpBtn.addEventListener("click", closeModal);

helpModal.addEventListener("click", (e) => {
  if (e.target === helpModal) closeModal();
});

// Switch to game screen
playBtn.addEventListener("click", () => {
  landingView.style.display = "none";
  openHelpBtn.style.display = "none";
  gameView.style.display = "flex";
  document.getElementById("searchInput").focus();
});

// Return to landing screen
navLogoBtn.addEventListener("click", () => {
  gameView.style.display = "none";
  landingView.style.display = "flex";
  openHelpBtn.style.display = "flex";
});

// Difficulty mode toggle
modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    modeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});