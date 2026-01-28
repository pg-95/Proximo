let deck = [];
let playerHand = [];
let dealerHand = [];

let chips = 1000;
let wins = 0;
let losses = 0;
const bet = 50;

function updateStats() {
  document.getElementById("chips").innerText = chips;
  document.getElementById("wins").innerText = wins;
  document.getElementById("losses").innerText = losses;
}

function createDeck() {
  const suits = ["♠","♥","♦","♣"];
  const values = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  deck = [];

  for (let s of suits) {
    for (let v of values) {
      deck.push({value:v, suit:s});
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
  let value = 0;
  let aces = 0;

  for (let c of hand) {
    if (["J","Q","K"].includes(c.value)) value += 10;
    else if (c.value === "A") { value += 11; aces++; }
    else value += parseInt(c.value);
  }

  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return value;
}

function render() {
  document.getElementById("player-cards").innerText =
    playerHand.map(c => c.value + c.suit).join(" ");

  document.getElementById("dealer-cards").innerText =
    dealerHand.map(c => c.value + c.suit).join(" ");

  document.getElementById("player-score").innerText =
    "Score: " + handValue(playerHand);

  document.getElementById("dealer-score").innerText =
    "Score: " + handValue(dealerHand);

  updateStats();
}

function startHand() {
  if (chips < bet) {
    document.getElementById("message").innerText = "Out of chips!";
    return;
  }

  createDeck();
  shuffle();

  playerHand = [deal(), deal()];
  dealerHand = [deal(), deal()];
  document.getElementById("message").innerText = "";

  render();
}

document.getElementById("hit").onclick = () => {
  playerHand.push(deal());
  render();

  if (handValue(playerHand) > 21) {
    losses++;
    chips -= bet;
    document.getElementById("message").innerText = "Bust!";
  }
};

document.getElementById("stand").onclick = () => {
  while (handValue(dealerHand) < 17) {
    dealerHand.push(deal());
  }

  const p = handValue(playerHand);
  const d = handValue(dealerHand);

  if (d > 21 || p > d) {
    wins++;
    chips += bet;
    document.getElementById("message").innerText = "You win!";
  } else if (p < d) {
    losses++;
    chips -= bet;
    document.getElementById("message").innerText = "Dealer wins.";
  } else {
    document.getElementById("message").innerText = "Push.";
  }

  render();
};

document.getElementById("new").onclick = startHand;

startHand();
