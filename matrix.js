// matrix.js - draws a Matrix-style falling characters background
(function(){
  const canvas = document.getElementById('matrix');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Config
  const fontSize = 16; // can be tuned
  let cols = 0;
  let drops = [];

  // Characters (use a subset that looks good)
  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789@#$%&*';

  // Resize canvas to fill the window
  function resize(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cols = Math.floor(canvas.width / fontSize);
    drops = new Array(cols).fill(1);
  }

  // Draw one frame
  function draw(){
    // translucent black to create the fade trail
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00FF00';
    ctx.font = fontSize + 'px "Ubuntu Mono", monospace';

    for (let i = 0; i < drops.length; i++){
      const text = chars.charAt(Math.floor(Math.random() * chars.length));
      const x = i * fontSize;
      const y = drops[i] * fontSize;
      ctx.fillText(text, x, y);

      if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }

  let running = true;
  let rafId = null;

  function loop(){
    if (!running) {
      rafId = null;
      return;
    }
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function setRunning(val){
    if (val === running) return;
    running = val;

    // update both desktop and mobile toggle buttons if present
    const btnDesktop = document.getElementById('matrix-toggle');
    const btnMobile = document.getElementById('matrix-toggle-mobile');
    const text = running ? 'Pause Matrix' : 'Resume Matrix';
    if (btnDesktop) {
      btnDesktop.textContent = text;
      btnDesktop.setAttribute('aria-pressed', running ? 'true' : 'false');
    }
    if (btnMobile) {
      btnMobile.textContent = text;
      btnMobile.setAttribute('aria-pressed', running ? 'true' : 'false');
    }

    if (running) {
      if (!rafId) rafId = requestAnimationFrame(loop);
    } else {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }
  }

  window.addEventListener('resize', resize);
  resize();

  // Wire up toggle buttons if present (desktop + mobile)
  const toggleBtnDesktop = document.getElementById('matrix-toggle');
  const toggleBtnMobile = document.getElementById('matrix-toggle-mobile');
  if (toggleBtnDesktop) {
    toggleBtnDesktop.setAttribute('aria-pressed', 'true');
    toggleBtnDesktop.addEventListener('click', () => setRunning(!running));
  }
  if (toggleBtnMobile) {
    toggleBtnMobile.setAttribute('aria-pressed', 'true');
    toggleBtnMobile.addEventListener('click', () => setRunning(!running));
  }
  
  // start animation
  rafId = requestAnimationFrame(loop);
})();
