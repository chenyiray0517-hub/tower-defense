const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// ── 座標常數 ─────────────────────────────────────────────
const CELL_SIZE  = 48;
const COLS       = 20;
const ROWS       = 15;
const ELEV_H     = 14;               // 每格高度差（像素，南側牆面高度）
const TOP_OFFSET = 3 * ELEV_H;       // 最高層 elev=3 向上偏移的空間

canvas.width  = COLS * CELL_SIZE;    // 960
canvas.height = ROWS * CELL_SIZE + TOP_OFFSET; // 720 + 42 = 762

// ── 座標轉換 ─────────────────────────────────────────────
// 格子頂面的螢幕 Y（往上移 elev*ELEV_H）
function tileY(row, elev) {
  return TOP_OFFSET + row * CELL_SIZE - elev * ELEV_H;
}

// 實體世界像素 → 螢幕像素（X不變，Y依所在格子高度偏移）
function getElevAt(wx, wy) {
  const col = wx / CELL_SIZE, row = wy / CELL_SIZE;
  const c0 = Math.floor(col), c1 = Math.min(COLS-1, c0+1);
  const r0 = Math.floor(row), r1 = Math.min(ROWS-1, r0+1);
  const tc = col-c0, tr = row-r0;
  const e = (r,c) => elevData[Math.max(0,Math.min(ROWS-1,r))]?.[Math.max(0,Math.min(COLS-1,c))] ?? 0;
  return e(r0,c0)*(1-tc)*(1-tr) + e(r0,c1)*tc*(1-tr)
       + e(r1,c0)*(1-tc)*tr     + e(r1,c1)*tc*tr;
}
function worldToScreen(wx, wy) {
  return { x: wx, y: TOP_OFFSET + wy - getElevAt(wx,wy)*ELEV_H };
}

// 螢幕座標 → 格子（從最近的 row 向遠搜尋）
function screenToGrid(sx, sy) {
  const col = Math.max(0, Math.min(COLS-1, Math.floor(sx / CELL_SIZE)));
  for (let row = ROWS-1; row >= 0; row--) {
    const elev = elevData[row]?.[col] ?? 0;
    const ty = tileY(row, elev);
    if (sy >= ty && sy < ty + CELL_SIZE) return { col, row };
  }
  return { col, row: Math.max(0, Math.min(ROWS-1, Math.floor((sy-TOP_OFFSET)/CELL_SIZE))) };
}

const TILE = { GRASS:0, PATH:1, START:2, END:3 };

// ── 地圖數據 ─────────────────────────────────────────────
const mapData = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [2,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,3],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// PATH 格子高度必須為 0
const elevData = [
  [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
  [3,2,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
  [0,0,0,0,0,1,2,3,3,3,3,3,3,3,3,3,3,3,3,3],
  [2,2,2,1,0,1,2,3,3,3,3,3,3,3,3,3,3,3,3,3],
  [3,2,1,1,0,0,0,0,1,2,3,3,3,3,3,3,3,3,3,3],
  [3,2,1,1,1,1,1,0,1,2,3,3,3,3,3,3,3,3,3,3],
  [3,2,2,1,1,1,1,0,0,0,0,0,1,2,2,3,3,3,3,3],
  [3,3,2,1,1,1,1,1,1,1,1,0,1,2,2,3,3,3,3,3],
  [3,3,3,2,1,1,1,1,1,1,1,0,0,0,0,1,2,3,3,3],
  [3,3,3,2,2,1,1,1,1,1,1,1,1,1,0,1,2,3,3,3],
  [3,3,3,3,2,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1],
  [3,3,3,3,3,2,2,1,1,1,1,1,1,1,1,1,1,1,0,2],
  [3,3,3,3,3,3,2,2,1,1,1,1,1,1,1,1,1,1,0,0],
  [3,3,3,3,3,3,3,2,2,2,1,1,1,1,1,1,1,2,2,3],
  [3,3,3,3,3,3,3,3,3,2,2,2,1,1,1,1,2,3,3,3],
];

const PATH_WAYPOINTS = [
  {row:2,col:0},{row:2,col:1},{row:2,col:2},{row:2,col:3},{row:2,col:4},
  {row:3,col:4},
  {row:4,col:4},{row:4,col:5},{row:4,col:6},{row:4,col:7},
  {row:5,col:7},
  {row:6,col:7},{row:6,col:8},{row:6,col:9},{row:6,col:10},{row:6,col:11},
  {row:7,col:11},
  {row:8,col:11},{row:8,col:12},{row:8,col:13},{row:8,col:14},
  {row:9,col:14},
  {row:10,col:14},{row:10,col:15},{row:10,col:16},{row:10,col:17},{row:10,col:18},
  {row:11,col:18},
  {row:12,col:18},{row:12,col:19},
];

// ── A* 動態尋路 ──────────────────────────────────────────
const PATH_START = {row:2,  col:0};
const PATH_END   = {row:12, col:19};

function findPath(occupied) {
  if(occupied===undefined) occupied=occupiedCells;

  // 動態終點：有堡壘就直奔堡壘，否則退回 PATH_END
  const fort=towers.find(t=>TOWER_TYPES[t.type].isFortress);
  const {row:ER,col:EC}=fort?{row:fort.row,col:fort.col}:PATH_END;
  const {row:SR,col:SC}=PATH_START;

  // 堡壘格子是目的地，不算阻塞
  const effOcc=fort
    ? new Set([...occupied].filter(k=>k!==`${fort.row},${fort.col}`))
    : occupied;

  const h=(r,c)=>Math.abs(r-ER)+Math.abs(c-EC);
  const key=(r,c)=>`${r},${c}`;
  const open=[], closed=new Set(), parent={}, gScore={};
  const sk=key(SR,SC);
  gScore[sk]=0;
  open.push({row:SR,col:SC,f:h(SR,SC),g:0,k:sk});
  while(open.length>0){
    open.sort((a,b)=>a.f-b.f);
    const cur=open.shift();
    if(closed.has(cur.k)) continue;
    closed.add(cur.k);
    if(cur.row===ER&&cur.col===EC){
      const path=[];
      let k=cur.k;
      while(k!==sk){
        const[r,c]=k.split(',').map(Number);
        path.unshift({row:r,col:c});
        k=parent[k];
      }
      path.unshift({row:SR,col:SC});
      return path;
    }
    for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1]]){
      const nr=cur.row+dr,nc=cur.col+dc;
      if(nr<0||nr>=ROWS||nc<0||nc>=COLS) continue;
      const nk=key(nr,nc);
      if(closed.has(nk)||effOcc.has(nk)) continue;
      const cost=(mapData[nr][nc]===TILE.PATH||mapData[nr][nc]===TILE.START||mapData[nr][nc]===TILE.END)?1:2;
      const ng=cur.g+cost;
      if(gScore[nk]===undefined||ng<gScore[nk]){
        gScore[nk]=ng; parent[nk]=cur.k;
        open.push({row:nr,col:nc,f:ng+h(nr,nc),g:ng,k:nk});
      }
    }
  }
  return null;
}

function recalculateAllPaths(){
  for(const e of enemies) if(!e.dead&&!e.reached) e.recalculatePath(); // 已到堡壘的不需重算
}

// ── 各關卡波次設定（20 波）──────────────────────────────
const LEVEL_WAVES = {
  1: [
    [{type:'grunt',count:4,interval:1600}],
    [{type:'grunt',count:5,interval:1500}],
    [{type:'grunt',count:6,interval:1400}],
    [{type:'grunt',count:7,interval:1300}],
    [{type:'grunt',count:8,interval:1200}],
    [{type:'grunt',count:9,interval:1100}],
    [{type:'grunt',count:10,interval:1000}],
    [{type:'grunt',count:11,interval:950}],
    [{type:'grunt',count:12,interval:900}],
    [{type:'grunt',count:13,interval:850}],
    [{type:'grunt',count:14,interval:800}],
    [{type:'grunt',count:15,interval:750}],
    [{type:'grunt',count:16,interval:700}],
    [{type:'grunt',count:17,interval:650}],
    [{type:'grunt',count:18,interval:620}],
    [{type:'grunt',count:19,interval:600}],
    [{type:'grunt',count:20,interval:580}],
    [{type:'grunt',count:22,interval:550}],
    [{type:'grunt',count:25,interval:500}],
    [{type:'grunt',count:30,interval:450}],
  ],
  2: [
    [{type:'grunt',count:6,interval:1200}],
    [{type:'grunt',count:7,interval:1100}],
    [{type:'grunt',count:7,interval:1000},{type:'runner',count:3,interval:900}],
    [{type:'runner',count:6,interval:800}],
    [{type:'grunt',count:8,interval:950},{type:'runner',count:4,interval:750}],
    [{type:'runner',count:8,interval:700}],
    [{type:'grunt',count:9,interval:900},{type:'runner',count:6,interval:650}],
    [{type:'grunt',count:10,interval:850},{type:'runner',count:7,interval:620}],
    [{type:'runner',count:10,interval:600}],
    [{type:'grunt',count:11,interval:800},{type:'runner',count:8,interval:580}],
    [{type:'grunt',count:12,interval:750},{type:'runner',count:9,interval:550}],
    [{type:'runner',count:12,interval:520}],
    [{type:'grunt',count:13,interval:720},{type:'runner',count:10,interval:500}],
    [{type:'grunt',count:14,interval:700},{type:'runner',count:11,interval:480}],
    [{type:'runner',count:14,interval:460}],
    [{type:'grunt',count:15,interval:680},{type:'runner',count:12,interval:450}],
    [{type:'grunt',count:16,interval:650},{type:'runner',count:13,interval:430}],
    [{type:'runner',count:16,interval:420}],
    [{type:'grunt',count:18,interval:620},{type:'runner',count:15,interval:400}],
    [{type:'grunt',count:20,interval:580},{type:'runner',count:18,interval:380}],
  ],
  3: [
    [{type:'grunt',count:6,interval:1000}],
    [{type:'grunt',count:7,interval:950},{type:'tank',count:1,interval:3000}],
    [{type:'runner',count:7,interval:800}],
    [{type:'grunt',count:8,interval:900},{type:'tank',count:1,interval:2800}],
    [{type:'runner',count:8,interval:750},{type:'tank',count:1,interval:2600}],
    [{type:'grunt',count:9,interval:850},{type:'tank',count:2,interval:2500}],
    [{type:'runner',count:9,interval:700},{type:'tank',count:2,interval:2400}],
    [{type:'grunt',count:10,interval:820},{type:'runner',count:6,interval:680},{type:'tank',count:2,interval:2300}],
    [{type:'tank',count:3,interval:2200},{type:'revenant',count:1,interval:3500}],
    [{type:'grunt',count:11,interval:780},{type:'runner',count:7,interval:650},{type:'ghost',count:2,interval:1800}],
    [{type:'runner',count:10,interval:620},{type:'tank',count:3,interval:2000},{type:'revenant',count:1,interval:3200}],
    [{type:'grunt',count:12,interval:750},{type:'tank',count:3,interval:1900},{type:'ghost',count:2,interval:1600}],
    [{type:'grunt',count:13,interval:720},{type:'runner',count:9,interval:600},{type:'revenant',count:2,interval:3000}],
    [{type:'runner',count:12,interval:580},{type:'tank',count:4,interval:1800},{type:'ghost',count:3,interval:1500}],
    [{type:'grunt',count:14,interval:700},{type:'tank',count:4,interval:1700},{type:'revenant',count:2,interval:2800}],
    [{type:'grunt',count:15,interval:670},{type:'runner',count:11,interval:560},{type:'ghost',count:3,interval:1400},{type:'revenant',count:2,interval:2600}],
    [{type:'runner',count:14,interval:540},{type:'tank',count:5,interval:1600},{type:'revenant',count:3,interval:2500}],
    [{type:'grunt',count:16,interval:640},{type:'runner',count:12,interval:520},{type:'ghost',count:4,interval:1300},{type:'tank',count:5,interval:1600}],
    [{type:'grunt',count:18,interval:600},{type:'tank',count:6,interval:1500},{type:'revenant',count:3,interval:2200},{type:'ghost',count:3,interval:1300}],
    [{type:'grunt',count:20,interval:560},{type:'runner',count:15,interval:480},{type:'tank',count:8,interval:1400},{type:'revenant',count:4,interval:2000},{type:'ghost',count:4,interval:1200}],
  ],
  4: [
    [{type:'grunt',count:8,interval:1000},{type:'runner',count:5,interval:750}],
    [{type:'runner',count:10,interval:650},{type:'tank',count:2,interval:2200}],
    [{type:'grunt',count:10,interval:900},{type:'runner',count:7,interval:600},{type:'tank',count:2,interval:2100}],
    [{type:'runner',count:12,interval:580},{type:'tank',count:3,interval:2000}],
    [{type:'grunt',count:12,interval:820},{type:'runner',count:9,interval:560},{type:'tank',count:3,interval:1900}],
    [{type:'grunt',count:14,interval:780},{type:'tank',count:3,interval:1800}],
    [{type:'runner',count:14,interval:530},{type:'tank',count:4,interval:1800}],
    [{type:'grunt',count:15,interval:750},{type:'runner',count:11,interval:510},{type:'tank',count:4,interval:1700}],
    [{type:'runner',count:16,interval:500},{type:'tank',count:4,interval:1700}],
    [{type:'grunt',count:16,interval:720},{type:'runner',count:12,interval:490},{type:'tank',count:5,interval:1600}],
    [{type:'grunt',count:17,interval:700},{type:'tank',count:5,interval:1600},{type:'revenant',count:2,interval:2800}],
    [{type:'runner',count:18,interval:470},{type:'ghost',count:3,interval:1400},{type:'tank',count:5,interval:1550}],
    [{type:'grunt',count:18,interval:680},{type:'runner',count:14,interval:460},{type:'revenant',count:3,interval:2600}],
    [{type:'runner',count:20,interval:450},{type:'tank',count:6,interval:1500},{type:'ghost',count:4,interval:1300}],
    [{type:'grunt',count:20,interval:650},{type:'runner',count:15,interval:440},{type:'revenant',count:3,interval:2400},{type:'ghost',count:3,interval:1300}],
    [{type:'grunt',count:22,interval:620},{type:'tank',count:7,interval:1400},{type:'revenant',count:4,interval:2200}],
    [{type:'runner',count:22,interval:420},{type:'ghost',count:5,interval:1200},{type:'tank',count:7,interval:1400}],
    [{type:'grunt',count:24,interval:600},{type:'runner',count:18,interval:400},{type:'revenant',count:4,interval:2000},{type:'ghost',count:4,interval:1100}],
    [{type:'grunt',count:26,interval:570},{type:'runner',count:20,interval:380},{type:'tank',count:9,interval:1300},{type:'revenant',count:5,interval:1900},{type:'ghost',count:5,interval:1000}],
    [{type:'grunt',count:30,interval:540},{type:'runner',count:25,interval:360},{type:'tank',count:12,interval:1200},{type:'revenant',count:6,interval:1700},{type:'ghost',count:6,interval:900}],
  ],
};

// ── 塔 & 經濟建築定義 ────────────────────────────────────
const TOWER_TYPES = {
  archer: {
    name:'弓箭手', emoji:'🏹', color:'#8B4513',
    bulletColor:'#cd853f', bulletSpeed:4, hp:150,
    levels: [
      { range:2.5, damage:15, fireRate:1200, cost:50,  upgradeCost:75  },
      { range:2.8, damage:28, fireRate:950,  upgradeCost:120 },
      { range:3.2, damage:45, fireRate:700,  upgradeCost:null },
    ],
  },
  mage: {
    name:'法師', emoji:'🔮', color:'#6a0dad',
    bulletColor:'#bf5fff', bulletSpeed:3,
    splash:true, splashRadius:0.8, hp:120,
    levels: [
      { range:2,   damage:35, fireRate:2200, cost:100, upgradeCost:150 },
      { range:2.4, damage:60, fireRate:1800, upgradeCost:220 },
      { range:2.8, damage:95, fireRate:1400, upgradeCost:null },
    ],
  },
  cannon: {
    name:'大砲', emoji:'💣', color:'#555',
    bulletColor:'#888', bulletSpeed:5,
    splash:true, splashRadius:1.2, hp:200,
    levels: [
      { range:3,   damage:60,  fireRate:3000, cost:150, upgradeCost:200 },
      { range:3.4, damage:100, fireRate:2400, upgradeCost:300 },
      { range:3.8, damage:160, fireRate:1800, upgradeCost:null },
    ],
  },
  farm: {
    name:'農場', emoji:'🌾', color:'#3d7a2a',
    isEconomic:true, hp:80,
    levels: [
      { goldPerTick:8,  tickInterval:8000, cost:80,  upgradeCost:120 },
      { goldPerTick:16, tickInterval:7000, upgradeCost:180 },
      { goldPerTick:28, tickInterval:5500, upgradeCost:null },
    ],
  },
  ice: {
    name:'冰塔', emoji:'🧊', color:'#4fc3f7',
    bulletColor:'#b3e5fc', bulletSpeed:5, hp:120,
    slow:true, slowDuration:2200, slowMult:0.35,
    levels: [
      { range:2.2, damage:8,  fireRate:1600, cost:110, upgradeCost:150 },
      { range:2.6, damage:16, fireRate:1300, upgradeCost:200 },
      { range:3.0, damage:28, fireRate:1000, upgradeCost:null },
    ],
  },
  lightning: {
    name:'電塔', emoji:'⚡', color:'#ffd600',
    isChain:true, hp:140,
    levels: [
      { range:2.5, damage:35, fireRate:1800, chainCount:3, cost:160, upgradeCost:210 },
      { range:3.0, damage:60, fireRate:1400, chainCount:4, upgradeCost:290 },
      { range:3.5, damage:95, fireRate:1050, chainCount:5, upgradeCost:null },
    ],
  },
  mine: {
    name:'礦坑', emoji:'⛏️', color:'#795548',
    isEconomic:true, hp:100,
    levels: [
      { goldPerTick:22, tickInterval:10000, cost:160, upgradeCost:220 },
      { goldPerTick:45, tickInterval:8500,  upgradeCost:300 },
      { goldPerTick:80, tickInterval:7000,  upgradeCost:null },
    ],
  },
  market: {
    name:'市場', emoji:'🏪', color:'#ff8f00',
    isMarket:true, hp:80,
    levels: [
      { bonusPerKill:6,  cost:130, upgradeCost:170 },
      { bonusPerKill:12, upgradeCost:240 },
      { bonusPerKill:20, upgradeCost:null },
    ],
  },
  training: {
    name:'訓練場', emoji:'🏋️', color:'#1a237e',
    isTraining:true, hp:160,
    levels: [
      { trainInterval:18000, maxUnits:2, cost:200, upgradeCost:260 },
      { trainInterval:13000, maxUnits:3, upgradeCost:350 },
      { trainInterval:9000,  maxUnits:5, upgradeCost:null },
    ],
  },
  lab: {
    name:'研發所', emoji:'🔬', color:'#4a148c',
    isLab:true, hp:100,
    levels: [
      { cost:220, upgradeCost:300 },
      { upgradeCost:400 },
      { upgradeCost:null },
    ],
  },
  fortress: {
    name:'堡壘', emoji:'🏰', color:'#5a3010',
    isFortress:true, hp:600,
    levels: [
      { hp:600,  cost:200, upgradeCost:350 },
      { hp:900,  upgradeCost:500 },
      { hp:1400, upgradeCost:null },
    ],
  },
};

// ── 友方兵種 ──────────────────────────────────────────────
const FRIENDLY_UNIT_TYPES = {
  infantry: { name:'步兵',   emoji:'🗡️', hp:80,  speed:1.5, damage:18, attackRate:1200, range:1.5*CELL_SIZE, size:12, color:'#1e88e5' },
  cavalry:  { name:'騎兵',   emoji:'🐴', hp:110, speed:2.8, damage:25, attackRate:900,  range:1.5*CELL_SIZE, size:12, color:'#00acc1' },
  paladin:  { name:'聖騎士', emoji:'⚜️', hp:280, speed:0.9, damage:42, attackRate:1600, range:1.8*CELL_SIZE, size:16, color:'#f9a825' },
};

const RESEARCH_ITEMS = [
  { id:'cavalry',    name:'解鎖騎兵',   cost:200, desc:'可訓練騎兵',     req:null },
  { id:'paladin',    name:'解鎖聖騎士', cost:350, desc:'可訓練聖騎士',   req:'cavalry' },
  { id:'hpBoost',    name:'強化體魄',   cost:180, desc:'士兵 HP +60%',   req:null },
  { id:'dmgBoost',   name:'武器精煉',   cost:220, desc:'士兵攻擊 +60%',  req:null },
  { id:'trainSpeed', name:'快速訓練',   cost:280, desc:'訓練間隔 -35%',  req:null },
];

let researchDone = new Set();
let friendlyUnits = [];
let towerIdCounter = 0;

const ENEMY_TYPES = {
  grunt:    { name:'步兵',   emoji:'👾', color:'#e74c3c', hp:95,  speed:1.3, reward:10, size:14, attackDmg:13, attackRate:1300, attackRange:CELL_SIZE*1.4 },
  runner:   { name:'快衝兵', emoji:'💨', color:'#e67e22', hp:50,  speed:2.8, reward:15, size:11, attackDmg:8,  attackRate:600,  attackRange:CELL_SIZE*1.1 },
  tank:     { name:'重甲兵', emoji:'🛡️', color:'#2c3e50', hp:360, speed:0.7, reward:30, size:18, attackDmg:38, attackRate:1800, attackRange:CELL_SIZE*1.6 },
  revenant: { name:'重生兵', emoji:'💀', color:'#7b1fa2', hp:155, speed:1.1, reward:25, size:15, attackDmg:18, attackRate:1400, attackRange:CELL_SIZE*1.4, canRevive:true },
  ghost:    { name:'幽靈兵', emoji:'👻', color:'#90a4ae', hp:85,  speed:2.0, reward:20, size:13, attackDmg:10, attackRate:1100, attackRange:CELL_SIZE*1.2, isGhost:true },
};

const BUILD_RANGE = 3 * CELL_SIZE;

function getKillBonus(){
  let b=0;
  for(const t of towers) if(TOWER_TYPES[t.type].isMarket) b+=t.bonusPerKill;
  return b;
}

// ── 遊戲狀態 ─────────────────────────────────────────────
let towers=[], enemies=[], bullets=[];
let gold=300, wave=0, gameOver=false, WAVES=[], hero=null;
let selectedTowerType='archer', selectedBuilding=null;
let upgradeButtonBounds=null, trainUnitButtonBounds=[], researchButtonBounds=[];
let hoverCol=-1, hoverRow=-1, animFrameId=null;
const occupiedCells = new Set();
const keys = {};

// ── 虛擬搖桿（手機用） ────────────────────────────────────
const joystick = {
  active: false, touchId: null,
  baseX: 0, baseY: 0,
  knobX: 0, knobY: 0,
  dx: 0, dy: 0,
  baseR: 52, knobR: 24,
};
let messageText='', messageExpire=0;
function showMessage(t,d=2000){ messageText=t; messageExpire=performance.now()+d; }

// ── 初始化 ────────────────────────────────────────────────
function initGame(levelNum) {
  towers=[]; enemies=[]; bullets=[]; friendlyUnits=[];
  gold=300; wave=0; gameOver=false;
  spawnQueue=[]; waveActive=false; waveComplete=false;
  nextWaveAt=0; nextWaveCountdown=0; towerIdCounter=0;
  messageText=''; selectedBuilding=null; upgradeButtonBounds=null;
  trainUnitButtonBounds=[]; researchButtonBounds=[];
  researchDone=new Set();
  occupiedCells.clear();
  selectedTowerType='archer';
  document.querySelectorAll('.tower-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('btn-archer').classList.add('active');
  WAVES = LEVEL_WAVES[levelNum]||LEVEL_WAVES[1];
  hero = new Hero();
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = requestAnimationFrame(gameLoop);
  nextWaveAt = performance.now()+3000;
}

// ── 主角 ─────────────────────────────────────────────────
class Hero {
  constructor(){
    this.x=1*CELL_SIZE+CELL_SIZE/2; this.y=13*CELL_SIZE+CELL_SIZE/2;
    this.speed=3; this.hp=200; this.maxHp=200;
    this.size=14; this.damage=30; this.range=2.5*CELL_SIZE;
    this.attackRate=700; this.lastAttack=0; this.dead=false;
    this.invincible=0; // 無敵時間到期點（ms）
  }
  takeDamage(dmg, now){
    if(now<this.invincible) return;
    this.hp-=dmg;
    if(this.hp<=0){
      this.hp=this.maxHp;
      this.x=1*CELL_SIZE+CELL_SIZE/2; this.y=13*CELL_SIZE+CELL_SIZE/2;
      this.invincible=now+3000;
      showMessage('💀 主角陣亡！回到起點復活');
    }
  }
  update(now){
    if(this.dead) return;
    let nx=this.x, ny=this.y;
    if(keys['w']||keys['W']||keys['ArrowUp'])    ny-=this.speed;
    if(keys['s']||keys['S']||keys['ArrowDown'])  ny+=this.speed;
    if(keys['a']||keys['A']||keys['ArrowLeft'])  nx-=this.speed;
    if(keys['d']||keys['D']||keys['ArrowRight']) nx+=this.speed;
    if(joystick.active){ nx+=joystick.dx*this.speed; ny+=joystick.dy*this.speed; }
    this.x=Math.max(this.size,Math.min(COLS*CELL_SIZE-this.size,nx));
    this.y=Math.max(this.size,Math.min(ROWS*CELL_SIZE-this.size,ny));
    if(now-this.lastAttack>=this.attackRate){
      let target=null, minD=this.range;
      for(const e of enemies){
        if(e.dead) continue;
        const d=Math.sqrt((e.x-this.x)**2+(e.y-this.y)**2);
        if(d<minD){minD=d; target=e;}
      }
      if(target){ this.lastAttack=now; bullets.push(new Bullet(this.x,this.y,target,this.damage,'#00e5ff',7,false,0)); }
    }
  }
  draw(now){
    if(this.dead) return;
    // 無敵閃爍
    const inv=this.invincible>now;
    if(inv&&Math.floor((this.invincible-now)/120)%2===0) return;
    const {x:sx,y:sy}=worldToScreen(this.x,this.y);
    // 建造範圍
    ctx.beginPath(); ctx.arc(sx,sy,BUILD_RANGE,0,Math.PI*2);
    ctx.strokeStyle='rgba(0,229,255,0.25)'; ctx.lineWidth=1.5;
    ctx.setLineDash([5,4]); ctx.stroke(); ctx.setLineDash([]);
    // 身體
    ctx.beginPath(); ctx.arc(sx,sy,this.size,0,Math.PI*2);
    ctx.fillStyle=inv?'rgba(21,101,192,0.5)':'#1565c0'; ctx.fill();
    ctx.strokeStyle='#00e5ff'; ctx.lineWidth=2; ctx.stroke();
    ctx.font=`${this.size}px serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🧙',sx,sy);
    // HP
    const bw=36,bh=4,bx=sx-bw/2,by=sy-this.size-10;
    ctx.fillStyle='#333'; ctx.fillRect(bx,by,bw,bh);
    const r=Math.max(0,this.hp/this.maxHp);
    ctx.fillStyle=r>0.5?'#2196f3':r>0.25?'#f39c12':'#e74c3c';
    ctx.fillRect(bx,by,bw*r,bh);
    ctx.font='bold 9px sans-serif'; ctx.fillStyle='#00e5ff';
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText('主角',sx,by-1);
  }
}

// ── 敵人 ─────────────────────────────────────────────────
class Enemy {
  constructor(type){
    const def=ENEMY_TYPES[type];
    this.type=type; this.color=def.color;
    this.maxHp=def.hp; this.hp=def.hp;
    this.speed=def.speed; this.reward=def.reward; this.size=def.size;
    this.attackDmg=def.attackDmg; this.attackRate=def.attackRate; this.attackRange=def.attackRange;
    this.lastAttack=0; this.slowUntil=0;
    this.revived=false; this.reviveFlash=0; this.hitFlash=0;
    this.ghost=def.isGhost||false;
    this.wpIndex=0;
    this.path=findPath()||[];
    const s=this.path[0]||PATH_START;
    this.x=s.col*CELL_SIZE+CELL_SIZE/2; this.y=s.row*CELL_SIZE+CELL_SIZE/2;
    this.dead=false; this.reached=false; this.meleeTarget=null;
  }
  tryKill(bonus=0){
    if(this.dead) return;
    if(ENEMY_TYPES[this.type].canRevive&&!this.revived){
      this.revived=true;
      this.hp=Math.floor(this.maxHp*0.4);
      this.reviveFlash=performance.now()+700;
      return; // 不死，復活
    }
    this.dead=true;
    gold+=this.reward+bonus;
  }
  recalculatePath(){
    const newPath=findPath();
    if(!newPath||newPath.length===0) return;
    // 找目前位置最近的路徑點繼續走
    let best=0,bestD=Infinity;
    for(let i=0;i<newPath.length;i++){
      const wp=newPath[i];
      const dx=this.x-(wp.col*CELL_SIZE+CELL_SIZE/2);
      const dy=this.y-(wp.row*CELL_SIZE+CELL_SIZE/2);
      const d=dx*dx+dy*dy;
      if(d<bestD){bestD=d;best=i;}
    }
    this.path=newPath; this.wpIndex=best;
  }
  update(now){
    if(this.dead) return;

    // ── 已抵達堡壘格子：直接攻打 ──
    if(this.reached){
      const fort=towers.find(t=>TOWER_TYPES[t.type].isFortress);
      if(!fort){ this.dead=true; return; }
      if(now-this.lastAttack>=this.attackRate){
        fort.takeDamage(this.attackDmg);
        this.lastAttack=now;
      }
      return;
    }

    // ── 近戰系統：找到目標就停步攻打 ──
    // 清除失效目標（死亡或跑離範圍）
    if(this.meleeTarget){
      const mt=this.meleeTarget;
      const dead=mt.dead||(mt instanceof Tower&&!towers.includes(mt));
      const edx=mt.x-this.x,edy=mt.y-this.y;
      const outOfRange=Math.sqrt(edx*edx+edy*edy)>this.attackRange*1.6;
      if(dead||(outOfRange&&!(mt instanceof Tower))){ // 建築不逃，不因距離丟棄
        this.meleeTarget=null;
        if(dead&&mt instanceof Tower) this.recalculatePath();
      }
    }

    // 尋找新目標（已有目標則跳過搜尋）
    if(!this.meleeTarget){
      let best=null, bestD=this.attackRange;
      // 1. 己方士兵
      for(const u of friendlyUnits){
        if(u.dead) continue;
        const dx=u.x-this.x,dy=u.y-this.y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<bestD){bestD=d;best=u;}
      }
      // 2. 主角
      if(!best&&hero&&!hero.dead){
        const dx=hero.x-this.x,dy=hero.y-this.y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<=this.attackRange) best=hero;
      }
      // 3. 最近非堡壘建築
      if(!best){
        for(const t of towers){
          if(TOWER_TYPES[t.type].isFortress) continue;
          const dx=t.x-this.x,dy=t.y-this.y,d=Math.sqrt(dx*dx+dy*dy);
          if(d<bestD){bestD=d;best=t;}
        }
      }
      if(best) this.meleeTarget=best;
    }

    // 有目標：停步攻打
    if(this.meleeTarget){
      if(now-this.lastAttack>=this.attackRate){
        const mt=this.meleeTarget;
        if(mt instanceof Tower){
          mt.takeDamage(this.attackDmg);
        } else if(mt===hero){
          hero.takeDamage(this.attackDmg,now);
        } else {
          mt.hp-=this.attackDmg;
          mt.hitFlash=now+220;
          if(mt.hp<=0) mt.dead=true;
        }
        this.lastAttack=now;
      }
      return; // 停步
    }

    // ── 移動（冰凍減速）──
    const effSpeed=(now<this.slowUntil)?this.speed*0.35:this.speed;
    if(this.wpIndex>=this.path.length-1){
      // 抵達堡壘
      this.reached=true;
      this.x=PATH_END.col*CELL_SIZE+CELL_SIZE/2;
      this.y=PATH_END.row*CELL_SIZE+CELL_SIZE/2;
      return;
    }
    const t=this.path[this.wpIndex+1];
    const tx=t.col*CELL_SIZE+CELL_SIZE/2, ty=t.row*CELL_SIZE+CELL_SIZE/2;
    const dx=tx-this.x, dy=ty-this.y, dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<effSpeed){this.x=tx;this.y=ty;this.wpIndex++;}
    else{this.x+=dx/dist*effSpeed; this.y+=dy/dist*effSpeed;}
  }
  get progress(){return this.wpIndex;}
  draw(now){
    if(this.dead) return;
    const {x:sx,y:sy}=worldToScreen(this.x,this.y);
    const r=this.size;
    const slowed=now<this.slowUntil;
    const revFlash=now<this.reviveFlash;
    const hit=now<this.hitFlash;

    // 幽靈半透明
    if(this.ghost) ctx.globalAlpha=0.45;

    // 受傷白色閃光疊層
    if(hit){
      ctx.beginPath(); ctx.arc(sx,sy,r+3,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.fill();
    }

    // 主體
    ctx.beginPath(); ctx.arc(sx,sy,r,0,Math.PI*2);
    const bodyColor=hit?'#fff':slowed?'#b3e5fc':this.revived?'#4a148c':this.color;
    ctx.fillStyle=bodyColor; ctx.fill();
    ctx.strokeStyle=hit?'#ff4444':revFlash?'#fff':slowed?'#00bcd4':'rgba(255,255,255,0.8)';
    ctx.lineWidth=hit||revFlash||slowed?2.5:1.5; ctx.stroke();

    ctx.font=`${r+2}px serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(ENEMY_TYPES[this.type].emoji,sx,sy);

    // 重生閃光光環
    if(revFlash){
      const pulse=0.6+0.4*Math.sin((now-this.reviveFlash+700)*0.02);
      ctx.beginPath(); ctx.arc(sx,sy,r+7,0,Math.PI*2);
      ctx.strokeStyle=`rgba(255,255,255,${pulse})`; ctx.lineWidth=3; ctx.stroke();
    }
    // 已復活第二條命標記（紫色光暈）
    if(this.revived&&!revFlash){
      ctx.beginPath(); ctx.arc(sx,sy,r+4,0,Math.PI*2);
      ctx.strokeStyle='rgba(186,104,200,0.6)'; ctx.lineWidth=2; ctx.stroke();
    }
    // 冰凍光暈
    if(slowed){
      ctx.beginPath(); ctx.arc(sx,sy,r+4,0,Math.PI*2);
      ctx.strokeStyle='rgba(100,220,255,0.5)'; ctx.lineWidth=2; ctx.stroke();
    }

    // HP 條
    const bw=r*3,bh=5,bx=sx-bw/2,by=sy-r-9;
    ctx.fillStyle='#222'; ctx.fillRect(bx-1,by-1,bw+2,bh+2);
    ctx.fillStyle='#333'; ctx.fillRect(bx,by,bw,bh);
    const ratio=Math.max(0,this.hp/this.maxHp);
    ctx.fillStyle=ratio>0.5?'#2ecc71':ratio>0.25?'#f39c12':'#e74c3c';
    ctx.fillRect(bx,by,bw*ratio,bh);

    if(this.ghost) ctx.globalAlpha=1;
  }
}

// ── 友方士兵 ──────────────────────────────────────────────
class FriendlyUnit {
  constructor(type, x, y, source){
    const def=FRIENDLY_UNIT_TYPES[type];
    this.type=type; this.source=source;
    this.x=x; this.y=y;
    const hpM=researchDone.has('hpBoost')?1.6:1;
    const dmM=researchDone.has('dmgBoost')?1.6:1;
    this.maxHp=Math.floor(def.hp*hpM); this.hp=this.maxHp;
    this.speed=def.speed;
    this.damage=Math.floor(def.damage*dmM);
    this.attackRate=def.attackRate;
    this.range=def.range;
    this.size=def.size;
    this.color=def.color;
    this.lastAttack=0; this.dead=false; this.hitFlash=0;
  }
  update(now){
    if(this.dead) return;
    let target=null, minD=Infinity;
    for(const e of enemies){
      if(e.dead) continue;
      const d=Math.sqrt((e.x-this.x)**2+(e.y-this.y)**2);
      if(d<minD){minD=d;target=e;}
    }
    if(!target) return;
    const dx=target.x-this.x, dy=target.y-this.y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    if(dist>this.range*0.8){
      this.x+=dx/dist*this.speed;
      this.y+=dy/dist*this.speed;
      this.x=Math.max(this.size,Math.min(COLS*CELL_SIZE-this.size,this.x));
      this.y=Math.max(this.size,Math.min(ROWS*CELL_SIZE-this.size,this.y));
    }
    if(dist<=this.range&&now-this.lastAttack>=this.attackRate){
      this.lastAttack=now;
      target.hp-=this.damage;
      target.hitFlash=now+220;
      if(target.hp<=0) target.tryKill(getKillBonus());
    }
  }
  draw(now){
    if(this.dead) return;
    const {x:sx,y:sy}=worldToScreen(this.x,this.y);
    const r=this.size;
    const hit=now<this.hitFlash;
    if(hit){
      ctx.beginPath(); ctx.arc(sx,sy,r+3,0,Math.PI*2);
      ctx.fillStyle='rgba(255,80,80,0.45)'; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(sx,sy,r,0,Math.PI*2);
    ctx.fillStyle=hit?'#ffcccc':this.color; ctx.fill();
    ctx.strokeStyle=hit?'#ff4444':'rgba(255,255,255,0.8)'; ctx.lineWidth=2; ctx.stroke();
    ctx.font=`${r+2}px serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(FRIENDLY_UNIT_TYPES[this.type].emoji,sx,sy);
    const bw=r*3,bh=5,bx=sx-bw/2,by=sy-r-9;
    ctx.fillStyle='#222'; ctx.fillRect(bx-1,by-1,bw+2,bh+2);
    ctx.fillStyle='#333'; ctx.fillRect(bx,by,bw,bh);
    const ratio=Math.max(0,this.hp/this.maxHp);
    ctx.fillStyle=ratio>0.5?'#4fc3f7':ratio>0.25?'#f39c12':'#e74c3c';
    ctx.fillRect(bx,by,bw*ratio,bh);
  }
}

// ── 防禦塔 ────────────────────────────────────────────────
class Tower {
  constructor(row,col,type){
    this.row=row; this.col=col; this.type=type; this.level=1;
    this.lastShot=0; this.lastTick=0;
    this.x=col*CELL_SIZE+CELL_SIZE/2;
    this.y=row*CELL_SIZE+CELL_SIZE/2;
    const _def=TOWER_TYPES[type];
    // 堡壘 HP 定義在 levels 裡；其他塔從 def.hp 取
    this.maxHp=_def.isFortress?_def.levels[0].hp:_def.hp;
    this.hp=this.maxHp;
    this.dead=false; this.hitFlash=0;
    this.id = ++towerIdCounter;
    if(_def.isTraining) this.trainUnitType='infantry';
    this._apply();
  }
  takeDamage(dmg){
    this.hp-=dmg;
    this.hitFlash=performance.now()+220;
    if(this.hp<=0) this.destroy();
  }
  destroy(){
    this.dead=true;
    if(TOWER_TYPES[this.type].isFortress){
      showMessage('🏰 堡壘陷落！遊戲結束',4000);
      gameOver=true;
    }
    const k=`${this.row},${this.col}`;
    const idx=towers.indexOf(this);
    if(idx!==-1) towers.splice(idx,1);
    occupiedCells.delete(k);
    if(selectedBuilding===this) selectedBuilding=null;
    recalculateAllPaths();
    if(!TOWER_TYPES[this.type].isFortress) showMessage('🏚️ 建築被摧毀！',2000);
  }
  _apply(){
    const def=TOWER_TYPES[this.type], s=def.levels[this.level-1];
    if(def.isEconomic){ this.goldPerTick=s.goldPerTick; this.tickInterval=s.tickInterval; }
    else if(def.isMarket){ this.bonusPerKill=s.bonusPerKill; }
    else if(def.isTraining){
      this.trainInterval=s.trainInterval*(researchDone.has('trainSpeed')?0.65:1);
      this.maxUnits=s.maxUnits;
    }
    else if(def.isLab){ /* no combat stats */ }
    else if(def.isFortress){
      const newMax=s.hp;
      const ratio=this.maxHp>0?this.hp/this.maxHp:1;
      this.maxHp=newMax;
      this.hp=Math.min(Math.ceil(newMax*ratio),newMax);
    }
    else if(def.isChain){
      this.range=s.range*CELL_SIZE; this.damage=s.damage; this.fireRate=s.fireRate;
      this.chainCount=s.chainCount;
      this.lightningTargets=[]; this.lightningExpire=0;
    }
    else{
      this.range=s.range*CELL_SIZE; this.damage=s.damage; this.fireRate=s.fireRate;
      this.splash=def.splash||false; this.splashRadius=(def.splashRadius||0)*CELL_SIZE;
      this.bulletColor=def.bulletColor; this.bulletSpeed=def.bulletSpeed;
    }
  }
  get upgradeCost(){ return TOWER_TYPES[this.type].levels[this.level-1].upgradeCost; }
  tryUpgrade(){
    const c=this.upgradeCost;
    if(!c||this.level>=3||gold<c) return false;
    gold-=c; this.level++; this._apply(); return true;
  }
  update(now){
    const def=TOWER_TYPES[this.type];
    if(def.isEconomic){
      if(now-this.lastTick>=this.tickInterval){this.lastTick=now; gold+=this.goldPerTick;}
      return;
    }
    if(def.isMarket||def.isLab||def.isFortress) return; // 純被動
    if(def.isTraining){
      const effInterval=this.trainInterval*(researchDone.has('trainSpeed')?0.65:1);
      const myUnits=friendlyUnits.filter(u=>u.source===this&&!u.dead);
      if(myUnits.length<this.maxUnits&&now-this.lastTick>=effInterval){
        this.lastTick=now;
        const angle=Math.random()*Math.PI*2;
        friendlyUnits.push(new FriendlyUnit(
          this.trainUnitType||'infantry',
          this.x+Math.cos(angle)*CELL_SIZE*0.7,
          this.y+Math.sin(angle)*CELL_SIZE*0.7,
          this
        ));
      }
      return;
    }
    if(now-this.lastShot<this.fireRate) return;

    if(def.isChain){
      // 電塔：即時鏈式傷害（幽靈兵免疫）
      const inRange=enemies.filter(e=>!e.dead&&!e.ghost&&
        Math.sqrt((e.x-this.x)**2+(e.y-this.y)**2)<=this.range);
      inRange.sort((a,b)=>b.progress-a.progress);
      const targets=inRange.slice(0,this.chainCount);
      if(targets.length===0) return;
      this.lastShot=now;
      this.lightningTargets=targets.map(e=>({x:e.x,y:e.y}));
      this.lightningExpire=now+220;
      for(const e of targets){
        e.hp-=this.damage;
        e.hitFlash=now+220;
        if(e.hp<=0) e.tryKill(getKillBonus());
      }
      return;
    }

    let target=null, best=-1;
    for(const e of enemies){
      if(e.dead||e.ghost) continue; // 幽靈兵塔無法鎖定
      const dx=e.x-this.x, dy=e.y-this.y;
      if(Math.sqrt(dx*dx+dy*dy)<=this.range && e.progress>best){best=e.progress;target=e;}
    }
    if(!target) return;
    this.lastShot=now;
    const slowEff=def.slow?{duration:def.slowDuration}:null;
    bullets.push(new Bullet(this.x,this.y,target,this.damage,this.bulletColor,this.bulletSpeed,this.splash,this.splashRadius,slowEff));
  }
  drawRange(){
    const def=TOWER_TYPES[this.type];
    if(def.isEconomic||def.isMarket||def.isTraining||def.isLab||def.isFortress) return;
    const {x:sx,y:sy}=worldToScreen(this.x,this.y);
    ctx.beginPath(); ctx.arc(sx,sy,this.range,0,Math.PI*2);
    if(def.isChain){
      ctx.strokeStyle='rgba(255,214,0,0.35)'; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle='rgba(255,214,0,0.05)'; ctx.fill();
    } else if(def.slow){
      ctx.strokeStyle='rgba(100,200,255,0.35)'; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle='rgba(100,200,255,0.05)'; ctx.fill();
    } else {
      ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.fill();
    }
  }
}

// ── 子彈 ─────────────────────────────────────────────────
class Bullet {
  constructor(x,y,target,damage,color,speed,splash,splashRadius,slowEff=null){
    this.x=x;this.y=y;this.target=target;this.damage=damage;
    this.color=color;this.speed=speed;this.splash=splash;
    this.splashRadius=splashRadius;this.slowEff=slowEff;this.done=false;
  }
  update(){
    if(this.done) return;
    if(this.target.dead){this.done=true;return;} // reached 的敵人仍可被打
    const dx=this.target.x-this.x, dy=this.target.y-this.y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    // 使用敵人尺寸作為命中半徑，確保子彈可靠擊中
    if(dist<this.speed+(this.target.size||8)) this.hit();
    else{this.x+=dx/dist*this.speed; this.y+=dy/dist*this.speed;}
  }
  hit(){
    this.done=true;
    const now=performance.now();
    const applyHit=(e)=>{
      e.hp-=this.damage;
      e.hitFlash=now+220; // 受傷閃光
      if(this.slowEff) e.slowUntil=now+this.slowEff.duration;
      if(e.hp<=0) e.tryKill(getKillBonus());
    };
    if(this.splash){
      for(const e of enemies){
        if(e.dead||e.ghost) continue; // 幽靈兵免疫範圍傷害
        const dx=e.x-this.target.x, dy=e.y-this.target.y;
        if(Math.sqrt(dx*dx+dy*dy)<=this.splashRadius) applyHit(e);
      }
    } else {
      applyHit(this.target);
    }
  }
  draw(){
    if(this.done) return;
    const {x:sx,y:sy}=worldToScreen(this.x,this.y);
    const r=this.slowEff?5:4;
    ctx.beginPath(); ctx.arc(sx,sy,r,0,Math.PI*2);
    ctx.fillStyle=this.color; ctx.fill();
    if(this.slowEff){
      ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=1; ctx.stroke();
    }
  }
}

// ── 波次 ─────────────────────────────────────────────────
const WAVE_INTERVAL=30000;
let spawnQueue=[],spawnTimer=0,waveActive=false;
let waveComplete=false,nextWaveAt=0,nextWaveCountdown=0;

function startWave(){
  if(wave>=WAVES.length){waveComplete=true;return;}
  spawnQueue=[];
  for(const g of WAVES[wave])
    for(let i=0;i<g.count;i++) spawnQueue.push({type:g.type,delay:i*g.interval});
  spawnQueue.sort((a,b)=>a.delay-b.delay);
  spawnTimer=performance.now(); waveActive=true; wave++;
  nextWaveAt=wave<WAVES.length?performance.now()+WAVE_INTERVAL:0;
}
function updateSpawn(now){
  if(!waveActive&&!gameOver&&!waveComplete){
    if(nextWaveAt>0){
      nextWaveCountdown=Math.max(0,Math.ceil((nextWaveAt-now)/1000));
      if(now>=nextWaveAt) startWave();
    } else nextWaveCountdown=0;
  } else nextWaveCountdown=0;
  if(!waveActive) return;
  while(spawnQueue.length&&now-spawnTimer>=spawnQueue[0].delay)
    enemies.push(new Enemy(spawnQueue.shift().type));
  if(spawnQueue.length===0&&enemies.every(e=>e.dead||e.reached)){
    waveActive=false;
    if(wave>=WAVES.length) waveComplete=true;
  }
}

function isInBuildRange(row,col){
  if(!hero) return false;
  const cx=col*CELL_SIZE+CELL_SIZE/2, cy=row*CELL_SIZE+CELL_SIZE/2;
  return Math.sqrt((hero.x-cx)**2+(hero.y-cy)**2)<=BUILD_RANGE;
}

// ── 地圖繪製（俯視 2.5D）────────────────────────────────
const GRASS_TOP   = ['#4a7c3f','#5c9448','#6dac50','#85c45e'];
const GRASS_WALL  = ['#2d5228','#3a6830','#477a38','#558c42'];
const PATH_TOP    = '#c2a05a';
const PATH_WALL   = '#8a6830';

function darken(hex,f){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `rgb(${Math.floor(r*f)},${Math.floor(g*f)},${Math.floor(b*f)})`;
}

function drawTile(col, row, tower){
  const type=mapData[row][col];
  const elev=elevData[row][col];
  const ty=tileY(row,elev);
  const x=col*CELL_SIZE;
  const CS=CELL_SIZE;
  const isHover=(col===hoverCol&&row===hoverRow);
  const occ=occupiedCells.has(`${row},${col}`);

  // ① 南側牆面（比頂面先畫，下一個 row 的頂面會蓋住多餘部分）
  if(elev>0){
    const wallH=elev*ELEV_H;
    const wallY=ty+CS;
    let wColor;
    if(type===TILE.PATH||type===TILE.START||type===TILE.END) wColor=PATH_WALL;
    else wColor=GRASS_WALL[Math.min(elev,3)];
    ctx.fillStyle=wColor;
    ctx.fillRect(x, wallY, CS, wallH);
    // 牆頂亮線
    ctx.fillStyle='rgba(255,255,255,0.12)';
    ctx.fillRect(x, wallY, CS, 2);
    // 牆底暗線
    ctx.fillStyle='rgba(0,0,0,0.25)';
    ctx.fillRect(x, wallY+wallH-2, CS, 2);
  }

  // ② 頂面
  let topColor;
  if(type===TILE.START)     topColor='#27ae60';
  else if(type===TILE.END)  topColor='#e74c3c';
  else if(type===TILE.PATH) topColor=PATH_TOP;
  else topColor=GRASS_TOP[Math.min(elev,3)];

  ctx.fillStyle=topColor;
  ctx.fillRect(x, ty, CS, CS);

  // hover 高亮
  if(isHover&&type===TILE.GRASS){
    ctx.fillStyle=occ?'rgba(255,0,0,0.4)':isInBuildRange(row,col)?'rgba(0,229,255,0.4)':'rgba(255,60,60,0.35)';
    ctx.fillRect(x,ty,CS,CS);
    // 塔攻擊範圍預覽
    const _selDef=TOWER_TYPES[selectedTowerType];
    if(!occ&&!_selDef.isEconomic&&!_selDef.isMarket&&!_selDef.isTraining&&!_selDef.isLab&&!_selDef.isFortress){
      const r=_selDef.levels[0].range*CELL_SIZE;
      const cx=x+CS/2, cy=ty+CS/2;
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
      ctx.strokeStyle=isInBuildRange(row,col)?'rgba(0,229,255,0.7)':'rgba(255,80,80,0.6)';
      ctx.lineWidth=1.5; ctx.stroke();
    }
  }

  // 格線
  ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=0.5;
  ctx.strokeRect(x,ty,CS,CS);

  // START / END 標籤
  if(type===TILE.START||type===TILE.END){
    ctx.font='bold 10px sans-serif'; ctx.fillStyle='#fff';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(type===TILE.START?'START':'END', x+CS/2, ty+CS/2);
  }

  // ③ 塔
  if(tower){
    const def=TOWER_TYPES[tower.type];
    const borderCol=tower.level===3?'#ff8c00':tower.level===2?'#f1c40f':'#ccc';
    // 塔底座
    ctx.fillStyle=tower.level===3?'#6b3800':tower.level===2?'#1e3f7a':def.color;
    ctx.fillRect(x+6, ty+6, CS-12, CS-12);
    ctx.strokeStyle=selectedBuilding===tower?'#00e5ff':borderCol;
    ctx.lineWidth=selectedBuilding===tower?2.5:1.5;
    ctx.strokeRect(x+6, ty+6, CS-12, CS-12);
    // emoji
    ctx.font=`${CS*0.44}px serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(def.emoji, x+CS/2, ty+CS/2);
    // 等級
    if(tower.level>1){
      ctx.font='bold 9px sans-serif'; ctx.fillStyle=borderCol;
      ctx.textAlign='right'; ctx.textBaseline='top';
      ctx.fillText(`Lv${tower.level}`, x+CS-4, ty+4);
    }
    // 受擊閃光
    if(tower.hitFlash&&performance.now()<tower.hitFlash){
      ctx.fillStyle='rgba(255,80,80,0.45)';
      ctx.fillRect(x+6,ty+6,CS-12,CS-12);
    }
    // HP 血條（堡壘永遠顯示，其他僅在受損時顯示）
    const hpR=tower.hp/tower.maxHp;
    const isFort=TOWER_TYPES[tower.type].isFortress;
    if(hpR<1||isFort){
      const bw=CS-12,bh=isFort?5:3,bx=x+6,by=ty+CS-(isFort?8:5);
      if(isFort){ ctx.fillStyle='#111'; ctx.fillRect(bx-1,by-1,bw+2,bh+2); }
      ctx.fillStyle='#333'; ctx.fillRect(bx,by,bw,bh);
      ctx.fillStyle=hpR>0.5?'#27ae60':hpR>0.25?'#e67e22':'#c0392b';
      ctx.fillRect(bx,by,bw*hpR,bh);
      if(isFort){
        ctx.font='bold 9px sans-serif'; ctx.fillStyle='#fff';
        ctx.textAlign='center'; ctx.textBaseline='bottom';
        ctx.fillText(`${Math.ceil(tower.hp)}/${tower.maxHp}`,x+CS/2,by-1);
      }
    }
  }
}

function drawMap(){
  const towerMap={};
  for(const t of towers) towerMap[`${t.row},${t.col}`]=t;

  // 逐 row 繪製（row 0 最遠，row ROWS-1 最近）
  for(let row=0;row<ROWS;row++){
    // 先畫南側牆面（會被下一 row 頂面覆蓋），再畫頂面
    for(let col=0;col<COLS;col++) drawTile(col, row, towerMap[`${row},${col}`]);
  }
}

// ── HUD ──────────────────────────────────────────────────
function drawHUD(){
  if(!waveActive&&nextWaveCountdown>0){
    ctx.font='bold 18px sans-serif'; ctx.textAlign='right'; ctx.textBaseline='top';
    ctx.fillStyle=nextWaveCountdown<=5?'#e74c3c':'#f1c40f';
    ctx.fillText(`下一波 ${nextWaveCountdown}s`, canvas.width-10, TOP_OFFSET+8);
  }
  const now=performance.now();
  if(messageText&&now<messageExpire){
    ctx.globalAlpha=Math.min(1,(messageExpire-now)/400);
    ctx.font='bold 20px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='#ff5252';
    ctx.fillText(messageText, canvas.width/2, TOP_OFFSET+30);
    ctx.globalAlpha=1;
  }
  drawUpgradePanel();
  // 虛擬搖桿
  if(joystick.active){
    ctx.save();
    ctx.globalAlpha=0.45;
    ctx.beginPath();
    ctx.arc(joystick.baseX, joystick.baseY, joystick.baseR, 0, Math.PI*2);
    ctx.fillStyle='#ffffff'; ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=2; ctx.stroke();
    ctx.beginPath();
    ctx.arc(joystick.knobX, joystick.knobY, joystick.knobR, 0, Math.PI*2);
    ctx.fillStyle='#00e5ff'; ctx.fill();
    ctx.globalAlpha=1;
    ctx.restore();
  }
}

function drawUpgradePanel(){
  upgradeButtonBounds=null; trainUnitButtonBounds=[]; researchButtonBounds=[];
  if(!selectedBuilding) return;
  const t=selectedBuilding, def=TOWER_TYPES[t.type];
  const now=performance.now();
  if(def.isLab)      { drawLabPanel(t,def,now); return; }
  if(def.isTraining) { drawTrainingPanel(t,def,now); return; }

  // ── 一般建築面板 ──
  const stats=def.levels[t.level-1], upCost=t.upgradeCost;
  const elev=elevData[t.row][t.col];
  const sx=t.col*CELL_SIZE+CELL_SIZE/2, sy=tileY(t.row,elev);
  const pW=210, pH=upCost?120:100;
  let px=sx-pW/2, py=sy-pH-8;
  px=Math.max(4,Math.min(canvas.width-pW-4,px));
  py=Math.max(4,py<4?sy+CELL_SIZE+4:py);
  ctx.fillStyle='rgba(8,18,48,0.95)'; ctx.strokeStyle='#00e5ff'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(px,py,pW,pH,8); ctx.fill(); ctx.stroke();
  const stars='★'.repeat(t.level)+'☆'.repeat(3-t.level);
  ctx.font='bold 14px sans-serif'; ctx.fillStyle='#fff'; ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText(`${def.emoji} ${def.name}`, px+10, py+10);
  ctx.font='13px sans-serif'; ctx.fillStyle=t.level===3?'#ff8c00':t.level===2?'#f1c40f':'#aaa';
  ctx.textAlign='right'; ctx.fillText(stars, px+pW-10, py+11);
  ctx.font='12px sans-serif'; ctx.fillStyle='#99ccff'; ctx.textAlign='left';
  if(def.isEconomic)     ctx.fillText(`💰 每${stats.tickInterval/1000}s 產出 ${stats.goldPerTick}金`, px+10, py+34);
  else if(def.isMarket)  ctx.fillText(`🏷️ 每擊殺 +${stats.bonusPerKill}金`, px+10, py+34);
  else if(def.isChain)   ctx.fillText(`⚡${stats.damage}  📡${stats.range/CELL_SIZE}  🔗${stats.chainCount}目標  ⏱${(stats.fireRate/1000).toFixed(1)}s`, px+10, py+34);
  else                   ctx.fillText(`⚔️${stats.damage}  📡${stats.range/CELL_SIZE}  ⏱${(stats.fireRate/1000).toFixed(1)}s`, px+10, py+34);
  if(upCost){
    const next=def.levels[t.level];
    ctx.fillStyle='#aaa';
    if(def.isEconomic)    ctx.fillText(`→Lv${t.level+1}: 每${next.tickInterval/1000}s +${next.goldPerTick}金`, px+10, py+54);
    else if(def.isMarket) ctx.fillText(`→Lv${t.level+1}: 每擊殺 +${next.bonusPerKill}金`, px+10, py+54);
    else if(def.isChain)  ctx.fillText(`→Lv${t.level+1}: ⚡${next.damage} 🔗${next.chainCount}目標`, px+10, py+54);
    else                  ctx.fillText(`→Lv${t.level+1}: ⚔️${next.damage} 📡${next.range} ⏱${(next.fireRate/1000).toFixed(1)}s`, px+10, py+54);
    const canUp=gold>=upCost&&isInBuildRange(t.row,t.col);
    const bx=px+10,by=py+76,bw=pW-20,bh=28;
    ctx.fillStyle=canUp?'#1e6e3a':'#333';
    ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,5); ctx.fill();
    ctx.strokeStyle=canUp?'#2ecc71':'#555'; ctx.lineWidth=1; ctx.stroke();
    ctx.font='bold 12px sans-serif'; ctx.fillStyle=canUp?'#fff':'#666';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    const note=!isInBuildRange(t.row,t.col)?'(需靠近)':gold<upCost?'(金幣不足)':'';
    ctx.fillText(`升級 Lv${t.level+1}  ${upCost}💰 ${note}`, bx+bw/2, by+bh/2);
    if(canUp) upgradeButtonBounds={x:bx,y:by,w:bw,h:bh};
  } else {
    ctx.font='bold 13px sans-serif'; ctx.fillStyle='#f1c40f';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🏆 已達最高等級', px+pW/2, py+pH-20);
  }
}

// ── 訓練場面板 ────────────────────────────────────────────
function drawTrainingPanel(t, def, now){
  const available=['infantry'];
  if(researchDone.has('cavalry'))  available.push('cavalry');
  if(researchDone.has('paladin'))  available.push('paladin');
  const upCost=t.upgradeCost;
  const btnH=28, btnGap=5;
  const pW=230;
  const pH=14+24+8+18+10+6+10+available.length*(btnH+btnGap)+(upCost?44:0)+16;
  const elev=elevData[t.row][t.col];
  const sx=t.col*CELL_SIZE+CELL_SIZE/2, sy=tileY(t.row,elev);
  let px=sx-pW/2, py=sy-pH-8;
  px=Math.max(4,Math.min(canvas.width-pW-4,px));
  py=Math.max(4,py<4?sy+CELL_SIZE+4:py);
  ctx.fillStyle='rgba(8,18,48,0.95)'; ctx.strokeStyle='#7986cb'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(px,py,pW,pH,8); ctx.fill(); ctx.stroke();
  // Header
  const stars='★'.repeat(t.level)+'☆'.repeat(3-t.level);
  ctx.font='bold 14px sans-serif'; ctx.fillStyle='#fff'; ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText(`🏋️ 訓練場`, px+10, py+10);
  ctx.font='13px sans-serif'; ctx.fillStyle=t.level===3?'#ff8c00':t.level===2?'#f1c40f':'#aaa';
  ctx.textAlign='right'; ctx.fillText(stars, px+pW-10, py+11);
  // Status
  const myUnits=friendlyUnits.filter(u=>u.source===t&&!u.dead).length;
  const speedMult=researchDone.has('trainSpeed')?0.65:1;
  const effInterval=t.trainInterval*speedMult;
  const elapsed=now-t.lastTick, remain=Math.max(0,effInterval-elapsed);
  const pct=Math.min(1,elapsed/effInterval);
  let iy=py+38;
  ctx.font='12px sans-serif'; ctx.fillStyle='#aaa'; ctx.textAlign='left'; ctx.textBaseline='top';
  const uDef=FRIENDLY_UNIT_TYPES[t.trainUnitType||'infantry'];
  ctx.fillText(`${uDef.emoji}${uDef.name}  👥${myUnits}/${t.maxUnits}  ⏱${remain>0?Math.ceil(remain/1000)+'s':'就緒'}`, px+10, iy);
  iy+=18;
  // Progress bar
  ctx.fillStyle='#2a2a4a'; ctx.fillRect(px+10,iy,pW-20,6);
  ctx.fillStyle='#7986cb'; ctx.fillRect(px+10,iy,(pW-20)*pct,6);
  iy+=16;
  // Unit type buttons
  ctx.font='bold 11px sans-serif'; ctx.fillStyle='#aaa'; ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText('選擇訓練兵種：', px+10, iy); iy+=16;
  for(const ut of available){
    const uD=FRIENDLY_UNIT_TYPES[ut];
    const sel=t.trainUnitType===ut;
    const bx=px+10, by=iy, bw=pW-20;
    ctx.fillStyle=sel?'#283593':'rgba(30,35,80,0.8)';
    ctx.beginPath(); ctx.roundRect(bx,by,bw,btnH,4); ctx.fill();
    ctx.strokeStyle=sel?'#7986cb':'#444'; ctx.lineWidth=sel?2:1; ctx.stroke();
    ctx.font='bold 12px sans-serif'; ctx.fillStyle=sel?'#fff':'#aaa';
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(`${uD.emoji} ${uD.name}`, bx+10, by+btnH/2);
    ctx.textAlign='right'; ctx.fillStyle='#777';
    ctx.fillText(`HP:${uD.hp} ATK:${uD.damage}`, bx+bw-8, by+btnH/2);
    trainUnitButtonBounds.push({x:bx,y:by,w:bw,h:btnH,unitType:ut});
    iy+=btnH+btnGap;
  }
  // Upgrade button
  if(upCost){
    const canUp=gold>=upCost&&isInBuildRange(t.row,t.col);
    const bx=px+10,by=iy+4,bw=pW-20,bh=28;
    ctx.fillStyle=canUp?'#1e6e3a':'#333';
    ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,5); ctx.fill();
    ctx.strokeStyle=canUp?'#2ecc71':'#555'; ctx.lineWidth=1; ctx.stroke();
    ctx.font='bold 12px sans-serif'; ctx.fillStyle=canUp?'#fff':'#666';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    const note=!isInBuildRange(t.row,t.col)?'(需靠近)':gold<upCost?'(金幣不足)':'';
    ctx.fillText(`升級 Lv${t.level+1}  ${upCost}💰 ${note}`, bx+bw/2, by+bh/2);
    if(canUp) upgradeButtonBounds={x:bx,y:by,w:bw,h:bh};
  } else {
    ctx.font='bold 13px sans-serif'; ctx.fillStyle='#f1c40f';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🏆 已達最高等級', px+pW/2, py+pH-12);
  }
}

// ── 研發所面板 ────────────────────────────────────────────
function drawLabPanel(t, def, now){
  const upCost=t.upgradeCost;
  const itemH=34;
  const pW=240;
  const pH=14+26+8+RESEARCH_ITEMS.length*itemH+(upCost?44:0)+14;
  const elev=elevData[t.row][t.col];
  const sx=t.col*CELL_SIZE+CELL_SIZE/2, sy=tileY(t.row,elev);
  let px=sx-pW/2, py=sy-pH-8;
  px=Math.max(4,Math.min(canvas.width-pW-4,px));
  py=Math.max(4,py<4?sy+CELL_SIZE+4:py);
  ctx.fillStyle='rgba(8,18,48,0.95)'; ctx.strokeStyle='#ce93d8'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(px,py,pW,pH,8); ctx.fill(); ctx.stroke();
  // Header
  ctx.font='bold 14px sans-serif'; ctx.fillStyle='#fff'; ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText(`🔬 研發所`, px+10, py+10);
  ctx.font='12px sans-serif'; ctx.fillStyle='#aaa'; ctx.textAlign='right';
  ctx.fillText(`Lv${t.level} · ${researchDone.size}項已研發`, px+pW-10, py+12);
  let iy=py+44;
  for(const item of RESEARCH_ITEMS){
    const done=researchDone.has(item.id);
    const locked=item.req&&!researchDone.has(item.req);
    const canAfford=!done&&!locked&&gold>=item.cost;
    const canResearch=canAfford&&isInBuildRange(t.row,t.col);
    const bx=px+8, by=iy, bw=pW-16, bh=itemH-4;
    if(done)       ctx.fillStyle='rgba(27,94,32,0.5)';
    else if(locked) ctx.fillStyle='rgba(40,40,40,0.6)';
    else            ctx.fillStyle=canAfford?'rgba(26,35,96,0.9)':'rgba(60,10,10,0.8)';
    ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,4); ctx.fill();
    ctx.strokeStyle=done?'#388e3c':locked?'#555':canAfford?'#7e57c2':'#b71c1c';
    ctx.lineWidth=1; ctx.stroke();
    ctx.font='bold 12px sans-serif'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillStyle=done?'#a5d6a7':locked?'#555':'#fff';
    ctx.fillText(`${done?'✅':locked?'🔒':''} ${item.name}`, bx+8, by+bh/2);
    ctx.font='11px sans-serif'; ctx.textAlign='right';
    if(done){
      ctx.fillStyle='#66bb6a'; ctx.fillText('已研發', bx+bw-8, by+bh/2);
    } else if(locked){
      ctx.fillStyle='#555'; ctx.fillText(`需先:${RESEARCH_ITEMS.find(r=>r.id===item.req)?.name||item.req}`, bx+bw-8, by+bh/2);
    } else {
      ctx.fillStyle=canAfford?'#f1c40f':'#e57373';
      ctx.fillText(`${item.cost}💰`, bx+bw-8, by+bh/2);
      if(canResearch) researchButtonBounds.push({x:bx,y:by,w:bw,h:bh,id:item.id,cost:item.cost});
    }
    // desc
    ctx.font='10px sans-serif'; ctx.fillStyle='#888'; ctx.textAlign='left';
    // iy+=itemH; // we draw desc below the button if we want, but it's already 34px tall
    iy+=itemH;
  }
  // Upgrade button
  if(upCost){
    const canUp=gold>=upCost&&isInBuildRange(t.row,t.col);
    const bx=px+8,by=iy+2,bw=pW-16,bh=28;
    ctx.fillStyle=canUp?'#1e6e3a':'#333';
    ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,5); ctx.fill();
    ctx.strokeStyle=canUp?'#2ecc71':'#555'; ctx.lineWidth=1; ctx.stroke();
    ctx.font='bold 12px sans-serif'; ctx.fillStyle=canUp?'#fff':'#666';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    const note=!isInBuildRange(t.row,t.col)?'(需靠近)':gold<upCost?'(金幣不足)':'';
    ctx.fillText(`升級 Lv${t.level+1}  ${upCost}💰 ${note}`, bx+bw/2, by+bh/2);
    if(canUp) upgradeButtonBounds={x:bx,y:by,w:bw,h:bh};
  } else {
    ctx.font='bold 13px sans-serif'; ctx.fillStyle='#f1c40f';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🏆 已達最高等級', px+pW/2, py+pH-12);
  }
}

// ── 遊戲迴圈 ──────────────────────────────────────────────
function gameLoop(now){
  if(gameOver){drawGameOver();return;}
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#1a1a2e'; ctx.fillRect(0,0,canvas.width,canvas.height);
  updateSpawn(now);
  // 塔攻擊範圍
  for(const t of towers) t.drawRange();
  // 地圖
  drawMap();
  // 電塔閃電特效
  for(const t of towers){
    if(!TOWER_TYPES[t.type].isChain||!t.lightningTargets||now>t.lightningExpire) continue;
    const {x:tx,y:ty}=worldToScreen(t.x,t.y);
    ctx.save();
    ctx.strokeStyle='rgba(255,230,0,0.9)'; ctx.lineWidth=2;
    ctx.shadowBlur=8; ctx.shadowColor='#ffd600';
    for(const tp of t.lightningTargets){
      const {x:ex,y:ey}=worldToScreen(tp.x,tp.y);
      ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(ex,ey); ctx.stroke();
    }
    ctx.restore();
  }
  // 更新邏輯
  for(const e of enemies) e.update(now);
  enemies=enemies.filter(e=>!e.dead);   // 只移除已死亡；抵達堡壘的繼續留場戰鬥
  for(const t of towers) t.update(now);
  if(hero) hero.update(now);
  for(const u of friendlyUnits) u.update(now);
  friendlyUnits=friendlyUnits.filter(u=>!u.dead);
  // 繪製實體（深度排序）
  const ents=[...enemies,...friendlyUnits,hero].filter(Boolean).filter(e=>!e.dead);
  ents.sort((a,b)=>a.y-b.y);
  for(const e of ents) e.draw(now);
  // 子彈
  bullets=bullets.filter(b=>!b.done);
  for(const b of bullets){b.update();b.draw();}
  drawHUD();
  animFrameId=requestAnimationFrame(gameLoop);
}

function drawGameOver(){
  ctx.fillStyle='rgba(0,0,0,0.72)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.font='52px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('🏚️',canvas.width/2,canvas.height/2-52);
  ctx.fillStyle='#e74c3c'; ctx.font='bold 44px sans-serif';
  ctx.fillText('堡壘陷落！', canvas.width/2, canvas.height/2-4);
  ctx.font='16px sans-serif'; ctx.fillStyle='#aaa';
  ctx.fillText('點擊「返回選關」重新挑戰', canvas.width/2, canvas.height/2+42);
}

// ── 事件監聽 ──────────────────────────────────────────────
document.addEventListener('keydown', e=>{
  keys[e.key]=true;
  if(e.key==='1') selectTower('archer');
  if(e.key==='2') selectTower('mage');
  if(e.key==='3') selectTower('cannon');
  if(e.key==='4') selectTower('farm');
  if(e.key==='5') selectTower('ice');
  if(e.key==='6') selectTower('lightning');
  if(e.key==='7') selectTower('mine');
  if(e.key==='8') selectTower('market');
  if(e.key==='9') selectTower('training');
  if(e.key==='0') selectTower('lab');
  if(e.key==='Escape') selectedBuilding=null;
  if(e.key==='Enter'&&!waveActive&&!gameOver) nextWaveAt=performance.now();
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup', e=>{ keys[e.key]=false; });

function selectTower(type){
  selectedTowerType=type;
  document.querySelectorAll('.tower-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(`btn-${type}`).classList.add('active');
}

canvas.addEventListener('mousemove', e=>{
  const rect=canvas.getBoundingClientRect();
  const g=screenToGrid(e.clientX-rect.left, e.clientY-rect.top);
  hoverCol=g.col; hoverRow=g.row;
});
canvas.addEventListener('mouseleave', ()=>{hoverCol=-1;hoverRow=-1;});

canvas.addEventListener('click', e=>{
  if(gameOver) return;
  const rect=canvas.getBoundingClientRect();
  const cx=e.clientX-rect.left, cy=e.clientY-rect.top;
  // 升級按鈕
  if(upgradeButtonBounds){
    const b=upgradeButtonBounds;
    if(cx>=b.x&&cx<=b.x+b.w&&cy>=b.y&&cy<=b.y+b.h){
      if(selectedBuilding.tryUpgrade()) showMessage('✅ 升級成功！');
      return;
    }
  }
  // 研發按鈕
  for(const b of researchButtonBounds){
    if(cx>=b.x&&cx<=b.x+b.w&&cy>=b.y&&cy<=b.y+b.h){
      researchDone.add(b.id); gold-=b.cost;
      showMessage(`🔬 研發完成：${RESEARCH_ITEMS.find(r=>r.id===b.id)?.name}`);
      return;
    }
  }
  // 訓練兵種切換
  for(const b of trainUnitButtonBounds){
    if(cx>=b.x&&cx<=b.x+b.w&&cy>=b.y&&cy<=b.y+b.h){
      if(selectedBuilding) selectedBuilding.trainUnitType=b.unitType;
      return;
    }
  }
  const {col,row}=screenToGrid(cx,cy);
  if(row<0||row>=ROWS||col<0||col>=COLS) return;
  if(mapData[row][col]!==TILE.GRASS) return;
  const key=`${row},${col}`;
  if(occupiedCells.has(key)){
    const ex=towers.find(t=>t.row===row&&t.col===col);
    selectedBuilding=(selectedBuilding===ex)?null:ex;
    return;
  }
  selectedBuilding=null;
  if(!isInBuildRange(row,col)){showMessage('⚠️ 主角需要靠近才能建造！');return;}
  const _bDef=TOWER_TYPES[selectedTowerType];
  if(_bDef.isFortress&&towers.some(t=>TOWER_TYPES[t.type].isFortress)){
    showMessage('🏰 堡壘已存在，只能建造一座！');return;
  }
  const cost=_bDef.levels[0].cost;
  if(gold<cost){showMessage(`💰 金幣不足！需要 ${cost} 金幣`);return;}
  // 確認建塔後路徑仍存在
  const testOcc=new Set([...occupiedCells,key]);
  if(!findPath(testOcc)){showMessage('⚠️ 不能完全封鎖路徑！');return;}
  gold-=cost;
  towers.push(new Tower(row,col,selectedTowerType));
  occupiedCells.add(key);
  recalculateAllPaths();
});

// ── 虛擬搖桿：觸控事件 ───────────────────────────────────
function getCanvasPos(touch){
  const rect=canvas.getBoundingClientRect();
  const scaleX=canvas.width/rect.width, scaleY=canvas.height/rect.height;
  return { x:(touch.clientX-rect.left)*scaleX, y:(touch.clientY-rect.top)*scaleY };
}

canvas.addEventListener('touchstart', e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
    const {x,y}=getCanvasPos(t);
    // 左半螢幕啟動搖桿
    if(x < canvas.width/2 && !joystick.active){
      joystick.active=true; joystick.touchId=t.identifier;
      joystick.baseX=x; joystick.baseY=y;
      joystick.knobX=x; joystick.knobY=y;
      joystick.dx=0; joystick.dy=0;
    }
  }
},{passive:false});

canvas.addEventListener('touchmove', e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
    if(t.identifier===joystick.touchId){
      const {x,y}=getCanvasPos(t);
      const ddx=x-joystick.baseX, ddy=y-joystick.baseY;
      const dist=Math.sqrt(ddx*ddx+ddy*ddy);
      const max=joystick.baseR-joystick.knobR;
      const clamp=Math.min(dist,max);
      const angle=Math.atan2(ddy,ddx);
      joystick.knobX=joystick.baseX+Math.cos(angle)*clamp;
      joystick.knobY=joystick.baseY+Math.sin(angle)*clamp;
      joystick.dx=dist>6?Math.cos(angle)*Math.min(dist/max,1):0;
      joystick.dy=dist>6?Math.sin(angle)*Math.min(dist/max,1):0;
    }
  }
},{passive:false});

canvas.addEventListener('touchend', e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
    if(t.identifier===joystick.touchId){
      joystick.active=false; joystick.touchId=null;
      joystick.dx=0; joystick.dy=0;
    }
  }
},{passive:false});

canvas.addEventListener('touchcancel', e=>{
  joystick.active=false; joystick.touchId=null; joystick.dx=0; joystick.dy=0;
},{passive:false});
