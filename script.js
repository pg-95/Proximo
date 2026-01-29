class BlackjackGame {
    constructor() {
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.playerScore = 0;
        this.dealerScore = 0;
        this.balance = 1000;
        this.currentBet = 0;
        this.gameInProgress = false;
        this.dealerHidden = true;
        
        this.suits = ['♠', '♥', '♦', '♣'];
        this.values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        this.initializeGame();
        this.setupEventListeners();
    }
    
    initializeGame() {
        this.updateDisplay();
    }
    
    setupEventListeners() {
        // Betting controls
        document.getElementById('bet-5').addEventListener('click', () => this.placeBet(5));
        document.getElementById('bet-10').addEventListener('click', () => this.placeBet(10));
        document.getElementById('bet-25').addEventListener('click', () => this.placeBet(25));
        document.getElementById('bet-50').addEventListener('click', () => this.placeBet(50));
        document.getElementById('clear-bet').addEventListener('click', () => this.clearBet());
        
        // Game controls
        document.getElementById('deal').addEventListener('click', () => this.dealCards());
        document.getElementById('hit').addEventListener('click', () => this.hit());
        document.getElementById('stand').addEventListener('click', () => this.stand());
        document.getElementById('double-down').addEventListener('click', () => this.doubleDown());
    }
    
    createDeck() {
        this.deck = [];
        for (let suit of this.suits) {
            for (let value of this.values) {
                this.deck.push({
                    suit: suit,
                    value: value,
                    numericValue: this.getCardValue(value)
                });
            }
        }
        this.shuffleDeck();
    }
    
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }
    
    getCardValue(value) {
        if (value === 'A') return 11;
        if (['J', 'Q', 'K'].includes(value)) return 10;
        return parseInt(value);
    }
    
    calculateScore(hand) {
        let score = 0;
        let aces = 0;
        
        for (let card of hand) {
            score += card.numericValue;
            if (card.value === 'A') aces++;
        }
        
        // Adjust for Aces
        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }
        
        return score;
    }
    
    placeBet(amount) {
        if (this.gameInProgress) return;
        if (this.balance >= amount) {
            this.currentBet += amount;
            this.balance -= amount;
            this.updateDisplay();
        }
    }
    
    clearBet() {
        if (this.gameInProgress) return;
        this.balance += this.currentBet;
        this.currentBet = 0;
        this.updateDisplay();
    }
    
    dealCards() {
        if (this.currentBet === 0) {
            this.showStatus('Please place a bet first!');
            return;
        }
        
        this.createDeck();
        this.playerHand = [];
        this.dealerHand = [];
        this.gameInProgress = true;
        this.dealerHidden = true;
        
        // Deal initial cards
        this.playerHand.push(this.deck.pop());
        this.dealerHand.push(this.deck.pop());
        this.playerHand.push(this.deck.pop());
        this.dealerHand.push(this.deck.pop());
        
        this.playerScore = this.calculateScore(this.playerHand);
        this.dealerScore = this.calculateScore(this.dealerHand);
        
        this.updateDisplay();
        
        // Check for blackjack
        if (this.playerScore === 21) {
            if (this.dealerScore === 21) {
                this.endGame('push');
            } else {
                this.endGame('blackjack');
            }
        } else {
            this.enableGameControls();
        }
    }
    
    hit() {
        if (!this.gameInProgress) return;
        
        this.playerHand.push(this.deck.pop());
        this.playerScore = this.calculateScore(this.playerHand);
        this.updateDisplay();
        
        if (this.playerScore > 21) {
            this.endGame('bust');
        } else if (this.playerScore === 21) {
            this.stand();
        }
    }
    
    stand() {
        if (!this.gameInProgress) return;
        
        this.dealerHidden = false;
        this.disableGameControls();
        
        // Dealer plays
        this.dealerPlay();
    }
    
    doubleDown() {
        if (!this.gameInProgress || this.playerHand.length !== 2) return;
        if (this.balance < this.currentBet) {
            this.showStatus('Insufficient balance to double down!');
            return;
        }
        
        this.balance -= this.currentBet;
        this.currentBet *= 2;
        this.updateDisplay();
        
        // Hit once and stand
        this.playerHand.push(this.deck.pop());
        this.playerScore = this.calculateScore(this.playerHand);
        this.updateDisplay();
        
        if (this.playerScore > 21) {
            this.endGame('bust');
        } else {
            this.stand();
        }
    }
    
    dealerPlay() {
        const dealerPlayStep = () => {
            this.dealerScore = this.calculateScore(this.dealerHand);
            this.updateDisplay();
            
            if (this.dealerScore < 17) {
                setTimeout(() => {
                    this.dealerHand.push(this.deck.pop());
                    dealerPlayStep();
                }, 1000);
            } else {
                this.determineWinner();
            }
        };
        
        dealerPlayStep();
    }
    
    determineWinner() {
        if (this.dealerScore > 21) {
            this.endGame('win');
        } else if (this.dealerScore > this.playerScore) {
            this.endGame('lose');
        } else if (this.playerScore > this.dealerScore) {
            this.endGame('win');
        } else {
            this.endGame('push');
        }
    }
    
    endGame(result) {
        this.gameInProgress = false;
        this.dealerHidden = false;
        this.disableGameControls();
        
        let winnings = 0;
        let message = '';
        
        switch (result) {
            case 'win':
                winnings = this.currentBet * 2;
                message = 'You Win! 🎉';
                break;
            case 'blackjack':
                winnings = this.currentBet * 2.5;
                message = 'Blackjack! 🃏';
                break;
            case 'lose':
                winnings = 0;
                message = 'You Lose! 😞';
                break;
            case 'bust':
                winnings = 0;
                message = 'Bust! You went over 21! 💥';
                break;
            case 'push':
                winnings = this.currentBet;
                message = 'Push! It\'s a tie! 🤝';
                break;
        }
        
        this.balance += winnings;
        this.currentBet = 0;
        this.updateDisplay();
        this.showStatus(message, result);
    }
    
    createCardElement(card, isHidden = false) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        
        if (isHidden) {
            cardElement.className += ' back';
            cardElement.innerHTML = 'CARD<br>BACK';
        } else {
            if (card.suit === '♥' || card.suit === '♦') {
                cardElement.className += ' red';
            }
            
            cardElement.innerHTML = `
                <div class="card-top">${card.value}<br>${card.suit}</div>
                <div class="card-bottom">${card.value}<br>${card.suit}</div>
            `;
        }
        
        return cardElement;
    }
    
    updateDisplay() {
        // Update balance and bet
        document.getElementById('balance').textContent = this.balance;
        document.getElementById('current-bet').textContent = this.currentBet;
        
        // Update player cards and score
        const playerCardsContainer = document.getElementById('player-cards');
        playerCardsContainer.innerHTML = '';
        this.playerHand.forEach(card => {
            playerCardsContainer.appendChild(this.createCardElement(card));
        });
        document.getElementById('player-score').textContent = 
            this.playerHand.length > 0 ? `(${this.playerScore})` : '';
        
        // Update dealer cards and score
        const dealerCardsContainer = document.getElementById('dealer-cards');
        dealerCardsContainer.innerHTML = '';
        this.dealerHand.forEach((card, index) => {
            const isHidden = index === 0 && this.dealerHidden && this.gameInProgress;
            dealerCardsContainer.appendChild(this.createCardElement(card, isHidden));
        });
        
        if (this.dealerHand.length > 0) {
            if (this.dealerHidden && this.gameInProgress) {
                document.getElementById('dealer-score').textContent = `(??)`;
            } else {
                document.getElementById('dealer-score').textContent = `(${this.dealerScore})`;
            }
        } else {
            document.getElementById('dealer-score').textContent = '';
        }
        
        // Update button states
        this.updateButtonStates();
    }
    
    updateButtonStates() {
        const dealBtn = document.getElementById('deal');
        const hitBtn = document.getElementById('hit');
        const standBtn = document.getElementById('stand');
        const doubleBtn = document.getElementById('double-down');
        
        dealBtn.disabled = this.gameInProgress;
        hitBtn.disabled = !this.gameInProgress;
        standBtn.disabled = !this.gameInProgress;
        doubleBtn.disabled = !this.gameInProgress || this.playerHand.length !== 2 || this.balance < this.currentBet;
        
        // Betting buttons
        const bettingButtons = document.querySelectorAll('.bet-btn');
        bettingButtons.forEach(btn => {
            btn.disabled = this.gameInProgress;
        });
    }
    
    enableGameControls() {
        document.getElementById('hit').disabled = false;
        document.getElementById('stand').disabled = false;
        document.getElementById('double-down').disabled = 
            this.playerHand.length !== 2 || this.balance < this.currentBet;
    }
    
    disableGameControls() {
        document.getElementById('hit').disabled = true;
        document.getElementById('stand').disabled = true;
        document.getElementById('double-down').disabled = true;
    }
    
    showStatus(message, type = '') {
        const statusElement = document.getElementById('game-status');
        statusElement.textContent = message;
        statusElement.className = `game-status ${type}`;
        
        if (type) {
            setTimeout(() => {
                statusElement.className = 'game-status';
                statusElement.textContent = '';
            }, 3000);
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new BlackjackGame();
});
