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
  [2,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0],  // row 7: 路線乙入口（左中）
  [0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3],  // row 12: 路線丙入口（左下直穿）
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// PATH 格子高度必須為 0；相鄰格高度差 ≤ 1
// 高地A：右上 (rows 0-4, cols 12-19, elev 3)
// 高地B：左下 (rows 12-14, cols 0-3,  elev 3)
const elevData = [
  [1,1,1,1,1,1,1,1,1,1,1,2,3,3,3,3,3,3,3,3], // row 0
  [1,1,1,1,1,1,1,1,1,1,1,2,3,3,3,3,3,3,3,3], // row 1
  [0,0,0,0,0,1,1,1,1,1,1,2,3,3,3,3,3,3,3,3], // row 2  path:0-4
  [1,1,1,1,0,1,1,1,1,1,2,2,3,3,3,3,3,3,3,3], // row 3  path:4
  [1,1,1,1,0,0,0,0,1,1,2,2,3,3,3,3,3,3,3,3], // row 4  path:4-7
  [1,1,1,1,1,1,1,0,1,1,1,1,2,2,3,3,3,3,3,3], // row 5  path:7
  [1,1,1,1,1,1,1,0,0,0,0,0,1,2,2,2,3,3,3,3], // row 6  path:7-11
  [0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,2,2,3,3,3], // row 7  path:0-11（路線乙）
  [1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,2,2,2,3], // row 8  path:11-14
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,2,2], // row 9  path:14
  [2,2,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1], // row 10 path:14-18
  [2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1], // row 11 path:18
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 12 path:0-19（路線丙全程）
  [3,3,3,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // row 13
  [3,3,3,3,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1], // row 14
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

// 三條進攻路線的出生點
const SPAWN_POINTS = [
  {row:2,  col:0},  // 路線甲（左上，原有）
  {row:7,  col:0},  // 路線乙（左中，新）
  {row:12, col:0},  // 路線丙（左下，新）
];

function findPath(occupied, start) {
  if(occupied===undefined||occupied===null) occupied=occupiedCells;

  // 動態終點：有堡壘就直奔堡壘，否則退回 PATH_END
  const fort=towers.find(t=>TOWER_TYPES[t.type].isFortress);
  const {row:ER,col:EC}=fort?{row:fort.row,col:fort.col}:PATH_END;
  const {row:SR,col:SC}=start||PATH_START;

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
  // ── L1：純步兵，非常簡單 ──────────────────────────────
  1: [
    [{type:'grunt',count:3,interval:1800}],
    [{type:'grunt',count:4,interval:1700}],
    [{type:'grunt',count:4,interval:1600}],
    [{type:'grunt',count:5,interval:1500}],
    [{type:'grunt',count:5,interval:1400}],
    [{type:'grunt',count:6,interval:1350}],
    [{type:'grunt',count:6,interval:1300}],
    [{type:'grunt',count:7,interval:1250}],
    [{type:'grunt',count:7,interval:1200}],
    [{type:'grunt',count:8,interval:1150}],
    [{type:'grunt',count:8,interval:1100}],
    [{type:'grunt',count:9,interval:1050}],
    [{type:'grunt',count:9,interval:1000}],
    [{type:'grunt',count:10,interval:950}],
    [{type:'grunt',count:10,interval:900}],
    [{type:'grunt',count:11,interval:880}],
    [{type:'grunt',count:11,interval:860}],
    [{type:'grunt',count:12,interval:840}],
    [{type:'grunt',count:13,interval:800}],
    [{type:'grunt',count:15,interval:750}],
  ],
  // ── L2：步兵＋快衝兵 ──────────────────────────────────
  2: [
    [{type:'grunt',count:4,interval:1400}],
    [{type:'grunt',count:5,interval:1300}],
    [{type:'grunt',count:5,interval:1200},{type:'runner',count:3,interval:900}],
    [{type:'runner',count:5,interval:850}],
    [{type:'grunt',count:6,interval:1100},{type:'runner',count:4,interval:800}],
    [{type:'runner',count:7,interval:780}],
    [{type:'grunt',count:7,interval:1000},{type:'runner',count:5,interval:750}],
    [{type:'grunt',count:8,interval:950},{type:'runner',count:6,interval:720}],
    [{type:'runner',count:8,interval:700}],
    [{type:'grunt',count:8,interval:900},{type:'runner',count:6,interval:680}],
    [{type:'grunt',count:9,interval:850},{type:'runner',count:7,interval:660}],
    [{type:'runner',count:9,interval:640}],
    [{type:'grunt',count:10,interval:820},{type:'runner',count:7,interval:620}],
    [{type:'grunt',count:11,interval:800},{type:'runner',count:8,interval:600}],
    [{type:'runner',count:10,interval:580}],
    [{type:'grunt',count:12,interval:780},{type:'runner',count:9,interval:560}],
    [{type:'grunt',count:13,interval:750},{type:'runner',count:10,interval:540}],
    [{type:'runner',count:12,interval:520}],
    [{type:'grunt',count:14,interval:720},{type:'runner',count:11,interval:500}],
    [{type:'grunt',count:16,interval:680},{type:'runner',count:13,interval:480}],
  ],
  // ── L3：加入重甲兵 ─────────────────────────────────────
  3: [
    [{type:'grunt',count:5,interval:1100}],
    [{type:'grunt',count:6,interval:1050},{type:'runner',count:3,interval:800}],
    [{type:'runner',count:7,interval:750}],
    [{type:'grunt',count:7,interval:1000},{type:'runner',count:5,interval:720},{type:'tank',count:1,interval:2800}],
    [{type:'runner',count:8,interval:700},{type:'tank',count:1,interval:2600}],
    [{type:'grunt',count:8,interval:950},{type:'runner',count:6,interval:680},{type:'tank',count:1,interval:2500}],
    [{type:'runner',count:9,interval:660},{type:'tank',count:2,interval:2400}],
    [{type:'grunt',count:9,interval:900},{type:'runner',count:7,interval:640},{type:'tank',count:2,interval:2300}],
    [{type:'runner',count:10,interval:620},{type:'tank',count:2,interval:2200}],
    [{type:'grunt',count:10,interval:870},{type:'runner',count:8,interval:610},{type:'tank',count:2,interval:2100}],
    [{type:'grunt',count:11,interval:840},{type:'runner',count:9,interval:590},{type:'tank',count:3,interval:2000}],
    [{type:'runner',count:11,interval:580},{type:'tank',count:3,interval:1950}],
    [{type:'grunt',count:12,interval:820},{type:'runner',count:9,interval:570},{type:'tank',count:3,interval:1900}],
    [{type:'grunt',count:13,interval:800},{type:'runner',count:10,interval:560},{type:'tank',count:3,interval:1850}],
    [{type:'runner',count:12,interval:540},{type:'tank',count:4,interval:1800}],
    [{type:'grunt',count:14,interval:780},{type:'runner',count:10,interval:530},{type:'tank',count:4,interval:1750}],
    [{type:'grunt',count:15,interval:760},{type:'runner',count:11,interval:520},{type:'tank',count:4,interval:1700}],
    [{type:'runner',count:13,interval:500},{type:'tank',count:5,interval:1650}],
    [{type:'grunt',count:16,interval:740},{type:'runner',count:12,interval:490},{type:'tank',count:5,interval:1600}],
    [{type:'grunt',count:18,interval:700},{type:'runner',count:14,interval:470},{type:'tank',count:5,interval:1550}],
  ],
  // ── L4：引入重生兵與幽靈兵 ────────────────────────────
  4: [
    [{type:'grunt',count:6,interval:1000},{type:'runner',count:4,interval:750}],
    [{type:'runner',count:7,interval:700},{type:'tank',count:1,interval:2600}],
    [{type:'grunt',count:8,interval:950},{type:'runner',count:6,interval:680},{type:'tank',count:1,interval:2500}],
    [{type:'runner',count:9,interval:660},{type:'tank',count:2,interval:2400}],
    [{type:'grunt',count:9,interval:900},{type:'runner',count:7,interval:640},{type:'tank',count:2,interval:2300}],
    [{type:'grunt',count:10,interval:880},{type:'tank',count:2,interval:2200}],
    [{type:'runner',count:10,interval:620},{type:'tank',count:3,interval:2100}],
    [{type:'grunt',count:11,interval:860},{type:'runner',count:8,interval:610},{type:'tank',count:3,interval:2000}],
    [{type:'runner',count:11,interval:600},{type:'tank',count:3,interval:1950}],
    [{type:'grunt',count:12,interval:840},{type:'runner',count:9,interval:590},{type:'tank',count:4,interval:1900}],
    [{type:'grunt',count:13,interval:820},{type:'tank',count:4,interval:1850},{type:'revenant',count:1,interval:3000}],
    [{type:'runner',count:12,interval:580},{type:'ghost',count:2,interval:1500},{type:'tank',count:4,interval:1800}],
    [{type:'grunt',count:14,interval:800},{type:'runner',count:10,interval:570},{type:'revenant',count:2,interval:2800}],
    [{type:'runner',count:13,interval:560},{type:'tank',count:5,interval:1750},{type:'ghost',count:2,interval:1400}],
    [{type:'grunt',count:15,interval:780},{type:'runner',count:11,interval:550},{type:'revenant',count:2,interval:2600},{type:'ghost',count:2,interval:1400}],
    [{type:'grunt',count:17,interval:760},{type:'tank',count:5,interval:1700},{type:'revenant',count:3,interval:2400}],
    [{type:'runner',count:14,interval:540},{type:'ghost',count:3,interval:1300},{type:'tank',count:6,interval:1650}],
    [{type:'grunt',count:18,interval:740},{type:'runner',count:13,interval:520},{type:'revenant',count:3,interval:2200},{type:'ghost',count:3,interval:1200}],
    [{type:'grunt',count:20,interval:720},{type:'runner',count:15,interval:500},{type:'tank',count:7,interval:1600},{type:'revenant',count:4,interval:2000},{type:'ghost',count:3,interval:1100}],
    [{type:'grunt',count:22,interval:700},{type:'runner',count:17,interval:480},{type:'tank',count:8,interval:1500},{type:'revenant',count:4,interval:1900},{type:'ghost',count:4,interval:1050}],
  ],
  // ── L5：全敵種混合，難度提升 ──────────────────────────
  5: [
    [{type:'grunt',count:7,interval:950},{type:'runner',count:5,interval:700},{type:'tank',count:1,interval:2500}],
    [{type:'grunt',count:8,interval:900},{type:'runner',count:6,interval:680},{type:'tank',count:2,interval:2400}],
    [{type:'runner',count:8,interval:660},{type:'tank',count:2,interval:2300}],
    [{type:'grunt',count:9,interval:880},{type:'runner',count:7,interval:640},{type:'tank',count:2,interval:2200},{type:'revenant',count:1,interval:3000}],
    [{type:'grunt',count:10,interval:860},{type:'runner',count:8,interval:620},{type:'tank',count:3,interval:2100},{type:'ghost',count:1,interval:1500}],
    [{type:'runner',count:10,interval:600},{type:'tank',count:3,interval:2000},{type:'revenant',count:2,interval:2800}],
    [{type:'grunt',count:11,interval:840},{type:'runner',count:9,interval:590},{type:'tank',count:3,interval:1950},{type:'ghost',count:2,interval:1450}],
    [{type:'grunt',count:12,interval:820},{type:'runner',count:10,interval:580},{type:'tank',count:4,interval:1900},{type:'revenant',count:2,interval:2600}],
    [{type:'runner',count:12,interval:560},{type:'tank',count:4,interval:1850},{type:'ghost',count:2,interval:1400}],
    [{type:'grunt',count:13,interval:800},{type:'runner',count:10,interval:570},{type:'tank',count:4,interval:1800},{type:'revenant',count:2,interval:2500}],
    [{type:'grunt',count:14,interval:780},{type:'tank',count:5,interval:1750},{type:'revenant',count:3,interval:2400},{type:'ghost',count:3,interval:1350}],
    [{type:'runner',count:14,interval:540},{type:'tank',count:5,interval:1700},{type:'ghost',count:3,interval:1300}],
    [{type:'grunt',count:15,interval:760},{type:'runner',count:11,interval:560},{type:'revenant',count:3,interval:2300},{type:'ghost',count:3,interval:1250}],
    [{type:'runner',count:15,interval:530},{type:'tank',count:6,interval:1650},{type:'revenant',count:4,interval:2200}],
    [{type:'grunt',count:17,interval:750},{type:'runner',count:12,interval:550},{type:'tank',count:6,interval:1600},{type:'ghost',count:4,interval:1200}],
    [{type:'grunt',count:18,interval:730},{type:'tank',count:7,interval:1550},{type:'revenant',count:4,interval:2100},{type:'ghost',count:4,interval:1150}],
    [{type:'runner',count:17,interval:510},{type:'tank',count:7,interval:1500},{type:'revenant',count:5,interval:2000},{type:'ghost',count:4,interval:1100}],
    [{type:'grunt',count:20,interval:710},{type:'runner',count:15,interval:520},{type:'tank',count:8,interval:1450},{type:'revenant',count:5,interval:1900}],
    [{type:'grunt',count:22,interval:690},{type:'runner',count:17,interval:500},{type:'tank',count:9,interval:1400},{type:'revenant',count:5,interval:1850},{type:'ghost',count:5,interval:1050}],
    [{type:'grunt',count:24,interval:660},{type:'runner',count:19,interval:480},{type:'tank',count:9,interval:1350},{type:'revenant',count:5,interval:1800},{type:'ghost',count:5,interval:1000}],
  ],
  // ── L6：壓力加劇 ──────────────────────────────────────
  6: [
    [{type:'grunt',count:8,interval:900},{type:'runner',count:6,interval:680},{type:'tank',count:2,interval:2300}],
    [{type:'grunt',count:9,interval:880},{type:'runner',count:7,interval:660},{type:'tank',count:2,interval:2200},{type:'revenant',count:1,interval:2800}],
    [{type:'runner',count:9,interval:640},{type:'tank',count:3,interval:2100}],
    [{type:'grunt',count:10,interval:860},{type:'runner',count:8,interval:620},{type:'tank',count:3,interval:2000},{type:'ghost',count:2,interval:1400}],
    [{type:'grunt',count:11,interval:840},{type:'runner',count:9,interval:600},{type:'tank',count:3,interval:1950},{type:'revenant',count:2,interval:2600}],
    [{type:'runner',count:11,interval:580},{type:'tank',count:4,interval:1900},{type:'ghost',count:2,interval:1350}],
    [{type:'grunt',count:12,interval:820},{type:'runner',count:10,interval:580},{type:'tank',count:4,interval:1850},{type:'revenant',count:2,interval:2500}],
    [{type:'grunt',count:13,interval:800},{type:'runner',count:11,interval:560},{type:'tank',count:4,interval:1800},{type:'ghost',count:3,interval:1300}],
    [{type:'runner',count:13,interval:550},{type:'tank',count:5,interval:1750},{type:'revenant',count:3,interval:2400}],
    [{type:'grunt',count:14,interval:780},{type:'runner',count:11,interval:550},{type:'tank',count:5,interval:1750},{type:'ghost',count:3,interval:1300}],
    [{type:'grunt',count:15,interval:760},{type:'tank',count:6,interval:1700},{type:'revenant',count:3,interval:2300},{type:'ghost',count:4,interval:1250}],
    [{type:'runner',count:15,interval:530},{type:'tank',count:6,interval:1650},{type:'ghost',count:4,interval:1200}],
    [{type:'grunt',count:17,interval:750},{type:'runner',count:12,interval:540},{type:'revenant',count:4,interval:2200}],
    [{type:'runner',count:16,interval:520},{type:'tank',count:7,interval:1600},{type:'revenant',count:4,interval:2100},{type:'ghost',count:5,interval:1150}],
    [{type:'grunt',count:18,interval:730},{type:'runner',count:13,interval:530},{type:'tank',count:7,interval:1600},{type:'ghost',count:5,interval:1100}],
    [{type:'grunt',count:20,interval:710},{type:'tank',count:8,interval:1550},{type:'revenant',count:5,interval:2000},{type:'ghost',count:5,interval:1050}],
    [{type:'runner',count:19,interval:500},{type:'tank',count:8,interval:1500},{type:'revenant',count:5,interval:1950}],
    [{type:'grunt',count:22,interval:690},{type:'runner',count:16,interval:510},{type:'tank',count:9,interval:1450},{type:'revenant',count:6,interval:1900},{type:'ghost',count:6,interval:1000}],
    [{type:'grunt',count:24,interval:670},{type:'runner',count:18,interval:490},{type:'tank',count:10,interval:1400},{type:'revenant',count:6,interval:1800},{type:'ghost',count:6,interval:950}],
    [{type:'grunt',count:26,interval:640},{type:'runner',count:21,interval:470},{type:'tank',count:11,interval:1350},{type:'revenant',count:6,interval:1750},{type:'ghost',count:6,interval:950}],
  ],
  // ── L7：接近 L8 強度 ──────────────────────────────────
  7: [
    [{type:'grunt',count:8,interval:1000},{type:'runner',count:5,interval:750}],
    [{type:'runner',count:9,interval:680},{type:'tank',count:2,interval:2100}],
    [{type:'grunt',count:9,interval:940},{type:'runner',count:7,interval:630},{type:'tank',count:2,interval:2000}],
    [{type:'runner',count:11,interval:600},{type:'tank',count:2,interval:1950}],
    [{type:'grunt',count:11,interval:860},{type:'runner',count:8,interval:580},{type:'tank',count:3,interval:1850}],
    [{type:'grunt',count:13,interval:820},{type:'tank',count:3,interval:1750}],
    [{type:'runner',count:13,interval:560},{type:'tank',count:4,interval:1750}],
    [{type:'grunt',count:14,interval:780},{type:'runner',count:10,interval:530},{type:'tank',count:4,interval:1680}],
    [{type:'runner',count:15,interval:520},{type:'tank',count:4,interval:1650}],
    [{type:'grunt',count:15,interval:750},{type:'runner',count:11,interval:510},{type:'tank',count:5,interval:1580}],
    [{type:'grunt',count:16,interval:720},{type:'tank',count:5,interval:1580},{type:'revenant',count:2,interval:2700}],
    [{type:'runner',count:17,interval:490},{type:'ghost',count:3,interval:1380},{type:'tank',count:5,interval:1530}],
    [{type:'grunt',count:17,interval:700},{type:'runner',count:13,interval:480},{type:'revenant',count:3,interval:2550}],
    [{type:'runner',count:19,interval:460},{type:'tank',count:6,interval:1480},{type:'ghost',count:4,interval:1280}],
    [{type:'grunt',count:19,interval:670},{type:'runner',count:14,interval:460},{type:'revenant',count:3,interval:2380},{type:'ghost',count:3,interval:1280}],
    [{type:'grunt',count:21,interval:640},{type:'tank',count:7,interval:1380},{type:'revenant',count:4,interval:2180}],
    [{type:'runner',count:21,interval:440},{type:'ghost',count:5,interval:1180},{type:'tank',count:7,interval:1380}],
    [{type:'grunt',count:23,interval:620},{type:'runner',count:17,interval:420},{type:'revenant',count:4,interval:1980},{type:'ghost',count:4,interval:1080}],
    [{type:'grunt',count:25,interval:590},{type:'runner',count:19,interval:400},{type:'tank',count:9,interval:1280},{type:'revenant',count:5,interval:1880},{type:'ghost',count:5,interval:980}],
    [{type:'grunt',count:28,interval:560},{type:'runner',count:23,interval:380},{type:'tank',count:11,interval:1220},{type:'revenant',count:6,interval:1720},{type:'ghost',count:6,interval:910}],
  ],
  // ── L50：終極試煉（50波，boss 不斷增加）─────────────────
  50: [
    // 第1–5波：地獄起點
    [{type:'grunt',count:8,interval:750},{type:'runner',count:7,interval:580},{type:'tank',count:2,interval:2000}],
    [{type:'grunt',count:10,interval:710},{type:'runner',count:8,interval:550},{type:'tank',count:3,interval:1950},{type:'revenant',count:2,interval:2400}],
    [{type:'grunt',count:12,interval:680},{type:'runner',count:9,interval:530},{type:'tank',count:3,interval:1900},{type:'ghost',count:2,interval:1450}],
    [{type:'grunt',count:13,interval:670},{type:'runner',count:10,interval:520},{type:'tank',count:4,interval:1850},{type:'revenant',count:2,interval:2350},{type:'ghost',count:2,interval:1400}],
    [{type:'grunt',count:14,interval:650},{type:'runner',count:10,interval:510},{type:'tank',count:4,interval:1800},{type:'revenant',count:2,interval:2300},{type:'ghost',count:3,interval:1350}],
    // 第6–10波
    [{type:'grunt',count:15,interval:630},{type:'runner',count:11,interval:500},{type:'tank',count:4,interval:1750},{type:'revenant',count:3,interval:2250},{type:'ghost',count:3,interval:1320}],
    [{type:'grunt',count:16,interval:610},{type:'runner',count:12,interval:490},{type:'tank',count:5,interval:1700},{type:'revenant',count:3,interval:2200},{type:'ghost',count:4,interval:1300}],
    [{type:'boss',count:1,interval:5500},{type:'grunt',count:15,interval:590},{type:'runner',count:10,interval:480},{type:'tank',count:4,interval:1650}],
    [{type:'grunt',count:17,interval:590},{type:'runner',count:13,interval:480},{type:'tank',count:5,interval:1650},{type:'revenant',count:3,interval:2150},{type:'ghost',count:3,interval:1280}],
    [{type:'boss',count:1,interval:5000},{type:'grunt',count:16,interval:570},{type:'runner',count:12,interval:470},{type:'tank',count:5,interval:1600},{type:'revenant',count:3,interval:2100}],
    // 第11–15波
    [{type:'grunt',count:19,interval:570},{type:'runner',count:14,interval:460},{type:'tank',count:6,interval:1600},{type:'revenant',count:4,interval:2050},{type:'ghost',count:4,interval:1260}],
    [{type:'boss',count:1,interval:4500},{type:'grunt',count:17,interval:550},{type:'runner',count:13,interval:450},{type:'tank',count:5,interval:1550}],
    [{type:'grunt',count:20,interval:550},{type:'runner',count:15,interval:440},{type:'tank',count:6,interval:1550},{type:'revenant',count:4,interval:2000},{type:'ghost',count:4,interval:1240}],
    [{type:'grunt',count:21,interval:540},{type:'runner',count:16,interval:430},{type:'tank',count:7,interval:1500},{type:'revenant',count:4,interval:1950},{type:'ghost',count:4,interval:1210}],
    [{type:'boss',count:2,interval:4000},{type:'grunt',count:19,interval:530},{type:'runner',count:14,interval:430},{type:'tank',count:6,interval:1500},{type:'ghost',count:4,interval:1200}],
    // 第16–20波
    [{type:'grunt',count:22,interval:530},{type:'runner',count:17,interval:425},{type:'tank',count:7,interval:1460},{type:'revenant',count:5,interval:1900},{type:'ghost',count:4,interval:1200}],
    [{type:'boss',count:2,interval:3800},{type:'grunt',count:20,interval:510},{type:'runner',count:15,interval:415},{type:'tank',count:6,interval:1450},{type:'revenant',count:4,interval:1850}],
    [{type:'grunt',count:24,interval:520},{type:'runner',count:18,interval:415},{type:'tank',count:8,interval:1450},{type:'revenant',count:5,interval:1850},{type:'ghost',count:5,interval:1180}],
    [{type:'grunt',count:25,interval:510},{type:'runner',count:19,interval:410},{type:'tank',count:8,interval:1420},{type:'revenant',count:5,interval:1780},{type:'ghost',count:5,interval:1160}],
    [{type:'boss',count:2,interval:3600},{type:'grunt',count:22,interval:500},{type:'runner',count:17,interval:405},{type:'tank',count:6,interval:1400},{type:'ghost',count:5,interval:1150}],
    // 第21–25波
    [{type:'grunt',count:26,interval:500},{type:'runner',count:19,interval:400},{type:'tank',count:8,interval:1400},{type:'revenant',count:5,interval:1720},{type:'ghost',count:5,interval:1150}],
    [{type:'boss',count:2,interval:3400},{type:'grunt',count:24,interval:490},{type:'runner',count:18,interval:395},{type:'tank',count:8,interval:1380},{type:'revenant',count:5,interval:1670}],
    [{type:'grunt',count:27,interval:490},{type:'runner',count:20,interval:390},{type:'tank',count:9,interval:1380},{type:'revenant',count:6,interval:1670},{type:'ghost',count:5,interval:1120}],
    [{type:'grunt',count:28,interval:480},{type:'runner',count:21,interval:385},{type:'tank',count:9,interval:1360},{type:'revenant',count:6,interval:1620},{type:'ghost',count:5,interval:1100}],
    [{type:'boss',count:3,interval:3200},{type:'grunt',count:26,interval:470},{type:'runner',count:19,interval:375},{type:'tank',count:8,interval:1340},{type:'ghost',count:5,interval:1080}],
    // 第26–30波
    [{type:'grunt',count:30,interval:470},{type:'runner',count:22,interval:375},{type:'tank',count:10,interval:1340},{type:'revenant',count:6,interval:1620},{type:'ghost',count:6,interval:1080}],
    [{type:'boss',count:3,interval:3000},{type:'grunt',count:27,interval:455},{type:'runner',count:20,interval:370},{type:'tank',count:8,interval:1320},{type:'revenant',count:5,interval:1570}],
    [{type:'grunt',count:31,interval:455},{type:'runner',count:23,interval:365},{type:'tank',count:11,interval:1320},{type:'revenant',count:7,interval:1570},{type:'ghost',count:6,interval:1060}],
    [{type:'grunt',count:33,interval:445},{type:'runner',count:25,interval:360},{type:'tank',count:11,interval:1300},{type:'revenant',count:7,interval:1520},{type:'ghost',count:6,interval:1040}],
    [{type:'boss',count:4,interval:2800},{type:'grunt',count:30,interval:440},{type:'runner',count:22,interval:355},{type:'tank',count:9,interval:1280},{type:'ghost',count:6,interval:1020}],
    // 第31–35波
    [{type:'grunt',count:34,interval:440},{type:'runner',count:25,interval:355},{type:'tank',count:11,interval:1280},{type:'revenant',count:7,interval:1520},{type:'ghost',count:6,interval:1020}],
    [{type:'boss',count:4,interval:2600},{type:'grunt',count:31,interval:430},{type:'runner',count:24,interval:350},{type:'tank',count:10,interval:1260},{type:'revenant',count:7,interval:1470}],
    [{type:'grunt',count:36,interval:430},{type:'runner',count:27,interval:350},{type:'tank',count:12,interval:1260},{type:'revenant',count:8,interval:1470},{type:'ghost',count:7,interval:1000}],
    [{type:'grunt',count:37,interval:420},{type:'runner',count:28,interval:340},{type:'tank',count:12,interval:1240},{type:'revenant',count:8,interval:1420},{type:'ghost',count:7,interval:980}],
    [{type:'boss',count:5,interval:2400},{type:'grunt',count:33,interval:415},{type:'runner',count:25,interval:335},{type:'tank',count:10,interval:1220},{type:'ghost',count:7,interval:960}],
    // 第36–40波
    [{type:'grunt',count:38,interval:415},{type:'runner',count:29,interval:335},{type:'tank',count:13,interval:1220},{type:'revenant',count:8,interval:1420},{type:'ghost',count:7,interval:960}],
    [{type:'boss',count:5,interval:2200},{type:'grunt',count:35,interval:400},{type:'runner',count:27,interval:330},{type:'tank',count:11,interval:1200},{type:'revenant',count:7,interval:1370}],
    [{type:'grunt',count:40,interval:400},{type:'runner',count:31,interval:330},{type:'tank',count:13,interval:1200},{type:'revenant',count:8,interval:1370},{type:'ghost',count:8,interval:925}],
    [{type:'grunt',count:42,interval:390},{type:'runner',count:32,interval:325},{type:'tank',count:14,interval:1180},{type:'revenant',count:8,interval:1325},{type:'ghost',count:8,interval:900}],
    [{type:'boss',count:6,interval:2000},{type:'grunt',count:38,interval:385},{type:'runner',count:29,interval:320},{type:'tank',count:12,interval:1160},{type:'ghost',count:8,interval:880}],
    // 第41–45波
    [{type:'grunt',count:43,interval:385},{type:'runner',count:33,interval:320},{type:'tank',count:15,interval:1160},{type:'revenant',count:9,interval:1325},{type:'ghost',count:8,interval:880}],
    [{type:'boss',count:6,interval:1900},{type:'grunt',count:40,interval:380},{type:'runner',count:30,interval:315},{type:'tank',count:13,interval:1140},{type:'revenant',count:8,interval:1280}],
    [{type:'grunt',count:45,interval:380},{type:'runner',count:34,interval:315},{type:'tank',count:15,interval:1140},{type:'revenant',count:10,interval:1280},{type:'ghost',count:8,interval:860}],
    [{type:'grunt',count:46,interval:370},{type:'runner',count:35,interval:310},{type:'tank',count:15,interval:1120},{type:'revenant',count:10,interval:1240},{type:'ghost',count:8,interval:840}],
    [{type:'boss',count:7,interval:1800},{type:'grunt',count:42,interval:360},{type:'runner',count:32,interval:305},{type:'tank',count:14,interval:1100},{type:'ghost',count:8,interval:810}],
    // 第46–50波：終末審判
    [{type:'grunt',count:48,interval:355},{type:'runner',count:36,interval:305},{type:'tank',count:16,interval:1100},{type:'revenant',count:10,interval:1240},{type:'ghost',count:9,interval:810}],
    [{type:'boss',count:7,interval:1700},{type:'grunt',count:44,interval:350},{type:'runner',count:34,interval:300},{type:'tank',count:15,interval:1080},{type:'revenant',count:10,interval:1190}],
    [{type:'grunt',count:50,interval:350},{type:'runner',count:38,interval:300},{type:'tank',count:17,interval:1080},{type:'revenant',count:11,interval:1190},{type:'ghost',count:9,interval:775}],
    [{type:'grunt',count:52,interval:340},{type:'runner',count:40,interval:295},{type:'tank',count:18,interval:1060},{type:'revenant',count:11,interval:1150},{type:'ghost',count:10,interval:755}],
    // 第50波：萬眾來朝
    [{type:'boss',count:7,interval:1600},{type:'grunt',count:58,interval:310},{type:'runner',count:43,interval:275},{type:'tank',count:21,interval:1000},{type:'revenant',count:13,interval:1080},{type:'ghost',count:11,interval:720}],
  ],
  // ── L8：等同原 L4（最高難度） ─────────────────────────
  8: [
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
      { hp:900,  upgradeCost:500,  slowRange:1.5, slowMult:0.80, regenHp:4,  regenInterval:5000 },
      { hp:1400, upgradeCost:null, slowRange:2.0, slowMult:0.70, regenHp:8,  regenInterval:4000, counterDmg:25, counterRate:1500, counterRange:1.8 },
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
  { id:'cavalry',    name:'解鎖騎兵',     cost:200, desc:'可訓練騎兵',      req:null },
  { id:'paladin',    name:'解鎖聖騎士',   cost:350, desc:'可訓練聖騎士',    req:'cavalry' },
  { id:'hpBoost',    name:'強化體魄',     cost:180, desc:'士兵 HP +60%',    req:null },
  { id:'dmgBoost',   name:'武器精煉',     cost:220, desc:'士兵攻擊 +60%',   req:null },
  { id:'trainSpeed', name:'快速訓練',     cost:280, desc:'訓練間隔 -35%',   req:null },
  // ── 主角升級 ──
  { id:'heroHp',     name:'主角體魄強化', cost:120, desc:'主角 HP +25%',    req:null, isHero:true },
  { id:'heroDmg',    name:'主角武器精煉', cost:130, desc:'主角傷害 +25%',   req:null, isHero:true },
  { id:'heroAtk',    name:'主角攻速提升', cost:110, desc:'主角攻速 +20%',   req:null, isHero:true },
  { id:'heroSpd',    name:'主角步法強化', cost:100, desc:'主角移速 +20%',   req:null, isHero:true },
];

let researchDone = new Set();
let friendlyUnits = [];
let towerIdCounter = 0;

const ENEMY_TYPES = {
  grunt:    { name:'步兵',   emoji:'👾', color:'#e74c3c', hp:80,   speed:1.2, reward:10,  size:14, attackDmg:11, attackRate:1300, attackRange:CELL_SIZE*1.4 },
  runner:   { name:'快衝兵', emoji:'💨', color:'#e67e22', hp:42,   speed:2.6, reward:15,  size:11, attackDmg:7,  attackRate:600,  attackRange:CELL_SIZE*1.1 },
  tank:     { name:'重甲兵', emoji:'🛡️', color:'#2c3e50', hp:300,  speed:0.65,reward:30,  size:18, attackDmg:32, attackRate:1800, attackRange:CELL_SIZE*1.6 },
  revenant: { name:'重生兵', emoji:'💀', color:'#7b1fa2', hp:130,  speed:1.0, reward:25,  size:15, attackDmg:15, attackRate:1400, attackRange:CELL_SIZE*1.4, canRevive:true },
  ghost:    { name:'幽靈兵', emoji:'👻', color:'#90a4ae', hp:72,   speed:1.9, reward:20,  size:13, attackDmg:8,  attackRate:1100, attackRange:CELL_SIZE*1.2, isGhost:true },
  boss:     { name:'首領',   emoji:'👑', color:'#ff6f00', hp:2400, speed:0.45,reward:200, size:26, attackDmg:42, attackRate:1800, attackRange:CELL_SIZE*2.0, isBoss:true },
};

const BUILD_RANGE = 3 * CELL_SIZE;

function getKillBonus(){
  let b=0;
  for(const t of towers) if(TOWER_TYPES[t.type].isMarket) b+=t.bonusPerKill;
  return b;
}

function getSellValue(tower){
  const def=TOWER_TYPES[tower.type];
  let total=def.levels[0].cost;
  for(let i=1;i<tower.level;i++) total+=(def.levels[i-1].upgradeCost||0);
  return Math.floor(total*0.6);
}

// ── 遊戲狀態 ─────────────────────────────────────────────
let towers=[], enemies=[], bullets=[];
let gold=300, wave=0, gameOver=false, WAVES=[], hero=null;
let selectedTowerType='archer', selectedBuilding=null;
let upgradeButtonBounds=null, sellButtonBounds=null, trainUnitButtonBounds=[], researchButtonBounds=[];
let hoverCol=-1, hoverRow=-1, animFrameId=null, currentLevel=1;
// 波次結算追蹤
let waveKills=0, waveGoldEarned=0, waveDmgTaken=0;
let waveSummary=null; // {kills, gold, dmg, waveNum, isBossWave}
let waveSummaryExpire=0;
// 通關進度
const SAVE_KEY='tdCleared';
function loadCleared(){ try{ return new Set(JSON.parse(localStorage.getItem(SAVE_KEY)||'[]')); }catch(e){ return new Set(); } }
function saveCleared(lvl){ const s=loadCleared(); s.add(lvl); localStorage.setItem(SAVE_KEY,JSON.stringify([...s])); }

// ── 玩家進度（跨關卡持久化 XP 系統）────────────────────────
const PLAYER_KEY='tdPlayerData_v1';
const UPGRADE_DEFS={
  hp:       {name:'❤️ 最大HP',   desc:'主角 HP +15%/級',  maxLevel:5, costs:[100,150,200,300,400]},
  damage:   {name:'⚔️ 攻擊力',   desc:'主角傷害 +15%/級', maxLevel:5, costs:[100,150,200,300,400]},
  atkSpeed: {name:'⚡ 攻擊速度', desc:'主角攻速 +10%/級', maxLevel:5, costs:[120,180,240,350,500]},
  speed:    {name:'💨 移動速度', desc:'主角移速 +10%/級', maxLevel:5, costs:[80,120,160,220,300]},
};
const SKILL_DEFS=[
  {id:'rebirth',      name:'🔥 浴火重生',  cost:500, desc:'每關一次：HP歸零時原地滿血復活，無需回到起點'},
  {id:'richStart',    name:'💰 軍需充裕',  cost:400, desc:'每關開局額外 +100 金幣'},
  {id:'ghostSlayer',  name:'👻 幽靈剋星',  cost:600, desc:'主角對幽靈兵造成 2× 傷害'},
  {id:'bossSlayer',   name:'👑 巨人殺手',  cost:700, desc:'主角對首領造成 2× 傷害'},
  {id:'fortressGuard',name:'🏰 堡壘守護',  cost:500, desc:'堡壘最大 HP +30%'},
  {id:'chainThunder', name:'⚡ 連鎖天雷',  cost:800, desc:'主角攻擊額外連鎖至 2 個附近敵人'},
];
// 確保跨 script 可存取
window.UPGRADE_DEFS = UPGRADE_DEFS;
window.SKILL_DEFS   = SKILL_DEFS;

function loadPlayerData(){
  try{
    const d=JSON.parse(localStorage.getItem(PLAYER_KEY)||'{}');
    return {
      xp:d.xp||0,
      upgrades:{hp:d.upgrades?.hp||0,damage:d.upgrades?.damage||0,atkSpeed:d.upgrades?.atkSpeed||0,speed:d.upgrades?.speed||0},
      skills:Array.isArray(d.skills)?d.skills:[]
    };
  }catch(e){return {xp:0,upgrades:{hp:0,damage:0,atkSpeed:0,speed:0},skills:[]};}
}
function savePlayerData(d){localStorage.setItem(PLAYER_KEY,JSON.stringify(d));}
// 安靜地加XP（不打斷遊戲訊息）；返回新總量
function addXPSilent(amount){
  const d=loadPlayerData(); d.xp+=amount; savePlayerData(d); return d.xp;
}
// 購買升級（從選關介面呼叫）
function buyUpgrade(key){
  const d=loadPlayerData();
  const def=UPGRADE_DEFS[key]; if(!def) return;
  const lv=d.upgrades[key]||0;
  if(lv>=def.maxLevel){alert('已達最高等級！');return;}
  const cost=def.costs[lv];
  if(d.xp<cost){alert(`經驗值不足！需要 ${cost} XP，目前 ${d.xp} XP`);return;}
  d.xp-=cost; d.upgrades[key]=(lv+1); savePlayerData(d);
  refreshXPPanel();
}
// 購買技能（從選關介面呼叫）
function buySkill(id){
  const d=loadPlayerData();
  const def=SKILL_DEFS.find(s=>s.id===id); if(!def) return;
  if(d.skills.includes(id)){alert('已解鎖！');return;}
  if(d.xp<def.cost){alert(`經驗值不足！需要 ${def.cost} XP，目前 ${d.xp} XP`);return;}
  d.xp-=def.cost; d.skills.push(id); savePlayerData(d);
  refreshXPPanel();
}
// 重設所有技能點，返還全部花費的 XP
function resetSkills(){
  if(!confirm('確定要重設所有技能點嗎？\n花費的 XP 將全額返還。')) return;
  const d=loadPlayerData();
  // 計算並返還所有升級花費
  for(const [key,def] of Object.entries(UPGRADE_DEFS)){
    const lv=d.upgrades[key]||0;
    for(let i=0;i<lv;i++) d.xp+=def.costs[i];
    d.upgrades[key]=0;
  }
  // 計算並返還所有技能花費
  for(const sk of SKILL_DEFS){
    if(d.skills.includes(sk.id)) d.xp+=sk.cost;
  }
  d.skills=[];
  savePlayerData(d);
  refreshXPPanel();
}
// 刷新 XP 面板 UI（在 index.html 的 inline script 中定義）
function refreshXPPanel(){
  if(typeof _refreshXPPanelImpl==='function') _refreshXPPanelImpl();
}
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
// 搖桿固定在畫布左下角
const JOY_FIX_X = joystick.baseR + 20;
const JOY_FIX_Y = canvas.height - joystick.baseR - 20;
joystick.baseX = JOY_FIX_X;
joystick.baseY = JOY_FIX_Y;
joystick.knobX = JOY_FIX_X;
joystick.knobY = JOY_FIX_Y;

// 建築點擊追蹤
let buildTouchId = null, buildTouchStartX = 0, buildTouchStartY = 0, buildTouchMoved = false;
let messageText='', messageExpire=0;
function showMessage(t,d=2000){ messageText=t; messageExpire=performance.now()+d; }

// ── 初始化 ────────────────────────────────────────────────
function initGame(levelNum) {
  researchDone=new Set();           // 必須在 hero = new Hero() 之前清空
  towers=[]; enemies=[]; bullets=[]; friendlyUnits=[];
  const _pdat=loadPlayerData();
  gold=(levelNum===50?600:300)+(_pdat.skills.includes('richStart')?100:0);
  wave=0; gameOver=false;
  spawnQueue=[]; waveActive=false; waveComplete=false;
  nextWaveAt=0; nextWaveCountdown=0; towerIdCounter=0;
  messageText=''; selectedBuilding=null; upgradeButtonBounds=null; sellButtonBounds=null;
  trainUnitButtonBounds=[]; researchButtonBounds=[];
  const _mp=document.getElementById('mobile-upgrade-panel');
  if(_mp) _mp.classList.remove('mp-active');
  waveKills=0; waveGoldEarned=0; waveDmgTaken=0; waveSummary=null; waveSummaryExpire=0;
  currentLevel=levelNum;
  occupiedCells.clear();
  selectedTowerType='archer';
  document.querySelectorAll('.tower-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('btn-archer').classList.add('active');
  WAVES = LEVEL_WAVES[levelNum]||LEVEL_WAVES[1];
  hero = new Hero();
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = requestAnimationFrame(gameLoop);
  SFX.startBGM();
  nextWaveAt = performance.now()+3000;
}

// ── 主角 ─────────────────────────────────────────────────
class Hero {
  constructor(){
    this.x=1*CELL_SIZE+CELL_SIZE/2; this.y=13*CELL_SIZE+CELL_SIZE/2;
    this.size=14; this.range=2.8*CELL_SIZE;
    this.lastAttack=0; this.dead=false; this.invincible=0;
    this.maxHp=260; this.hp=260;
    this.damage=40; this.attackRate=620; this.speed=3.3;
    // 載入技能旗標
    const _pd=loadPlayerData();
    this._rebirthAvail=_pd.skills.includes('rebirth');
    this._ghostSlayer=_pd.skills.includes('ghostSlayer');
    this._bossSlayer=_pd.skills.includes('bossSlayer');
    this._chainThunder=_pd.skills.includes('chainThunder');
    this.applyResearch();
  }
  applyResearch(){
    const wasAtFull=this.hp>=this.maxHp;
    const upg=loadPlayerData().upgrades;
    this.maxHp=Math.floor(260*(1+upg.hp*0.15)*(researchDone.has('heroHp')?1.25:1));
    this.hp=wasAtFull?this.maxHp:Math.min(this.hp,this.maxHp);
    this.damage=Math.floor(40*(1+upg.damage*0.15)*(researchDone.has('heroDmg')?1.25:1));
    this.attackRate=Math.floor(620/(1+upg.atkSpeed*0.10)*(researchDone.has('heroAtk')?0.8:1));
    this.speed=3.3*(1+upg.speed*0.10)*(researchDone.has('heroSpd')?1.2:1);
  }
  takeDamage(dmg, now){
    if(now<this.invincible) return;
    this.hp-=dmg;
    waveDmgTaken+=dmg;
    if(this.hp<=0){
      if(this._rebirthAvail){
        this._rebirthAvail=false;
        this.hp=this.maxHp;
        this.invincible=now+5000;
        showMessage('🔥 浴火重生！原地滿血復活！',3000);
      } else {
        this.hp=this.maxHp;
        this.x=1*CELL_SIZE+CELL_SIZE/2; this.y=13*CELL_SIZE+CELL_SIZE/2;
        this.invincible=now+3000;
        showMessage('💀 主角陣亡！回到起點復活');
      }
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
      if(target){
        this.lastAttack=now; SFX.heroShoot();
        let dmg=this.damage;
        if(this._ghostSlayer&&target.ghost) dmg=dmg*2;
        if(this._bossSlayer&&ENEMY_TYPES[target.type]?.isBoss) dmg=dmg*2;
        bullets.push(new Bullet(this.x,this.y,target,dmg,'#00e5ff',7,false,0));
        if(this._chainThunder){
          const chain=enemies.filter(e=>!e.dead&&e!==target)
            .sort((a,b)=>((a.x-target.x)**2+(a.y-target.y)**2)-((b.x-target.x)**2+(b.y-target.y)**2))
            .slice(0,2);
          for(const ce of chain)
            bullets.push(new Bullet(target.x,target.y,ce,Math.floor(dmg*0.6),'#f1c40f',9,false,0));
        }
      }
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
  constructor(type, spawnPoint){
    const def=ENEMY_TYPES[type];
    this.type=type; this.color=def.color;
    this.maxHp=def.hp; this.hp=def.hp;
    this.speed=def.speed; this.reward=def.reward; this.size=def.size;
    this.attackDmg=def.attackDmg; this.attackRate=def.attackRate; this.attackRange=def.attackRange;
    this.lastAttack=0; this.slowUntil=0; this.fortSlowUntil=0; this.fortSlowMult=1;
    this.revived=false; this.reviveFlash=0; this.hitFlash=0;
    this.ghost=def.isGhost||false;
    this.wpIndex=0;
    this.spawnPoint=spawnPoint||PATH_START;
    this.path=findPath(null,this.spawnPoint)||[];
    const s=this.path[0]||this.spawnPoint;
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
    SFX.die(ENEMY_TYPES[this.type].isBoss||false);
    const earned=this.reward+bonus;
    gold+=earned;
    waveKills++;
    waveGoldEarned+=earned;
  }
  recalculatePath(){
    const newPath=findPath(undefined,this.spawnPoint);
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

    // ── 移動（冰凍減速 + 堡壘緩速 + 爬坡減速）──
    let effSpeed=this.speed;
    if(now<this.slowUntil) effSpeed*=0.35;
    if(now<this.fortSlowUntil) effSpeed*=this.fortSlowMult;
    if(this.wpIndex>=this.path.length-1){
      // 抵達堡壘
      const fort=towers.find(t=>TOWER_TYPES[t.type].isFortress);
      if(!fort){ this.dead=true; return; }
      this.reached=true;
      this.x=fort.x;
      this.y=fort.y;
      return;
    }
    const t=this.path[this.wpIndex+1];
    // 爬坡減速：每升高1層減速20%，最多減60%
    const curElev=elevData[Math.floor(this.y/CELL_SIZE)]?.[Math.floor(this.x/CELL_SIZE)]??0;
    const nxtElev=elevData[t.row]?.[t.col]??0;
    const elevDiff=nxtElev-curElev;
    if(elevDiff>0) effSpeed*=Math.max(0.4, 1-elevDiff*0.2);
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
    let _baseHp=_def.isFortress?_def.levels[0].hp:_def.hp;
    if(_def.isFortress&&loadPlayerData().skills.includes('fortressGuard')) _baseHp=Math.floor(_baseHp*1.3);
    this.maxHp=_baseHp;
    this.hp=this.maxHp;
    this.dead=false; this.hitFlash=0;
    this.id = ++towerIdCounter;
    if(_def.isTraining) this.trainUnitType='infantry';
    this._apply();
  }
  takeDamage(dmg){
    this.hp-=dmg;
    this.hitFlash=performance.now()+220;
    if(TOWER_TYPES[this.type].isFortress){ waveDmgTaken+=dmg; SFX.fortressHit(); }
    if(this.hp<=0) this.destroy();
  }
  destroy(){
    this.dead=true;
    if(TOWER_TYPES[this.type].isFortress){
      showMessage('🏰 堡壘陷落！遊戲結束',4000);
      gameOver=true;
      SFX.gameOver(); SFX.stopBGM();
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
      let newMax=s.hp;
      if(loadPlayerData().skills.includes('fortressGuard')) newMax=Math.floor(newMax*1.3);
      const ratio=this.maxHp>0?this.hp/this.maxHp:1;
      this.maxHp=newMax;
      this.hp=Math.min(Math.ceil(newMax*ratio),newMax);
      this.slowRange   = s.slowRange   ? s.slowRange*CELL_SIZE : 0;
      this.slowMult    = s.slowMult    ?? 1;
      this.regenHp     = s.regenHp     ?? 0;
      this.regenInterval = s.regenInterval ?? 0;
      this.counterDmg  = s.counterDmg  ?? 0;
      this.counterRate = s.counterRate ?? 0;
      this.counterRange= s.counterRange ? s.counterRange*CELL_SIZE : 0;
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
    gold-=c; this.level++; this._apply(); SFX.upgrade(); return true;
  }
  update(now){
    const def=TOWER_TYPES[this.type];
    if(!def.isFortress && !towers.some(t=>TOWER_TYPES[t.type].isFortress)) return;
    if(def.isEconomic){
      if(now-this.lastTick>=this.tickInterval){this.lastTick=now; gold+=this.goldPerTick;}
      return;
    }
    if(def.isMarket||def.isLab) return; // 純被動
    if(def.isFortress){
      // ── 緩速光環（2級+）──
      if(this.slowRange>0){
        for(const e of enemies){
          if(e.dead) continue;
          const dx=e.x-this.x, dy=e.y-this.y;
          if(dx*dx+dy*dy<=this.slowRange*this.slowRange){
            e.fortSlowUntil=now+600;
            e.fortSlowMult=this.slowMult;
          }
        }
      }
      // ── HP 再生（2級+）──
      if(this.regenHp>0&&this.regenInterval>0&&this.hp<this.maxHp){
        if(now-this.lastTick>=this.regenInterval){
          this.lastTick=now;
          this.hp=Math.min(this.maxHp, this.hp+this.regenHp);
        }
      }
      // ── 自動反擊（3級）──
      if(this.counterDmg>0&&now-this.lastShot>=this.counterRate){
        let target=null, minD=this.counterRange;
        for(const e of enemies){
          if(e.dead||!e.reached) continue; // 只打正在攻打堡壘的敵人
          const d=Math.sqrt((e.x-this.x)**2+(e.y-this.y)**2);
          if(d<minD){minD=d; target=e;}
        }
        if(!target){ // 備選：打範圍內最近敵人
          for(const e of enemies){
            if(e.dead) continue;
            const dx=e.x-this.x, dy=e.y-this.y, d=Math.sqrt(dx*dx+dy*dy);
            if(d<minD){minD=d; target=e;}
          }
        }
        if(target){
          this.lastShot=now;
          target.hp-=this.counterDmg;
          target.hitFlash=now+200;
          if(target.hp<=0) target.tryKill(getKillBonus());
        }
      }
      return;
    }
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
      SFX.shoot('lightning');
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
    SFX.shoot(this.type);
    const slowEff=def.slow?{duration:def.slowDuration}:null;
    bullets.push(new Bullet(this.x,this.y,target,this.damage,this.bulletColor,this.bulletSpeed,this.splash,this.splashRadius,slowEff));
  }
  drawRange(){
    const def=TOWER_TYPES[this.type];
    if(def.isFortress&&this.slowRange>0){
      const {x:sx,y:sy}=worldToScreen(this.x,this.y);
      ctx.beginPath(); ctx.arc(sx,sy,this.slowRange,0,Math.PI*2);
      ctx.strokeStyle='rgba(100,220,255,0.3)'; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle='rgba(100,220,255,0.04)'; ctx.fill();
      return;
    }
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
  SFX.waveStart();
  spawnQueue=[];
  let roundIdx=0; // 輪流分路計數器
  for(const g of WAVES[wave]){
    for(let i=0;i<g.count;i++){
      // 所有敵人（含 boss）都輪流分路，count 代表總數
      spawnQueue.push({
        type:g.type, delay:i*g.interval,
        sp: SPAWN_POINTS[roundIdx++ % SPAWN_POINTS.length]
      });
    }
  }
  // Boss 波：第10波、第20波三路各生一隻首領
  const isBossWave=(wave+1)===10||(wave+1)===20;
  if(isBossWave){
    SPAWN_POINTS.forEach((sp,i)=>
      spawnQueue.push({type:'boss', delay:i*1200, sp}));
    showMessage('👑 三路首領同時壓境！',3500);
  }
  spawnQueue.sort((a,b)=>a.delay-b.delay);
  spawnTimer=performance.now(); waveActive=true; wave++;
  // 重置本波結算計數
  waveKills=0; waveGoldEarned=0; waveDmgTaken=0;
  nextWaveAt=wave<WAVES.length?performance.now()+WAVE_INTERVAL:0;
}
function updateSpawn(now){
  if(!waveActive&&!gameOver&&!waveComplete){
    const hasFort=towers.some(t=>TOWER_TYPES[t.type].isFortress);
    if(nextWaveAt>0&&hasFort){
      nextWaveCountdown=Math.max(0,Math.ceil((nextWaveAt-now)/1000));
      if(now>=nextWaveAt) startWave();
    } else { nextWaveCountdown=0; if(!hasFort) nextWaveAt=performance.now()+3000; }
  } else nextWaveCountdown=0;
  if(!waveActive) return;
  while(spawnQueue.length&&now-spawnTimer>=spawnQueue[0].delay){
    const e=spawnQueue.shift();
    enemies.push(new Enemy(e.type, e.sp));
  }
  if(spawnQueue.length===0&&enemies.every(e=>e.dead)){
    waveActive=false;
    // 顯示波次結算
    const isBossWave=wave===10||wave===20;
    // 計算並發放本波 XP
    const waveXP=30+wave*4+(isBossWave?80:0);
    addXPSilent(waveXP);
    waveSummary={kills:waveKills,gold:waveGoldEarned,dmg:Math.floor(waveDmgTaken),waveNum:wave,isBossWave,xp:waveXP};
    waveSummaryExpire=performance.now()+4000;
    if(wave>=WAVES.length){
      waveComplete=true;
      SFX.victory(); SFX.stopBGM();
      saveCleared(currentLevel);
      // 通關額外 XP
      const clearXP=currentLevel===50?500:150;
      addXPSilent(clearXP);
      waveSummary.clearXP=clearXP;
      refreshLevelCards();
      refreshXPPanel();
    }
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
const PATH_TOP    = GRASS_TOP[0];
const PATH_WALL   = GRASS_WALL[0];

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
    if(type===TILE.START) wColor=PATH_WALL;
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
  else if(type===TILE.END)  topColor=GRASS_TOP[0];
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

  // 入口標示（三條路線各不同顏色）
  if(type===TILE.START){
    const spIdx=SPAWN_POINTS.findIndex(sp=>sp.row===row&&sp.col===col);
    const spColors=['#e74c3c','#e67e22','#9b59b6']; // 甲紅 乙橘 丙紫
    const spLabels=['甲','乙','丙'];
    const c=spColors[spIdx]??'#e74c3c';
    const label=spLabels[spIdx]??'入';
    ctx.fillStyle=c+'cc';
    ctx.fillRect(x+2,ty+2,CS-4,CS-4);
    ctx.font='bold 11px sans-serif'; ctx.fillStyle='#fff';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(`▶ ${label}`, x+CS/2, ty+CS/2);
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
  // 波次結算面板
  if(waveSummary&&now<waveSummaryExpire&&!waveActive){
    const alpha=Math.min(1,(waveSummaryExpire-now)/600);
    const pW=260;
    let pH=waveSummary.isBossWave?148:128;
    if(waveSummary.clearXP) pH+=22;
    const px=canvas.width/2-pW/2, py=TOP_OFFSET+8;
    ctx.save(); ctx.globalAlpha=alpha*0.96;
    ctx.fillStyle='rgba(5,15,40,0.95)';
    ctx.beginPath(); ctx.roundRect(px,py,pW,pH,10); ctx.fill();
    ctx.strokeStyle=waveSummary.isBossWave?'#ff6f00':'#00e5ff'; ctx.lineWidth=1.8; ctx.stroke();
    ctx.globalAlpha=alpha;
    ctx.font='bold 14px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillStyle='#fff';
    const title=waveSummary.isBossWave?`👑 第 ${waveSummary.waveNum} 波結算（首領波！）`:`⚔️ 第 ${waveSummary.waveNum} 波結算`;
    ctx.fillText(title, px+pW/2, py+12);
    ctx.font='13px sans-serif'; ctx.fillStyle='#aef'; ctx.textAlign='left';
    ctx.fillText(`🗡️  擊殺敵人：${waveSummary.kills} 隻`, px+20, py+40);
    ctx.fillText(`💰  獲得金幣：+${waveSummary.gold}`, px+20, py+60);
    ctx.fillText(`🛡️  承受傷害：${waveSummary.dmg}`, px+20, py+80);
    ctx.fillText(`✨  獲得經驗：+${waveSummary.xp} XP`, px+20, py+100);
    ctx.fillStyle='#c8f';
    if(waveSummary.isBossWave){
      ctx.font='bold 12px sans-serif'; ctx.fillStyle='#ffa040'; ctx.textAlign='center';
      ctx.fillText('首領已擊倒！豐厚獎勵到手', px+pW/2, py+124);
    }
    if(waveSummary.clearXP){
      ctx.font='bold 12px sans-serif'; ctx.fillStyle='#f1c40f'; ctx.textAlign='center';
      ctx.fillText(`🏆 通關獎勵 +${waveSummary.clearXP} XP！`, px+pW/2, py+pH-14);
    }
    ctx.restore();
  }
  // 虛擬搖桿（僅桌面在畫布上繪製；手機用 HTML 搖桿）
  if(!isMobile()){
    ctx.save();
    ctx.globalAlpha = joystick.active ? 0.45 : 0.18;
    ctx.beginPath();
    ctx.arc(JOY_FIX_X, JOY_FIX_Y, joystick.baseR, 0, Math.PI*2);
    ctx.fillStyle='#ffffff'; ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=2; ctx.stroke();
    ctx.globalAlpha = joystick.active ? 0.85 : 0.28;
    ctx.beginPath();
    ctx.arc(joystick.knobX, joystick.knobY, joystick.knobR, 0, Math.PI*2);
    ctx.fillStyle='#00e5ff'; ctx.fill();
    ctx.globalAlpha=1;
    ctx.restore();
  }
}

// ── 手機面板輔助函數 ─────────────────────────────────────
function isMobile(){ return window.innerWidth<=768; }

function updateMobilePanel(){
  const panel=document.getElementById('mobile-upgrade-panel');
  if(!panel) return;
  if(!isMobile()||!selectedBuilding){
    panel.classList.remove('mp-active');
    return;
  }
  panel.classList.add('mp-active');
  const t=selectedBuilding, def=TOWER_TYPES[t.type];
  const now=performance.now();
  const stats=def.levels[t.level-1], upCost=t.upgradeCost;
  const inRange=isInBuildRange(t.row,t.col);
  const canUp=upCost&&gold>=upCost&&inRange;
  const stars='★'.repeat(t.level)+'☆'.repeat(3-t.level);
  const starsClass=t.level===3?'mp-stars-max':t.level===2?'mp-stars-2':'';

  let html=`<div class="mp-header">
    <span class="mp-name">${def.emoji} ${def.name}</span>
    <span class="mp-stars ${starsClass}">${stars}</span>
    <button class="mp-close" onclick="selectedBuilding=null">✕</button>
  </div><div class="mp-stats">`;

  if(def.isEconomic)    html+=`<span>💰 每${stats.tickInterval/1000}s 產出 ${stats.goldPerTick}金</span>`;
  else if(def.isMarket) html+=`<span>🏷️ 每擊殺 +${stats.bonusPerKill}金</span>`;
  else if(def.isChain)  html+=`<span>⚡${stats.damage}  📡${(stats.range/CELL_SIZE).toFixed(1)}  🔗${stats.chainCount}目標  ⏱${(stats.fireRate/1000).toFixed(1)}s</span>`;
  else if(def.isFortress){
    html+=`<span>❤️ ${Math.ceil(t.hp)} / ${t.maxHp}</span>`;
    if(t.level>=2) html+=`<span>🧊 緩速${stats.slowRange}格  ⚕️ 再生+${stats.regenHp}HP/${stats.regenInterval/1000}s</span>`;
    if(t.level>=3) html+=`<span>⚔️ 反擊${stats.counterDmg}傷害/${stats.counterRate/1000}s</span>`;
  }
  else html+=`<span>⚔️${stats.damage}  📡${(stats.range/CELL_SIZE).toFixed(1)}  ⏱${(stats.fireRate/1000).toFixed(1)}s</span>`;
  html+='</div>';

  if(def.isTraining){
    const available=['infantry'];
    if(researchDone.has('cavalry'))  available.push('cavalry');
    if(researchDone.has('paladin'))  available.push('paladin');
    const myUnits=friendlyUnits.filter(u=>u.source===t&&!u.dead).length;
    const speedMult=researchDone.has('trainSpeed')?0.65:1;
    const effInterval=t.trainInterval*speedMult;
    const elapsed=now-t.lastTick, remain=Math.max(0,effInterval-elapsed);
    const pct=Math.min(1,elapsed/effInterval)*100;
    const uDef=FRIENDLY_UNIT_TYPES[t.trainUnitType||'infantry'];
    html+=`<div class="mp-train-status">${uDef.emoji}${uDef.name}  👥${myUnits}/${t.maxUnits}  ⏱${remain>0?Math.ceil(remain/1000)+'s':'就緒'}</div>`;
    html+=`<div class="mp-progress-bar"><div class="mp-progress-fill" style="width:${pct}%"></div></div>`;
    html+='<div class="mp-unit-btns">';
    for(const ut of available){
      const uD=FRIENDLY_UNIT_TYPES[ut];
      const sel=(t.trainUnitType||'infantry')===ut;
      html+=`<button class="mp-unit-btn${sel?' mp-unit-btn-sel':''}" onclick="mobileSelectUnit('${ut}')">${uD.emoji} ${uD.name}  HP:${uD.hp}  ATK:${uD.damage}</button>`;
    }
    html+='</div>';
  }

  if(def.isLab){
    html+='<div class="mp-research-list">';
    let heroHeaderDrawn=false;
    for(const item of RESEARCH_ITEMS){
      if(item.isHero&&!heroHeaderDrawn){
        html+='<div class="mp-research-header">── 🧙 主角升級 ──</div>';
        heroHeaderDrawn=true;
      }
      const done=researchDone.has(item.id);
      const locked=item.req&&!researchDone.has(item.req);
      const canRes=!done&&!locked&&gold>=item.cost&&inRange;
      const cls=done?'mp-research-done':locked?'mp-research-locked':canRes?'mp-research-can':'mp-research-poor';
      const btnText=done?'✅ 已研發':locked?'🔒 鎖定':`${item.cost}💰`;
      html+=`<div class="mp-research-item ${cls}"><span>🔬 ${item.name} — ${item.desc}</span>
        <button ${(done||locked||!inRange)?'disabled':''} onclick="mobileResearch('${item.id}')">${btnText}</button></div>`;
    }
    html+='</div>';
  }

  if(upCost&&!def.isTraining&&!def.isLab){
    const next=def.levels[t.level];
    let preview='';
    if(def.isEconomic)    preview=`→Lv${t.level+1}: 每${next.tickInterval/1000}s +${next.goldPerTick}金`;
    else if(def.isMarket) preview=`→Lv${t.level+1}: 每擊殺 +${next.bonusPerKill}金`;
    else if(def.isChain)  preview=`→Lv${t.level+1}: ⚡${next.damage} 🔗${next.chainCount}目標`;
    else if(def.isFortress) preview=`→Lv${t.level+1}: ❤️HP ${next.hp}${next.slowRange?` 🧊緩速${next.slowRange}格`:''}${next.counterDmg?` ⚔️反擊${next.counterDmg}`:''}`;
    else preview=`→Lv${t.level+1}: ⚔️${next.damage} 📡${(next.range/CELL_SIZE).toFixed(1)} ⏱${(next.fireRate/1000).toFixed(1)}s`;
    if(preview) html+=`<div class="mp-next">${preview}</div>`;
  }

  html+='<div class="mp-btns">';
  if(upCost){
    const note=!inRange?'(需靠近)':gold<upCost?'(金幣不足)':'';
    html+=`<button class="mp-btn-upgrade${canUp?'':' mp-btn-disabled'}" ${canUp?'onclick="mobileUpgrade()"':'disabled'}>升級 Lv${t.level+1}  ${upCost}💰${note?' '+note:''}</button>`;
  } else if(!def.isLab){
    html+=`<span class="mp-maxlevel">🏆 已達最高等級</span>`;
  }
  if(!def.isFortress&&inRange){
    const sv=getSellValue(t);
    html+=`<button class="mp-btn-sell" onclick="mobileSell()">🗑️ 出售  退款 ${sv}💰</button>`;
  }
  html+='</div>';
  const prev=panel.scrollTop;
  panel.innerHTML=html;
  panel.scrollTop=prev;
}

function mobileUpgrade(){
  if(!selectedBuilding) return;
  if(selectedBuilding.tryUpgrade()) showMessage('✅ 升級成功！');
}
function mobileSell(){
  if(!selectedBuilding) return;
  const sv=getSellValue(selectedBuilding);
  selectedBuilding.destroy();
  gold+=sv;
  showMessage(`💰 出售成功，退款 ${sv} 金幣`);
  selectedBuilding=null;
}
function mobileSelectUnit(unitType){
  if(selectedBuilding) selectedBuilding.trainUnitType=unitType;
}
function mobileResearch(id){
  const item=RESEARCH_ITEMS.find(r=>r.id===id);
  if(!item||researchDone.has(id)||gold<item.cost) return;
  researchDone.add(id); gold-=item.cost;
  showMessage(`🔬 研發完成：${item.name}`);
  if(hero) hero.applyResearch();
}

function drawUpgradePanel(){
  upgradeButtonBounds=null; sellButtonBounds=null; trainUnitButtonBounds=[]; researchButtonBounds=[];
  if(isMobile()){ updateMobilePanel(); return; }
  if(!selectedBuilding) return;
  const t=selectedBuilding, def=TOWER_TYPES[t.type];
  const now=performance.now();
  if(def.isLab)      { drawLabPanel(t,def,now); return; }
  if(def.isTraining) { drawTrainingPanel(t,def,now); return; }

  // ── 一般建築面板 ──
  const stats=def.levels[t.level-1], upCost=t.upgradeCost;
  const elev=elevData[t.row][t.col];
  const sx=t.col*CELL_SIZE+CELL_SIZE/2, sy=tileY(t.row,elev);
  const pW=210;
  let baseH = def.isFortress ? (t.level===1?100 : t.level===2?116 : 132) : (upCost?120:100);
  const pH = baseH + 34; // 額外34px給出售按鈕
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
  else if(def.isFortress){
    ctx.fillText(`❤️ ${Math.ceil(t.hp)} / ${t.maxHp}`, px+10, py+34);
    if(t.level>=2){
      ctx.fillStyle='#80deea';
      ctx.fillText(`🧊 緩速光環 ${stats.slowRange}格  ⚕️ 再生 +${stats.regenHp}HP/${stats.regenInterval/1000}s`, px+10, py+50);
    }
    if(t.level>=3){
      ctx.fillStyle='#ffcc80';
      ctx.fillText(`⚔️ 自動反擊 ${stats.counterDmg}傷害 / ${stats.counterRate/1000}s`, px+10, py+66);
    }
  }
  else                   ctx.fillText(`⚔️${stats.damage}  📡${stats.range/CELL_SIZE}  ⏱${(stats.fireRate/1000).toFixed(1)}s`, px+10, py+34);
  if(upCost){
    const next=def.levels[t.level];
    ctx.fillStyle='#aaa';
    if(def.isEconomic)    ctx.fillText(`→Lv${t.level+1}: 每${next.tickInterval/1000}s +${next.goldPerTick}金`, px+10, py+54);
    else if(def.isMarket) ctx.fillText(`→Lv${t.level+1}: 每擊殺 +${next.bonusPerKill}金`, px+10, py+54);
    else if(def.isChain)  ctx.fillText(`→Lv${t.level+1}: ⚡${next.damage} 🔗${next.chainCount}目標`, px+10, py+54);
    else if(def.isFortress){
      const yOff=t.level===1?34:t.level===2?66:34;
      ctx.fillText(`→Lv${t.level+1}: ❤️HP ${next.hp}${next.slowRange?`  🧊緩速${next.slowRange}格`:''}${next.counterDmg?`  ⚔️反擊${next.counterDmg}`:''}`, px+10, py+yOff+20);
    }
    else                  ctx.fillText(`→Lv${t.level+1}: ⚔️${next.damage} 📡${next.range} ⏱${(next.fireRate/1000).toFixed(1)}s`, px+10, py+54);
    const canUp=gold>=upCost&&isInBuildRange(t.row,t.col);
    const bx=px+10,by=py+baseH-44,bw=pW-20,bh=28;
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
    ctx.fillText('🏆 已達最高等級', px+pW/2, py+pH-54);
  }
  // ── 出售按鈕（所有建築共用，堡壘除外）──
  if(!def.isFortress&&isInBuildRange(t.row,t.col)){
    const sv=getSellValue(t);
    const sbx=px+10,sby=py+pH-30,sbw=pW-20,sbh=24;
    ctx.fillStyle='rgba(120,20,20,0.85)';
    ctx.beginPath(); ctx.roundRect(sbx,sby,sbw,sbh,5); ctx.fill();
    ctx.strokeStyle='#e74c3c'; ctx.lineWidth=1; ctx.stroke();
    ctx.font='bold 11px sans-serif'; ctx.fillStyle='#faa'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(`🗑️ 出售  退款 ${sv}💰`, sbx+sbw/2, sby+sbh/2);
    sellButtonBounds={x:sbx,y:sby,w:sbw,h:sbh,tower:t};
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
  const pH=14+24+8+18+10+6+10+available.length*(btnH+btnGap)+(upCost?44:0)+16+34;
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
    ctx.fillText('🏆 已達最高等級', px+pW/2, py+pH-44);
  }
  if(isInBuildRange(t.row,t.col)){
    const sv=getSellValue(t);
    const sbx=px+10,sby=py+pH-30,sbw=pW-20,sbh=24;
    ctx.fillStyle='rgba(120,20,20,0.85)';
    ctx.beginPath(); ctx.roundRect(sbx,sby,sbw,sbh,5); ctx.fill();
    ctx.strokeStyle='#e74c3c'; ctx.lineWidth=1; ctx.stroke();
    ctx.font='bold 11px sans-serif'; ctx.fillStyle='#faa'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(`🗑️ 出售  退款 ${sv}💰`, sbx+sbw/2, sby+sbh/2);
    sellButtonBounds={x:sbx,y:sby,w:sbw,h:sbh,tower:t};
  }
}

// ── 研發所面板 ────────────────────────────────────────────
function drawLabPanel(t, def, now){
  const upCost=t.upgradeCost;
  const itemH=34, sectionH=22;
  const pW=240;
  const pH=14+26+8+RESEARCH_ITEMS.length*itemH+sectionH+(upCost?44:0)+14+34;
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
  let heroHeaderDrawn=false;
  for(const item of RESEARCH_ITEMS){
    // 主角升級分隔標題
    if(item.isHero&&!heroHeaderDrawn){
      ctx.fillStyle='rgba(106,27,154,0.4)';
      ctx.fillRect(px+8,iy,pW-16,sectionH);
      ctx.font='bold 11px sans-serif'; ctx.fillStyle='#ce93d8';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('── 🧙 主角升級 ──', px+pW/2, iy+sectionH/2);
      iy+=sectionH; heroHeaderDrawn=true;
    }
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
    ctx.fillText('🏆 已達最高等級', px+pW/2, py+pH-44);
  }
  if(isInBuildRange(t.row,t.col)){
    const sv=getSellValue(t);
    const sbx=px+8,sby=py+pH-30,sbw=pW-16,sbh=24;
    ctx.fillStyle='rgba(120,20,20,0.85)';
    ctx.beginPath(); ctx.roundRect(sbx,sby,sbw,sbh,5); ctx.fill();
    ctx.strokeStyle='#e74c3c'; ctx.lineWidth=1; ctx.stroke();
    ctx.font='bold 11px sans-serif'; ctx.fillStyle='#faa'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(`🗑️ 出售  退款 ${sv}💰`, sbx+sbw/2, sby+sbh/2);
    sellButtonBounds={x:sbx,y:sby,w:sbw,h:sbh,tower:t};
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
  if(e.key==='Enter'&&!waveActive&&!gameOver&&towers.some(t=>TOWER_TYPES[t.type].isFortress)) nextWaveAt=performance.now();
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

// ── 點擊 / 點觸建築邏輯（cx/cy 為畫布像素座標）────────────
function handleCanvasTap(cx, cy){
  if(gameOver) return;
  // 出售按鈕
  if(sellButtonBounds){
    const b=sellButtonBounds;
    if(cx>=b.x&&cx<=b.x+b.w&&cy>=b.y&&cy<=b.y+b.h){
      const sv=getSellValue(b.tower);
      b.tower.destroy();
      gold+=sv;
      showMessage(`💰 出售成功，退款 ${sv} 金幣`);
      sellButtonBounds=null;
      return;
    }
  }
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
      if(hero) hero.applyResearch();
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
  const testOcc=new Set([...occupiedCells,key]);
  if(SPAWN_POINTS.some(sp=>!findPath(testOcc,sp))){showMessage('⚠️ 不能完全封鎖路徑！');return;}
  gold-=cost;
  towers.push(new Tower(row,col,selectedTowerType));
  SFX.build();
  occupiedCells.add(key);
  recalculateAllPaths();
}

canvas.addEventListener('click', e=>{
  const rect=canvas.getBoundingClientRect();
  const scaleX=canvas.width/rect.width, scaleY=canvas.height/rect.height;
  handleCanvasTap((e.clientX-rect.left)*scaleX, (e.clientY-rect.top)*scaleY);
});

// ── 關卡進度（localStorage）──────────────────────────────
function refreshLevelCards(){
  const cleared=loadCleared();
  document.querySelectorAll('.level-card').forEach(card=>{
    const lvl=parseInt(card.getAttribute('data-level'));
    if(!lvl) return;
    card.querySelector('.level-clear-badge')?.remove();
    if(cleared.has(lvl)){
      const badge=document.createElement('div');
      badge.className='level-clear-badge';
      badge.textContent='✓';
      card.appendChild(badge);
      card.classList.add('cleared');
    } else {
      card.classList.remove('cleared');
    }
  });
}
// 頁面載入時刷新一次
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',refreshLevelCards);
} else {
  refreshLevelCards();
}

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
    if(!isMobile()){
      // 桌面：在畫布上偵測搖桿
      const dxJ=x-JOY_FIX_X, dyJ=y-JOY_FIX_Y;
      const distToJoy=Math.sqrt(dxJ*dxJ+dyJ*dyJ);
      if(!joystick.active && distToJoy<=joystick.baseR*1.8){
        joystick.active=true; joystick.touchId=t.identifier;
        joystick.knobX=x; joystick.knobY=y;
        joystick.dx=0; joystick.dy=0;
        continue;
      }
    }
    if(buildTouchId===null){
      // 其他區域 → 追蹤建築點擊
      buildTouchId=t.identifier;
      buildTouchStartX=x; buildTouchStartY=y;
      buildTouchMoved=false;
    }
  }
},{passive:false});

canvas.addEventListener('touchmove', e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
    if(!isMobile()&&t.identifier===joystick.touchId){
      const {x,y}=getCanvasPos(t);
      const ddx=x-JOY_FIX_X, ddy=y-JOY_FIX_Y;
      const dist=Math.sqrt(ddx*ddx+ddy*ddy);
      const max=joystick.baseR-joystick.knobR;
      const clamp=Math.min(dist,max);
      const angle=Math.atan2(ddy,ddx);
      joystick.knobX=JOY_FIX_X+Math.cos(angle)*clamp;
      joystick.knobY=JOY_FIX_Y+Math.sin(angle)*clamp;
      joystick.dx=dist>6?Math.cos(angle)*Math.min(dist/max,1):0;
      joystick.dy=dist>6?Math.sin(angle)*Math.min(dist/max,1):0;
    }
    if(t.identifier===buildTouchId){
      const {x,y}=getCanvasPos(t);
      const dx=x-buildTouchStartX, dy=y-buildTouchStartY;
      if(Math.sqrt(dx*dx+dy*dy)>10) buildTouchMoved=true;
    }
  }
},{passive:false});

canvas.addEventListener('touchend', e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
    if(!isMobile()&&t.identifier===joystick.touchId){
      joystick.active=false; joystick.touchId=null;
      joystick.knobX=JOY_FIX_X; joystick.knobY=JOY_FIX_Y;
      joystick.dx=0; joystick.dy=0;
    }
    if(t.identifier===buildTouchId){
      buildTouchId=null;
      if(!buildTouchMoved){
        const {x,y}=getCanvasPos(t);
        handleCanvasTap(x, y);
      }
    }
  }
},{passive:false});

canvas.addEventListener('touchcancel', e=>{
  if(!isMobile()){
    joystick.active=false; joystick.touchId=null;
    joystick.knobX=JOY_FIX_X; joystick.knobY=JOY_FIX_Y;
    joystick.dx=0; joystick.dy=0;
  }
  buildTouchId=null;
},{passive:false});

// ── HTML 搖桿觸控（手機，畫布下方）─────────────────────────
(function(){
  const joyBase=document.getElementById('joy-base');
  const joyKnob=document.getElementById('joy-knob');
  if(!joyBase) return;
  const JOY_R=54; // joy-base 半徑 (108/2)
  const KNOB_R=23; // joy-knob 半徑 (46/2)
  const MAX_DISP=JOY_R-KNOB_R; // 31px
  let touchId=null;

  function getCenter(){
    const r=joyBase.getBoundingClientRect();
    return { x: r.left+r.width/2, y: r.top+r.height/2 };
  }
  function move(clientX, clientY){
    const c=getCenter();
    const ddx=clientX-c.x, ddy=clientY-c.y;
    const dist=Math.sqrt(ddx*ddx+ddy*ddy);
    const clamp=Math.min(dist,MAX_DISP);
    const angle=Math.atan2(ddy,ddx);
    const ox=Math.cos(angle)*clamp, oy=Math.sin(angle)*clamp;
    joyKnob.style.transform=`translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
    joystick.dx=dist>5?Math.cos(angle)*Math.min(dist/MAX_DISP,1):0;
    joystick.dy=dist>5?Math.sin(angle)*Math.min(dist/MAX_DISP,1):0;
    joystick.active=true;
  }
  function reset(){
    touchId=null;
    joystick.active=false; joystick.dx=0; joystick.dy=0;
    joyKnob.style.transform='translate(-50%, -50%)';
  }

  joyBase.addEventListener('touchstart', e=>{
    e.preventDefault();
    if(touchId===null){
      const t=e.changedTouches[0];
      touchId=t.identifier;
      move(t.clientX, t.clientY);
    }
  },{passive:false});
  joyBase.addEventListener('touchmove', e=>{
    e.preventDefault();
    for(const t of e.changedTouches){
      if(t.identifier===touchId){ move(t.clientX, t.clientY); break; }
    }
  },{passive:false});
  joyBase.addEventListener('touchend', e=>{
    e.preventDefault();
    for(const t of e.changedTouches){
      if(t.identifier===touchId){ reset(); break; }
    }
  },{passive:false});
  joyBase.addEventListener('touchcancel', e=>{ reset(); },{passive:false});
})();
