import Phaser from 'phaser';
import {
  GAME, TIMER, MONEY, ROBBER, BAGS, CAR, PARTNER,
  BANK, PARTNER_LINES, ROBBER_LINES,
} from '../config/gameConfig.js';

// ============================================================
// GameScene — 核心游戏：银行场景、捡钱、倒计时、逃跑
// ============================================================
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  /* ───────── 初始化状态 ───────── */
  init() {
    this.totalMoney = 0;
    this.bagsCollected = 0;
    this.timerStarted = false;
    this.timerStartTime = 0;
    this.policeDelay = Phaser.Math.FloatBetween(TIMER.POLICE_MIN, TIMER.POLICE_MAX);
    this.gameEnded = false;
    this.isEscaping = false;
    this.introPlaying = true;
    this.robberTarget = null;
    this.triggeredDialogues = new Set();
    this.alarmSoundInterval = null;
    this.heartbeatInterval = null;
  }

  /* ───────── 创建场景 ───────── */
  create() {
    // 初始化音频上下文（需用户交互后才可用）
    this.audioCtx = null;

    this.drawBankInterior();
    this.createGetawayCar();
    this.createPartnerChar();
    this.createTellers();
    this.createMoneyBags();
    this.createRobber();
    this.createHUD();
    this.createEscapeButton();
    this.createPromptText();

    // 开始开场动画
    this.playIntro();

    // 淡入
    this.cameras.main.fadeIn(300);
  }

  /* ───────── 每帧更新 ───────── */
  update(time, delta) {
    if (this.introPlaying || this.gameEnded) return;

    this.updateRobberMovement(delta);
    if (this.timerStarted) {
      this.updateTimer(time);
      this.updatePartnerPacing(time);
    }
  }

  // ==================================================================
  //  银行场景绘制
  // ==================================================================
  drawBankInterior() {
    const g = this.add.graphics();

    // ── 银行地板（浅大理石） ──
    g.fillStyle(0xf0ead6);
    g.fillRect(0, 0, GAME.WIDTH, BANK.OUTSIDE_Y);

    // 地砖网格
    g.lineStyle(1, 0xe0d8c4, 0.25);
    for (let x = 0; x <= GAME.WIDTH; x += 65) {
      g.lineBetween(x, BANK.FLOOR_TOP, x, BANK.FLOOR_BOTTOM);
    }
    for (let y = BANK.FLOOR_TOP; y <= BANK.FLOOR_BOTTOM; y += 65) {
      g.lineBetween(0, y, GAME.WIDTH, y);
    }

    // ── 墙壁 ──
    g.fillStyle(0x3d3d5c);
    g.fillRect(0, 0, GAME.WIDTH, 16);
    g.fillRect(0, 0, 16, BANK.FLOOR_BOTTOM);
    g.fillRect(GAME.WIDTH - 16, 0, 16, BANK.FLOOR_BOTTOM);

    // 墙壁装饰线
    g.lineStyle(2, 0x555577);
    g.lineBetween(16, 16, GAME.WIDTH - 16, 16);

    // ── 柜台 ──
    g.fillStyle(0x5c3d2e);
    g.fillRect(25, BANK.COUNTER_Y, GAME.WIDTH - 50, BANK.COUNTER_H);
    // 柜台高光
    g.fillStyle(0x7a5240);
    g.fillRect(25, BANK.COUNTER_Y, GAME.WIDTH - 50, 8);
    // 柜台前沿
    g.fillStyle(0x4a2e20);
    g.fillRect(25, BANK.COUNTER_Y + BANK.COUNTER_H - 4, GAME.WIDTH - 50, 4);

    // ── 柜员窗口 ──
    const windowY = 18;
    const windowH = BANK.COUNTER_Y - windowY - 2;
    [75, 170, 265].forEach(wx => {
      g.fillStyle(0x88bbdd, 0.25);
      g.fillRect(wx, windowY, 55, windowH);
      g.lineStyle(2, 0x666688);
      g.strokeRect(wx, windowY, 55, windowH);
    });

    // ── 装饰柱子 ──
    [[55, 230], [335, 230], [55, 440], [335, 440]].forEach(([px, py]) => {
      g.fillStyle(0xd4c5a9);
      g.fillCircle(px, py, 12);
      g.fillStyle(0xbfb08d);
      g.fillCircle(px, py, 8);
    });

    // ── 绳索护栏 ──
    g.lineStyle(2, 0xccaa44, 0.5);
    g.lineBetween(55, 230, 55, 440);
    g.lineBetween(335, 230, 335, 440);

    // ── 银行出口区 ──
    g.fillStyle(0x3a3a50);
    g.fillRect(0, BANK.ENTRANCE_Y, GAME.WIDTH, BANK.OUTSIDE_Y - BANK.ENTRANCE_Y);

    // 玻璃门
    g.fillStyle(0x88aacc, 0.35);
    g.fillRect(130, BANK.ENTRANCE_Y, 130, 30);
    g.lineStyle(2, 0xaaccee, 0.6);
    g.strokeRect(130, BANK.ENTRANCE_Y, 65, 30);
    g.strokeRect(195, BANK.ENTRANCE_Y, 65, 30);

    // ── 室外（街道） ──
    g.fillStyle(0x252535);
    g.fillRect(0, BANK.OUTSIDE_Y, GAME.WIDTH, GAME.HEIGHT - BANK.OUTSIDE_Y);

    // 人行道
    g.fillStyle(0x404055);
    g.fillRect(0, BANK.OUTSIDE_Y, GAME.WIDTH, 18);

    // 路面标线
    g.fillStyle(0x555565, 0.4);
    g.fillRect(50, 800, 40, 3);
    g.fillRect(150, 800, 40, 3);
    g.fillRect(250, 800, 40, 3);
  }

  // ==================================================================
  //  游戏对象创建
  // ==================================================================
  createGetawayCar() {
    this.car = this.add.image(CAR.X, CAR.Y, 'car').setDepth(5);

    // 汽车怠速微颤
    this.tweens.add({
      targets: this.car,
      x: { from: CAR.X - 0.5, to: CAR.X + 0.5 },
      duration: 120,
      yoyo: true,
      repeat: -1,
    });
  }

  createPartnerChar() {
    this.partner = this.add.image(PARTNER.X, PARTNER.Y, 'partner').setDepth(6);

    // 猪队友紧张踱步
    this.partnerPaceTween = this.tweens.add({
      targets: this.partner,
      x: { from: PARTNER.X - 12, to: PARTNER.X + 12 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  createTellers() {
    this.tellers = [];
    [102, 197, 292].forEach(tx => {
      const t = this.add.image(tx, 45, 'teller').setDepth(3).setScale(1.1);
      t.setAlpha(0); // 开场动画后显示
      this.tellers.push(t);
    });
  }

  createMoneyBags() {
    this.moneyBags = [];
    const count = Phaser.Math.Between(BAGS.MIN_COUNT, BAGS.MAX_COUNT);
    const placed = [];
    let attempts = 0;

    while (placed.length < count && attempts < 600) {
      const x = Phaser.Math.Between(BAGS.AREA.minX, BAGS.AREA.maxX);
      const y = Phaser.Math.Between(BAGS.AREA.minY, BAGS.AREA.maxY);
      let ok = true;

      // 最小距离检测
      for (const p of placed) {
        if (Phaser.Math.Distance.Between(x, y, p.x, p.y) < BAGS.MIN_DISTANCE) {
          ok = false;
          break;
        }
      }
      // 避开柱子
      for (const [px, py] of [[55, 230], [335, 230], [55, 440], [335, 440]]) {
        if (Phaser.Math.Distance.Between(x, y, px, py) < 30) {
          ok = false;
          break;
        }
      }

      if (ok) placed.push({ x, y });
      attempts++;
    }

    placed.forEach(pos => {
      const bag = this.add.image(pos.x, pos.y, 'moneybag')
        .setDepth(8)
        .setScale(0)        // 开场动画中弹出
        .setAlpha(0)
        .setInteractive({ useHandCursor: true, pixelPerfect: false });

      bag.collected = false;
      bag.on('pointerdown', () => this.onBagClicked(bag));
      this.moneyBags.push(bag);
    });
  }

  createRobber() {
    this.robber = this.add.image(ROBBER.START_X, GAME.HEIGHT + 50, 'robber')
      .setDepth(10)
      .setScale(1.2);

    // 走路时的上下摇晃
    this.robberBobTween = this.tweens.add({
      targets: this.robber,
      y: '-=3',
      duration: 180,
      yoyo: true,
      repeat: -1,
      paused: true,
    });
  }

  createHUD() {
    // 半透明HUD背景
    this.hudBg = this.add.graphics().setDepth(90);
    this.hudBg.fillStyle(0x000000, 0.5);
    this.hudBg.fillRoundedRect(8, 6, 160, 36, 8);
    this.hudBg.fillRoundedRect(GAME.WIDTH - 168, 6, 160, 36, 8);
    this.hudBg.setAlpha(0);

    // 倒计时
    this.timerText = this.add.text(18, 12, '⏱ 1:00', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 4,
    }).setDepth(100).setAlpha(0);

    // 金额
    this.moneyText = this.add.text(GAME.WIDTH - 18, 12, '💰 $0', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#ffd700',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(1, 0).setDepth(100).setAlpha(0);

    // 翻倍弹出数字（复用）
    this.popupText = this.add.text(0, 0, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '22px',
      color: '#ffee44',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(120).setAlpha(0);
  }

  createEscapeButton() {
    const bx = GAME.WIDTH - 80, by = GAME.HEIGHT - 60;

    this.escBtnContainer = this.add.container(bx, by).setDepth(100).setAlpha(0);

    const bg = this.add.graphics();
    bg.fillStyle(0xdd3333, 0.92);
    bg.fillRoundedRect(-56, -22, 112, 44, 12);
    bg.lineStyle(2, 0xff7777, 0.8);
    bg.strokeRoundedRect(-56, -22, 112, 44, 12);

    const txt = this.add.text(0, 0, '🚗 逃跑!', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.escBtnContainer.add([bg, txt]);
    this.escBtnContainer.setSize(112, 44);
    this.escBtnContainer.setInteractive({ useHandCursor: true });

    this.escBtnContainer.on('pointerdown', () => {
      if (!this.introPlaying && !this.gameEnded) {
        this.startEscape();
      }
    });

    // 脉冲动画（延后启动）
    this.escPulseTween = this.tweens.add({
      targets: this.escBtnContainer,
      scaleX: { from: 1, to: 1.06 },
      scaleY: { from: 1, to: 1.06 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      paused: true,
    });
  }

  createPromptText() {
    this.promptText = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2 + 60, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffdd44',
      stroke: '#000',
      strokeThickness: 4,
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setDepth(80).setAlpha(0);
  }

  // ==================================================================
  //  开场动画序列
  // ==================================================================
  playIntro() {
    const cx = GAME.WIDTH / 2;
    const timeline = this.add.timeline([
      // 0ms — 劫匪从底部走进银行
      {
        at: 0,
        run: () => {
          this.robberBobTween.resume();
          this.tweens.add({
            targets: this.robber,
            y: ROBBER.START_Y,
            duration: 1400,
            ease: 'Sine.easeOut',
            onComplete: () => this.robberBobTween.pause(),
          });
        },
      },
      // 1500ms — 掏枪、威胁
      {
        at: 1500,
        run: () => {
          // 枪口闪光
          const flash = this.add.image(cx - 10, ROBBER.START_Y - 20, 'gunFlash')
            .setDepth(11).setAlpha(0);
          this.tweens.add({
            targets: flash,
            alpha: { from: 1, to: 0 },
            scale: { from: 0.5, to: 1.5 },
            duration: 300,
            onComplete: () => flash.destroy(),
          });

          // 劫匪台词
          this.showBubble(this.robber, ROBBER_LINES.threat, 2000);

          // 屏幕微震
          this.cameras.main.shake(200, 0.005);
        },
      },
      // 2500ms — 柜员出现（惊恐举手）
      {
        at: 2500,
        run: () => {
          this.tellers.forEach((t, i) => {
            this.tweens.add({
              targets: t,
              alpha: 1,
              y: { from: 35, to: 45 },
              duration: 300,
              delay: i * 100,
              ease: 'Back.easeOut',
            });
          });
        },
      },
      // 3200ms — 劫匪再说一句
      {
        at: 3200,
        run: () => {
          this.showBubble(this.robber, ROBBER_LINES.noAlarm, 1800);
        },
      },
      // 4500ms — 钱袋从柜台散落
      {
        at: 4500,
        run: () => {
          // 屏幕震动
          this.cameras.main.shake(400, 0.008);

          this.moneyBags.forEach((bag, i) => {
            const targetX = bag.x;
            const targetY = bag.y;
            // 从柜台位置弹出
            bag.x = Phaser.Math.Between(80, GAME.WIDTH - 80);
            bag.y = BANK.COUNTER_Y + BANK.COUNTER_H;

            this.tweens.add({
              targets: bag,
              x: targetX,
              y: targetY,
              alpha: 1,
              scale: { from: 0.3, to: 1 },
              duration: 700,
              delay: i * 60,
              ease: 'Bounce.easeOut',
            });
          });
        },
      },
      // 6000ms — 开场结束，可以开始玩
      {
        at: 6200,
        run: () => {
          this.introPlaying = false;

          // 显示提示
          this.promptText.setText('👆 点击钱袋开始捡钱！');
          this.tweens.add({
            targets: this.promptText,
            alpha: { from: 0, to: 1 },
            duration: 400,
          });

          // 钱袋发光呼吸
          this.moneyBags.forEach((bag, i) => {
            this.tweens.add({
              targets: bag,
              scale: { from: 0.92, to: 1.08 },
              duration: 600 + (i % 4) * 100,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut',
            });
          });
        },
      },
    ]);

    timeline.play();
  }

  // ==================================================================
  //  玩家交互
  // ==================================================================
  onBagClicked(bag) {
    if (this.introPlaying || this.gameEnded || bag.collected) return;

    // 初始化音频（需在用户交互中）
    if (!this.audioCtx) {
      try {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { /* 静默降级 */ }
    }

    this.robberTarget = bag;
    this.isEscaping = false;

    // 开始移动
    this.robberBobTween.resume();

    // 隐藏提示
    if (this.promptText.alpha > 0) {
      this.tweens.add({ targets: this.promptText, alpha: 0, duration: 200 });
    }
  }

  startEscape() {
    if (this.gameEnded) return;

    // 初始化音频
    if (!this.audioCtx) {
      try {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { /* 静默降级 */ }
    }

    this.robberTarget = this.car;
    this.isEscaping = true;
    this.robberBobTween.resume();
  }

  // ==================================================================
  //  劫匪移动
  // ==================================================================
  updateRobberMovement(delta) {
    if (!this.robberTarget) return;

    const target = this.robberTarget;
    const dx = target.x - this.robber.x;
    const dy = target.y - this.robber.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const speed = this.isEscaping ? ROBBER.ESCAPE_SPEED : ROBBER.SPEED;
    const step = speed * delta / 1000;

    if (dist <= step + 2) {
      // 到达目标
      this.robber.x = target.x;
      this.robber.y = target.y;
      this.robberBobTween.pause();

      if (target === this.car) {
        this.onReachedCar();
      } else {
        this.onReachedBag(target);
      }
      this.robberTarget = null;
    } else {
      this.robber.x += (dx / dist) * step;
      this.robber.y += (dy / dist) * step;

      // 水平翻转朝向
      this.robber.setFlipX(dx < 0);
    }
  }

  // ==================================================================
  //  捡钱逻辑
  // ==================================================================
  onReachedBag(bag) {
    if (bag.collected) return;
    bag.collected = true;
    this.bagsCollected++;

    // 第一个钱袋 → 触发警铃
    if (this.bagsCollected === 1) {
      this.totalMoney = MONEY.INITIAL;
      this.triggerAlarm();
    } else {
      this.totalMoney *= 2;
    }

    // ── 视觉反馈 ──
    // 钱袋消失动画
    this.tweens.add({
      targets: bag,
      scale: 0,
      alpha: 0,
      y: bag.y - 20,
      duration: 250,
      ease: 'Back.easeIn',
      onComplete: () => bag.disableInteractive(),
    });

    // 弹出数字
    this.showMoneyPopup(bag.x, bag.y - 10);

    // 更新 HUD
    this.updateMoneyDisplay();

    // 金币粒子
    this.spawnGoldParticles(bag.x, bag.y);

    // 音效
    this.playCollectSound();

    // 震动
    this.vibrateDevice(30);

    // 检查是否所有钱袋都捡完了
    const remaining = this.moneyBags.filter(b => !b.collected).length;
    if (remaining === 0) {
      this.showBubble(this.partner, '钱都捡完了！快上车！', 2000);
    }
  }

  triggerAlarm() {
    // ── 警铃大作！──
    this.cameras.main.shake(500, 0.012);
    this.cameras.main.flash(300, 255, 0, 0, false, null, this);

    // 红色闪烁叠加层
    this.alarmOverlay = this.add.graphics().setDepth(85);
    this.alarmFlashTween = this.tweens.add({
      targets: { v: 0 },
      v: 1,
      duration: 500,
      yoyo: true,
      repeat: -1,
      onUpdate: (tween) => {
        this.alarmOverlay.clear();
        const a = tween.getValue() * 0.06;
        this.alarmOverlay.fillStyle(0xff0000, a);
        this.alarmOverlay.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
      },
    });

    // 猪队友尖叫
    this.showBubble(this.partner, PARTNER_LINES[0].text, PARTNER_LINES[0].ms);
    this.triggeredDialogues.add('alarm');

    // 1.5秒后劫匪说"警察还有一分钟"
    this.time.delayedCall(1800, () => {
      this.showBubble(this.robber, ROBBER_LINES.gogogo, 2500);
    });

    // 2.5秒后显示 HUD & 开始计时
    this.time.delayedCall(2800, () => {
      this.timerStarted = true;
      this.timerStartTime = this.time.now;

      // HUD 淡入
      this.tweens.add({ targets: this.hudBg, alpha: 1, duration: 300 });
      this.tweens.add({ targets: this.timerText, alpha: 1, duration: 300 });
      this.tweens.add({ targets: this.moneyText, alpha: 1, duration: 300 });

      // 逃跑按钮出现
      this.tweens.add({
        targets: this.escBtnContainer,
        alpha: 1,
        scale: { from: 0, to: 1 },
        duration: 400,
        ease: 'Back.easeOut',
      });
      this.escPulseTween.resume();
    });

    // 播放警铃音效（循环）
    this.playAlarmSound();
  }

  // ==================================================================
  //  倒计时系统
  // ==================================================================
  updateTimer(time) {
    const elapsed = (time - this.timerStartTime) / 1000;
    const displayTime = TIMER.DISPLAY_SECONDS - elapsed;

    // 格式化
    const abs = Math.abs(displayTime);
    const min = Math.floor(abs / 60);
    const sec = Math.floor(abs % 60);
    const sign = displayTime < 0 ? '-' : '';
    this.timerText.setText(`⏱ ${sign}${min}:${sec.toString().padStart(2, '0')}`);

    // 颜色 & 闪烁
    if (displayTime <= 0) {
      this.timerText.setColor('#ff2222');
      this.timerText.setAlpha(Math.floor(elapsed * 4) % 2 === 0 ? 1 : 0.35);
    } else if (displayTime <= 10) {
      this.timerText.setColor('#ff5500');
    } else if (displayTime <= 30) {
      this.timerText.setColor('#ffaa33');
    } else {
      this.timerText.setColor('#ffffff');
    }

    // 猪队友对话触发
    this.checkDialogueTrigger(displayTime);

    // 心跳音效（最后15秒）
    if (displayTime <= 15 && !this.heartbeatInterval && this.audioCtx) {
      this.startHeartbeat();
    }

    // 警察到达判定
    if (elapsed >= this.policeDelay && !this.gameEnded) {
      // 检查是否正在逃跑且足够近
      if (this.isEscaping) {
        const distToCar = Phaser.Math.Distance.Between(
          this.robber.x, this.robber.y, this.car.x, this.car.y
        );
        if (distToCar < 30) {
          this.escapeSuccess(0);
          return;
        }
      }
      this.policeCaught();
    }
  }

  checkDialogueTrigger(displayTime) {
    for (const line of PARTNER_LINES) {
      if (line.at === 'alarm') continue; // 已在 triggerAlarm 处理
      const key = `time_${line.at}`;
      if (!this.triggeredDialogues.has(key) && displayTime <= line.at) {
        this.triggeredDialogues.add(key);
        this.showBubble(this.partner, line.text, line.ms);

        // 越紧急，猪队友踱步越快
        if (line.at <= 15 && this.partnerPaceTween) {
          this.partnerPaceTween.timeScale = 2;
        }
        if (line.at <= 5 && this.partnerPaceTween) {
          this.partnerPaceTween.timeScale = 3.5;
        }
        break; // 一次只触发一条
      }
    }
  }

  // ==================================================================
  //  猪队友动画
  // ==================================================================
  updatePartnerPacing(_time) {
    // 由 tween 驱动，无需额外逻辑
  }

  // ==================================================================
  //  逃跑 & 结局
  // ==================================================================
  onReachedCar() {
    if (this.gameEnded) return;

    const elapsed = (this.time.now - this.timerStartTime) / 1000;
    const margin = this.policeDelay - elapsed; // 正数 = 还有余量
    this.escapeSuccess(margin);
  }

  escapeSuccess(margin) {
    this.gameEnded = true;
    this.cleanupSounds();
    this.robberBobTween.pause();

    // 上车动画
    this.tweens.add({
      targets: this.robber,
      x: this.car.x,
      y: this.car.y,
      scale: 0.5,
      alpha: 0.5,
      duration: 300,
      ease: 'Quad.easeIn',
    });

    // 猪队友也上车
    this.tweens.add({
      targets: this.partner,
      x: this.car.x + 10,
      y: this.car.y,
      scale: 0.5,
      alpha: 0.5,
      duration: 400,
    });

    // 车飙走
    this.time.delayedCall(500, () => {
      this.tweens.add({
        targets: this.car,
        y: GAME.HEIGHT + 100,
        duration: 600,
        ease: 'Quad.easeIn',
      });

      this.cameras.main.fadeOut(800, 0, 0, 0);

      this.time.delayedCall(900, () => {
        this.scene.start('ResultScene', {
          success: true,
          money: this.totalMoney,
          bags: this.bagsCollected,
          margin: margin,
          timeUsed: (this.time.now - this.timerStartTime) / 1000,
          policeDelay: this.policeDelay,
        });
      });
    });

    this.playSuccessSound();
    this.vibrateDevice(100);
  }

  policeCaught() {
    this.gameEnded = true;
    this.cleanupSounds();
    this.robberBobTween.pause();

    // 屏幕闪红
    this.cameras.main.flash(500, 255, 50, 50);
    this.cameras.main.shake(400, 0.02);

    // 警车出现效果 — 红蓝闪烁
    const policeFlash = this.add.graphics().setDepth(200);
    let flashCount = 0;
    const flashInterval = this.time.addEvent({
      delay: 150,
      repeat: 8,
      callback: () => {
        policeFlash.clear();
        const color = flashCount % 2 === 0 ? 0xff0000 : 0x0044ff;
        policeFlash.fillStyle(color, 0.15);
        policeFlash.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
        flashCount++;
      },
    });

    // 劫匪举手投降姿态
    this.tweens.add({
      targets: this.robber,
      scaleY: 0.8,
      duration: 500,
    });

    this.time.delayedCall(1500, () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(700, () => {
        const moneyIfOneLess = this.bagsCollected > 1
          ? this.totalMoney / 2
          : 0;
        this.scene.start('ResultScene', {
          success: false,
          money: 0,
          bags: this.bagsCollected,
          totalMoneyBeforeCaught: this.totalMoney,
          moneyIfOneLess,
          policeDelay: this.policeDelay,
        });
      });
    });

    this.playFailSound();
    this.vibrateDevice(200);
  }

  // ==================================================================
  //  UI 更新
  // ==================================================================
  updateMoneyDisplay() {
    this.moneyText.setText(`💰 $${this.totalMoney.toLocaleString()}`);

    // 弹跳动画
    this.tweens.add({
      targets: this.moneyText,
      scale: { from: 1.35, to: 1 },
      duration: 300,
      ease: 'Bounce.easeOut',
    });
  }

  showMoneyPopup(x, y) {
    const txt = this.add.text(x, y, `$${this.totalMoney.toLocaleString()}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '18px',
      color: '#ffee44',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(120);

    this.tweens.add({
      targets: txt,
      y: y - 50,
      alpha: { from: 1, to: 0 },
      scale: { from: 1.2, to: 0.6 },
      duration: 800,
      ease: 'Quad.easeOut',
      onComplete: () => txt.destroy(),
    });

    // 翻倍指示 (第2袋以后)
    if (this.bagsCollected > 1) {
      const x2 = this.add.text(x + 50, y + 5, 'x2!', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: '#ff4444',
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(120);

      this.tweens.add({
        targets: x2,
        y: y - 30,
        alpha: { from: 1, to: 0 },
        scale: { from: 1.5, to: 0.5 },
        duration: 600,
        delay: 100,
        onComplete: () => x2.destroy(),
      });
    }
  }

  // ==================================================================
  //  对话气泡
  // ==================================================================
  showBubble(target, text, duration = 2000) {
    // 清除旧气泡
    if (this.activeBubble) {
      this.activeBubble.destroy();
    }

    const bx = Phaser.Math.Clamp(target.x, 70, GAME.WIDTH - 70);
    const by = target.y - 40;

    const container = this.add.container(bx, by).setDepth(200);

    // 文字（先创建以获取尺寸）
    const txt = this.add.text(0, 0, text, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#000000',
      wordWrap: { width: 140 },
      align: 'center',
      lineSpacing: 3,
    }).setOrigin(0.5);

    const pad = 10;
    const w = txt.width + pad * 2;
    const h = txt.height + pad * 2;

    // 气泡背景
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    // 小三角
    bg.fillTriangle(-5, h / 2, 5, h / 2, 0, h / 2 + 8);

    container.add([bg, txt]);

    // 弹入动画
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    this.activeBubble = container;

    // 自动消失
    this.time.delayedCall(duration, () => {
      if (container.active) {
        this.tweens.add({
          targets: container,
          alpha: 0,
          scale: 0.5,
          duration: 200,
          onComplete: () => {
            container.destroy();
            if (this.activeBubble === container) {
              this.activeBubble = null;
            }
          },
        });
      }
    });
  }

  // ==================================================================
  //  粒子效果
  // ==================================================================
  spawnGoldParticles(x, y) {
    const particles = this.add.particles(x, y, 'goldCoin', {
      speed: { min: 40, max: 180 },
      angle: { min: 200, max: 340 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0.2 },
      lifespan: 700,
      gravityY: 250,
      quantity: 8,
      emitting: false,
    }).setDepth(50);

    particles.explode(8);
    this.time.delayedCall(1000, () => particles.destroy());
  }

  // ==================================================================
  //  音效（Web Audio 合成，无需音频文件）
  // ==================================================================
  playTone(freq, duration, type = 'square', volume = 0.15) {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) { /* 降级 */ }
  }

  playCollectSound() {
    const base = 520 + this.bagsCollected * 60;
    this.playTone(base, 0.12, 'square', 0.12);
    setTimeout(() => this.playTone(base * 1.5, 0.08, 'square', 0.08), 80);
  }

  playAlarmSound() {
    let toggle = 0;
    this.alarmSoundInterval = setInterval(() => {
      this.playTone(toggle % 2 === 0 ? 740 : 580, 0.18, 'square', 0.06);
      toggle++;
    }, 400);
  }

  startHeartbeat() {
    let fast = false;
    this.heartbeatInterval = setInterval(() => {
      this.playTone(70, 0.1, 'sine', 0.25);
      setTimeout(() => this.playTone(55, 0.08, 'sine', 0.18), 140);

      // 倒计时到0后加速
      if (!fast && this.timerStarted) {
        const elapsed = (this.time.now - this.timerStartTime) / 1000;
        if (elapsed > TIMER.DISPLAY_SECONDS) {
          fast = true;
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = setInterval(() => {
            this.playTone(80, 0.08, 'sine', 0.3);
            setTimeout(() => this.playTone(60, 0.06, 'sine', 0.22), 100);
          }, 350);
        }
      }
    }, 700);
  }

  playSuccessSound() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.2, 'square', 0.12), i * 120);
    });
  }

  playFailSound() {
    [400, 350, 300, 200].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.3, 'sawtooth', 0.1), i * 180);
    });
  }

  cleanupSounds() {
    if (this.alarmSoundInterval) {
      clearInterval(this.alarmSoundInterval);
      this.alarmSoundInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.alarmFlashTween) {
      this.alarmFlashTween.stop();
    }
    if (this.alarmOverlay) {
      this.alarmOverlay.clear();
    }
  }

  // ==================================================================
  //  震动反馈（手机端）
  // ==================================================================
  vibrateDevice(ms) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) { /* 降级 */ }
  }

  // ==================================================================
  //  场景销毁
  // ==================================================================
  shutdown() {
    this.cleanupSounds();
  }
}
