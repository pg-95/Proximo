let deck = [];
let playerHand = [];
let dealerHand = [];

let gameOver = false;
let dealerHidden = true;

function createDeck() {
  const suits = ["♠","♥","♦","♣"];
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

function render() {
  document.getElementById("player-cards").innerText =
    playerHand.map(c => c.value + c.suit).join(" ");

  document.getElementById("dealer-cards").innerText =
    dealerHand.map((c, i) => {
      if (i === 1 && dealerHidden) return "🂠";
      return c.value + c.suit;
    }).join(" ");

  document.getElementById("player-score").innerText =
    "Score: " + handValue(playerHand);

  document.getElementById("dealer-score").innerText =
    dealerHidden ? "" : "Score: " + handValue(dealerHand);
}

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

  const playerTotal = handValue(playerHand);
  const dealerTotal = handValue(dealerHand);

  render();

  if (playerTotal === 21 && dealerTotal !== 21) {
    endGame("Blackjack! You win!");
  } else if (dealerTotal === 21 && playerTotal !== 21) {
    endGame("Dealer blackjack.");
  } else if (dealerTotal === 21 && playerTotal === 21) {
    endGame("Push.");
  }
}

document.getElementById("hit").onclick = () => {
  if (gameOver) return;

  playerHand.push(deal());
  render();

  if (handValue(playerHand) > 21) {
    endGame("Bust!");
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

  if (d > 21 || p > d) endGame("You win!");
  else if (p < d) endGame("Dealer wins.");
  else endGame("Push.");
};

document.getElementById("new").onclick = startHand;

startHand();
