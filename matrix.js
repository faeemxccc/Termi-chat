// matrix.js - draws a Matrix-style falling characters background
(function(){
  const canvas = document.getElementById('matrix');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Resize canvas to fill the window
  function resize(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cols = Math.floor(canvas.width / fontSize);
    drops = new Array(cols).fill(1);
  }

  // Config
  const fontSize = 16; // can be tuned
  let cols = 0;
  let drops = [];

  // Characters (use a subset that looks good)
  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789@#$%&*';

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

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  // start animation after a short delay so other scripts can load
  requestAnimationFrame(draw);
})();
