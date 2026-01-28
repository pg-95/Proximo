let deck = [];
let playerHand = [];
let dealerHand = [];

let gameOver = false;
let dealerHidden = true;

let chips = 1000;

let stats = JSON.parse(localStorage.getItem("bjStats")) || {
  handsPlayed: 0,
  handsWon: 0,
  userBJ: 0,
  dealerBJ: 0
};

function saveStats() {
  localStorage.setItem("bjStats", JSON.stringify(stats));
}

function updateStatsUI() {
  document.getElementById("stat-hands").innerText = stats.handsPlayed;
  document.getElementById("stat-wins").innerText = stats.handsWon;
  document.getElementById("stat-user-bj").innerText = stats.userBJ;
  document.getElementById("stat-dealer-bj").innerText = stats.dealerBJ;
}

function createDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const values = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  deck = [];

  for (let s of suits) {
    for (let v of values) {
      deck.push({ value: v, suit: s });
    }
  }
}

function shuffle() {
  deck.sort(() => Math.random() - 0.5);
}

function deal() {
  return deck.pop();
}

function handValue(hand) {
  let total = 0;
  let aces = 0;

  for (let c of hand) {
    if (["J","Q","K"].includes(c.value)) total += 10;
    else if (c.value === "A") {
      total += 11;
      aces++;
    } else total += parseInt(c.value);
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

function renderHand(elementId, hand, hideSecond = false) {
  const el = document.getElementById(elementId);
  el.innerHTML = "";

  hand.forEach((card, index) => {
    if (hideSecond && index === 1) {
      const back = document.createElement("div");
      back.className = "card";
      back.style.background = "#1a3d8f";
      el.appendChild(back);
      return;
    }

    const div = document.createElement("div");
    div.className = "card";
    if (card.suit === "♥" || card.suit === "♦") div.classList.add("red");

    div.innerHTML = `
      <div class="top">${card.value}${card.suit}</div>
      <div class="center">${card.suit}</div>
      <div class="bottom">${card.value}${card.suit}</div>
    `;

    el.appendChild(div);
  });
}

function render() {
  renderHand("player-cards", playerHand);
  renderHand("dealer-cards", dealerHand, dealerHidden);

  document.getElementById("player-score").innerText =
    "Score: " + handValue(playerHand);

  document.getElementById("dealer-score").innerText =
    dealerHidden ? "" : "Score: " + handValue(dealerHand);

  document.getElementById("chips").innerText = chips;
}

function endGame(message, win = false) {
  gameOver = true;
  dealerHidden = false;

  stats.handsPlayed++;
  if (win) stats.handsWon++;

  saveStats();
  updateStatsUI();

  document.getElementById("message").innerText = message;
  render();
}

function startHand() {
  gameOver = false;
  dealerHidden = true;

  createDeck();
  shuffle();

  playerHand = [deal(), deal()];
  dealerHand = [deal(), deal()];

  document.getElementById("message").innerText = "";

  const p = handValue(playerHand);
  const d = handValue(dealerHand);

  render();

  if (p === 21 && d !== 21) {
    stats.userBJ++;
    endGame("Blackjack! You win!", true);
  } else if (d === 21 && p !== 21) {
    stats.dealerBJ++;
    endGame("Dealer blackjack.");
  } else if (d === 21 && p === 21) {
    endGame("Push.");
  }
}

document.getElementById("hit").onclick = () => {
  if (gameOver) return;

  playerHand.push(deal());
  render();

  if (handValue(playerHand) > 21) {
    endGame("Bust.");
  }
};

document.getElementById("stand").onclick = () => {
  if (gameOver) return;

  dealerHidden = false;

  while (handValue(dealerHand) < 17) {
    dealerHand.push(deal());
  }

  const p = handValue(playerHand);
  const d = handValue(dealerHand);

  if (d > 21 || p > d) endGame("You win!", true);
  else if (p < d) endGame("Dealer wins.");
  else endGame("Push.");
};

document.getElementById("new").onclick = startHand;

document.getElementById("stats-btn").onclick = () => {
  updateStatsUI();
  document.getElementById("stats-modal").classList.remove("hidden");
};

document.getElementById("close-stats").onclick = () => {
  document.getElementById("stats-modal").classList.add("hidden");
};

startHand();
