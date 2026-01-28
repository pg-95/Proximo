// =======================
// GLOBAL STATE
// =======================
let deck = [];
let playerHand = [];
let dealerHand = [];

let gameOver = false;
let dealerHidden = true;

// =======================
// DECK LOGIC
// =======================
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

// =======================
// HAND VALUE
// =======================
function handValue(hand) {
  let total = 0;
  let aces = 0;

  for (let c of hand) {
    if (["J","Q","K"].includes(c.value)) total += 10;
    else if (c.value === "A") {
      total += 11;
      aces++;
    } else {
      total += parseInt(c.value);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

// =======================
// CARD RENDERING
// =======================
function renderHand(elementId, hand, hideSecond = false) {
  const container = document.getElementById(elementId);
  container.innerHTML = "";

  hand.forEach((card, index) => {
    if (hideSecond && index === 1) {
      const back = document.createElement("div");
      back.className = "card";
      back.style.background = "#1a3d8f";
      container.appendChild(back);
      return;
    }

    const div = document.createElement("div");
    div.className = "card";

    if (card.suit === "♥" || card.suit === "♦") {
      div.classList.add("red");
    }

    div.innerHTML = `
      <div class="top">${card.value}${card.suit}</div>
      <div class="center">${card.suit}</div>
      <div class="bottom">${card.value}${card.suit}</div>
    `;

    container.appendChild(div);
  });
}

// =======================
// RENDER TABLE
// =======================
function render() {
  renderHand("player-cards", playerHand);
  renderHand("dealer-cards", dealerHand, dealerHidden);

  document.getElementById("player-score").innerText =
    "Score: " + handValue(playerHand);

  document.getElementById("dealer-score").innerText =
    dealerHidden ? "" : "Score: " + handValue(dealerHand);
}

// =======================
// GAME FLOW
// =======================
function endGame(message) {
  gameOver = true;
  dealerHidden = false;
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

  const playerTotal = handValue(playerHand);
  const dealerTotal = handValue(dealerHand);

  render();

  // Blackjack detection
  if (playerTotal === 21 && dealerTotal !== 21) {
    endGame("Blackjack! You win!");
  } else if (dealerTotal === 21 && playerTotal !== 21) {
    endGame("Dealer blackjack.");
  } else if (dealerTotal === 21 && playerTotal === 21) {
    endGame("Push.");
  }
}

// =======================
// BUTTON HANDLERS
// =======================
document.getElementById("hit").onclick = () => {
  if (gameOver) return;

  playerHand.push(deal());
  render();

  if (handValue(playerHand) > 21) {
    endGame("Bust!");
  }
};

document.getElementById("stand").onclick = (
