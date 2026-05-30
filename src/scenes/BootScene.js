import Phaser from 'phaser';

// ============================================================
// BootScene — 生成所有游戏纹理（无需外部图片资源）
// ============================================================
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBox = this.add.graphics();
    const progressBar = this.add.graphics();
    
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontFamily: 'monospace', // fallback in case Press Start 2P isn't ready
      fontSize: '20px',
      fill: '#ffffff'
    }).setOrigin(0.5);

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontFamily: 'monospace',
      fontSize: '18px',
      fill: '#000000'
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xffd700, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
      percentText.setText(parseInt(value * 100) + '%');
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });


    this.load.video('homeVideo', 'assets/首页视频.mp4');
    this.load.audio('homeAudio', 'assets/启动页.mp3');
    this.load.audio('menuSiren', 'assets/menu_siren.mp3');
    this.load.image('homeBtn', 'assets/首页开始按钮.webp');
    this.load.image('homeTitle', 'assets/首页标题.webp');

    // 加载外部新资源
    this.load.image('gameBg', 'assets/游戏主画面.webp');
    this.load.image('safe_bg', 'assets/safe.png');
    this.load.image('safe_5', 'assets/5保险.png');
    this.load.image('safe_35', 'assets/10保险.png');
    this.load.image('safe_15', 'assets/15倍.png');
    this.load.image('safe_diamond', 'assets/转式保险箱.png');
    this.load.image('moneybag', 'assets/钱袋.png');
    this.load.image('handle', 'assets/把手.png');
    this.load.image('btn_normal', 'assets/btn_normal.png');
    this.load.image('btn_pressed', 'assets/btn_pressed.png');
    this.load.image('bag_brown', 'assets/bag_brown.png');
    this.load.image('bag_dark', 'assets/bag_dark.png');
    this.load.image('bag_green', 'assets/bag_green.png');
    this.load.image('bag_gold', 'assets/bag_gold.png');
    this.load.image('bag_yellow', 'assets/bag_yellow.png');
    this.load.image('car', 'assets/汽车.png');
    this.load.image('gameBg2', 'assets/游戏主画面2.png');
    this.load.image('gameBg3', 'assets/游戏主画面3.png');
    this.load.image('gameBg4', 'assets/游戏主画面4.png');
    this.load.image('gameBg5', 'assets/游戏主画面5.png');
    this.load.audio('robberyMusic', 'assets/开始抢银行.mp3');
    this.load.image('partner', 'assets/劫匪2.png');
    this.load.audio('collectSound', 'assets/collect.mp3');
    this.load.audio('failSound', 'assets/失败.mp3');
    this.load.audio('successSound', 'assets/胜利.mp3');

    // 成功结算页优化新资源
    this.load.image('victoryBg', 'assets/胜利背景.webp');
    this.load.image('successHeader', 'assets/成功逃脱.webp');
    this.load.image('successHighScoreHeader', 'assets/成功逃脱新高分.webp');
    this.load.image('popupMoney', 'assets/弹出框钱.png');
    this.load.image('popupPoliceCar', 'assets/弹出框警车.png');
    this.load.image('popupHumanDisdain', 'assets/弹出框小人鄙视.png');
    this.load.image('popupHumanHappy', 'assets/弹出框小人鄙视开心.png');
    this.load.image('btnShare', 'assets/分享战绩.webp');
    this.load.image('btnRetry', 'assets/再来一次.webp');
    this.load.image('btnEscape', 'assets/逃跑.webp');
    this.load.image('fallingBill', 'assets/飘落钞票.png');

    // 失败结算页资源
    this.load.image('failBg', 'assets/失败背景.webp');
    this.load.image('failHeader', 'assets/失败标题.webp');

    // 预加载劫匪台词语音
    this.load.audio('voiceLine1', 'assets/台词1.mp3');
    this.load.audio('voiceLine2', 'assets/台词2.mp3');
    this.load.audio('voiceLine3', 'assets/台词3.mp3');

    // 预加载主角静止三视图（正面、背面、左侧面）
    this.load.image('robber_idle_front', 'assets/robber_idle_front.png');
    this.load.image('robber_idle_back', 'assets/robber_idle_back.png');
    this.load.image('robber_idle_left', 'assets/robber_idle_left.png');

    // 预加载主角多方向行走动作帧
    for (let i = 0; i < 8; i++) {
      this.load.image(`robber_down_${i}`, `assets/robber_down_${i}.png`);
    }
    for (let i = 0; i < 11; i++) {
      this.load.image(`robber_up_${i}`, `assets/robber_up_${i}.png`);
      this.load.image(`robber_left_${i}`, `assets/robber_left_${i}.png`);
    }

    // 预加载警车动画帧
    for (let i = 0; i < 7; i++) {
      this.load.image(`police_car_${i}`, `assets/police_car_${i}.png`);
    }

    // 显式触发自定义像素字体加载，确保浏览器立即开始下载
    if (document.fonts) {
      document.fonts.load('12px "Zpix"');
      document.fonts.load('12px "Press Start 2P"');
    }
  }

  create() {
    let fontLoaded = false;
    const startGame = () => {
      if (fontLoaded) return;
      fontLoaded = true;
      this.generateAllTextures();
      this.createAnimations();
      this.scene.start('MenuScene');
    };

    // 检查 Zpix 像素字体是否已经加载完毕
    if (document.fonts && document.fonts.check('12px "Zpix"')) {
      console.log('Zpix font already loaded, starting game...');
      startGame();
    } else {
      console.log('Zpix font not loaded yet, waiting...');
      // 正常字体加载完回调
      document.fonts.ready.then(() => {
        console.log('All fonts loaded, starting game...');
        startGame();
      }).catch(err => {
        console.error('Error waiting for fonts:', err);
        startGame();
      });

      // 3000ms 超时兜底，给 965KB 的本地中文字体足够的时间下载，避免因超时过短（如 600ms）导致降级为系统默认字体
      this.time.delayedCall(3000, () => {
        console.warn('Font load timed out after 3s, starting game with fallback fonts...');
        startGame();
      });
    }
  }

  createAnimations() {
    // 1. 向下行走 (正面)
    const downFrames = [];
    for (let i = 0; i < 8; i++) {
      downFrames.push({ key: `robber_down_${i}` });
    }
    this.anims.create({
      key: 'robber_walk_down',
      frames: downFrames,
      frameRate: 11,
      repeat: -1
    });

    // 2. 向上行走 (背面)
    const upFrames = [];
    for (let i = 0; i < 11; i++) {
      upFrames.push({ key: `robber_up_${i}` });
    }
    this.anims.create({
      key: 'robber_walk_up',
      frames: upFrames,
      frameRate: 13,
      repeat: -1
    });

    // 3. 向左行走 (侧面)
    const leftFrames = [];
    for (let i = 0; i < 11; i++) {
      leftFrames.push({ key: `robber_left_${i}` });
    }
    this.anims.create({
      key: 'robber_walk_left',
      frames: leftFrames,
      frameRate: 13,
      repeat: -1
    });

    // 4. 警车闪灯动画
    const policeFrames = [];
    for (let i = 0; i < 7; i++) {
      policeFrames.push({ key: `police_car_${i}` });
    }
    this.anims.create({
      key: 'police_car_flash',
      frames: policeFrames,
      frameRate: 10,
      repeat: -1
    });
  }

  generateAllTextures() {
    this.genRobber();
    // 使用外部图片，不再动态生成猪队友纹理
    // this.genPartner();
    // 使用外部图片，不再动态生成钱袋和汽车纹理
    // this.genMoneyBag();
    // this.genCar();
    this.genTeller();
    this.genGoldCoin();
    this.genDollarBill();
    this.genPoliceCar();
    this.genGunFlash();
  }

  // ── 劫匪（瘦、黑衣、面罩）──────────────────────
  genRobber() {
    const W = 32, H = 42;
    const g = this.make.graphics({ add: false });

    // 阴影
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(W / 2, H - 4, 22, 8);

    // 腿
    g.fillStyle(0x1a1a2e);
    g.fillRect(11, 30, 4, 8);
    g.fillRect(17, 30, 4, 8);

    // 身体 (瘦)
    g.fillStyle(0x2a2a3a);
    g.fillRoundedRect(9, 13, 14, 19, 4);

    // 手臂
    g.fillStyle(0x2a2a3a);
    g.fillRoundedRect(5, 16, 4, 13, 2);
    g.fillRoundedRect(23, 16, 4, 13, 2);

    // 头（面罩）
    g.fillStyle(0x111122);
    g.fillCircle(W / 2, 10, 8);

    // 眼白
    g.fillStyle(0xffffff);
    g.fillCircle(13, 9, 2.2);
    g.fillCircle(19, 9, 2.2);

    // 瞳孔
    g.fillStyle(0x111111);
    g.fillCircle(13.5, 9, 1);
    g.fillCircle(19.5, 9, 1);

    g.generateTexture('robber', W, H);
    g.destroy();
  }

  // ── 猪队友（胖、条纹衫）────────────────────────
  genPartner() {
    const W = 42, H = 48;
    const g = this.make.graphics({ add: false });

    // 阴影
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(W / 2, H - 4, 30, 10);

    // 腿
    g.fillStyle(0x2a2a3a);
    g.fillRect(12, 36, 6, 8);
    g.fillRect(24, 36, 6, 8);

    // 身体 (胖，白底)
    g.fillStyle(0xdddddd);
    g.fillRoundedRect(6, 14, 30, 24, 6);

    // 横条纹
    g.fillStyle(0x222233);
    for (let y = 17; y < 36; y += 5) {
      g.fillRoundedRect(6, y, 30, 2, 1);
    }

    // 手臂
    g.fillStyle(0xdddddd);
    g.fillRoundedRect(1, 17, 6, 15, 3);
    g.fillRoundedRect(35, 17, 6, 15, 3);
    // 手臂条纹
    g.fillStyle(0x222233);
    for (let y = 19; y < 30; y += 5) {
      g.fillRect(1, y, 6, 2);
      g.fillRect(35, y, 6, 2);
    }

    // 头（面罩）
    g.fillStyle(0x111122);
    g.fillCircle(W / 2, 10, 9);

    // 眼白
    g.fillStyle(0xffffff);
    g.fillCircle(17, 9, 2.5);
    g.fillCircle(25, 9, 2.5);

    // 瞳孔 (紧张地看向旁边)
    g.fillStyle(0x111111);
    g.fillCircle(18, 9, 1.2);
    g.fillCircle(26, 9, 1.2);

    g.generateTexture('partner', W, H);
    g.destroy();
  }

  // ── 钱袋 ───────────────────────────────────────
  genMoneyBag() {
    const S = 30;
    const g = this.make.graphics({ add: false });

    // 发光
    g.fillStyle(0xffd700, 0.12);
    g.fillCircle(S / 2, S / 2 + 2, 14);

    // 袋体
    g.fillStyle(0xc89b3c);
    g.fillRoundedRect(5, 10, 20, 16, 5);

    // 高光
    g.fillStyle(0xe8c252, 0.7);
    g.fillRoundedRect(8, 12, 10, 8, 3);

    // 扎口
    g.fillStyle(0xa07828);
    g.fillRect(12, 6, 6, 6);
    g.fillCircle(S / 2, 6, 5);
    g.fillStyle(0xc89b3c);
    g.fillCircle(S / 2, 5, 3);

    // $ 符号 (简化为两道横线)
    g.fillStyle(0x806020, 0.8);
    g.fillRect(13, 15, 5, 1.5);
    g.fillRect(12, 19, 5, 1.5);
    g.fillRect(14, 13, 1.5, 9);

    g.generateTexture('moneybag', S, S);
    g.destroy();
  }

  // ── 逃跑车（俯视） ──────────────────────────────
  genCar() {
    const W = 56, H = 92;
    const g = this.make.graphics({ add: false });

    // 车体阴影
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(6, 8, W - 12, H - 8, 12);

    // 车体
    g.fillStyle(0x1e293b);
    g.fillRoundedRect(4, 4, W - 8, H - 8, 12);

    // 车顶
    g.fillStyle(0x334155);
    g.fillRoundedRect(10, 28, W - 20, 34, 6);

    // 前挡风
    g.fillStyle(0x64b5f6, 0.5);
    g.fillRoundedRect(12, 18, W - 24, 14, 4);

    // 后挡风
    g.fillStyle(0x64b5f6, 0.4);
    g.fillRoundedRect(12, 58, W - 24, 10, 4);

    // 前车灯
    g.fillStyle(0xffee88);
    g.fillCircle(12, 8, 4);
    g.fillCircle(W - 12, 8, 4);

    // 尾灯
    g.fillStyle(0xff4444);
    g.fillRoundedRect(8, H - 10, 8, 5, 2);
    g.fillRoundedRect(W - 16, H - 10, 8, 5, 2);

    // 车轮
    g.fillStyle(0x111111);
    g.fillRoundedRect(0, 14, 6, 14, 2);
    g.fillRoundedRect(W - 6, 14, 6, 14, 2);
    g.fillRoundedRect(0, 60, 6, 14, 2);
    g.fillRoundedRect(W - 6, 60, 6, 14, 2);

    g.generateTexture('car', W, H);
    g.destroy();
  }

  // ── 柜员 ───────────────────────────────────────
  genTeller() {
    const W = 24, H = 30;
    const g = this.make.graphics({ add: false });

    // 身体 (浅色制服)
    g.fillStyle(0x4488aa);
    g.fillRoundedRect(6, 12, 12, 14, 3);

    // 举起的手
    g.fillStyle(0xf0c8a0);
    g.fillCircle(4, 8, 3);   // 左手
    g.fillCircle(20, 8, 3);  // 右手
    g.fillStyle(0x4488aa);
    g.fillRect(4, 12, 3, 6);  // 左臂
    g.fillRect(17, 12, 3, 6); // 右臂

    // 头
    g.fillStyle(0xf0c8a0);
    g.fillCircle(W / 2, 8, 6);

    // 头发
    g.fillStyle(0x3a2a1a);
    g.fillCircle(W / 2, 5, 6);
    g.fillStyle(0xf0c8a0);
    g.fillCircle(W / 2, 7, 5);

    // 惊恐的眼睛 (大)
    g.fillStyle(0xffffff);
    g.fillCircle(10, 8, 2.5);
    g.fillCircle(14, 8, 2.5);
    g.fillStyle(0x111111);
    g.fillCircle(10, 8, 1);
    g.fillCircle(14, 8, 1);

    // 张大的嘴
    g.fillStyle(0x222222);
    g.fillCircle(W / 2, 12, 1.5);

    g.generateTexture('teller', W, H);
    g.destroy();
  }

  // ── 小金币（粒子用） ──────────────────────────
  genGoldCoin() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xffd700);
    g.fillCircle(4, 4, 4);
    g.fillStyle(0xffec80, 0.6);
    g.fillCircle(3, 3, 2);
    g.generateTexture('goldCoin', 8, 8);
    g.destroy();
  }

  // ── 美钞（粒子用） ────────────────────────────
  genDollarBill() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x55aa55);
    g.fillRoundedRect(0, 0, 14, 7, 1);
    g.fillStyle(0x77cc77, 0.5);
    g.fillRect(2, 2, 10, 3);
    g.generateTexture('dollarBill', 14, 7);
    g.destroy();
  }

  // ── 警车（俯视） ──────────────────────────────
  genPoliceCar() {
    const W = 56, H = 92;
    const g = this.make.graphics({ add: false });

    // 车体阴影
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(6, 8, W - 12, H - 8, 12);

    // 车体（白色）
    g.fillStyle(0xe8e8ee);
    g.fillRoundedRect(4, 4, W - 8, H - 8, 12);

    // 车顶
    g.fillStyle(0xd0d0dd);
    g.fillRoundedRect(10, 28, W - 20, 34, 6);

    // 前挡风
    g.fillStyle(0x64b5f6, 0.5);
    g.fillRoundedRect(12, 18, W - 24, 14, 4);

    // 后挡风
    g.fillStyle(0x64b5f6, 0.4);
    g.fillRoundedRect(12, 58, W - 24, 10, 4);

    // 警灯条（红蓝）
    g.fillStyle(0xff2222);
    g.fillRoundedRect(10, 38, 14, 6, 2);
    g.fillStyle(0x2244ff);
    g.fillRoundedRect(W - 24, 38, 14, 6, 2);

    // 警灯发光
    g.fillStyle(0xff2222, 0.3);
    g.fillCircle(17, 41, 10);
    g.fillStyle(0x2244ff, 0.3);
    g.fillCircle(W - 17, 41, 10);

    // 前车灯
    g.fillStyle(0xffee88);
    g.fillCircle(12, 8, 4);
    g.fillCircle(W - 12, 8, 4);

    // 蓝色车身条纹
    g.fillStyle(0x2255aa, 0.7);
    g.fillRect(4, 70, W - 8, 6);

    // 车轮
    g.fillStyle(0x111111);
    g.fillRoundedRect(0, 14, 6, 14, 2);
    g.fillRoundedRect(W - 6, 14, 6, 14, 2);
    g.fillRoundedRect(0, 60, 6, 14, 2);
    g.fillRoundedRect(W - 6, 60, 6, 14, 2);

    g.generateTexture('policeCar', W, H);
    g.destroy();
  }

  // ── 枪口闪光 ──────────────────────────────────
  genGunFlash() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xffff44, 0.9);
    g.fillCircle(10, 10, 10);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(10, 10, 5);
    g.generateTexture('gunFlash', 20, 20);
    g.destroy();
  }
}
