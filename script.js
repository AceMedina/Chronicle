// Elements
const helpModal = document.getElementById("helpModal");
const openHelpBtn = document.getElementById("openHelpBtn");
const closeHelpBtn = document.getElementById("closeHelpBtn");
const ackHelpBtn = document.getElementById("ackHelpBtn");
const playBtn = document.getElementById("playBtn");

// Modal toggle
function openModal() {
  helpModal.classList.add("open");
}

function closeModal() {
  helpModal.classList.remove("open");
}

openHelpBtn.addEventListener("click", openModal);
closeHelpBtn.addEventListener("click", closeModal);
ackHelpBtn.addEventListener("click", closeModal);

helpModal.addEventListener("click", (e) => {
  if (e.target === helpModal) closeModal();
});

// Launch game
playBtn.addEventListener("click", () => {
  console.log("Game launched");
});