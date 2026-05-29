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
  INITIAL: 100,              // 第一个钱袋的金额
};

export const ROBBER = {
  SPEED: 160,                // 正常移动速度 (px/s)
  ESCAPE_SPEED: 210,         // 逃跑冲刺速度 (px/s)
  START_X: 195,
  START_Y: 520,
  COLLECT_RADIUS: 18,        // 捡拾判定半径
};

export const BAGS = {
  MIN_COUNT: 10,
  MAX_COUNT: 12,
  MIN_DISTANCE: 55,          // 钱袋间最小距离
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

// 猪队友对话 (trigger = 剩余时间)
export const PARTNER_LINES = [
  { at: 'alarm',  text: '🚨 有人报警了！！快跑！',     ms: 2500 },
  { at: 45,       text: '老大，快点啊！',               ms: 2000 },
  { at: 30,       text: '我有不好的预感…',              ms: 2000 },
  { at: 15,       text: '我看到警灯了！快走！！',       ms: 2500 },
  { at: 10,       text: '求你了赶紧上车！！',           ms: 2000 },
  { at: 5,        text: '完了完了完了！！！',            ms: 2000 },
  { at: 0,        text: '老大你疯了吗！！！',            ms: 3000 },
  { at: -5,       text: '啊啊啊啊啊啊！！！',           ms: 2000 },
];

export const ROBBER_LINES = {
  threat:  '不许动！\n把钱都拿出来！',
  noAlarm: '谁都不准报警！\n否则毙了你们！',
  gogogo:  '警察还有一分钟！\n尽量多捡点！',
};

// 结算称号
export const TITLES = [
  { maxMargin: 1,  text: '⚡ 千钧一发！',   color: '#ff2222' },
  { maxMargin: 3,  text: '🔥 惊险逃脱！',   color: '#ff6600' },
  { maxMargin: 5,  text: '😎 游刃有余',     color: '#ffcc00' },
  { maxMargin: 10, text: '🚶 从容不迫',     color: '#66ff66' },
  { maxMargin: 99, text: '🐢 太保守了吧…',  color: '#aaaaaa' },
];
