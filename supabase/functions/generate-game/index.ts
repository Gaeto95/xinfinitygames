const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!
    
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured')
    }

    console.log('Starting game generation...')
    
    // Generate game idea with focused prompts
    const ideaResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You create simple but addictive browser mini-games. Focus on games that are immediately fun and have clear mechanics.'
          },
          {
            role: 'user',
            content: `Create a simple browser mini-game concept:

REQUIREMENTS:
- Simple one-button or arrow key controls
- Clear objective (collect, avoid, survive, etc.)
- Can be coded in 200 lines of HTML/JS
- Immediately engaging and fun
- Has clear win/lose conditions

Examples of GOOD concepts:
- "Dodge falling meteors while collecting stars"
- "Jump over obstacles in an endless runner"
- "Catch falling items while avoiding bombs"
- "Navigate a maze while being chased"

Format: 
Title: [Simple Game Name]
Description: [One sentence describing the core gameplay]`
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    })

    if (!ideaResponse.ok) {
      const errorText = await ideaResponse.text()
      throw new Error(`Failed to generate game idea: ${errorText}`)
    }

    const ideaData = await ideaResponse.json()
    const ideaText = ideaData.choices[0].message.content.trim()
    console.log('Generated idea:', ideaText)
    
    // Parse title and description
    const titleMatch = ideaText.match(/Title:\s*(.+)/i)
    const descMatch = ideaText.match(/Description:\s*(.+)/i)
    
    const title = titleMatch ? titleMatch[1].trim() : 'Mystery Game'
    const description = descMatch ? descMatch[1].trim() : 'A unique gaming experience'

    console.log('Parsed - Title:', title, 'Description:', description)

    // Generate thumbnail FIRST
    let thumbnailUrl = '/placeholder.png'
    
    try {
      console.log('Generating thumbnail...')
      const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: `Pixel art game screenshot of "${title}". Retro 8-bit arcade game style, bright vibrant colors, game interface visible, action scene from the game. Style: classic arcade cabinet screen, pixelated graphics, neon colors. Theme: ${description}. Make it look like an actual game in progress.`,
          n: 1,
          size: '1792x1024',
          quality: 'hd',
        }),
      })

      if (imageResponse.ok) {
        const imageData = await imageResponse.json()
        const imageUrl = imageData.data[0].url
        console.log('DALL-E image generated:', imageUrl)
        
        // Download and convert to blob
        const imageDownload = await fetch(imageUrl)
        if (imageDownload.ok) {
          const imageBlob = await imageDownload.blob()
          
          // Generate unique filename
          const timestamp = Date.now()
          const safeName = title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)
          const fileName = `${timestamp}-${safeName}.png`
          
          console.log('Uploading to Supabase storage:', fileName)
          
          // Upload to Supabase Storage
          const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/game-thumbnails/${fileName}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'image/png',
            },
            body: imageBlob,
          })
          
          if (uploadResponse.ok) {
            thumbnailUrl = `${supabaseUrl}/storage/v1/object/public/game-thumbnails/${fileName}`
            console.log('Thumbnail uploaded successfully:', thumbnailUrl)
          } else {
            const uploadError = await uploadResponse.text()
            console.error('Upload failed:', uploadError)
          }
        }
      } else {
        const imageError = await imageResponse.text()
        console.error('DALL-E generation failed:', imageError)
      }
    } catch (error) {
      console.error('Thumbnail generation error:', error)
    }

    // Generate game code with MUCH simpler requirements
    const codeResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You create simple, working HTML5 games. Your games are immediately playable and fun. NEVER provide explanations - only complete HTML code.`
          },
          {
            role: 'user',
            content: `Create a complete HTML game for: "${title}"
Concept: ${description}

CRITICAL REQUIREMENTS:
✅ Complete HTML document starting with <!DOCTYPE html>
✅ Simple controls (arrow keys or mouse clicks)
✅ Player character that moves smoothly
✅ Clear game objective displayed on screen
✅ Score system that increases
✅ Game over when player fails
✅ Restart button after game over
✅ Bright, contrasting colors for visibility
✅ 60fps smooth animation using requestAnimationFrame
✅ Collision detection that actually works

GAME TEMPLATE:
- Canvas 600x400px for game area
- Player sprite (30x30px bright color)
- Moving enemies/obstacles
- Collectible items (if applicable)
- HUD showing score and lives
- Game loop with proper timing
- Win/lose conditions clearly defined

VISUAL STYLE:
- Use bright colors: #FF0000, #00FF00, #0000FF, #FFFF00, #FF00FF
- Player should be easily visible (bright color, distinct shape)
- Background should not interfere with gameplay
- Add simple particle effects for feedback

CODE STRUCTURE:
- Use canvas and 2D context
- requestAnimationFrame for smooth animation
- Proper collision detection (bounding boxes)
- Clean game state management
- No external dependencies

Provide ONLY the complete HTML code with no markdown formatting.`
          }
        ],
        max_tokens: 3000,
        temperature: 0.2,
      }),
    })

    if (!codeResponse.ok) {
      const errorText = await codeResponse.text()
      console.error('Code generation failed:', errorText)
      throw new Error(`Failed to generate game code: ${errorText}`)
    }

    const codeData = await codeResponse.json()
    let gameCode = codeData.choices[0].message.content.trim()
    
    console.log('Generated code length:', gameCode.length)
    
    // Clean up the code if it has markdown formatting
    if (gameCode.startsWith('```html')) {
      gameCode = gameCode.replace(/^```html\n/, '').replace(/\n```$/, '')
    } else if (gameCode.startsWith('```')) {
      gameCode = gameCode.replace(/^```\n/, '').replace(/\n```$/, '')
    }

    // Validate the generated code
    if (!gameCode.includes('<!DOCTYPE html>') || !gameCode.includes('<html>')) {
      console.log('Generated code invalid, using optimized fallback')
      gameCode = createOptimizedFallbackGame(title, description)
    }

    console.log('Saving to database...')
    
    // Save to database with the generated thumbnail
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/games`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        title: title,
        prompt: description,
        code: gameCode,
        thumbnail_url: thumbnailUrl,
        status: 'approved'
      })
    })

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text()
      throw new Error(`Database insert failed: ${errorText}`)
    }

    const insertedGame = await insertResponse.json()
    console.log('Game saved successfully with thumbnail:', thumbnailUrl)

    return new Response(
      JSON.stringify({ 
        success: true, 
        game: insertedGame[0],
        title: title,
        description: description,
        thumbnail: thumbnailUrl
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

function createOptimizedFallbackGame(title: string, description: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
  font-family: Arial, sans-serif; 
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: white;
}
.game-container {
  background: rgba(0,0,0,0.3);
  border-radius: 20px;
  padding: 20px;
  text-align: center;
}
#gameCanvas { 
  border: 3px solid #fff;
  border-radius: 10px;
  background: #000;
  display: block;
}
.hud { 
  display: flex;
  justify-content: space-between;
  margin: 15px 0;
  font-size: 18px;
  font-weight: bold;
}
button { 
  padding: 10px 20px; 
  background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
  color: white; 
  border: none; 
  border-radius: 15px; 
  cursor: pointer; 
  font-size: 16px;
  margin: 5px;
}
button:hover { transform: scale(1.05); }
h1 { margin-bottom: 10px; font-size: 24px; }
.controls { font-size: 14px; margin: 10px 0; opacity: 0.9; }
</style>
</head>
<body>
<div class="game-container">
  <h1>${title}</h1>
  <p style="margin-bottom: 15px; font-size: 14px;">${description}</p>
  
  <div class="hud">
    <div>Score: <span id="score">0</span></div>
    <div>Lives: <span id="lives">3</span></div>
  </div>
  
  <canvas id="gameCanvas" width="600" height="400"></canvas>
  
  <div class="controls">Use ARROW KEYS to move • Collect yellow items • Avoid red enemies</div>
  
  <button onclick="startGame()" id="startBtn">Start Game</button>
  <button onclick="resetGame()">Reset</button>
</div>

<script>
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let game = {
  player: { x: 50, y: 200, width: 30, height: 30, speed: 5 },
  enemies: [],
  items: [],
  particles: [],
  score: 0,
  lives: 3,
  running: false,
  keys: {},
  lastTime: 0
};

// Input handling
document.addEventListener('keydown', (e) => game.keys[e.code] = true);
document.addEventListener('keyup', (e) => game.keys[e.code] = false);

function startGame() {
  if (game.running) return;
  game.running = true;
  document.getElementById('startBtn').textContent = 'Playing...';
  spawnItems();
  spawnEnemies();
  gameLoop();
}

function gameLoop(currentTime = 0) {
  if (!game.running) return;
  
  const deltaTime = currentTime - game.lastTime;
  game.lastTime = currentTime;
  
  update(deltaTime);
  render();
  
  requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
  // Move player
  if (game.keys['ArrowLeft'] && game.player.x > 0) game.player.x -= game.player.speed;
  if (game.keys['ArrowRight'] && game.player.x < canvas.width - game.player.width) game.player.x += game.player.speed;
  if (game.keys['ArrowUp'] && game.player.y > 0) game.player.y -= game.player.speed;
  if (game.keys['ArrowDown'] && game.player.y < canvas.height - game.player.height) game.player.y += game.player.speed;
  
  // Update enemies
  game.enemies.forEach((enemy, i) => {
    enemy.x += enemy.vx;
    enemy.y += enemy.vy;
    
    // Bounce off walls
    if (enemy.x <= 0 || enemy.x >= canvas.width - enemy.width) enemy.vx *= -1;
    if (enemy.y <= 0 || enemy.y >= canvas.height - enemy.height) enemy.vy *= -1;
    
    // Check collision with player
    if (isColliding(game.player, enemy)) {
      game.lives--;
      createParticles(enemy.x, enemy.y, '#FF0000');
      game.enemies.splice(i, 1);
      if (game.lives <= 0) endGame();
    }
  });
  
  // Update items
  game.items.forEach((item, i) => {
    item.rotation += 0.1;
    
    if (isColliding(game.player, item)) {
      game.score += 10;
      createParticles(item.x, item.y, '#FFFF00');
      game.items.splice(i, 1);
    }
  });
  
  // Update particles
  game.particles.forEach((p, i) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= deltaTime;
    if (p.life <= 0) game.particles.splice(i, 1);
  });
  
  // Spawn new objects
  if (Math.random() < 0.01) spawnItems();
  if (Math.random() < 0.005) spawnEnemies();
  
  updateDisplay();
}

function render() {
  // Clear canvas
  ctx.fillStyle = '#001122';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw grid
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  
  // Draw items
  game.items.forEach(item => {
    ctx.save();
    ctx.translate(item.x + item.width/2, item.y + item.height/2);
    ctx.rotate(item.rotation);
    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(-item.width/2, -item.height/2, item.width, item.height);
    ctx.restore();
  });
  
  // Draw enemies
  game.enemies.forEach(enemy => {
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
  });
  
  // Draw player
  ctx.fillStyle = '#00FF00';
  ctx.fillRect(game.player.x, game.player.y, game.player.width, game.player.height);
  
  // Draw particles
  game.particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life / 1000;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function spawnItems() {
  game.items.push({
    x: Math.random() * (canvas.width - 20),
    y: Math.random() * (canvas.height - 20),
    width: 20,
    height: 20,
    rotation: 0
  });
}

function spawnEnemies() {
  game.enemies.push({
    x: Math.random() * (canvas.width - 25),
    y: Math.random() * (canvas.height - 25),
    width: 25,
    height: 25,
    vx: (Math.random() - 0.5) * 4,
    vy: (Math.random() - 0.5) * 4
  });
}

function createParticles(x, y, color) {
  for (let i = 0; i < 8; i++) {
    game.particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      color: color,
      size: Math.random() * 4 + 2,
      life: 1000
    });
  }
}

function isColliding(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function updateDisplay() {
  document.getElementById('score').textContent = game.score;
  document.getElementById('lives').textContent = game.lives;
}

function endGame() {
  game.running = false;
  alert('Game Over! Final Score: ' + game.score);
  document.getElementById('startBtn').textContent = 'Start Game';
}

function resetGame() {
  game.running = false;
  game.enemies = [];
  game.items = [];
  game.particles = [];
  game.player = { x: 50, y: 200, width: 30, height: 30, speed: 5 };
  game.score = 0;
  game.lives = 3;
  updateDisplay();
  document.getElementById('startBtn').textContent = 'Start Game';
  
  ctx.fillStyle = '#001122';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
</script>
</body>
</html>`;
}