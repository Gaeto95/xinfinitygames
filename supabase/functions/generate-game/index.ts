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

    // Parse request body to get user prompt
    let userPrompt = '';
    try {
      const body = await req.json();
      userPrompt = body.user_prompt || '';
    } catch (error) {
      console.log('No request body or invalid JSON, proceeding without user prompt');
    }

    console.log('Starting game generation with user prompt:', userPrompt || 'No prompt provided');
    
    // Generate game idea with user prompt or random generation
    let ideaPrompt = '';
    
    if (userPrompt.trim()) {
      // Use user's prompt directly
      ideaPrompt = `Create a unique browser mini-game based on this description: "${userPrompt}"

REQUIREMENTS:
- Must be playable in a web browser
- Should be fun and engaging
- Include clear objectives and controls
- Make it creative and unique
- Keep the core concept focused

Format: 
Title: [Creative Game Name]
Description: [One sentence describing the core gameplay]`;
    } else {
      // Generate random game idea
      const gameTypes = [
        "endless runner with unique mechanics",
        "puzzle game with physics",
        "arcade shooter with power-ups",
        "platformer with special abilities",
        "rhythm-based action game",
        "maze navigation challenge",
        "reaction time tester",
        "memory pattern game",
        "resource management mini-game",
        "physics-based destruction game"
      ];
      
      const themes = [
        "space exploration",
        "underwater adventure",
        "magical forest",
        "cyberpunk city",
        "ancient temple",
        "candy world",
        "robot factory",
        "dinosaur era",
        "alien planet",
        "steampunk laboratory"
      ];
      
      const mechanics = [
        "collect items while avoiding obstacles",
        "match patterns under time pressure",
        "stack objects without falling",
        "navigate through moving barriers",
        "defend against waves of enemies",
        "solve puzzles to progress",
        "race against the clock",
        "balance resources carefully",
        "chain combos for higher scores",
        "survive as long as possible"
      ];
      
      const randomType = gameTypes[Math.floor(Math.random() * gameTypes.length)];
      const randomTheme = themes[Math.floor(Math.random() * themes.length)];
      const randomMechanic = mechanics[Math.floor(Math.random() * mechanics.length)];
      
      ideaPrompt = `Create a unique ${randomType} set in a ${randomTheme} where the player must ${randomMechanic}.

REQUIREMENTS:
- Must be completely different from typical games
- Unique control scheme (not just arrow keys)
- Creative visual style and colors
- Unexpected gameplay twist
- Clear win/lose conditions
- Should feel fresh and original

Examples of CREATIVE concepts:
- "Gravity-switching space janitor cleaning cosmic debris"
- "Time-rewinding ninja avoiding laser grids"
- "Color-mixing wizard painting portals to escape"
- "Sound-wave surfer riding music through dimensions"

Format: 
Title: [Creative Unique Name]
Description: [One sentence describing the unique core gameplay]`;
    }
    
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
            content: 'You create unique, creative browser mini-games. Each game should have completely different mechanics, visuals, and gameplay from typical games. Be creative and weird!'
          },
          {
            role: 'user',
            content: ideaPrompt
          }
        ],
        max_tokens: 150,
        temperature: 0.9, // Higher temperature for more creativity
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

    // Generate game code with VERY specific prompts to ensure matching
    console.log('Generating game code for:', title)
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
            content: `You are a master game developer who creates EXACTLY what is requested. You MUST implement the exact game described in the title and description. No generic templates - create the specific game requested.`
          },
          {
            role: 'user',
            content: `Create a complete HTML game that EXACTLY implements: "${title}"

Game Description: ${description}
${userPrompt ? `Original User Request: "${userPrompt}"` : ''}

CRITICAL REQUIREMENTS - MUST IMPLEMENT EXACTLY:
✅ The game MUST match the title "${title}" exactly
✅ The game MUST implement the mechanics described in: "${description}"
✅ If it's a racing game, implement actual racing mechanics
✅ If it's a shooter, implement shooting mechanics
✅ If it's a puzzle, implement puzzle mechanics
✅ If it's about food, include food-themed visuals and mechanics

TECHNICAL SPECIFICATIONS:
- Complete HTML document with embedded CSS and JavaScript
- Canvas size: 800x600px
- Smooth 60fps animation using requestAnimationFrame
- Proper game states (menu, playing, game over)
- Creative visual style matching the theme
- Unique controls appropriate for the game type
- Sound effects using Web Audio API
- Progressive difficulty
- Score/progress tracking
- Restart functionality

VISUAL REQUIREMENTS:
- Use colors and graphics that match the game theme
- Creative particle effects and animations
- Professional game UI with HUD elements
- Smooth transitions and feedback

GAMEPLAY REQUIREMENTS:
- Implement the EXACT mechanics described in the title/description
- Clear objectives and win/lose conditions
- Engaging and fun gameplay loop
- Appropriate difficulty curve

The game MUST be a complete, playable implementation of "${title}" - not a generic template!

Provide ONLY the complete HTML code with no markdown formatting.`
          }
        ],
        max_tokens: 4000,
        temperature: 0.7, // Lower temperature for more accurate implementation
      }),
    })

    if (!codeResponse.ok) {
      const errorText = await codeResponse.text()
      console.error('Code generation failed:', errorText)
      // Create a matching fallback game instead of generic template
      const gameCode = createMatchingFallbackGame(title, description, userPrompt)
      return await saveAndReturnGame(supabaseUrl, supabaseKey, title, description, gameCode, thumbnailUrl)
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
      console.log('Generated code invalid, creating matching fallback')
      gameCode = createMatchingFallbackGame(title, description, userPrompt)
    }

    // Additional validation - check if the game actually matches the title
    if (!gameCodeMatchesTitle(gameCode, title, description)) {
      console.log('Generated code does not match title, creating matching fallback')
      gameCode = createMatchingFallbackGame(title, description, userPrompt)
    }

    return await saveAndReturnGame(supabaseUrl, supabaseKey, title, description, gameCode, thumbnailUrl)

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

async function saveAndReturnGame(supabaseUrl: string, supabaseKey: string, title: string, description: string, gameCode: string, thumbnailUrl: string) {
  console.log('Saving to database...')
  
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
}

function gameCodeMatchesTitle(code: string, title: string, description: string): boolean {
  const codeText = code.toLowerCase();
  const titleWords = title.toLowerCase().split(' ').filter(word => word.length > 3);
  const descWords = description.toLowerCase().split(' ').filter(word => word.length > 3);
  
  // Check for key gameplay elements
  const gameplayKeywords = {
    racing: ['speed', 'race', 'car', 'vehicle', 'track', 'lap', 'finish'],
    shooting: ['shoot', 'bullet', 'enemy', 'target', 'weapon', 'fire'],
    puzzle: ['puzzle', 'solve', 'match', 'pattern', 'logic'],
    platformer: ['jump', 'platform', 'gravity', 'collision'],
    food: ['food', 'eat', 'cook', 'recipe', 'ingredient']
  };
  
  // If title suggests racing, code should have racing elements
  if (title.toLowerCase().includes('racing') || title.toLowerCase().includes('grand prix')) {
    return gameplayKeywords.racing.some(keyword => codeText.includes(keyword));
  }
  
  // If title suggests shooting, code should have shooting elements
  if (title.toLowerCase().includes('shooter') || title.toLowerCase().includes('battle')) {
    return gameplayKeywords.shooting.some(keyword => codeText.includes(keyword));
  }
  
  // Check if at least some title words appear in the code
  const matchingWords = titleWords.filter(word => codeText.includes(word));
  return matchingWords.length >= Math.min(2, titleWords.length);
}

function createMatchingFallbackGame(title: string, description: string, userPrompt: string): string {
  console.log('Creating matching fallback for:', title);
  
  // Analyze the title and description to determine game type
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();
  const promptLower = userPrompt.toLowerCase();
  
  const allText = `${titleLower} ${descLower} ${promptLower}`;
  
  // Determine game type based on keywords
  if (allText.includes('racing') || allText.includes('race') || allText.includes('grand prix') || allText.includes('speed') || allText.includes('car') || allText.includes('vehicle')) {
    return createRacingGame(title, description);
  } else if (allText.includes('shoot') || allText.includes('battle') || allText.includes('fight') || allText.includes('enemy') || allText.includes('defend')) {
    return createShooterGame(title, description);
  } else if (allText.includes('puzzle') || allText.includes('match') || allText.includes('solve') || allText.includes('memory')) {
    return createPuzzleGame(title, description);
  } else if (allText.includes('jump') || allText.includes('platform') || allText.includes('adventure') || allText.includes('collect')) {
    return createPlatformerGame(title, description);
  } else if (allText.includes('rhythm') || allText.includes('music') || allText.includes('beat') || allText.includes('dance')) {
    return createRhythmGame(title, description);
  } else {
    // Default to a creative adaptive game
    return createAdaptiveGame(title, description);
  }
}

function createRacingGame(title: string, description: string): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const primaryColor = colors[Math.floor(Math.random() * colors.length)];
  const secondaryColor = colors[Math.floor(Math.random() * colors.length)];
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  background: linear-gradient(180deg, #000428 0%, #004e92 100%); 
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
  border: 2px solid ${primaryColor};
}
#gameCanvas { 
  border: 3px solid ${primaryColor};
  border-radius: 15px;
  background: #000;
  display: block;
  box-shadow: 0 0 20px ${primaryColor}40;
}
.hud { 
  display: flex;
  justify-content: space-between;
  margin: 15px 0;
  font-size: 18px;
  font-weight: bold;
  color: ${primaryColor};
}
button { 
  padding: 12px 24px; 
  background: linear-gradient(45deg, ${primaryColor}, ${secondaryColor});
  color: white; 
  border: none; 
  border-radius: 25px; 
  cursor: pointer; 
  font-size: 16px;
  margin: 5px;
  transition: all 0.3s;
}
button:hover { transform: scale(1.05); box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
h1 { margin-bottom: 10px; font-size: 24px; color: ${primaryColor}; }
.controls { font-size: 14px; margin: 10px 0; opacity: 0.9; }
</style>
</head>
<body>
<div class="game-container">
  <h1>${title}</h1>
  <p style="margin-bottom: 15px; font-size: 14px;">${description}</p>
  
  <div class="hud">
    <div>Speed: <span id="speed">0</span> mph</div>
    <div>Distance: <span id="distance">0</span>m</div>
    <div>Lap: <span id="lap">1</span></div>
  </div>
  
  <canvas id="gameCanvas" width="800" height="600"></canvas>
  
  <div class="controls">ARROW KEYS to steer • SPACE to boost • Avoid obstacles!</div>
  
  <button onclick="startGame()" id="startBtn">Start Racing</button>
  <button onclick="resetGame()">Reset</button>
</div>

<script>
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let game = {
  player: { x: 375, y: 500, width: 50, height: 80, speed: 0, maxSpeed: 12, boost: 0 },
  obstacles: [],
  roadLines: [],
  particles: [],
  distance: 0,
  lap: 1,
  running: false,
  keys: {},
  roadOffset: 0,
  trackWidth: 400,
  trackX: 200
};

document.addEventListener('keydown', (e) => game.keys[e.code] = true);
document.addEventListener('keyup', (e) => game.keys[e.code] = false);

function startGame() {
  if (game.running) return;
  game.running = true;
  document.getElementById('startBtn').textContent = 'Racing...';
  initializeRoad();
  gameLoop();
}

function gameLoop() {
  if (!game.running) return;
  update();
  render();
  requestAnimationFrame(gameLoop);
}

function update() {
  // Player movement
  if (game.keys['ArrowLeft'] && game.player.x > game.trackX + 20) {
    game.player.x -= 6;
  }
  if (game.keys['ArrowRight'] && game.player.x < game.trackX + game.trackWidth - 70) {
    game.player.x += 6;
  }
  if (game.keys['ArrowUp'] || game.keys['Space']) {
    game.player.speed = Math.min(game.player.speed + 0.3, game.player.maxSpeed);
    if (game.keys['Space']) {
      game.player.boost = Math.min(game.player.boost + 0.1, 1);
    }
  } else {
    game.player.speed = Math.max(game.player.speed - 0.15, 3);
  }
  
  if (game.keys['ArrowDown']) {
    game.player.speed = Math.max(game.player.speed - 0.4, 0);
  }
  
  // Boost effects
  if (game.player.boost > 0) {
    game.player.speed += game.player.boost * 3;
    game.player.boost -= 0.02;
    createBoostParticles();
  }
  
  // Update road
  game.roadOffset += game.player.speed;
  game.distance += game.player.speed * 0.1;
  
  // Lap counting
  if (game.distance > 1000 * game.lap) {
    game.lap++;
    game.player.maxSpeed += 1; // Increase max speed each lap
  }
  
  // Update road lines
  game.roadLines.forEach(line => {
    line.y += game.player.speed;
    if (line.y > canvas.height) line.y = -20;
  });
  
  // Update obstacles (other cars)
  game.obstacles.forEach((obstacle, i) => {
    obstacle.y += game.player.speed - obstacle.speed;
    if (obstacle.y > canvas.height) {
      game.obstacles.splice(i, 1);
    }
    
    // Collision check
    if (isColliding(game.player, obstacle)) {
      createCrashEffect();
      game.player.speed *= 0.5; // Slow down on crash
    }
  });
  
  // Spawn obstacles (other racing cars)
  if (Math.random() < 0.015) {
    spawnRacingCar();
  }
  
  // Update particles
  game.particles.forEach((p, i) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 16;
    p.size *= 0.98;
    if (p.life <= 0) game.particles.splice(i, 1);
  });
  
  updateDisplay();
}

function render() {
  // Clear with night sky
  ctx.fillStyle = '#000428';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw track background
  ctx.fillStyle = '#333';
  ctx.fillRect(game.trackX, 0, game.trackWidth, canvas.height);
  
  // Draw track edges
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(game.trackX - 5, 0, 10, canvas.height);
  ctx.fillRect(game.trackX + game.trackWidth - 5, 0, 10, canvas.height);
  
  // Draw road lines
  ctx.fillStyle = '#FFFF00';
  game.roadLines.forEach(line => {
    ctx.fillRect(line.x, line.y, line.width, line.height);
  });
  
  // Draw obstacles (other cars)
  game.obstacles.forEach(obstacle => {
    // Car body
    ctx.fillStyle = obstacle.color;
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    
    // Car details
    ctx.fillStyle = '#FFF';
    ctx.fillRect(obstacle.x + 5, obstacle.y + 5, 10, 10);
    ctx.fillRect(obstacle.x + 35, obstacle.y + 5, 10, 10);
    ctx.fillRect(obstacle.x + 10, obstacle.y + 40, 30, 20);
  });
  
  // Draw player car
  ctx.fillStyle = '${primaryColor}';
  ctx.fillRect(game.player.x, game.player.y, game.player.width, game.player.height);
  
  // Player car details
  ctx.fillStyle = '#FFF';
  ctx.fillRect(game.player.x + 5, game.player.y + 10, 10, 15);
  ctx.fillRect(game.player.x + 35, game.player.y + 10, 10, 15);
  ctx.fillRect(game.player.x + 10, game.player.y + 40, 30, 20);
  
  // Boost effect
  if (game.player.boost > 0) {
    ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.fillRect(game.player.x - 5, game.player.y - 5, game.player.width + 10, game.player.height + 10);
  }
  
  // Draw speed lines
  for (let i = 0; i < Math.floor(game.player.speed); i++) {
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(game.player.x - 20 - i * 15, game.player.y + Math.random() * 80);
    ctx.lineTo(game.player.x - 35 - i * 15, game.player.y + Math.random() * 80);
    ctx.stroke();
  }
  
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

function initializeRoad() {
  game.roadLines = [];
  for (let i = 0; i < 15; i++) {
    game.roadLines.push({
      x: game.trackX + game.trackWidth / 2 - 5,
      y: i * 50,
      width: 10,
      height: 30
    });
  }
}

function spawnRacingCar() {
  const lanes = [
    game.trackX + 30,
    game.trackX + 100,
    game.trackX + 170,
    game.trackX + 240,
    game.trackX + 310
  ];
  const lane = lanes[Math.floor(Math.random() * lanes.length)];
  const carColors = ['#FF4444', '#44FF44', '#4444FF', '#FFFF44', '#FF44FF'];
  
  game.obstacles.push({
    x: lane,
    y: -80,
    width: 50,
    height: 80,
    speed: Math.random() * 3 + 1,
    color: carColors[Math.floor(Math.random() * carColors.length)]
  });
}

function createBoostParticles() {
  for (let i = 0; i < 3; i++) {
    game.particles.push({
      x: game.player.x + 25,
      y: game.player.y + 80,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      color: '#FFFF00',
      size: Math.random() * 4 + 2,
      life: 500
    });
  }
}

function createCrashEffect() {
  for (let i = 0; i < 15; i++) {
    game.particles.push({
      x: game.player.x + 25,
      y: game.player.y + 40,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      color: ['#FF4444', '#FFAA00', '#FFF'][Math.floor(Math.random() * 3)],
      size: Math.random() * 6 + 3,
      life: 1000
    });
  }
}

function isColliding(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function updateDisplay() {
  document.getElementById('speed').textContent = Math.floor(game.player.speed * 8);
  document.getElementById('distance').textContent = Math.floor(game.distance);
  document.getElementById('lap').textContent = game.lap;
}

function resetGame() {
  game.running = false;
  game.player.speed = 0;
  game.player.boost = 0;
  game.distance = 0;
  game.lap = 1;
  game.obstacles = [];
  game.particles = [];
  updateDisplay();
  document.getElementById('startBtn').textContent = 'Start Racing';
  
  ctx.fillStyle = '#000428';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
</script>
</body>
</html>`;
}

function createShooterGame(title: string, description: string): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const primaryColor = colors[Math.floor(Math.random() * colors.length)];
  const secondaryColor = colors[Math.floor(Math.random() * colors.length)];
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  background: linear-gradient(135deg, #2C3E50 0%, #34495E 100%); 
  font-family: 'Courier New', monospace; 
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: white;
}
.game-container {
  background: rgba(0,0,0,0.4);
  border-radius: 20px;
  padding: 20px;
  text-align: center;
  border: 2px solid ${primaryColor};
}
#gameCanvas { 
  border: 3px solid ${primaryColor};
  border-radius: 15px;
  background: radial-gradient(circle, #1a1a2e 0%, #16213e 100%);
  display: block;
  box-shadow: 0 0 20px ${primaryColor}40;
}
.hud { 
  display: flex;
  justify-content: space-between;
  margin: 15px 0;
  font-size: 18px;
  font-weight: bold;
  color: ${primaryColor};
}
button { 
  padding: 12px 24px; 
  background: linear-gradient(45deg, ${primaryColor}, ${secondaryColor});
  color: white; 
  border: none; 
  border-radius: 25px; 
  cursor: pointer; 
  font-size: 16px;
  margin: 5px;
  transition: all 0.3s;
}
button:hover { transform: scale(1.05); box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
h1 { margin-bottom: 10px; font-size: 24px; color: ${primaryColor}; }
.controls { font-size: 14px; margin: 10px 0; opacity: 0.9; }
</style>
</head>
<body>
<div class="game-container">
  <h1>${title}</h1>
  <p style="margin-bottom: 15px; font-size: 14px;">${description}</p>
  
  <div class="hud">
    <div>Score: <span id="score">0</span></div>
    <div>Level: <span id="level">1</span></div>
    <div>Ammo: <span id="ammo">∞</span></div>
  </div>
  
  <canvas id="gameCanvas" width="800" height="600"></canvas>
  
  <div class="controls">WASD to move • MOUSE to aim • CLICK to SHOOT • Destroy all enemies!</div>
  
  <button onclick="startGame()" id="startBtn">Start Battle</button>
  <button onclick="resetGame()">Reset</button>
</div>

<script>
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let game = {
  player: { x: 400, y: 550, width: 40, height: 40, angle: 0, health: 100 },
  bullets: [],
  enemies: [],
  particles: [],
  powerups: [],
  score: 0,
  level: 1,
  running: false,
  mouseX: 400,
  mouseY: 300,
  keys: {},
  lastTime: 0,
  enemySpawnRate: 0.02
};

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  game.mouseX = e.clientX - rect.left;
  game.mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', () => {
  if (game.running) shootBullet();
});

document.addEventListener('keydown', (e) => game.keys[e.code] = true);
document.addEventListener('keyup', (e) => game.keys[e.code] = false);

function startGame() {
  if (game.running) return;
  game.running = true;
  document.getElementById('startBtn').textContent = 'Fighting...';
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
  // Player movement
  if (game.keys['KeyW'] && game.player.y > 20) game.player.y -= 5;
  if (game.keys['KeyS'] && game.player.y < canvas.height - 60) game.player.y += 5;
  if (game.keys['KeyA'] && game.player.x > 20) game.player.x -= 5;
  if (game.keys['KeyD'] && game.player.x < canvas.width - 60) game.player.x += 5;
  
  // Update player angle to face mouse
  const dx = game.mouseX - game.player.x;
  const dy = game.mouseY - game.player.y;
  game.player.angle = Math.atan2(dy, dx);
  
  // Update bullets
  game.bullets.forEach((bullet, i) => {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    
    if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
      game.bullets.splice(i, 1);
    }
    
    // Check enemy collisions
    game.enemies.forEach((enemy, j) => {
      if (isColliding(bullet, enemy)) {
        game.score += 10;
        createExplosion(enemy.x, enemy.y);
        game.enemies.splice(j, 1);
        game.bullets.splice(i, 1);
        
        // Chance to spawn powerup
        if (Math.random() < 0.3) {
          spawnPowerup(enemy.x, enemy.y);
        }
      }
    });
  });
  
  // Update enemies
  game.enemies.forEach((enemy, i) => {
    // Move towards player
    const dx = game.player.x - enemy.x;
    const dy = game.player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      enemy.x += (dx / distance) * enemy.speed;
      enemy.y += (dy / distance) * enemy.speed;
    }
    
    enemy.rotation += 0.1;
    
    // Check player collision
    if (isColliding(enemy, game.player)) {
      game.player.health -= 10;
      createExplosion(enemy.x, enemy.y);
      game.enemies.splice(i, 1);
      
      if (game.player.health <= 0) {
        endGame();
      }
    }
  });
  
  // Update powerups
  game.powerups.forEach((powerup, i) => {
    powerup.rotation += 0.05;
    
    if (isColliding(powerup, game.player)) {
      game.score += 50;
      game.player.health = Math.min(game.player.health + 20, 100);
      createPowerupEffect(powerup.x, powerup.y);
      game.powerups.splice(i, 1);
    }
  });
  
  // Update particles
  game.particles.forEach((p, i) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= deltaTime;
    p.size *= 0.99;
    if (p.life <= 0 || p.size < 1) game.particles.splice(i, 1);
  });
  
  // Spawn more enemies
  if (Math.random() < game.enemySpawnRate) {
    spawnEnemy();
  }
  
  // Level progression
  if (game.score > game.level * 200) {
    game.level++;
    game.enemySpawnRate += 0.005;
  }
  
  updateDisplay();
}

function render() {
  // Clear with gradient
  const gradient = ctx.createRadialGradient(400, 300, 0, 400, 300, 400);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw stars
  for (let i = 0; i < 50; i++) {
    const x = (i * 137.5) % canvas.width;
    const y = (i * 73.3) % canvas.height;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Draw player
  ctx.save();
  ctx.translate(game.player.x + game.player.width/2, game.player.y + game.player.height/2);
  ctx.rotate(game.player.angle);
  ctx.fillStyle = '${primaryColor}';
  ctx.fillRect(-20, -20, 40, 40);
  ctx.fillStyle = '${secondaryColor}';
  ctx.fillRect(15, -5, 10, 10);
  ctx.restore();
  
  // Draw health bar
  ctx.fillStyle = 'rgba(255,0,0,0.5)';
  ctx.fillRect(game.player.x, game.player.y - 10, game.player.width, 5);
  ctx.fillStyle = '#00FF00';
  ctx.fillRect(game.player.x, game.player.y - 10, (game.player.width * game.player.health) / 100, 5);
  
  // Draw bullets
  game.bullets.forEach(bullet => {
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Bullet trail
    ctx.strokeStyle = 'rgba(255,255,0,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.lineTo(bullet.x - bullet.vx * 3, bullet.y - bullet.vy * 3);
    ctx.stroke();
  });
  
  // Draw enemies
  game.enemies.forEach(enemy => {
    ctx.save();
    ctx.translate(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
    ctx.rotate(enemy.rotation);
    ctx.fillStyle = '#FF4444';
    ctx.fillRect(-enemy.width/2, -enemy.height/2, enemy.width, enemy.height);
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
  });
  
  // Draw powerups
  game.powerups.forEach(powerup => {
    ctx.save();
    ctx.translate(powerup.x + powerup.width/2, powerup.y + powerup.height/2);
    ctx.rotate(powerup.rotation);
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(-powerup.width/2, -powerup.height/2, powerup.width, powerup.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-5, -2, 10, 4);
    ctx.fillRect(-2, -5, 4, 10);
    ctx.restore();
  });
  
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

function shootBullet() {
  const speed = 12;
  const dx = game.mouseX - (game.player.x + game.player.width/2);
  const dy = game.mouseY - (game.player.y + game.player.height/2);
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  game.bullets.push({
    x: game.player.x + game.player.width/2,
    y: game.player.y + game.player.height/2,
    vx: (dx / distance) * speed,
    vy: (dy / distance) * speed,
    size: 4
  });
}

function spawnEnemies() {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => spawnEnemy(), i * 1000);
  }
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x, y;
  
  switch(side) {
    case 0: x = Math.random() * canvas.width; y = -30; break;
    case 1: x = canvas.width + 30; y = Math.random() * canvas.height; break;
    case 2: x = Math.random() * canvas.width; y = canvas.height + 30; break;
    case 3: x = -30; y = Math.random() * canvas.height; break;
  }
  
  game.enemies.push({
    x: x,
    y: y,
    width: 30,
    height: 30,
    speed: Math.random() * 2 + 1,
    rotation: 0
  });
}

function spawnPowerup(x, y) {
  game.powerups.push({
    x: x,
    y: y,
    width: 20,
    height: 20,
    rotation: 0
  });
}

function createExplosion(x, y) {
  for (let i = 0; i < 12; i++) {
    game.particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      color: ['#FF4444', '#FFAA00', '#FFFF00'][Math.floor(Math.random() * 3)],
      size: Math.random() * 6 + 3,
      life: 1000
    });
  }
}

function createPowerupEffect(x, y) {
  for (let i = 0; i < 8; i++) {
    game.particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      color: '#00FF00',
      size: Math.random() * 4 + 2,
      life: 800
    });
  }
}

function isColliding(a, b) {
  return a.x < b.x + b.width && a.x + a.size > b.x && a.y < b.y + b.height && a.y + a.size > b.y;
}

function updateDisplay() {
  document.getElementById('score').textContent = game.score;
  document.getElementById('level').textContent = game.level;
}

function endGame() {
  game.running = false;
  alert('Game Over! Final Score: ' + game.score);
  document.getElementById('startBtn').textContent = 'Start Battle';
}

function resetGame() {
  game.running = false;
  game.bullets = [];
  game.enemies = [];
  game.particles = [];
  game.powerups = [];
  game.score = 0;
  game.level = 1;
  game.player.health = 100;
  game.enemySpawnRate = 0.02;
  updateDisplay();
  document.getElementById('startBtn').textContent = 'Start Battle';
  
  const gradient = ctx.createRadialGradient(400, 300, 0, 400, 300, 400);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
</script>
</body>
</html>`;
}

function createPuzzleGame(title: string, description: string): string {
  const colors = ['#9B59B6', '#3498DB', '#E74C3C', '#F39C12', '#2ECC71', '#E67E22'];
  const primaryColor = colors[Math.floor(Math.random() * colors.length)];
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  background: linear-gradient(45deg, #667eea 0%, #764ba2 100%); 
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
  padding: 30px;
  text-align: center;
}
.puzzle-grid {
  display: grid;
  grid-template-columns: repeat(4, 80px);
  gap: 5px;
  margin: 20px auto;
  padding: 20px;
  background: rgba(255,255,255,0.1);
  border-radius: 15px;
}
.puzzle-tile {
  width: 80px;
  height: 80px;
  background: ${primaryColor};
  border: 2px solid white;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  transition: all 0.3s;
}
.puzzle-tile:hover { transform: scale(1.1); }
.puzzle-tile.matched { background: #2ECC71; }
.hud { font-size: 18px; margin: 15px 0; }
button { 
  padding: 12px 24px; 
  background: linear-gradient(45deg, ${primaryColor}, #E74C3C);
  color: white; 
  border: none; 
  border-radius: 25px; 
  cursor: pointer; 
  font-size: 16px;
  margin: 5px;
}
</style>
</head>
<body>
<div class="game-container">
  <h1>${title}</h1>
  <p>${description}</p>
  <div class="hud">Score: <span id="score">0</span> | Moves: <span id="moves">0</span></div>
  <div class="puzzle-grid" id="grid"></div>
  <button onclick="startGame()">New Puzzle</button>
</div>

<script>
let game = {
  grid: [],
  score: 0,
  moves: 0,
  symbols: ['🌟', '🎯', '🔥', '💎', '⚡', '🌈', '🎪', '🎨']
};

function startGame() {
  game.score = 0;
  game.moves = 0;
  generatePuzzle();
  updateDisplay();
}

function generatePuzzle() {
  const gridElement = document.getElementById('grid');
  gridElement.innerHTML = '';
  game.grid = [];
  
  // Create pairs of symbols
  const symbols = [];
  for (let i = 0; i < 8; i++) {
    symbols.push(game.symbols[i], game.symbols[i]);
  }
  
  // Shuffle
  for (let i = symbols.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
  }
  
  // Create tiles
  symbols.forEach((symbol, index) => {
    const tile = document.createElement('div');
    tile.className = 'puzzle-tile';
    tile.textContent = '?';
    tile.dataset.symbol = symbol;
    tile.dataset.index = index;
    tile.onclick = () => flipTile(tile);
    gridElement.appendChild(tile);
    game.grid.push({ element: tile, symbol: symbol, flipped: false, matched: false });
  });
}

let flippedTiles = [];

function flipTile(tile) {
  if (flippedTiles.length >= 2 || tile.classList.contains('matched')) return;
  
  const index = parseInt(tile.dataset.index);
  const gridItem = game.grid[index];
  
  if (gridItem.flipped) return;
  
  tile.textContent = gridItem.symbol;
  gridItem.flipped = true;
  flippedTiles.push(gridItem);
  
  if (flippedTiles.length === 2) {
    game.moves++;
    setTimeout(checkMatch, 1000);
  }
  
  updateDisplay();
}

function checkMatch() {
  if (flippedTiles[0].symbol === flippedTiles[1].symbol) {
    // Match!
    flippedTiles.forEach(item => {
      item.matched = true;
      item.element.classList.add('matched');
    });
    game.score += 10;
    
    // Check win
    if (game.grid.every(item => item.matched)) {
      setTimeout(() => alert('Puzzle Complete! Score: ' + game.score), 500);
    }
  } else {
    // No match
    flippedTiles.forEach(item => {
      item.flipped = false;
      item.element.textContent = '?';
    });
  }
  
  flippedTiles = [];
  updateDisplay();
}

function updateDisplay() {
  document.getElementById('score').textContent = game.score;
  document.getElementById('moves').textContent = game.moves;
}

startGame();
</script>
</body>
</html>`;
}

function createPlatformerGame(title: string, description: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  background: linear-gradient(180deg, #87CEEB 0%, #98FB98 100%); 
  font-family: Arial, sans-serif; 
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
.game-container {
  background: rgba(0,0,0,0.1);
  border-radius: 20px;
  padding: 20px;
  text-align: center;
}
#gameCanvas { 
  border: 3px solid #4169E1;
  border-radius: 15px;
  background: linear-gradient(180deg, #87CEEB 0%, #228B22 100%);
}
.hud { 
  display: flex;
  justify-content: space-between;
  margin: 15px 0;
  font-size: 18px;
  font-weight: bold;
  color: #4169E1;
}
button { 
  padding: 12px 24px; 
  background: linear-gradient(45deg, #4169E1, #32CD32);
  color: white; 
  border: none; 
  border-radius: 25px; 
  cursor: pointer; 
  font-size: 16px;
  margin: 5px;
}
.controls { font-size: 14px; margin: 10px 0; color: #4169E1; }
</style>
</head>
<body>
<div class="game-container">
  <h1>${title}</h1>
  <p>${description}</p>
  <div class="hud">
    <div>Score: <span id="score">0</span></div>
    <div>Lives: <span id="lives">3</span></div>
  </div>
  <canvas id="gameCanvas" width="800" height="600"></canvas>
  <div class="controls">ARROW KEYS to move • SPACEBAR to jump • Collect coins!</div>
  <button onclick="startGame()" id="startBtn">Start Adventure</button>
</div>

<script>
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let game = {
  player: { x: 50, y: 400, width: 30, height: 40, vx: 0, vy: 0, onGround: false, speed: 5 },
  platforms: [],
  coins: [],
  enemies: [],
  particles: [],
  score: 0,
  lives: 3,
  running: false,
  keys: {},
  camera: { x: 0, y: 0 }
};

document.addEventListener('keydown', (e) => game.keys[e.code] = true);
document.addEventListener('keyup', (e) => game.keys[e.code] = false);

function startGame() {
  if (game.running) return;
  game.running = true;
  document.getElementById('startBtn').textContent = 'Playing...';
  generateLevel();
  gameLoop();
}

function gameLoop() {
  if (!game.running) return;
  update();
  render();
  requestAnimationFrame(gameLoop);
}

function update() {
  // Player movement
  if (game.keys['ArrowLeft']) game.player.vx = -game.player.speed;
  else if (game.keys['ArrowRight']) game.player.vx = game.player.speed;
  else game.player.vx *= 0.8;
  
  if (game.keys['Space'] && game.player.onGround) {
    game.player.vy = -15;
    game.player.onGround = false;
  }
  
  // Gravity
  game.player.vy += 0.8;
  
  // Update player position
  game.player.x += game.player.vx;
  game.player.y += game.player.vy;
  
  // Platform collisions
  game.player.onGround = false;
  game.platforms.forEach(platform => {
    if (game.player.x < platform.x + platform.width &&
        game.player.x + game.player.width > platform.x &&
        game.player.y < platform.y + platform.height &&
        game.player.y + game.player.height > platform.y) {
      
      if (game.player.vy > 0 && game.player.y < platform.y) {
        game.player.y = platform.y - game.player.height;
        game.player.vy = 0;
        game.player.onGround = true;
      }
    }
  });
  
  // Coin collection
  game.coins.forEach((coin, i) => {
    if (isColliding(game.player, coin)) {
      game.score += 10;
      createCoinEffect(coin.x, coin.y);
      game.coins.splice(i, 1);
    }
  });
  
  // Update particles
  game.particles.forEach((p, i) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 16;
    if (p.life <= 0) game.particles.splice(i, 1);
  });
  
  // Camera follow player
  game.camera.x = game.player.x - 400;
  
  // Boundaries
  if (game.player.y > canvas.height) {
    game.lives--;
    if (game.lives <= 0) endGame();
    else resetPlayerPosition();
  }
  
  updateDisplay();
}

function render() {
  // Sky gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#87CEEB');
  gradient.addColorStop(1, '#98FB98');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  ctx.translate(-game.camera.x, 0);
  
  // Draw platforms
  game.platforms.forEach(platform => {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    ctx.fillStyle = '#228B22';
    ctx.fillRect(platform.x, platform.y - 5, platform.width, 5);
  });
  
  // Draw coins
  game.coins.forEach(coin => {
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(coin.x + coin.width/2, coin.y + coin.height/2, coin.width/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  
  // Draw player
  ctx.fillStyle = '#FF6B6B';
  ctx.fillRect(game.player.x, game.player.y, game.player.width, game.player.height);
  ctx.fillStyle = '#FFF';
  ctx.fillRect(game.player.x + 5, game.player.y + 5, 8, 8);
  ctx.fillRect(game.player.x + 17, game.player.y + 5, 8, 8);
  
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
  
  ctx.restore();
}

function generateLevel() {
  game.platforms = [
    { x: 0, y: 550, width: 200, height: 50 },
    { x: 300, y: 450, width: 150, height: 20 },
    { x: 500, y: 350, width: 150, height: 20 },
    { x: 700, y: 250, width: 150, height: 20 },
    { x: 900, y: 400, width: 200, height: 20 },
    { x: 1200, y: 300, width: 150, height: 20 }
  ];
  
  game.coins = [
    { x: 320, y: 420, width: 20, height: 20 },
    { x: 520, y: 320, width: 20, height: 20 },
    { x: 720, y: 220, width: 20, height: 20 },
    { x: 950, y: 370, width: 20, height: 20 }
  ];
}

function createCoinEffect(x, y) {
  for (let i = 0; i < 8; i++) {
    game.particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      color: '#FFD700',
      size: Math.random() * 4 + 2,
      life: 1000
    });
  }
}

function isColliding(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function resetPlayerPosition() {
  game.player.x = 50;
  game.player.y = 400;
  game.player.vx = 0;
  game.player.vy = 0;
}

function updateDisplay() {
  document.getElementById('score').textContent = game.score;
  document.getElementById('lives').textContent = game.lives;
}

function endGame() {
  game.running = false;
  alert('Game Over! Final Score: ' + game.score);
  document.getElementById('startBtn').textContent = 'Start Adventure';
}
</script>
</body>
</html>`;
}

function createRhythmGame(title: string, description: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  background: linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4); 
  background-size: 400% 400%;
  animation: gradientShift 3s ease infinite;
  font-family: Arial, sans-serif; 
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: white;
}
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.game-container {
  background: rgba(0,0,0,0.3);
  border-radius: 20px;
  padding: 20px;
  text-align: center;
}
#gameCanvas { 
  border: 3px solid #FFF;
  border-radius: 15px;
  background: radial-gradient(circle, #1a1a2e 0%, #16213e 100%);
}
.hud { 
  display: flex;
  justify-content: space-between;
  margin: 15px 0;
  font-size: 18px;
  font-weight: bold;
}
button { 
  padding: 12px 24px; 
  background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
  color: white; 
  border: none; 
  border-radius: 25px; 
  cursor: pointer; 
  font-size: 16px;
  margin: 5px;
}
.controls { font-size: 14px; margin: 10px 0; }
</style>
</head>
<body>
<div class="game-container">
  <h1>${title}</h1>
  <p>${description}</p>
  <div class="hud">
    <div>Score: <span id="score">0</span></div>
    <div>Combo: <span id="combo">0</span></div>
  </div>
  <canvas id="gameCanvas" width="800" height="600"></canvas>
  <div class="controls">Press SPACEBAR when circles reach the target! Feel the rhythm!</div>
  <button onclick="startGame()" id="startBtn">Start Rhythm</button>
</div>

<script>
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let game = {
  notes: [],
  particles: [],
  score: 0,
  combo: 0,
  running: false,
  keys: {},
  beat: 0,
  targetY: 500,
  colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
};

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && game.running) {
    e.preventDefault();
    hitNote();
  }
});

function startGame() {
  if (game.running) return;
  game.running = true;
  document.getElementById('startBtn').textContent = 'Playing...';
  game.beat = 0;
  spawnNotes();
  gameLoop();
}

function gameLoop() {
  if (!game.running) return;
  update();
  render();
  requestAnimationFrame(gameLoop);
}

function update() {
  game.beat += 0.02;
  
  // Update notes
  game.notes.forEach((note, i) => {
    note.y += note.speed;
    note.pulse = Math.sin(game.beat * 10) * 0.2 + 1;
    
    if (note.y > canvas.height + 50) {
      game.notes.splice(i, 1);
      game.combo = 0; // Miss breaks combo
    }
  });
  
  // Update particles
  game.particles.forEach((p, i) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 16;
    p.size *= 0.98;
    if (p.life <= 0) game.particles.splice(i, 1);
  });
  
  // Spawn new notes
  if (Math.random() < 0.03) {
    spawnNote();
  }
  
  updateDisplay();
}

function render() {
  // Animated background
  const gradient = ctx.createRadialGradient(400, 300, 0, 400, 300, 400);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw beat visualization
  const beatIntensity = Math.sin(game.beat * 20) * 0.5 + 0.5;
  ctx.strokeStyle = 'rgba(255,255,255,' + (beatIntensity * 0.3) + ')';
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(400, 300, 50 + i * 30 + beatIntensity * 20, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Draw target line
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, game.targetY);
  ctx.lineTo(canvas.width, game.targetY);
  ctx.stroke();
  
  // Draw target zone
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(0, game.targetY - 30, canvas.width, 60);
  
  // Draw notes
  game.notes.forEach(note => {
    ctx.save();
    ctx.translate(note.x, note.y);
    ctx.scale(note.pulse, note.pulse);
    
    // Outer glow
    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, note.size + 10);
    glowGradient.addColorStop(0, note.color);
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, note.size + 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Main note
    ctx.fillStyle = note.color;
    ctx.beginPath();
    ctx.arc(0, 0, note.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-note.size/3, -note.size/3, note.size/3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  });
  
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
  
  // Draw combo multiplier
  if (game.combo > 0) {
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('x' + game.combo, 400, 100);
  }
}

function spawnNotes() {
  // Initial notes
  for (let i = 0; i < 3; i++) {
    setTimeout(() => spawnNote(), i * 1000);
  }
}

function spawnNote() {
  const lanes = [200, 300, 400, 500, 600];
  const lane = lanes[Math.floor(Math.random() * lanes.length)];
  const color = game.colors[Math.floor(Math.random() * game.colors.length)];
  
  game.notes.push({
    x: lane,
    y: -50,
    size: 25,
    speed: 3 + Math.random() * 2,
    color: color,
    pulse: 1
  });
}

function hitNote() {
  let hit = false;
  
  game.notes.forEach((note, i) => {
    const distance = Math.abs(note.y - game.targetY);
    
    if (distance < 50) { // Hit zone
      let points = 10;
      if (distance < 20) points = 50; // Perfect hit
      else if (distance < 35) points = 25; // Good hit
      
      game.score += points * (game.combo + 1);
      game.combo++;
      
      createHitEffect(note.x, note.y, note.color, points);
      game.notes.splice(i, 1);
      hit = true;
    }
  });
  
  if (!hit) {
    game.combo = 0; // Miss breaks combo
    createMissEffect();
  }
}

function createHitEffect(x, y, color, points) {
  // Explosion particles
  for (let i = 0; i < 15; i++) {
    game.particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      color: color,
      size: Math.random() * 6 + 3,
      life: 1000
    });
  }
}

function createMissEffect() {
  // Red flash effect
  for (let i = 0; i < 10; i++) {
    game.particles.push({
      x: 400 + (Math.random() - 0.5) * 200,
      y: game.targetY + (Math.random() - 0.5) * 100,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      color: '#FF4444',
      size: Math.random() * 4 + 2,
      life: 500
    });
  }
}

function updateDisplay() {
  document.getElementById('score').textContent = game.score;
  document.getElementById('combo').textContent = game.combo;
}
</script>
</body>
</html>`;
}

function createAdaptiveGame(title: string, description: string): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const primaryColor = colors[Math.floor(Math.random() * colors.length)];
  const secondaryColor = colors[Math.floor(Math.random() * colors.length)];
  
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
  font-family: 'Courier New', monospace; 
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: white;
}
.game-container { 
  background: rgba(0,0,0,0.3); 
  padding: 40px; 
  border-radius: 20px; 
  max-width: 900px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  text-align: center;
  border: 2px solid ${primaryColor};
}
#gameCanvas { 
  border: 3px solid ${primaryColor};
  border-radius: 15px;
  background: radial-gradient(circle, #1a1a2e 0%, #16213e 100%);
  display: block;
  margin: 20px auto;
  box-shadow: 0 0 20px ${primaryColor}40;
}
.hud { 
  display: flex;
  justify-content: space-between;
  margin: 15px 0;
  font-size: 18px;
  font-weight: bold;
  color: ${primaryColor};
}
button { 
  padding: 12px 24px; 
  background: linear-gradient(45deg, ${primaryColor}, ${secondaryColor});
  color: white; 
  border: none; 
  border-radius: 25px; 
  cursor: pointer; 
  font-size: 16px;
  margin: 5px;
  transition: all 0.3s;
}
button:hover { transform: scale(1.05); box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
h1 { color: ${primaryColor}; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); margin-bottom: 10px; }
.controls { font-size: 14px; margin: 10px 0; opacity: 0.9; }
</style>
</head>
<body>
<div class="game-container">
  <h1>${title}</h1>
  <p style="margin-bottom: 15px; font-size: 14px;">${description}</p>
  
  <div class="hud">
    <div>Score: <span id="score">0</span></div>
    <div>Level: <span id="level">1</span></div>
    <div>Time: <span id="time">60</span>s</div>
  </div>
  
  <canvas id="gameCanvas" width="800" height="600"></canvas>
  
  <div class="controls">CLICK to interact • WASD to move • Collect items and avoid obstacles!</div>
  
  <button onclick="startGame()" id="startBtn">Start Game</button>
  <button onclick="resetGame()">Reset</button>
</div>

<script>
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let game = {
  player: { x: 400, y: 300, width: 30, height: 30, vx: 0, vy: 0, speed: 4 },
  objects: [],
  particles: [],
  score: 0,
  level: 1,
  time: 60,
  running: false,
  keys: {},
  mouseX: 0,
  mouseY: 0,
  gameMode: 'collect' // collect, avoid, shoot
};

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  game.mouseX = e.clientX - rect.left;
  game.mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', () => {
  if (game.running) handleClick();
});

document.addEventListener('keydown', (e) => game.keys[e.code] = true);
document.addEventListener('keyup', (e) => game.keys[e.code] = false);

function startGame() {
  if (game.running) return;
  game.running = true;
  document.getElementById('startBtn').textContent = 'Playing...';
  spawnObjects();
  gameLoop();
  
  // Timer
  const timer = setInterval(() => {
    if (!game.running) {
      clearInterval(timer);
      return;
    }
    game.time--;
    if (game.time <= 0) {
      endGame();
      clearInterval(timer);
    }
  }, 1000);
}

function gameLoop() {
  if (!game.running) return;
  update();
  render();
  requestAnimationFrame(gameLoop);
}

function update() {
  // Player movement
  if (game.keys['KeyW'] && game.player.y > 20) game.player.y -= game.player.speed;
  if (game.keys['KeyS'] && game.player.y < canvas.height - 50) game.player.y += game.player.speed;
  if (game.keys['KeyA'] && game.player.x > 20) game.player.x -= game.player.speed;
  if (game.keys['KeyD'] && game.player.x < canvas.width - 50) game.player.x += game.player.speed;
  
  // Update objects
  game.objects.forEach((obj, i) => {
    obj.x += obj.vx;
    obj.y += obj.vy;
    obj.rotation += 0.05;
    
    // Bounce off walls
    if (obj.x <= 0 || obj.x >= canvas.width - obj.width) obj.vx *= -1;
    if (obj.y <= 0 || obj.y >= canvas.height - obj.height) obj.vy *= -1;
    
    // Check collision with player
    if (isColliding(game.player, obj)) {
      if (obj.type === 'good') {
        game.score += 10;
        createCollectEffect(obj.x, obj.y);
        game.objects.splice(i, 1);
      } else if (obj.type === 'bad') {
        game.score = Math.max(0, game.score - 5);
        createHitEffect(obj.x, obj.y);
        game.objects.splice(i, 1);
      }
    }
  });
  
  // Update particles
  game.particles.forEach((p, i) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 16;
    p.size *= 0.98;
    if (p.life <= 0) game.particles.splice(i, 1);
  });
  
  // Spawn new objects
  if (Math.random() < 0.02) {
    spawnObject();
  }
  
  // Level progression
  if (game.score > game.level * 100) {
    game.level++;
    game.player.speed += 0.5;
  }
  
  updateDisplay();
}

function render() {
  // Clear with animated background
  const gradient = ctx.createRadialGradient(400, 300, 0, 400, 300, 400);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw grid pattern
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < canvas.width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i < canvas.height; i += 50) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }
  
  // Draw player
  ctx.save();
  ctx.translate(game.player.x + game.player.width/2, game.player.y + game.player.height/2);
  const playerAngle = Math.atan2(game.mouseY - game.player.y, game.mouseX - game.player.x);
  ctx.rotate(playerAngle);
  ctx.fillStyle = '${primaryColor}';
  ctx.fillRect(-15, -15, 30, 30);
  ctx.fillStyle = '${secondaryColor}';
  ctx.fillRect(10, -5, 10, 10);
  ctx.restore();
  
  // Draw objects
  game.objects.forEach(obj => {
    ctx.save();
    ctx.translate(obj.x + obj.width/2, obj.y + obj.height/2);
    ctx.rotate(obj.rotation);
    ctx.fillStyle = obj.color;
    ctx.fillRect(-obj.width/2, -obj.height/2, obj.width, obj.height);
    
    // Add symbol
    ctx.fillStyle = '#FFF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(obj.symbol, 0, 5);
    ctx.restore();
  });
  
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
  
  // Draw connection line to mouse
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(game.player.x + game.player.width/2, game.player.y + game.player.height/2);
  ctx.lineTo(game.mouseX, game.mouseY);
  ctx.stroke();
}

function spawnObjects() {
  for (let i = 0; i < 5; i++) {
    setTimeout(() => spawnObject(), i * 500);
  }
}

function spawnObject() {
  const isGood = Math.random() > 0.4;
  const colors = isGood ? ['#00FF00', '#00FFFF', '#FFFF00'] : ['#FF0000', '#FF4444', '#FF6666'];
  const symbols = isGood ? ['★', '♦', '●'] : ['✖', '▲', '■'];
  
  game.objects.push({
    x: Math.random() * (canvas.width - 30),
    y: Math.random() * (canvas.height - 30),
    width: 25,
    height: 25,
    vx: (Math.random() - 0.5) * 3,
    vy: (Math.random() - 0.5) * 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    symbol: symbols[Math.floor(Math.random() * symbols.length)],
    type: isGood ? 'good' : 'bad',
    rotation: 0
  });
}

function handleClick() {
  // Create click effect
  createClickEffect(game.mouseX, game.mouseY);
  
  // Check if clicked on any objects
  game.objects.forEach((obj, i) => {
    if (game.mouseX >= obj.x && game.mouseX <= obj.x + obj.width &&
        game.mouseY >= obj.y && game.mouseY <= obj.y + obj.height) {
      if (obj.type === 'good') {
        game.score += 20;
        createCollectEffect(obj.x, obj.y);
      } else {
        game.score = Math.max(0, game.score - 10);
        createHitEffect(obj.x, obj.y);
      }
      game.objects.splice(i, 1);
    }
  });
}

function createCollectEffect(x, y) {
  for (let i = 0; i < 10; i++) {
    game.particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      color: '#00FF00',
      size: Math.random() * 4 + 2,
      life: 1000
    });
  }
}

function createHitEffect(x, y) {
  for (let i = 0; i < 8; i++) {
    game.particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      color: '#FF4444',
      size: Math.random() * 5 + 3,
      life: 800
    });
  }
}

function createClickEffect(x, y) {
  for (let i = 0; i < 6; i++) {
    game.particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      color: '${primaryColor}',
      size: Math.random() * 3 + 2,
      life: 600
    });
  }
}

function isColliding(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function updateDisplay() {
  document.getElementById('score').textContent = game.score;
  document.getElementById('level').textContent = game.level;
  document.getElementById('time').textContent = game.time;
}

function endGame() {
  game.running = false;
  alert('Game Complete! Final Score: ' + game.score);
  document.getElementById('startBtn').textContent = 'Start Game';
}

function resetGame() {
  game.running = false;
  game.objects = [];
  game.particles = [];
  game.score = 0;
  game.level = 1;
  game.time = 60;
  game.player.speed = 4;
  updateDisplay();
  document.getElementById('startBtn').textContent = 'Start Game';
  
  const gradient = ctx.createRadialGradient(400, 300, 0, 400, 300, 400);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
</script>
</body>
</html>`;
}