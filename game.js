
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Yksinkertainen pelitilan hallinta
let gameState = "menu";
let player1Score = 0;
let player2Score = 0;
let winner = "";
let opponentType = "computer";

// Pelin vakiot
const paddleWidth = 25, 
paddleHeight = 130;
const ballRadius = 15;
const paddleSpeed = 25;
let ballSpeedMultiplier = 1; // Pallon nopeuden kerroin

// Pelimuuttujat
let paddle1Y, paddle2Y, ballX, ballY, ballSpeedX, ballSpeedY;
let upPressed = false, downPressed = false;
let wPressed = false, sPressed = false;

// Yksinkertainen äänijärjestelmä HTML5 Audio
const hitSound = new Audio("sounds/hit.mp3");
const scoreSound = new Audio("sounds/score2.mp3");
const winSound = new Audio("sounds/win.mp3");

// Äänivolyymin säätö
hitSound.volume = 0.5;
scoreSound.volume = 0.6;
winSound.volume = 0.7;

// Ääniefektit
function playHitSound() {
    if (!soundEnabled) return;
    hitSound.currentTime = 0; // Aloita alusta
    hitSound.play().catch(() => console.log("Ääni ei voi soittaa"));
}

function playScoreSound() {
    if (!soundEnabled) return;
    scoreSound.currentTime = 0; // Aloita alusta
    scoreSound.play().catch(() => console.log("Ääni ei voi soittaa"));
}

function playWinSound() {
    if (!soundEnabled) return;
    winSound.currentTime = 0; // Aloita alusta
    winSound.play().catch(() => console.log("Ääni ei voi soittaa"));
}

// Ääniasetukset ja napin käsittely (määritellään kerran globaalisti)
let soundEnabled = true; // Ääni oletuksena päällä

// Responsiivinen canvas
function resizeCanvas() {
    const court = document.querySelector('.court');
    if (court) {
        canvas.width = court.clientWidth;
        canvas.height = court.clientHeight;
    } else {
        canvas.width = 800;
        canvas.height = 400;
    }
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Pallon nollaus
function resetBall() {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * 15 * ballSpeedMultiplier;
    
    ballSpeedY = (Math.random() * 4 - 2);
}

// Pelin nollaus
function resetGame() {
    player1Score = 0;
    player2Score = 0;
    ballSpeedMultiplier = 1; // Nollaa nopeuskerroin
    paddle1Y = canvas.height / 2 - paddleHeight / 2;
    paddle2Y = canvas.height / 2 - paddleHeight / 2;
    resetBall();
    gameState = "playing";
    updateScoreDisplay();
}

// Pistenäytön päivitys
function updateScoreDisplay() {
    const player1ScoreEl = document.getElementById("player1-score");
    const player2ScoreEl = document.getElementById("player2-score");
    if (player1ScoreEl) player1ScoreEl.textContent = player1Score;
    if (player2ScoreEl) player2ScoreEl.textContent = player2Score;
}

// Piirtofunktiot
function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

function drawCircle(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

function drawText(text, x, y, size = "30px", color = "white") {
    ctx.fillStyle = color;
    ctx.font = `${size} 'Courier New', monospace`;
    ctx.textAlign = "center";
    ctx.fillText(text, x, y);
}

function drawNet() {
    for (let i = 0; i < canvas.height; i += 20) {
        drawRect(canvas.width / 2 - 1, i, 2, 10, "#90ee90");
    }
}

function drawMenu() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Tausta on läpinäkyvä jotta robottia näkyy
}

function drawGameOver() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const startMessage = document.getElementById("start-message");
    if (startMessage) {
        startMessage.style.display = "block";
        startMessage.classList.add("victory-message");
        startMessage.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 15px; text-shadow: 0 0 20px #ffdd00;">🏆 ${winner} 🏆</div>
            <div style="font-size: 2.5rem; margin-bottom: 20px; color: #ffdd00; text-shadow: 0 0 15px #ffdd00;">VOITTI!</div>
            <div style="font-size: 1.3rem; color: #00ffd0;">Paina ENTER uudelle pelille</div>
        `;
    }
}
        

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawNet();
    
    // Mailat CSS-väreillä
    drawRect(0, paddle1Y, paddleWidth, paddleHeight, "#ff69b4"); // Vaaleanpunainen
    drawRect(canvas.width - paddleWidth, paddle2Y, paddleWidth, paddleHeight, "#3ded97"); // Vihreä
    
    // Keltainen pallo
    drawCircle(ballX, ballY, ballRadius, "#ffdd00");
    
    // Pisteet
    drawText(player1Score, canvas.width / 4, 50, "30px", "#ff69b4");
    drawText(player2Score, canvas.width * 3 / 4, 50, "30px", "#3ded97");
}

// Pelin päälogiikka
function move() {
  // Pelaaja 1 (W/S) - Kiinteä mailan liike
  if (wPressed) {
      paddle1Y -= paddleSpeed;
      if (paddle1Y < 0) paddle1Y = 0;
  }
  if (sPressed) {
      paddle1Y += paddleSpeed;
      if (paddle1Y > canvas.height - paddleHeight) paddle1Y = canvas.height - paddleHeight;
  }

  // Pelaaja 2 tai tietokone - Kiinteä mailan liike
  if (opponentType === "human") {
      if (upPressed) {
          paddle2Y -= paddleSpeed;
          if (paddle2Y < 0) paddle2Y = 0;
      }
      if (downPressed) {
          paddle2Y += paddleSpeed;
          if (paddle2Y > canvas.height - paddleHeight) paddle2Y = canvas.height - paddleHeight;
      }
  } else {
      // PARANNETTU - säännöllinen liike
      const paddleCenter = paddle2Y + paddleHeight / 2;
      const ballCenter = ballY;
      const difficulty = 0.7; // Vaikeus 0-1 (0.7 = haastava mutta voitettava)
      
      // Ennakoi pallon liikettä
      let targetY = ballCenter;
      if (ballX > canvas.width / 2 && ballSpeedX > 0) {
          // Pallo tulee kohti tietokonetta, ennakoi
          const timeToReach = (canvas.width - paddleWidth - ballX) / ballSpeedX;
          targetY = ballY + (ballSpeedY * timeToReach);
      }
      
      const diff = targetY - paddleCenter;
      const moveSpeed = paddleSpeed * difficulty;
      
      // Tasainen liike ilman tärinää
      if (Math.abs(diff) > 10) {
          if (diff > 0) {
              paddle2Y += moveSpeed;
          } else {
              paddle2Y -= moveSpeed;
          }
      }
      
      paddle2Y = Math.max(0, Math.min(canvas.height - paddleHeight, paddle2Y));
  }
    // Pallon liike (NOPEUTUVA PALLO)
    ballX += ballSpeedX;
    ballY += ballSpeedY;

    // Seinätörmäykset
    if (ballY - ballRadius < 0 || ballY + ballRadius > canvas.height) {
        ballSpeedY = -ballSpeedY;
        playHitSound();
    }

    // Mailatörmäykset + NOPEUTTAMINEN
    if (
        ballX - ballRadius <= paddleWidth &&
        ballY >= paddle1Y &&
        ballY <= paddle1Y + paddleHeight &&
        ballSpeedX < 0
    ) {
        ballSpeedX = -ballSpeedX;
        
        // NOPEUDU JOKA TÖRMÄYKSESSÄ
        ballSpeedMultiplier += 0.1;
        ballSpeedX *= (1 + 0.05); // 5% nopeampi
        ballSpeedY *= (1 + 0.05);
        
        // Pomppukulma perusteella osumakohta mailassa
        const hitPosition = (ballY - paddle1Y) / paddleHeight;
        ballSpeedY += (hitPosition - 0.5) * 3;
        
        playHitSound();
    }

    if (
        ballX + ballRadius >= canvas.width - paddleWidth &&
        ballY >= paddle2Y &&
        ballY <= paddle2Y + paddleHeight &&
        ballSpeedX > 0
    ) {
        ballSpeedX = -ballSpeedX;
        
        // NOPEUDU JOKA TÖRMÄYKSESSÄ  
        ballSpeedMultiplier += 0.1;
        ballSpeedX *= (1 + 0.05); // 5% nopeampi
        ballSpeedY *= (1 + 0.05);
        
        // Pomppukulma
        const hitPosition = (ballY - paddle2Y) / paddleHeight;
        ballSpeedY += (hitPosition - 0.5) * 3;
        
        playHitSound();
    }

    // Pisteet
    if (ballX < 0) {
        player2Score++;
        updateScoreDisplay();
        playScoreSound();
        resetBall();
    }

    if (ballX > canvas.width) {
        player1Score++;
        updateScoreDisplay();
        playScoreSound();
        resetBall();
    }

    // Voitto 10 pisteeseen
    if (player1Score >= 10) {
        winner = "🏆 Pelaaja 1";
        playWinSound();
        gameState = "gameover";
    } else if (player2Score >= 10) {
        winner = opponentType === "human" ? "🏆 Pelaaja 2" : "🤖 Tietokone";
        playWinSound();
        gameState = "gameover";
    }
}

// Pelisilmukka
function gameLoop() {
    if (gameState === "menu") {
        drawMenu();
    } else if (gameState === "playing") {
        move();
        drawGame();
    } else if (gameState === "gameover") {
        drawGameOver();
    }
    requestAnimationFrame(gameLoop);
}

// Aloita peli
gameLoop();

// Näppäinkäsittely
document.addEventListener("keydown", (e) => {
    // ENTER aloittaa pelin
    if (e.key === "Enter") {
        if (gameState === "menu" || gameState === "gameover") {
            const select = document.getElementById("opponent-select");
            if (select) {
                opponentType = select.value;
                updateOpponentLabel();
            }
            resetGame();
            hideStartMessage();
        }
    }
    
    // Peliohjaimet
    if (e.key === "ArrowUp") upPressed = true;
    if (e.key === "ArrowDown") downPressed = true;
    if (e.key === "w" || e.key === "W") wPressed = true;
    if (e.key === "s" || e.key === "S") sPressed = true;
});

document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowUp") upPressed = false;
    if (e.key === "ArrowDown") downPressed = false;
    if (e.key === "w" || e.key === "W") wPressed = false;
    if (e.key === "s" || e.key === "S") sPressed = false;
});

// Funktiot HTML-elementeille
function hideStartMessage() {
    const startMessage = document.getElementById("start-message");
    if (startMessage) {
        startMessage.style.display = "none";
    }
}

function updateOpponentLabel() {
    const label = document.getElementById("player2-label");
    if (label) {
        label.textContent = opponentType === "computer" ? "🤖 Tietokone" : "👤 Pelaaja 2";
    }
}

function startGameIfReady() {
    const select = document.getElementById("opponent-select");
    if (select) {
        opponentType = select.value;
        updateOpponentLabel();
    }
    
    resetGame();
    hideStartMessage();
}

// KAIKKI PAINIKKEET TOIMIVAT
document.addEventListener("DOMContentLoaded", () => {
    console.log("🎮 Retro Ping Pong ladattu!");
    
    // Vastustajan valinta
    const opponentSelect = document.getElementById("opponent-select");
    if (opponentSelect) {
        opponentSelect.addEventListener("change", (e) => {
            opponentType = e.target.value;
            updateOpponentLabel();
            console.log(`Vastustaja vaihdettu: ${opponentType}`);
        });
    }
    
    // Äänipainikeet
    const soundToggle = document.getElementById("sound-toggle");
    if (soundToggle) {
        soundToggle.addEventListener("click", () => {
            soundEnabled = !soundEnabled;
            if (soundEnabled) {
                soundToggle.textContent = "🔊 Ääni: Päällä";
                soundToggle.classList.remove("sound-off");
                soundToggle.classList.add("sound-on");
            } else {
                soundToggle.textContent = "🔇 Ääni: Pois";
                soundToggle.classList.remove("sound-on");
                soundToggle.classList.add("sound-off");
            }
        });
    }
    
    // Uudelleenkäynnistys painike
    const restartButton = document.getElementById("restart-button");
    if (restartButton) {
        restartButton.addEventListener("click", () => {
            console.log("🔄 Peli käynnistetään uudelleen");
            gameState = "menu";
            const startMessage = document.getElementById("start-message");
            if (startMessage) {
                startMessage.style.display = "block";
                startMessage.innerHTML = "🎮 Valitse vastustaja ja paina ENTER<br>🏆 Peli päättyy 10 pisteeseen";
            }
            player1Score = 0;
            player2Score = 0;
            updateScoreDisplay();
        });
    }
    
    // Aloituspainike
    const startButton = document.getElementById("start-button");
    if (startButton) {
        startButton.addEventListener("click", () => {
            console.log("▶️ Peli aloitettu painikkeesta");
            startGameIfReady();
        });
    }
    
    // Kosketusohjaus canvasille
    canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if (gameState === "menu" || gameState === "gameover") {
            startGameIfReady();
        }
    });
    
    // Alusta peli
    resetBall();
    paddle1Y = canvas.height / 2 - paddleHeight / 2;
    paddle2Y = canvas.height / 2 - paddleHeight / 2;
    resizeCanvas();
    updateOpponentLabel();
    updateScoreDisplay();
    
    console.log("✅ Kaikki toiminnot alustettu!");
    console.log("🎯 Peli valmis pelattavaksi!");
});

console.log("🏓 Retro Ping Pong JavaScript ladattu onnistuneesti!");
console.log("🎮 Painikkeet: W/S (Pelaaja 1), ↑/↓ (Pelaaja 2)");
console.log("⚡ Pallo nopeutuu joka törmäyksessä!");
console.log("🤖 Tietokone toimii säännöllisesti!");
console.log("🎯 Peli päättyy 10 pisteeseen - Onnea matkaan!");

// Kosketustuki (mobiililaitteille)
canvas.addEventListener("touchstart", () => {
    if (gameState === "menu" || gameState === "gameover") {
        startGameIfReady();
    }
});

