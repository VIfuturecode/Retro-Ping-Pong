// Game constants
const GAME_STATES = {
    MENU: 0,
    PLAYING: 1,
    GAME_OVER: 2
  };
  // Get DOM elements (deferred until DOM is loaded)
  let canvas, ctx, startMessage, player1ScoreElement, player2ScoreElement, restartButton, soundToggle;
  let soundEnabled = true;
  let audioContext;
  
  function initDomElements() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    startMessage = document.getElementById('start-message');
    player1ScoreElement = document.getElementById('player1-score');
    player2ScoreElement = document.getElementById('player2-score');
    restartButton = document.getElementById('restart-button');
    soundToggle = document.getElementById('sound-toggle');
  }
  // Game variables
  let gameState = GAME_STATES.MENU;
  let lastTime = 0;
  let player1Score = 0;
  let player2Score = 0;
  let winner = null;
  // Get the CSS variables to maintain visual consistency
  const getCssVar = (varName) => {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  };
  // Game colors - initialized properly after DOM load
  const colors = {
    background: 'rgba(0, 30, 60, 0.4)',
    net: '',
    ball: '',
    paddle1: '',
    paddle2: ''
  };
  // Game objects
  const ball = {
    x: 0,
    y: 0,
    radius: 12.5,
    speedX: 400,
    speedY: 400,
    reset: function() {
      if (!canvas) return; // Skip if canvas isn't initialized yet
      
      this.x = canvas.width / 2;
      this.y = canvas.height / 2;
      // Random direction
      this.speedX = (Math.random() > 0.5 ? 1 : -1) * 400;
      this.speedY = (Math.random() * 2 - 1) * 400;
    }
  };
  const paddle1 = {
    x: 0,
    y: 0,
    width: 20,
    height: 120,
    speed: 0,
    score: 0
  };
  const paddle2 = {
    x: 0,
    y: 0,
    width: 20,
    height: 120,
    speed: 0,
    score: 0
  };
  // Sound functions
  function initAudio() {
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log("Audio initialized");
      } catch (e) {
        console.error("Could not initialize audio context:", e);
      }
    }
  }
  
  function playSound(frequency, type, duration) {
    if (!audioContext || !soundEnabled) return;
    
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = type || 'sine';
      oscillator.frequency.value = frequency;
      gainNode.gain.value = 0.3;
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      setTimeout(() => oscillator.stop(), duration * 1000);
    } catch (e) {
      console.error("Error playing sound:", e);
    }
  }
  
  function playPaddleHitSound() {
    playSound(600, 'sine', 0.1); // Higher pitch for paddle hit
  }
  
  function playWallHitSound() {
    playSound(300, 'square', 0.08); // Lower pitch for wall bounce
  }
  
  function playScoreSound() {
    playSound(400, 'sine', 0.3); // Medium pitch, longer duration for score
  }
  
  function toggleSound() {
    soundEnabled = !soundEnabled;
    
    if (soundToggle) {
      if (soundEnabled) {
        soundToggle.textContent = "Ääni: Päällä";
        soundToggle.classList.remove("sound-off");
        soundToggle.classList.add("sound-on");
        
        // Initialize audio on first enable
        if (!audioContext) initAudio();
      } else {
        soundToggle.textContent = "Ääni: Pois";
        soundToggle.classList.remove("sound-on");
        soundToggle.classList.add("sound-off");
      }
    }
  }

  // Input handling
  let keys = {};
  window.addEventListener('keydown', function(e) {
    keys[e.code] = true;
    
    // Start the game when space is pressed
    if (e.code === 'Space' && gameState === GAME_STATES.MENU) {
      gameState = GAME_STATES.PLAYING;
      resetGame();
      startMessage.style.display = 'none';
      
      // Initialize audio when game starts
      if (soundEnabled) initAudio();
    }
    
    // Restart game after game over
    if (e.code === 'Space' && gameState === GAME_STATES.GAME_OVER) {
      gameState = GAME_STATES.PLAYING;
      player1Score = 0;
      player2Score = 0;
      updateScoreDisplay();
      resetGame();
      startMessage.style.display = 'none';
    }
  });
  window.addEventListener('keyup', function(e) {
    keys[e.code] = false;
  });
  // Initialize game
  function init() {
    // Initialize DOM references
    initDomElements();
    
    // Initialize game colors
    colors.net = getCssVar('--yellow');
    colors.ball = getCssVar('--yellow');
    colors.paddle1 = getCssVar('--pink');
    colors.paddle2 = getCssVar('--green-seafoam');
    
    // Set canvas size to match container
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initial positions
    resetGame();
    
    // Add event listeners for buttons
    if (restartButton) {
      restartButton.addEventListener('click', function() {
        // Reset scores and game state
        player1Score = 0;
        player2Score = 0;
        updateScoreDisplay();
        
        // If in game over state, change to playing
        if (gameState === GAME_STATES.GAME_OVER) {
          gameState = GAME_STATES.PLAYING;
        }
        // If in menu state, start the game
        else if (gameState === GAME_STATES.MENU) {
          gameState = GAME_STATES.PLAYING;
          startMessage.style.display = 'none';
        }
        
        // Reset ball and paddles
        resetGame();
        
        // Initialize audio if it's enabled
        if (soundEnabled && !audioContext) initAudio();
      });
    }
    
    if (soundToggle) {
      soundToggle.addEventListener('click', toggleSound);
    }
    
    // Start game loop
    requestAnimationFrame(gameLoop);
  }
  
  function resizeCanvas() {
    if (!canvas) return; // Skip if canvas isn't initialized yet
    
    const container = canvas.parentElement;
    if (!container) return; // Skip if container isn't available
    
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Adjust paddle positions after resize
    paddle1.x = 20;
    paddle2.x = canvas.width - paddle2.width - 20;
    
    // Scale paddle size based on court height
    const paddleHeightRatio = 0.25; // Paddle height as percentage of court height
    paddle1.height = canvas.height * paddleHeightRatio;
    paddle2.height = canvas.height * paddleHeightRatio;
    
    // Center paddles vertically
    paddle1.y = (canvas.height - paddle1.height) / 2;
    paddle2.y = (canvas.height - paddle2.height) / 2;
  }
  function resetGame() {
    // Reset scores if starting a new game
    if (gameState === GAME_STATES.MENU) {
      player1Score = 0;
      player2Score = 0;
      updateScoreDisplay();
    }
    
    // Reset ball position
    ball.reset();
    
    // Reset paddle positions
    paddle1.y = (canvas.height - paddle1.height) / 2;
    paddle2.y = (canvas.height - paddle2.height) / 2;
  }
  function updateScoreDisplay() {
    if (player1ScoreElement) player1ScoreElement.textContent = player1Score;
    if (player2ScoreElement) player2ScoreElement.textContent = player2Score;
  }
  // Main game loop
  function gameLoop(timestamp) {
    // Skip if canvas or context isn't initialized yet
    if (!canvas || !ctx) {
      requestAnimationFrame(gameLoop);
      return;
    }
    
    // Calculate delta time
    if (!lastTime) lastTime = timestamp;
    const deltaTime = (timestamp - lastTime) / 1000; // Convert to seconds
    lastTime = timestamp;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    drawBackground();
    
    // Draw game objects
    drawNet();
    drawBall();
    drawPaddle(paddle1, colors.paddle1);
    drawPaddle(paddle2, colors.paddle2);
    
    // Update game state
    if (gameState === GAME_STATES.PLAYING) {
      update(deltaTime);
    } else if (gameState === GAME_STATES.GAME_OVER) {
      drawGameOver();
    }
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
  }
  function update(deltaTime) {
    // Update paddle positions based on input
    updatePaddles(deltaTime);
    
    // Update ball position
    updateBall(deltaTime);
    
    // Check for game over
    if (player1Score >= 10 || player2Score >= 10) {
      gameState = GAME_STATES.GAME_OVER;
      winner = player1Score >= 10 ? 1 : 2;
      startMessage.textContent = `Pelaaja ${winner} voitti! Paina välilyöntiä pelataksesi uudelleen`;
      startMessage.style.display = 'block';
    }
  }
  function updatePaddles(deltaTime) {
    // Player 1 controls (W, S)
    if (keys['KeyW']) {
      paddle1.y -= 500 * deltaTime; // Speed in pixels per second
    }
    if (keys['KeyS']) {
      paddle1.y += 500 * deltaTime;
    }
    
    // Player 2 controls (Up, Down)
    if (keys['ArrowUp']) {
      paddle2.y -= 500 * deltaTime;
    }
    if (keys['ArrowDown']) {
      paddle2.y += 500 * deltaTime;
    }
    
    // Keep paddles within bounds
    paddle1.y = Math.max(0, Math.min(canvas.height - paddle1.height, paddle1.y));
    paddle2.y = Math.max(0, Math.min(canvas.height - paddle2.height, paddle2.y));
  }
  function updateBall(deltaTime) {
    // Move the ball
    ball.x += ball.speedX * deltaTime;
    ball.y += ball.speedY * deltaTime;
    
    // Bounce off top and bottom walls
    if (ball.y - ball.radius < 0) {
      ball.y = ball.radius;
      ball.speedY = -ball.speedY;
      playWallHitSound();
    } else if (ball.y + ball.radius > canvas.height) {
      ball.y = canvas.height - ball.radius;
      ball.speedY = -ball.speedY;
      playWallHitSound();
    }
    
    // Check for paddle collisions
    checkPaddleCollisions();
    
    // Check for scoring
    if (ball.x - ball.radius < 0) {
      // Player 2 scores
      player2Score++;
      updateScoreDisplay();
      playScoreSound();
      ball.reset();
    } else if (ball.x + ball.radius > canvas.width) {
      // Player 1 scores
      player1Score++;
      updateScoreDisplay();
      playScoreSound();
      ball.reset();
    }
  }
  function checkPaddleCollisions() {
    // Left paddle (Player 1)
    if (
      ball.x - ball.radius < paddle1.x + paddle1.width &&
      ball.y > paddle1.y &&
      ball.y < paddle1.y + paddle1.height &&
      ball.speedX < 0
    ) {
      ball.x = paddle1.x + paddle1.width + ball.radius;
      ball.speedX = -ball.speedX;
      
      // Play sound
      playPaddleHitSound();
      
      // Calculate bounce angle based on where the ball hit the paddle
      const hitPosition = (ball.y - paddle1.y) / paddle1.height;
      ball.speedY = (hitPosition - 0.5) * 2 * 600; // Max vertical speed
    }
    
    // Right paddle (Player 2)
    if (
      ball.x + ball.radius > paddle2.x &&
      ball.y > paddle2.y &&
      ball.y < paddle2.y + paddle2.height &&
      ball.speedX > 0
    ) {
      ball.x = paddle2.x - ball.radius;
      ball.speedX = -ball.speedX;
      
      // Play sound
      playPaddleHitSound();
      
      // Calculate bounce angle based on where the ball hit the paddle
      const hitPosition = (ball.y - paddle2.y) / paddle2.height;
      ball.speedY = (hitPosition - 0.5) * 2 * 600; // Max vertical speed
    }
  }
  // Drawing functions
  function drawBackground() {
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  function drawNet() {
    const netWidth = 4;
    const netGap = 20;
    const netX = canvas.width / 2 - netWidth / 2;
    
    ctx.fillStyle = colors.net;
    
    // Draw dashed line
    for (let y = 0; y < canvas.height; y += netGap * 2) {
      ctx.fillRect(netX, y, netWidth, netGap);
    }
  }
  function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = colors.ball;
    ctx.fill();
    ctx.closePath();
    
    // Add glow effect
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.shadowColor = colors.ball;
    ctx.shadowBlur = 15;
    ctx.fillStyle = 'rgba(255, 221, 0, 0.5)';
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
  }
  function drawPaddle(paddle, color) {
    ctx.fillStyle = color;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    
    // Add glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.shadowBlur = 0;
  }
  function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = '30px "Courier New", monospace';
    ctx.fillStyle = colors.ball;
    ctx.textAlign = 'center';
    ctx.fillText(`Pelaaja ${winner} voitti!`, canvas.width / 2, canvas.height / 2 - 20);
    
    ctx.font = '20px "Courier New", monospace';
    ctx.fillText('Paina välilyöntiä pelataksesi uudelleen', canvas.width / 2, canvas.height / 2 + 20);
  }
  // Initialize game when DOM is loaded
  window.addEventListener('DOMContentLoaded', init);