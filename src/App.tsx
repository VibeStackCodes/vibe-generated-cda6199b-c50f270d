import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Position = { x: number; y: number };
type BuilderCell = { x: number; y: number; kind: 'food' | 'obstacle' };
type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

type GameConfig = {
  gridSize: number;
  initialSnake: Position[];
  initialDir: Dir;
  obstacles: Position[];
  foods: Position[]; // pre-placed foods from builder
  speed: number; // moves per second
};

const GRID_SIZE = 20;
const CELL = 28; // px, used for preview sizing
const START_SNAKE: Position[] = [
  { x: Math.floor(GRID_SIZE / 2) - 1, y: Math.floor(GRID_SIZE / 2) },
  { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) },
  { x: Math.floor(GRID_SIZE / 2) + 1, y: Math.floor(GRID_SIZE / 2) },
];

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function randomEmptyCell(occupied: Set<string>, gridSize: number): Position | null {
  const empty: Position[] = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) empty.push({ x, y });
    }
  }
  if (empty.length === 0) return null;
  return empty[Math.floor(Math.random() * empty.length)];
}

function keyFor(p: Position) {
  return `${p.x},${p.y}`;
}

function useKeyDirection(onDirection: (d: Dir) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
        w: 'UP',
        W: 'UP',
        s: 'DOWN',
        S: 'DOWN',
        a: 'LEFT',
        A: 'LEFT',
        d: 'RIGHT',
        D: 'RIGHT',
      };
      const key = e.key;
      if (key in map) {
        e.preventDefault();
        onDirection(map[key]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDirection]);
}

function exportHTML(config: GameConfig, snake: Position[], foods: Position[], obstacles: Position[]) {
  // Simple HTML5/JS export replicating the config
  const grid = config.gridSize;
  const snakeStr = JSON.stringify(snake);
  const foodsStr = JSON.stringify(foods);
  const obsStr = JSON.stringify(obstacles);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>SnakeKit Live Preview</title>
<style>html,body{margin:0;height:100%;} canvas{ display:block; margin:0 auto; background:#111; }</style>
</head>
<body>
<canvas id="snakeGame" width="${grid * 24}" height="${grid * 24}"></canvas>
<script>
const GRID = ${grid};
const CELL = 24;
const canvas = document.getElementById('snakeGame');
const ctx = canvas.getContext('2d');
let snake = ${snakeStr};
let dir = { x:1, y:0 };
let foods = ${foodsStr};
let obstacles = ${obsStr};
let speed = 8;
let paused = false;
let gameOver = false;
function drawGrid(){
  ctx.clearRect(0,0,canvas.width, canvas.height);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0,0, canvas.width, canvas.height);
  // grid lines
  ctx.strokeStyle = '#1f1f1f';
  for(let i=0;i<=GRID;i++){
    ctx.beginPath(); ctx.moveTo(i*CELL,0); ctx.lineTo(i*CELL, GRID*CELL); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,i*CELL); ctx.lineTo(GRID*CELL, i*CELL); ctx.stroke();
  }
}
function drawSnake(){
  ctx.fillStyle = '#6ee7b7';
  for (const p of snake){ ctx.fillRect(p.x*CELL+2, p.y*CELL+2, CELL-4, CELL-4); }
}
function drawFoods(){ ctx.fillStyle = '#f87171'; foods.forEach(f => ctx.fillRect(f.x*CELL+6, f.y*CELL+6, CELL-12, CELL-12)); }
function drawObst(){ ctx.fillStyle = '#9ca3af'; obstacles.forEach(o => ctx.fillRect(o.x*CELL+4, o.y*CELL+4, CELL-8, CELL-8)); }
function step(){ if (gameOver || paused) return; const head = snake[0]; const nx = head.x + dir.x; const ny = head.y + dir.y; // wall collision
 if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) { gameOver = true; return; }
 const hitSelf = snake.some((s)=> s.x===nx && s.y===ny);
 if (hitSelf) { gameOver = true; return; }
 // obstacle
 if (obstacles.some(o => o.x===nx && o.y===ny)) { gameOver = true; return; }
 const ateFoodIndex = foods.findIndex(f => f.x===nx && f.y===ny);
 snake.unshift({x:nx, y:ny});
 if (ateFoodIndex >= 0){ foods.splice(ateFoodIndex,1); // grow and spawn new food
 const occ = new Set<string>([...snake.map(p=>`${p.x},${p.y}`)]);
 const f = null;
 const newFood = (function(){ const c = null; return null; })();
 // try to spawn a new food
 const spawn = (occupiedSet)=>{
  const c = Math.random(); if (c>0) {
    const p = { x: Math.floor(Math.random()*GRID), y: Math.floor(Math.random()*GRID) };
    if (!occupiedSet.has(`${p.x},${p.y}`)) {
      foods.push(p); return;
    }
  }
  if (foods.length < 5) { foods.push({x: Math.floor(Math.random()*GRID), y: Math.floor(Math.random()*GRID)}); }
 };
 spawn(new Set<string>(snake.map(p=>`${p.x},${p.y}`)).add(...obstacles.map(o=>`${o.x},${o.y}`) as any));
 } else {
  snake.pop();
 }
}
function render(){ drawGrid(); drawFoods(); drawObst(); drawSnake(); if (gameOver){ ctx.fillStyle='white'; ctx.font='20px sans-serif'; ctx.fillText('Game Over', canvas.width/2-60, canvas.height/2); } }
let last = 0;
function loop(ts){ if (!last) last = ts; const dt = ts - last; last = ts; step(); render(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
window.addEventListener('keydown', (e)=>{
  const k = e.key;
  const map = {ArrowUp:'UP', ArrowDown:'DOWN', ArrowLeft:'LEFT', ArrowRight:'RIGHT'};
  if (k in map){ const nd = map[k as keyof typeof map] as string; const cdir = { UP:['LEFT','RIGHT'].includes(nd)? 'UP': 'UP', DOWN:'DOWN' } as any; const ndir = nd as string;
    // prevent reverse
    const opposite = (dir === 'UP' && ndir==='DOWN') || (dir==='DOWN' && ndir==='UP') || (dir==='LEFT' && ndir==='RIGHT') || (dir==='RIGHT' && ndir==='LEFT');
    if (!opposite) {
      if (ndir==='UP') dir.y = -1, dir.x = 0; else if (ndir==='DOWN') dir.y = 1, dir.x = 0; else if (ndir==='LEFT') dir.x = -1, dir.y = 0; else if (ndir==='RIGHT') dir.x = 1, dir.y = 0;
    }
  }
});
</script>
</body>
</html>`;
  return html;
}

export default function App(): JSX.Element {
  // Onboarding / Stepper state
  const [step, setStep] = useState<number>(1);
  // Builder state
  const [builder, setBuilder] = useState<BuilderCell[]>([]);
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Game state derived from builder
  const initialFoods = useMemo(() => builder.filter(b => b.kind === 'food').map(b => ({ x: b.x, y: b.y })), [builder]);
  const initialObstacles = useMemo(() => builder.filter(b => b.kind === 'obstacle').map(b => ({ x: b.x, y: b.y })), [builder]);

  const [snake, setSnake] = useState<Position[]>(START_SNAKE);
  const [dir, setDir] = useState<Dir>('RIGHT');
  const [foods, setFoods] = useState<Position[]>(initialFoods);
  const [obstacles, setObstacles] = useState<Position[]>(initialObstacles);
  const [speed, setSpeed] = useState<number>(8); // moves per second
  const [paused, setPaused] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);

  // Sync derived from builder on initial render
  useEffect(() => {
    setFoods(initialFoods);
  }, [initialFoods]);
  useEffect(() => {
    setObstacles(initialObstacles);
  }, [initialObstacles]);

  // Keyboard controls for direction with no reverse
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      let nd: Dir | null = null;
      if (k === 'ArrowUp' || k === 'w' || k === 'W') nd = 'UP';
      else if (k === 'ArrowDown' || k === 's' || k === 'S') nd = 'DOWN';
      else if (k === 'ArrowLeft' || k === 'a' || k === 'A') nd = 'LEFT';
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') nd = 'RIGHT';
      if (nd) {
        const opposite = (dir === 'UP' && nd === 'DOWN') || (dir === 'DOWN' && nd === 'UP') || (dir === 'LEFT' && nd === 'RIGHT') || (dir === 'RIGHT' && nd === 'LEFT');
        if (!opposite) {
          switch (nd) {
            case 'UP': setDir('UP'); break;
            case 'DOWN': setDir('DOWN'); break;
            case 'LEFT': setDir('LEFT'); break;
            case 'RIGHT': setDir('RIGHT'); break;
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dir]);

  // Core game loop via interval
  useEffect(() => {
    if (paused || gameOver) return;
    const interval = 1000 / speed;
    const id = setInterval(() => {
      // compute next head
      const head = snake[0];
      let nx = head.x;
      let ny = head.y;
      if (dir === 'UP') ny -= 1;
      if (dir === 'DOWN') ny += 1;
      if (dir === 'LEFT') nx -= 1;
      if (dir === 'RIGHT') nx += 1;
      // walls
      if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) {
        setGameOver(true);
        clearInterval(id);
        return;
      }
      // self collision
      if (snake.some(p => p.x === nx && p.y === ny)) {
        setGameOver(true);
        clearInterval(id);
        return;
      }
      // obstacle collision
      if (obstacles.some(p => p.x === nx && p.y === ny)) {
        setGameOver(true);
        clearInterval(id);
        return;
      }
      // move
      const nextSnake = [{ x: nx, y: ny }, ...snake];
      const eatIndex = foods.findIndex(f => f.x === nx && f.y === ny);
      if (eatIndex >= 0) {
        // eat food: increase score, grow (do not pop tail)
        setScore(s => s + 1);
        const newFoods = foods.slice();
        newFoods.splice(eatIndex, 1);
        setFoods(newFoods);
        // spawn a new random food if space available
        const occupied = new Set<string>([...nextSnake.map(p => `${p.x},${p.y}`), ...obstacles.map(o => `${o.x},${o.y}`]);
        const spawn = randomEmptyCell(occupied, GRID_SIZE);
        if (spawn) {
          setFoods(f => [...f, spawn]);
        }
      } else {
        nextSnake.pop();
      }
      setSnake(nextSnake);
    }, interval);
    return () => clearInterval(id);
  }, [snake, dir, speed, foods, obstacles, paused, gameOver]);

  // Canvas rendering using a tiny inline canvas to reflect state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = GRID_SIZE * CELL;
    const h = GRID_SIZE * CELL;
    canvas.width = w;
    canvas.height = h;
    // Draw background
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, w, h);
    // grid lines
    ctx.strokeStyle = '#1e1e1e';
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.lineWidth = 1;
      ctx.strokeRect(i * CELL, 0, 1, h);
      ctx.strokeRect(0, i * CELL, w, 1);
    }
    // obstacles
    ctx.fillStyle = '#8b8b8b';
    obstacles.forEach(p => {
      ctx.fillRect(p.x * CELL + 2, p.y * CELL + 2, CELL - 4, CELL - 4);
    });
    // foods
    ctx.fillStyle = '#ff6b6b';
    foods.forEach(f => {
      ctx.fillRect(f.x * CELL + 6, f.y * CELL + 6, CELL - 12, CELL - 12);
    });
    // snake
    ctx.fillStyle = '#4ade80';
    snake.forEach((s, idx) => {
      const r = idx === 0 ? 0.6 : 0.5; // head slightly larger
      ctx.beginPath();
      ctx.arc((s.x + 0.5) * CELL, (s.y + 0.5) * CELL, (CELL * r) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [snake, foods, obstacles]);

  // Onboard drop handling
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.kind || 'food');
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const kind = (e.dataTransfer.getData('text/plain') || 'food') as 'food' | 'obstacle';
    const rect = (gridRef.current as HTMLDivElement).getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (GRID_SIZE? (rect.width / GRID_SIZE) : 28));
    const y = Math.floor((e.clientY - rect.top) / (GRID_SIZE? (rect.height / GRID_SIZE) : 28));
    if (Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE) {
      // guard duplicates
      const exists = builder.some(b => b.x === x && b.y === y);
      if (!exists) {
        setBuilder(b => [...b, { x, y, kind }]);
      }
    }
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const removeCell = (idx: number) => {
    setBuilder(b => b.filter((_, i) => i !== idx));
  };

  // Export helpers
  const [exportHtml, setExportHtml] = useState<string>('');
  const [exportPython, setExportPython] = useState<string>('');
  const doExport = () => {
    const config: GameConfig = {
      gridSize: GRID_SIZE,
      initialSnake: START_SNAKE,
      initialDir: 'RIGHT',
      obstacles: obstacles,
      foods: foods,
      speed: speed
    };
    const html = exportHTML(config, snake, foods, obstacles);
    const py = `import pygame
import sys

CELL = 24
GRID = ${GRID_SIZE}
WIDTH = GRID * CELL
HEIGHT = GRID * CELL

WHITE = (255,255,255)
GREEN = (110, 232, 128)
RED = (255,0,0)
BLACK = (0,0,0)

class SnakeGame:
    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode((WIDTH, HEIGHT))
        pygame.display.set_caption('SnakeKit Studio')
        self.clock = pygame.time.Clock()
        self.snake = [(GRID//2, GRID//2), (GRID//2 -1, GRID//2), (GRID//2 -2, GRID//2)]
        self.dir = (1,0)
        self.foods = ${JSON.stringify(foods)}
        self.obstacles = ${JSON.stringify(obstacles)}
        self.running = True

    def run(self):
        while self.running:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    self.running = False
            # basic movement
            head = self.snake[0]
            nx = head[0] + self.dir[0]
            ny = head[1] + self.dir[1]
            if nx <0 or ny<0 or nx>=GRID or ny>=GRID:
                self.running = False
                break
            if (nx,ny) in self.snake:
                self.running = False
                break
            self.snake.insert(0, (nx,ny))
            if (nx,ny) in self.foods:
                self.foods.remove((nx,ny))
            else:
                self.snake.pop()
            self.screen.fill((0,0,0))
            for s in self.snake:
                pygame.draw.rect(self.screen, GREEN, (s[0]*CELL, s[1]*CELL, CELL, CELL))
            for f in self.foods:
                pygame.draw.rect(self.screen, RED, (f[0]*CELL, f[1]*CELL, CELL, CELL))
            for o in self.obstacles:
                pygame.draw.rect(self.screen, (128,128,128), (o[0]*CELL, o[1]*CELL, CELL, CELL))
            pygame.display.flip()
            self.clock.tick(6)
        pygame.quit()
        sys.exit()

if __name__ == '__main__':
    game = SnakeGame()
    game.run()
`;
    setExportHtml(html);
    setExportPython(py);
  };

  // On mount, create initial preview state
  useEffect(() => {
    doExport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On swipes for mobile direction
  const touchStart = useRef<{x:number;y:number}|null>(null);
  const onTouchStart = (e: React.TouchEvent) => { const t = e.touches[0]; touchStart.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20) setDir('RIGHT'); else if (dx < -20) setDir('LEFT');
    } else {
      if (dy > 20) setDir('DOWN'); else if (dy < -20) setDir('UP');
    }
    touchStart.current = null;
  };

  // Simple UI helpers
  const addToBuilder = (kind: 'food'|'obstacle') => {
    // add at center by default if grid cell available
    const cx = Math.floor(GRID_SIZE/2);
    const cy = Math.floor(GRID_SIZE/2);
    const exists = builder.find(b => b.x===cx && b.y===cy);
    if (!exists) setBuilder(b => [...b, { x: cx, y: cy, kind }]);
  };
  const clearBuilder = () => {
    setBuilder([]);
    setFoods([]);
    setObstacles([]);
  };

  // Importantly, set step progress through onboarding
  const goNext = () => setStep(s => Math.min(3, s+1));
  const goBack = () => setStep(s => Math.max(1, s-1));

  // Render
  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      <header className="bg-primary p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-accent" aria-label="logo"></div>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>SnakeKit Studio</h1>
          </div>
          <button className={cn('px-4 py-2 rounded-md text-white', 'bg-accent hover:bg-yellow-600 focus:outline-none')} onClick={doExport} aria-label="Export options">Export</button>
        </div>
      </header>

      <main className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Builder Panel */}
        <section aria-labelledby="builder" className="rounded-lg border border-gray-700 p-4 bg-gray-900/60">
          <h2 id="builder" className="text-xl font-semibold mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Game Builder</h2>
          <p className="text-sm text-gray-300 mb-3">Drag components to configure foods and obstacles. Live preview updates in the right panel.</p>
          <div className="flex gap-3 mb-3">
            <button className="px-3 py-2 rounded bg-primary text-white hover:bg-primary/90" onClick={() => addToBuilder('food')} aria-label="Add food to grid">Add Food</button>
            <button className="px-3 py-2 rounded bg-accent text-black hover:bg-accent/90" onClick={() => addToBuilder('obstacle')} aria-label="Add obstacle to grid">Add Obstacle</button>
            <button className="px-3 py-2 rounded bg-gray-700 text-white hover:bg-gray-600" onClick={clearBuilder} aria-label="Clear builder">Clear</button>
          </div>
          <div className="grid grid-cols-5 gap-1 mb-3 text-xs text-gray-300">
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
              const x = idx % GRID_SIZE;
              const y = Math.floor(idx / GRID_SIZE);
              const exists = builder.find(b => b.x === x && b.y === y);
              if (!exists) return <div key={idx} className="h-5 w-5 border border-gray-700" />;
              const color = exists.kind === 'food' ? 'bg-red-500' : 'bg-gray-500';
              return <div key={idx} className={cn('h-5 w-5', color)} title={`${exists.kind} @ ${x},${y}`} />;
            })}
          </div>
          <div ref={gridRef} className="rounded bg-black/40 border border-gray-700 overflow-hidden p-2"
               onDrop={onDrop} onDragOver={onDragOver}>
            <div className="text-xs text-gray-300 mb-1">Drop area (click on grid to place items via click in a real app)</div>
            <div className="grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gap: 0 }} aria-label="Builder grid">
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                const x = i % GRID_SIZE;
                const y = Math.floor(i / GRID_SIZE);
                const found = builder.find(b => b.x === x && b.y === y);
                const cls = found ? (found.kind === 'food' ? 'bg-red-500' : 'bg-gray-500') : 'bg-transparent';
                return (
                  <div key={i} style={{ width: 28, height: 28 }} aria-label={`cell ${x},${y}`} className={cn('border border-gray-800', cls)}></div>
                );
              })}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-300">Step: {step}/3</span>
            <button className="px-3 py-2 rounded bg-primary text-white" onClick={goNext} aria-label="Next step">Next</button>
            <button className="px-3 py-2 rounded bg-gray-700 text-white" onClick={goBack} aria-label="Previous step">Back</button>
          </div>
        </section>

        {/* Live Preview */}
        <section aria-labelledby="preview" className="rounded-lg border border-gray-700 p-4 bg-gray-900/60 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 id="preview" className="text-xl font-semibold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Live Preview</h2>
            <div className="flex items-center gap-2">
              <button className={cn('px-3 py-2 rounded', paused ? 'bg-accent text-black' : 'bg-primary text-white')} onClick={() => setPaused(p => !p)} aria-label="Pause or resume game">{paused ? 'Resume' : 'Pause'}</button>
              <button className="px-3 py-2 rounded bg-gray-700" onClick={() => { setSnake(START_SNAKE); setDir('RIGHT'); setScore(0); setGameOver(false); }} aria-label="Restart game">Restart</button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center" style={{ minHeight: 420 }}>
            <canvas ref={canvasRef} width={GRID_SIZE * CELL} height={GRID_SIZE * CELL} aria-label="Snake game canvas" style={{ borderRadius: 8, border: '1px solid #333' }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}></canvas>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm text-gray-200">
            <div>Score: <strong className="text-accent">{score}</strong></div>
            <div>Speed: {speed} moves/s</div>
            <div>Grid: {GRID_SIZE}x{GRID_SIZE}</div>
          </div>
        </section>
      </main>

      <section className="container mx-auto p-4 mt-6">
        <div className="rounded-lg border border-gray-700 p-4 bg-gray-900/60">
          <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Export</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-300 mb-2">HTML5/JS Export (Self-contained snake game)</p>
              <button className="px-3 py-2 rounded bg-primary text-white" onClick={() => navigator.clipboard.writeText(exportHtml)} aria-label="Copy HTML export">Copy HTML Export</button>
              <textarea aria-label="HTML export code" value={exportHtml} readOnly className="w-full h-40 mt-2 p-2 text-xs rounded bg-black/50 text-green-100" />
            </div>
            <div>
              <p className="text-sm text-gray-300 mb-2">Python/Pygame Export (Educational example)</p>
              <button className="px-3 py-2 rounded bg-primary text-white" onClick={() => navigator.clipboard.writeText(exportPython)} aria-label="Copy Python export">Copy Python Export</button>
              <textarea aria-label="Python export code" value={exportPython} readOnly className="w-full h-40 mt-2 p-2 text-xs rounded bg-black/50 text-green-100" />
            </div>
          </div>
        </div>
      </section>

      <footer className="pointer-events-none" aria-label="footer" />
    </div>
  );
}
