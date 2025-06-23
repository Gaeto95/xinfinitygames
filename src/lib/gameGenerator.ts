interface GameIdea {
  title: string;
  description: string;
}

interface GeneratedGame {
  title: string;
  code: string;
}

// Mock GPT API calls for development
const mockGameIdeas: GameIdea[] = [
  {
    title: "Pixel Pet Therapist",
    description: "A counseling session with pixelated creatures who have existential crises"
  },
  {
    title: "Interdimensional Laundromat",
    description: "Sort clothes from different dimensions while avoiding reality tears"
  },
  {
    title: "Quantum Cat Herder",
    description: "Herd cats that exist in multiple states simultaneously"
  },
  {
    title: "Bureaucratic Wizard",
    description: "Cast spells by filling out the correct magical paperwork"
  },
  {
    title: "Time Loop Coffee Shop",
    description: "Serve increasingly demanding customers in a repeating time loop"
  }
];

const mockGameCodes: Record<string, string> = {
  "Pixel Pet Therapist": `
<!DOCTYPE html>
<html>
<head>
  <title>Pixel Pet Therapist</title>
  <style>
    body { margin: 0; padding: 20px; background: #1a1a2e; color: #eee; font-family: monospace; }
    .game-container { max-width: 600px; margin: 0 auto; text-align: center; }
    .pet { width: 100px; height: 100px; background: #ff6b6b; margin: 20px auto; border-radius: 10px; cursor: pointer; transition: all 0.3s; }
    .pet:hover { background: #ffd93d; transform: scale(1.1); }
    .dialogue { background: #16213e; padding: 15px; border-radius: 10px; margin: 20px 0; min-height: 100px; }
    .options { display: flex; gap: 10px; justify-content: center; }
    .option { background: #6c5ce7; padding: 10px 20px; border: none; border-radius: 5px; color: white; cursor: pointer; }
    .option:hover { background: #a29bfe; }
  </style>
</head>
<body>
  <div class="game-container">
    <h1>🎮 Pixel Pet Therapist</h1>
    <div class="pet" id="pet"></div>
    <div class="dialogue" id="dialogue">Click the pet to start the session...</div>
    <div class="options" id="options"></div>
    <div>Score: <span id="score">0</span></div>
  </div>
  <script>
    let score = 0;
    const problems = [
      { text: "I feel like I'm just a collection of pixels... Am I real?", responses: ["You're as real as any of us", "Reality is subjective", "Have you tried meditation?"] },
      { text: "Every day is the same 60fps loop...", responses: ["Let's explore that feeling", "Change starts with you", "Maybe try 30fps?"] },
      { text: "I think my creator doesn't love me anymore...", responses: ["That's not true", "Love takes many forms", "Have you talked to them?"] }
    ];
    let currentProblem = 0;
    
    document.getElementById('pet').onclick = function() {
      if (currentProblem < problems.length) {
        showProblem(problems[currentProblem]);
      } else {
        document.getElementById('dialogue').innerHTML = "Thank you, doctor! I feel much better. Final Score: " + score;
        document.getElementById('options').innerHTML = "";
      }
    };
    
    function showProblem(problem) {
      document.getElementById('dialogue').innerHTML = problem.text;
      const optionsDiv = document.getElementById('options');
      optionsDiv.innerHTML = '';
      problem.responses.forEach((response, i) => {
        const btn = document.createElement('button');
        btn.className = 'option';
        btn.textContent = response;
        btn.onclick = () => {
          score += Math.floor(Math.random() * 10) + 1;
          document.getElementById('score').textContent = score;
          currentProblem++;
          setTimeout(() => document.getElementById('pet').click(), 1000);
        };
        optionsDiv.appendChild(btn);
      });
    }
  </script>
</body>
</html>`,
  
  "Interdimensional Laundromat": `
<!DOCTYPE html>
<html>
<head>
  <title>Interdimensional Laundromat</title>
  <style>
    body { margin: 0; padding: 20px; background: linear-gradient(45deg, #667eea, #764ba2); color: white; font-family: Arial, sans-serif; }
    .game-area { max-width: 800px; margin: 0 auto; }
    .machine { width: 150px; height: 200px; background: #2c3e50; border-radius: 10px; margin: 10px; display: inline-block; position: relative; }
    .clothes { width: 30px; height: 30px; border-radius: 50%; position: absolute; cursor: pointer; transition: all 0.3s; }
    .clothes:hover { transform: scale(1.2); }
    .dimension-1 { background: #ff6b6b; }
    .dimension-2 { background: #4ecdc4; }
    .dimension-3 { background: #ffe66d; }
    .timer { font-size: 24px; text-align: center; margin: 20px 0; }
    .score { text-align: center; font-size: 20px; }
  </style>
</head>
<body>
  <div class="game-area">
    <h1>🌀 Interdimensional Laundromat</h1>
    <div class="timer">Time: <span id="timer">60</span>s</div>
    <div class="score">Score: <span id="score">0</span></div>
    <div id="machines"></div>
    <div id="clothes-area"></div>
  </div>
  <script>
    let score = 0;
    let timeLeft = 60;
    let gameActive = true;
    
    // Create machines
    const machinesDiv = document.getElementById('machines');
    for (let i = 0; i < 3; i++) {
      const machine = document.createElement('div');
      machine.className = 'machine';
      machine.dataset.dimension = i + 1;
      machine.innerHTML = '<div style="text-align:center;padding-top:80px;">Dimension ' + (i + 1) + '</div>';
      machinesDiv.appendChild(machine);
    }
    
    // Spawn clothes
    function spawnClothes() {
      if (!gameActive) return;
      const clothesArea = document.getElementById('clothes-area');
      const clothes = document.createElement('div');
      clothes.className = 'clothes dimension-' + (Math.floor(Math.random() * 3) + 1);
      clothes.style.left = Math.random() * 700 + 'px';
      clothes.style.top = Math.random() * 200 + 400 + 'px';
      
      clothes.onclick = function() {
        const dimension = this.className.split(' ')[1].split('-')[1];
        score += 10;
        document.getElementById('score').textContent = score;
        this.remove();
      };
      
      clothesArea.appendChild(clothes);
      setTimeout(() => clothes.remove(), 3000);
    }
    
    // Timer
    setInterval(() => {
      timeLeft--;
      document.getElementById('timer').textContent = timeLeft;
      if (timeLeft <= 0) {
        gameActive = false;
        alert('Game Over! Final Score: ' + score);
      }
    }, 1000);
    
    // Spawn clothes every 500ms
    setInterval(spawnClothes, 500);
  </script>
</body>
</html>`
};

export async function generateGameIdea(): Promise<GameIdea> {
  // In production, this would call the actual OpenAI API
  // For now, return a random mock idea
  const randomIdea = mockGameIdeas[Math.floor(Math.random() * mockGameIdeas.length)];
  return randomIdea;
}

export async function generateGameCode(idea: GameIdea): Promise<GeneratedGame> {
  // In production, this would call the actual OpenAI API to generate code
  // For now, return mock code or generate a simple template
  const code = mockGameCodes[idea.title] || generateSimpleGame(idea);
  
  return {
    title: idea.title,
    code: code
  };
}

function generateSimpleGame(idea: GameIdea): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>${idea.title}</title>
  <style>
    body { 
      margin: 0; 
      padding: 20px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      font-family: 'Courier New', monospace; 
      text-align: center;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    .game-container { 
      background: rgba(0,0,0,0.3); 
      padding: 40px; 
      border-radius: 20px; 
      max-width: 600px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .game-element { 
      width: 100px; 
      height: 100px; 
      background: #ff6b6b; 
      margin: 20px auto; 
      border-radius: 15px; 
      cursor: pointer; 
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    .game-element:hover { 
      background: #ffd93d; 
      transform: scale(1.1) rotate(5deg); 
    }
    .score { 
      font-size: 24px; 
      margin: 20px 0; 
      color: #ffd93d;
    }
    h1 { color: #ffd93d; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }
  </style>
</head>
<body>
  <div class="game-container">
    <h1>🎮 ${idea.title}</h1>
    <p>${idea.description}</p>
    <div class="game-element" onclick="play()">🎯</div>
    <div class="score">Score: <span id="score">0</span></div>
    <p><em>Click the element to play!</em></p>
  </div>
  <script>
    let score = 0;
    function play() {
      score += Math.floor(Math.random() * 10) + 1;
      document.getElementById('score').textContent = score;
      document.querySelector('.game-element').style.background = 
        '#' + Math.floor(Math.random()*16777215).toString(16);
    }
  </script>
</body>
</html>`;
}