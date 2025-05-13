// Pelin vakiot
const GAME_STATES = {
    MENU: 0,
    PLAYING: 1,
    GAME_OVER: 2
  };
  // Haetaan DOM-elementit (viivästetty)
  let canvas, ctx, startMessage, player1ScoreElement, player2ScoreElement, restartButton, soundToggle;
  let soundEnabled = true;
  let audioContext;
  
  function initDomElements() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
      console.error('Canvas-elementtia ei löydy');
      return false;
    }
    
    ctx = canvas.getContext('2d');
    startMessage = document.getElementById('start-message');
    player1ScoreElement = document.getElementById('player1-score');
    player2ScoreElement = document.getElementById('player2-score');
    restartButton = document.getElementById('restart-button');
    soundToggle = document.getElementById('sound-toggle');
    
    console.log('DOM-elementit alustettu:', {
      canvas: !!canvas,
      context: !!ctx,
      startMessage: !!startMessage,
      player1Score: !!player1ScoreElement,
      player2Score: !!player2ScoreElement,
      restartButton: !!restartButton,
      soundToggle: !!soundToggle
    });
    
    return true;
  }
  // Pelin muutujat
  let gameState = GAME_STATES.MENU;
  let lastTime = 0;
  let player1Score = 0;
  let player2Score = 0;
  let winner = null;
  // Haetaan CSS-muutujat visuaalisen yhtenäisyyden ylläpitämiseksi
  const getCssVar = (varName) => {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  };
  // Pelin värit - alustetaan kunnolla DOM-latauksen jälkeen
  const colors = {
    background: 'rgba(0, 30, 60, 0.4)',
    net: '',
    ball: '',
    paddle1: '',
    paddle2: ''
  };
  // Pelin objektit
  const ball = {
    x: 0,
    y: 0,
    radius: 12.5,
    speedX: 400,
    speedY: 400,
    reset: function() {
      if (!canvas) {
        console.error('Ei voi resetoida palloa: canvas ei ole alustettu');
        return; // Ohitetaan, jos Canvas ei ole alustettu
      }
      
      this.x = canvas.width / 2;
      this.y = canvas.height / 2;
      // Satunnainen suunta
      this.speedX = (Math.random() > 0.5 ? 1 : -1) * 400;
      this.speedY = (Math.random() * 2 - 1) * 400;
      console.log('Pallon palautus asentoon:', this.x, this.y);
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
  // Äänitoiminnot
  function initAudio() {
    if (!audioContext) {
      try {
        console.log("Alustetaan äänikontekstia");
        // Äänikontekstin alustaminen selainkäytöjen mukaiseksi 
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Jatka äänikontekstia, jos se on keskeytetyssä tilassa(yleistä joissakin selaimissa)
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            console.log("Äänikontekstia jatkettiin onnistuneesti");
          }).catch(err => {
            console.error("Äänikontekstin jatkaminen epäonnistui:", err);
          });
        }
        
        console.log("Äänen alustus onnistui, tila:", audioContext.state);
      } catch (e) {
        console.error("Äänikontekstia ei voitu alustaa:", e);
      }
    } else {
      console.log("Äänikonteksti on jo olemassa:", audioContext.state);
    }
  }
  
  function playSound(frequency, type, duration) {
    if (!audioContext) {
      console.warn("Ääntä ei voi toistaa: äänikontekstia ei ole alustettu");
      return;
    }
    
    if (!soundEnabled) {
      console.log("Ääni pois käytöstä, ei toistu");
      return;
    }
    
    try {
      console.log(`Playing ${type} sound at ${frequency}Hz for ${duration}s`);
      
      // Jatka kontekstia tarvittaessa
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = type || 'sine';
      oscillator.frequency.value = frequency;
      gainNode.gain.value = 0.3;
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      setTimeout(() => {
        try {
          oscillator.stop();
        } catch (stopErr) {
          console.warn("Virhe pysäytettäessä oskillaattoria:", stopErr);
        }
      }, duration * 1000);
    } catch (e) {
      console.error("Virhe toistettaessa ääntä:", e);
    }
  }
  
  function playPaddleHitSound() {
    playSound(600, 'sine', 0.1); // Korkeampi sävelkorkeus melaiskulle
  }
  
  function playWallHitSound() {
    playSound(300, 'square', 0.08); // Alempi nousu seinän pomppimista varten
  }
  
  function playScoreSound() {
    playSound(400, 'sine', 0.3); // Keskitasoinen, pisteiden pidempi kesto
  }
  
  function toggleSound() {
    soundEnabled = !soundEnabled;
    
    if (soundToggle) {
      if (soundEnabled) {
        soundToggle.textContent = "Ääni: Päällä";
        soundToggle.classList.remove("sound-off");
        soundToggle.classList.add("sound-on");
        
        // Alusta ääni ensimmäisellä käyttöönotolla
        if (!audioContext) initAudio();
      } else {
        soundToggle.textContent = "Ääni: Pois";
        soundToggle.classList.remove("sound-on");
        soundToggle.classList.add("sound-off");
      }
    }
  }
  
  // Syötteen käsittely
  let keys = {};
  window.addEventListener('keydown', function(e) {
    keys[e.code] = true;
    
    // Aloita peli, kun välilyöntiä painetaam
    if (e.code === 'Space' && gameState === GAME_STATES.MENU) {
      gameState = GAME_STATES.PLAYING;
      resetGame();
      startMessage.style.display = 'none';
      
      // Alustetaan ääni, pelin alkaessa
      if (soundEnabled) initAudio();
    }
    
    // Aloita peli uudelleen pelin päätyttyä
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
  // Alusta peli
  function init() {
    console.log('Alustetaan peliä');
    
    // Alusta DOM-viittaukset
    if (!initDomElements()) {
      console.error('DOM-elementtien alustaminen epäonnistui, yritetään uudelleen 500ms kuluttua');
      setTimeout(init, 500);
      return;
    }
    
    // Alusta pelin värit
    try {
      colors.net = getCssVar('--yellow');
      colors.ball = getCssVar('--yellow');
      colors.paddle1 = getCssVar('--pink');
      colors.paddle2 = getCssVar('--green-seafoam');
      console.log('Pelin värit alustettu:', colors);
    } catch (e) {
      console.error('Värien alustus virhe:', e);
    }
    
    // Aseta canvas-koko vastamaan säiliötä
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Alkuasennot
    resetGame();
    
    // Lisää listeners painikkeille
    if (restartButton) {
      restartButton.addEventListener('click', function() {
        console.log('Restart painiketta klikkattu');
        // Nollaa pisteet ja pelin tila
        player1Score = 0;
        player2Score = 0;
        updateScoreDisplay();
        
        // Jos peli on päättynyt, vaihda pelitilaan
        if (gameState === GAME_STATES.GAME_OVER) {
          gameState = GAME_STATES.PLAYING;
        }
        // Jos ollaan valikossa, aloita peli
        else if (gameState === GAME_STATES.MENU) {
          gameState = GAME_STATES.PLAYING;
          if (startMessage) startMessage.style.display = 'none';
        }
        
        // Nollaa pallo ja mailat
        resetGame();
        
        // Alusta äänet, jos ne ovat käytössä
        if (soundEnabled && !audioContext) initAudio();
      });
    } else {
      console.warn('Restart-painiketta ei löydy');
    }
    
    if (soundToggle) {
      soundToggle.addEventListener('click', toggleSound);
    } else {
      console.warn('Ääni-painiketta ei löydy');
    }
    
    // Käynnistä pelisilmukka
    requestAnimationFrame(gameLoop);
    console.log('Pelin alustus valmis');
  }
  
  function resizeCanvas() {
    if (!canvas) {
      console.error('Ei voi muuttaa kokoa: Canvas ei ole alustettu');
      return; // Ohita jos canvas ei ole vielä alustettu
    }
    
    const container = canvas.parentElement;
    if (!container) {
      console.error('Ei voi muuttaa kokoa: Canvas-säiliötä ei löydy');
      return; // Ohita jos säiliötä ei ole saatavilla
    }
    
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    console.log('Canvas-koko muutettu', oldWidth, 'x', oldHeight, 'to', canvas.width, 'x', canvas.height);
    
    // Säädä mailojen sijainnit koon muutoksen jälkeen
    paddle1.x = 20;
    paddle2.x = canvas.width - paddle2.width - 20;
    
    // Skaala mailojen koko kentän korkeuden mukaan
    const paddleHeightRatio = 0.25; // Mailan korkeus prosentteina kentän korkeudesta
    paddle1.height = canvas.height * paddleHeightRatio;
    paddle2.height = canvas.height * paddleHeightRatio;
    
    // Keskitä mailat pystysuunnassa
    paddle1.y = (canvas.height - paddle1.height) / 2;
    paddle2.y = (canvas.height - paddle2.height) / 2;
    
    console.log('Mailojen sijainnit päivitetty. Vasen:', paddle1.x, paddle1.y, '| Oikea:', paddle2.x, paddle2.y);
  }
  function resetGame() {
    // Nollaa pisteet, jos aloitetaan uusi peli
    if (gameState === GAME_STATES.MENU) {
      player1Score = 0;
      player2Score = 0;
      updateScoreDisplay();
    }
    
    // Nollaa pallon sijainti
    ball.reset();
    
    // Nollaa mailojen sijainnit
    paddle1.y = (canvas.height - paddle1.height) / 2;
    paddle2.y = (canvas.height - paddle2.height) / 2;
  }
  function updateScoreDisplay() {
    if (player1ScoreElement) player1ScoreElement.textContent = player1Score;
    if (player2ScoreElement) player2ScoreElement.textContent = player2Score;
    console.log('Pistenäyttö päivitetty. Pelaaja 1:', player1Score, 'Pelaaja 2:', player2Score);
  }
  // Pääpelisilmukka
  function gameLoop(timestamp) {
    // Ohita jos canvas tai konteksti ei ole vielä alustettu
    if (!canvas || !ctx) {
      console.warn('Canvas tai konteksti ei ole saatavilla, ohitetaan ruutu');
      requestAnimationFrame(gameLoop);
      return;
    }
    
    // Laske aika-askel
    if (!lastTime) lastTime = timestamp;
    const deltaTime = (timestamp - lastTime) / 1000; // Muunna sekunneiksi
    lastTime = timestamp;
    
    try {
      // Tyhjennä canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Piirrä tausta
      drawBackground();
      
      // Piirrä peliobjektit
      drawNet();
      drawBall();
      drawPaddle(paddle1, colors.paddle1);
      drawPaddle(paddle2, colors.paddle2);
      
      // Päivitä pelitila
      if (gameState === GAME_STATES.PLAYING) {
        update(deltaTime);
      } else if (gameState === GAME_STATES.GAME_OVER) {
        drawGameOver();
      }
    } catch (error) {
      console.error('Virhe pelisilmukassa:', error);
    }
    
    // Jatka pelisilmukkaa
    requestAnimationFrame(gameLoop);
  }
  function update(deltaTime) {
    //  Päivitä mailojen sijainnit syötteiden perusteella
    updatePaddles(deltaTime);
    
    // Päivitä pallon sijainti
    updateBall(deltaTime);
    
    // Tarkista pelin loppuminen
    if (player1Score >= 10 || player2Score >= 10) {
      gameState = GAME_STATES.GAME_OVER;
      winner = player1Score >= 10 ? 1 : 2;
      startMessage.textContent = `Pelaaja ${winner} voitti! Paina välilyöntiä pelataksesi uudelleen`;
      startMessage.style.display = 'block';
    }
  }
  function updatePaddles(deltaTime) {
    // Pelaaja 1 ohjaus (W, S)
    if (keys['KeyW']) {
      paddle1.y -= 500 * deltaTime; // Nopeus pikseleinä sekunnissa
    }
    if (keys['KeyS']) {
      paddle1.y += 500 * deltaTime;
    }
    
    // Pelaaja 2 ohjaus (Ylös, Alas)
    if (keys['ArrowUp']) {
      paddle2.y -= 500 * deltaTime;
    }
    if (keys['ArrowDown']) {
      paddle2.y += 500 * deltaTime;
    }
    
    // Pidä mailat kentän sisällä
    paddle1.y = Math.max(0, Math.min(canvas.height - paddle1.height, paddle1.y));
    paddle2.y = Math.max(0, Math.min(canvas.height - paddle2.height, paddle2.y));
  }
  function updateBall(deltaTime) {
    // Liikuta palloa
    ball.x += ball.speedX * deltaTime;
    ball.y += ball.speedY * deltaTime;
    
    // Pomppia pois ylä- ja alaseinistä
    if (ball.y - ball.radius < 0) {
      ball.y = ball.radius;
      ball.speedY = -ball.speedY;
      playWallHitSound();
    } else if (ball.y + ball.radius > canvas.height) {
      ball.y = canvas.height - ball.radius;
      ball.speedY = -ball.speedY;
      playWallHitSound();
    }
    
    // Tarkista mailatörmäykset
    checkPaddleCollisions();
    
    // Tarkista pisteiden saanti
    if (ball.x - ball.radius < 0) {
      // Pelaaja 2 pisteet
      player2Score++;
      updateScoreDisplay();
      playScoreSound();
      ball.reset();
    } else if (ball.x + ball.radius > canvas.width) {
      // Pelaaja 1 pisteet
      player1Score++;
      updateScoreDisplay();
      playScoreSound();
      ball.reset();
    }
  }
  function checkPaddleCollisions() {
    // Vasen maila (Pelaaja 1)
    if (
      ball.x - ball.radius < paddle1.x + paddle1.width &&
      ball.y > paddle1.y &&
      ball.y < paddle1.y + paddle1.height &&
      ball.speedX < 0
    ) {
      ball.x = paddle1.x + paddle1.width + ball.radius;
      ball.speedX = -ball.speedX;
      
      // Soita ääni
      playPaddleHitSound();
      
      // Laske pomppukulma perustuen pallon osumakohtaan mailassa
      const hitPosition = (ball.y - paddle1.y) / paddle1.height;
      ball.speedY = (hitPosition - 0.5) * 2 * 600; // Maksimi pystysuuntainen nopeus
    }
    
    // Oikea maila (Pelaaja 2)
    if (
      ball.x + ball.radius > paddle2.x &&
      ball.y > paddle2.y &&
      ball.y < paddle2.y + paddle2.height &&
      ball.speedX > 0
    ) {
      ball.x = paddle2.x - ball.radius;
      ball.speedX = -ball.speedX;
      
      // Soita ääni
      playPaddleHitSound();
      
      // Laske pomppukulma perustuen pallon osumakohtaan mailassa
      const hitPosition = (ball.y - paddle2.y) / paddle2.height;
      ball.speedY = (hitPosition - 0.5) * 2 * 600; // Maksimi pystysuuntainen nopeus
    }
  }
  // Piirtofunktiot
  function drawBackground() {
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  function drawNet() {
    const netWidth = 4;
    const netGap = 20;
    const netX = canvas.width / 2 - netWidth / 2;
    
    ctx.fillStyle = colors.net;
    
    // Piirrä katkoviiva
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
    
    // Lisää hehkuefekti
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
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.shadowBlur = 0;
    
    // Lisää korostusefekti
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(paddle.x + 2, paddle.y + 2, paddle.width - 4, 10);
  }
  
  function drawGameOver() {
    // Piirrä puoliksi läpinäkyvä peite
    ctx.fillStyle = 'rgba(0, 30, 60, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Piirrä pelin lopputeksti
    ctx.fillStyle = colors.ball;
    ctx.shadowColor = colors.ball;
    ctx.shadowBlur = 15;
    ctx.font = '40px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Pelaaja ${winner} voitti!`, canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;
  }
  
  //  Alusta peli kun DOM on täysin ladattu
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded-tapahtuma käynnistetty, pelin alustus');
    init();
  });
  
  // Tee init-funktio globaalisti saatavilla, jotta sitä voidaan kutsua manuaalisesti tarvittaessa
  window.init = init;
  
  // Ylimääräinen tarkistus pelin alustamiseksi, vaikka DOMContentLoaded-tapahtuma olisi jo tapahtunut
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('Dokumentti oli jo ladattu kun skripti suoritettiin, alustetaan peli viiveellä');
    setTimeout(init, 100); // Pieni viive varmistamaan että DOM on täysin käsitelty
  }