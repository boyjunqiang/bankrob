// ============================================================
// 游戏核心配置 — 所有可调参数集中管理
// ============================================================

export const GAME = {
  WIDTH: 390,
  HEIGHT: 844,
};

export const TIMER = {
  DISPLAY_SECONDS: 60,       // 显示给玩家的倒计时
  POLICE_MIN: 55,            // 警察最早到达 (秒)
  POLICE_MAX: 65,            // 警察最晚到达 (秒)
};

export const MONEY = {
  INITIAL: 1,               // 第一个钱袋的金额
};

export const ROBBER = {
  SPEED: 110,                // 正常移动速度 (px/s) — 慢一点，每袋都有成本
  ESCAPE_SPEED: 165,         // 逃跑冲刺速度 (px/s)
  START_X: 195,
  START_Y: 520,
  COLLECT_RADIUS: 18,        // 捡拾判定半径
};

export const BAGS = {
  MIN_COUNT: 50,
  MAX_COUNT: 60,
  MIN_DISTANCE: 32,          // 钱袋间最小距离（铺满整个地面）
  AREA: {
    minX: 50, maxX: 340,
    minY: 165, maxY: 625,
  },
};

export const CAR = {
  X: 195,
  Y: 770,
};

export const PARTNER = {
  X: 258,
  Y: 755,
};

// 银行布局 Y 轴分段
export const BANK = {
  COUNTER_Y: 60,
  COUNTER_H: 50,
  FLOOR_TOP: 130,
  FLOOR_BOTTOM: 660,
  ENTRANCE_Y: 660,
  OUTSIDE_Y: 700,
};

// 猪队友对话（仅在报警时说一句，不再按时间触发）
export const PARTNER_LINES = {
  alarm: '🚨 完了！报警了！！',
};

// 劫匪台词
export const ROBBER_LINES = {
  threat:  '不许动！\n把钱都拿出来！',
  noAlarm: '谁都不准报警！\n否则毙了你们！',
  gogogo:  '慌什么！警察最快一分钟才到！\n这辈子就赌这一把了！\n给老子使劲捡！！',
};

// 劫匪按捡钱袋数说的搞笑台词（不泄露时间信息）
export const ROBBER_QUIPS = [
  { bags: 3,  text: '嘿嘿嘿 真香！' },
  { bags: 6,  text: '再捡一个！\n就一个！' },
  { bags: 10, text: '哈哈哈 停不下来！' },
  { bags: 14, text: '贪心？\n我这叫专业！' },
  { bags: 18, text: '我是不是有点上头了…' },
  { bags: 22, text: '再来再来！\n就最后一个！' },
  { bags: 26, text: '好像听到什么声音…\n算了不管了！' },
  { bags: 30, text: '谁能阻止我！！' },
  { bags: 35, text: '我是不是疯了？\n但好爽啊！' },
  { bags: 40, text: '老婆对不起…\n但这钱太多了！' },
  { bags: 45, text: '传说中的赌神！' },
  { bags: 50, text: '我已经无法停下来了…' },
];

// 结算称号
export const TITLES = [
  { maxMargin: 1,  text: '⚡ 千钧一发！',   color: '#ff2222' },
  { maxMargin: 3,  text: '🔥 惊险逃脱！',   color: '#ff6600' },
  { maxMargin: 5,  text: '😎 游刃有余',     color: '#ffcc00' },
  { maxMargin: 10, text: '🚶 从容不迫',     color: '#66ff66' },
  { maxMargin: 99, text: '🐢 太保守了吧…',  color: '#aaaaaa' },
];
