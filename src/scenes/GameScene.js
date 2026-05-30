import Phaser from 'phaser';
import {
  GAME, TIMER, MONEY, ROBBER, BAGS, CAR, PARTNER,
  BANK, PARTNER_LINES, ROBBER_LINES, ROBBER_QUIPS,
} from '../config/gameConfig.js';

const BAG_SCALE = 0.48;
const PARTNER_SCALE = 42 / 104;

// 主角显示尺寸
const ROBBER_DISPLAY_H = 40;  // 主角显示高度 (px)

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
    }
  }

  // ==================================================================
  //  银行场景绘制
  // ==================================================================
  drawBankInterior() {
    // 1. 游戏主画面 (底图层，深度为 1)
    this.bg = this.add.image(GAME.WIDTH / 2, GAME.HEIGHT / 2, 'gameBg')
      .setDepth(1)
      .setDisplaySize(GAME.WIDTH, GAME.HEIGHT);

    // 2. 游戏主画面2 (叠加层，深度为 2，游戏一开始覆盖在主画面上)
    this.bgOverlay = this.add.image(GAME.WIDTH / 2, GAME.HEIGHT / 2, 'gameBg2')
      .setDepth(2)
      .setDisplaySize(GAME.WIDTH, GAME.HEIGHT);
  }

  // ==================================================================
  //  游戏对象创建
  // ==================================================================
  createGetawayCar() {
    // 汽车阴影 (通过多层叠加实现边缘模糊渐变效果，渲染在 depth 4)
    this.carShadow = this.add.graphics()
      .setDepth(4);
    const shadowLayers = 6;
    for (let j = 0; j < shadowLayers; j++) {
      const w = 56 + (j * 4);
      const h = 92 + (j * 5);
      const alpha = 0.12 - (j * 0.02);
      this.carShadow.fillStyle(0x000000, alpha);
      this.carShadow.fillEllipse(0, 0, w, h);
    }
    this.carShadow.x = CAR.X + 3;
    this.carShadow.y = CAR.Y + 6;

    // 抢匪汽车替换为新图片并设置合适的缩放大小
    this.car = this.add.image(CAR.X, CAR.Y, 'car')
      .setDepth(5)
      .setDisplaySize(56, 92);

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
    // 门外的抢匪影子 (黑色的半透明椭圆，渲染在 depth 5)
    this.partnerShadow = this.add.graphics()
      .setDepth(5)
      .fillStyle(0x000000, 0.24)
      .fillEllipse(0, 0, 30, 9);
    this.partnerShadow.x = PARTNER.X;
    this.partnerShadow.y = PARTNER.Y + 20;

    // 门外的抢匪（猪队友）替换为 劫匪2.png，并设置等比缩放大小
    this.partner = this.add.image(PARTNER.X, PARTNER.Y, 'partner')
      .setDepth(6)
      .setScale(PARTNER_SCALE);

    // 猪队友及影子同步紧张踱步
    this.partnerPaceTween = this.tweens.add({
      targets: [this.partner, this.partnerShadow],
      x: { from: PARTNER.X - 12, to: PARTNER.X + 12 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  createTellers() {
    // 门内的柜员已经画在背景图上，这里不再生成多余且悬空的柜员小人
    this.tellers = [];
  }

  createMoneyBags() {
    this.moneyBags = [];
    const count = Phaser.Math.Between(BAGS.MIN_COUNT, BAGS.MAX_COUNT);
    const placed = [];
    let attempts = 0;

    while (placed.length < count && attempts < 1500) {
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
      // 钱袋影子 (黑色的半透明椭圆，大小调为 20x8 更为显眼，渲染在 depth 7)
      const shadow = this.add.graphics()
        .setDepth(7)
        .setAlpha(0);
      shadow.fillStyle(0x000000, 0.32);
      shadow.fillEllipse(0, 0, 20, 8);
      shadow.x = pos.x;
      shadow.y = pos.y + 10;

      const bag = this.add.image(pos.x, pos.y, 'moneybag')
        .setDepth(8)
        .setScale(0)        // 开始时 scale 设为 0 (配合弹出动画)
        .setAlpha(0)
        .setInteractive({ useHandCursor: true, pixelPerfect: false });

      bag.shadow = shadow; // 关联影子到钱袋对象
      bag.collected = false;
      bag.on('pointerdown', () => this.onBagClicked(bag));
      this.moneyBags.push(bag);
    });
  }

  createRobber() {
    // 主角抢匪：初始使用背面静止图（从底部走入银行）
    this.robber = this.add.sprite(ROBBER.START_X, GAME.HEIGHT + 50, 'robber_idle_back')
      .setDepth(10);
    this.applyRobberScale('robber_idle_back');

    // 主角脚下的影子
    this.robberShadow = this.add.graphics().setDepth(9);
    this.robberShadow.fillStyle(0x000000, 0.28);
    this.robberShadow.fillEllipse(0, 0, 24, 8);
    this.robberShadow.x = this.robber.x;
    this.robberShadow.y = this.robber.y + ROBBER_DISPLAY_H / 2 + 2;

    // 记录当前朝向，用于站定时选择正确的静止图
    this.robberDirection = 'up'; // 初始向上走进银行

    // 用空目标代替，因为我们现在有了真正的多方向行走动画
    this.robberBobTween = this.tweens.add({
      targets: [],
      duration: 150,
      paused: true,
    });
  }

  /**
   * 根据纹理原始高度计算 scale，保证显示高度始终为 ROBBER_DISPLAY_H。
   * 使用 setScale（而非 setDisplaySize）确保动画播放时每帧都能正确显示。
   */
  applyRobberScale(textureKey) {
    const frame = this.textures.getFrame(textureKey);
    if (frame) {
      const s = ROBBER_DISPLAY_H / frame.height;
      this.robber.setScale(s);
    }
  }

  /** 同步影子位置到主角脚下 */
  updateRobberShadow() {
    if (this.robberShadow) {
      this.robberShadow.x = this.robber.x;
      this.robberShadow.y = this.robber.y + ROBBER_DISPLAY_H / 2 + 2;
    }
  }

  createHUD() {
    // 半透明HUD背景（显示倒计时和金额）
    this.hudBg = this.add.graphics().setDepth(90);
    this.hudBg.fillStyle(0x000000, 0.5);
    this.hudBg.fillRoundedRect(GAME.WIDTH / 2 - 140, 6, 280, 36, 8);
    this.hudBg.setAlpha(0);

    // 倒计时（靠左显示）
    this.timerText = this.add.text(GAME.WIDTH / 2 - 120, 12, '⏱️ 60.0s', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#ff4444',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0, 0).setDepth(100).setAlpha(0);

    // 金额（靠右显示）
    this.moneyText = this.add.text(GAME.WIDTH / 2 + 120, 12, '💰 $0', {
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

    const escapeImg = this.add.image(0, 0, 'btnEscape')
      .setDisplaySize(96, 51);

    this.escBtnContainer.add([escapeImg]);
    this.escBtnContainer.setSize(96, 51);
    this.escBtnContainer.setInteractive({ useHandCursor: true });

    this.escBtnContainer.on('pointerdown', () => {
      if (!this.introPlaying && !this.gameEnded) {
        // 点击缩放反馈效果
        this.tweens.add({
          targets: this.escBtnContainer,
          scale: 0.9,
          duration: 80,
          yoyo: true,
          onComplete: () => {
            this.startEscape();
          }
        });
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
          this.applyRobberScale('robber_up_0'); // 行走时用行走帧尺寸
          this.robber.play('robber_walk_up'); // 走近银行（向上），播放背面行走动画
          this.tweens.add({
            targets: this.robber,
            y: ROBBER.START_Y,
            duration: 1400,
            ease: 'Sine.easeOut',
            onUpdate: () => {
              // 抢匪进入银行之后（走到门口门禁线以上时），叠加图 gameBg2 换成 gameBg3
              if (this.robber.y <= BANK.ENTRANCE_Y + 10 && this.bgOverlay && this.bgOverlay.active) {
                if (this.bgOverlay.texture.key !== 'gameBg3') {
                  this.bgOverlay.setTexture('gameBg3');
                }
              }
              // 同步影子位置
              this.updateRobberShadow();
            },
            onComplete: () => {
              this.robberBobTween.pause();
              this.robber.anims.stop();
              this.setRobberIdle('down'); // 站定朝前方，使用正面静止图
            },
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

          // 劫匪第一句台词 + 语音
          this.showBubble(this.robber, ROBBER_LINES.threat, 3000);
          const voice1 = this.sound.add('voiceLine1');
          voice1.play({ volume: 1 });

          // 等第一句语音播完后再出第二句
          voice1.once('complete', () => {
            this.showBubble(this.robber, ROBBER_LINES.noAlarm, 2500);
            this.sound.play('voiceLine2', { volume: 1 });
          });

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

            // 钱袋快速落地的动画 (加快下落速度)
            this.tweens.add({
              targets: bag,
              x: targetX,
              y: targetY,
              alpha: 1,
              scale: { from: 0.3 * BAG_SCALE, to: BAG_SCALE },
              duration: 350,
              delay: i * 7,
              ease: 'Bounce.easeOut',
              onComplete: () => {
                // 每隔 4 个钱袋落地时播放一次金币音效，并加入随机音调偏移（detune），模拟哗啦啦下落的声音
                if (i % 4 === 0) {
                  this.sound.play('collectSound', {
                    volume: 0.2,
                    detune: Phaser.Math.Between(-400, 400),
                  });
                }
              },
            });

            // 影子同步淡入和缩放动画 (Phaser 3 中 Graphics 的 scaleTween 需直接改变 scaleX 和 scaleY)
            if (bag.shadow) {
              this.tweens.add({
                targets: bag.shadow,
                alpha: { from: 0, to: 1 },
                scaleX: { from: 0.2, to: 1 },
                scaleY: { from: 0.2, to: 1 },
                duration: 350,
                delay: i * 7,
                ease: 'Bounce.easeOut',
              });
            }
          });
        },
      },
      // 6000ms — 所有钱袋掉落完成，开始可以抢劫
      {
        at: 6000,
        run: () => {
          this.introPlaying = false;

          // 切换图片为 gameBg4 并开启害怕发抖效果
          if (this.bgOverlay && this.bgOverlay.active) {
            this.bgOverlay.setTexture('gameBg4');

            // 快速左右微弱抖动，模拟人害怕颤抖的效果
            this.tweens.add({
              targets: this.bgOverlay,
              x: { from: GAME.WIDTH / 2 - 1.5, to: GAME.WIDTH / 2 + 1.5 },
              y: { from: GAME.HEIGHT / 2 - 1, to: GAME.HEIGHT / 2 + 1 },
              duration: 45,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
          }

          // 开始可以抢劫的时候播放抢劫背景音乐直到本局游戏结束，开启循环
          this.robberyMusic = this.sound.add('robberyMusic', { loop: true });
          this.robberyMusic.play();

          // 显示提示
          this.promptText.setText('👆 点击钱袋开始抢钱！');
          this.tweens.add({
            targets: this.promptText,
            alpha: { from: 0, to: 1 },
            duration: 400,
          });

          // 钱袋发光呼吸
          this.moneyBags.forEach((bag, i) => {
            this.tweens.add({
              targets: bag,
              scale: { from: 0.92 * BAG_SCALE, to: 1.08 * BAG_SCALE },
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
      this.robber.angle = 0;
      this.robberBobTween.pause();
      this.robber.anims.stop();
      this.setRobberIdle('down'); // 站定始终正面面对观众

      if (target === this.car) {
        this.onReachedCar();
      } else {
        this.onReachedBag(target);
      }
      this.robberTarget = null;
    } else {
      this.robber.x += (dx / dist) * step;
      this.robber.y += (dy / dist) * step;

      // 根据实际行走方向，动态选择向上（背面）、向下（正面）、向左/右（侧面）的行走动画
      this.setRobberWalkAnimation(dx, dy);

      // 同步影子
      this.updateRobberShadow();
    }
  }

  setRobberWalkAnimation(dx, dy) {
    const curKey = this.robber.anims.currentAnim?.key;
    const playing = this.robber.anims.isPlaying;

    if (dy < 0) {
      // 往屏幕上方走（含斜上方）→ 背面行走
      this.robberDirection = 'up';
      if (curKey !== 'robber_walk_up' || !playing) {
        this.robber.play('robber_walk_up');
        this.applyRobberScale('robber_up_0');
      }
      this.robber.setFlipX(false);
    } else {
      // 往屏幕下方 / 水平移动 → 正面行走
      this.robberDirection = 'down';
      if (curKey !== 'robber_walk_down' || !playing) {
        this.robber.play('robber_walk_down');
        this.applyRobberScale('robber_down_0');
      }
      this.robber.setFlipX(false);
    }
  }

  /**
   * 设置劫匪静止状态：停止动画，切换为对应方向的静止图，使用静止缩放
   */
  setRobberIdle(direction) {
    this.robberDirection = direction;
    this.robber.setFlipX(false);

    let textureKey;
    switch (direction) {
      case 'down':
        textureKey = 'robber_idle_front';
        break;
      case 'up':
        textureKey = 'robber_idle_back';
        break;
      case 'left':
        textureKey = 'robber_idle_left';
        break;
      case 'right':
        textureKey = 'robber_idle_left';
        this.robber.setFlipX(true);
        break;
      default:
        textureKey = 'robber_idle_front';
        break;
    }

    this.robber.setTexture(textureKey);
    this.applyRobberScale(textureKey);
    this.updateRobberShadow();
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
      this.totalMoney = Math.round(this.totalMoney * 1.5);
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

    // 影子同步消失并销毁
    if (bag.shadow) {
      this.tweens.add({
        targets: bag.shadow,
        scale: 0,
        alpha: 0,
        duration: 250,
        ease: 'Back.easeIn',
        onComplete: () => bag.shadow.destroy(),
      });
    }

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

    // 按捡袋数触发劫匪搞笑台词
    this.checkRobberQuip();

    // 检查是否所有钱袋都捡完了
    const remaining = this.moneyBags.filter(b => !b.collected).length;
    if (remaining === 0) {
      this.showBubble(this.robber, '全捡完了！！快上车！', 2000);
    }
  }

  triggerAlarm() {
    // ── 警铃大作！──
    this.cameras.main.shake(500, 0.012);

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
    this.showBubble(this.partner, PARTNER_LINES.alarm, 2500);

    // 1.5秒后劫匪说核心玩法台词（显示更长时间确保可见）
    this.time.delayedCall(1800, () => {
      this.gogogoActive = true; // 保护gogogo气泡不被后续台词覆盖
      this.showBubble(this.robber, ROBBER_LINES.gogogo, 9000);
      this.sound.play('voiceLine3', { volume: 1 });

      // gogogo显示结束后解除保护
      this.time.delayedCall(9000, () => {
        this.gogogoActive = false;
      });
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

    // 显示正计时
    this.timerText.setText(`⏱️ ${elapsed.toFixed(1)}s`);
    
    if (displayTime <= 10) {
      this.timerText.setColor('#ff0000');
    }

    // 心跳音效（最后15秒）— 给玩家隐性压力
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

  // 按捡袋数触发劫匪台词（不泄露时间）
  checkRobberQuip() {
    // gogogo台词显示期间不被后续搞笑台词覆盖
    if (this.gogogoActive) return;

    for (const quip of ROBBER_QUIPS) {
      if (this.bagsCollected === quip.bags) {
        this.showBubble(this.robber, quip.text, 2000);
        break;
      }
    }
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
 
    // 顺利离开时，将大厅覆盖大图从 gameBg4 切换为 gameBg5
    if (this.bgOverlay && this.bgOverlay.active) {
      this.bgOverlay.setTexture('gameBg5');
    }

    // 上车动画
    const currentScale = this.robber.scaleX;
    this.tweens.add({
      targets: this.robber,
      x: this.car.x,
      y: this.car.y,
      scaleX: currentScale * 0.5,
      scaleY: currentScale * 0.5,
      alpha: 0.5,
      duration: 300,
      ease: 'Quad.easeIn',
    });

    // 影子跟随并消失
    if (this.robberShadow) {
      this.tweens.add({
        targets: this.robberShadow,
        x: this.car.x,
        y: this.car.y + ROBBER_DISPLAY_H / 2 + 2,
        alpha: 0,
        duration: 300,
        ease: 'Quad.easeIn',
      });
    }

    // 猪队友切换为侧面图朝向车辆方向，然后跑上车
    if (this.partnerPaceTween) this.partnerPaceTween.stop();
    this.partner.setTexture('robber_idle_left');
    // 判断猪队友在车的哪一侧，决定是否镜像
    if (this.partner.x < this.car.x) {
      this.partner.setFlipX(true); // 在车左边，面朝右
    } else {
      this.partner.setFlipX(false); // 在车右边，面朝左
    }
    this.tweens.add({
      targets: this.partner,
      x: this.car.x + 10,
      y: this.car.y,
      scale: 0.5 * PARTNER_SCALE,
      alpha: 0.5,
      duration: 400,
    });
 
    // 猪队友影子同步移动并淡出消失
    if (this.partnerShadow) {
      this.tweens.add({
        targets: this.partnerShadow,
        x: this.car.x + 10,
        y: this.car.y + 20,
        scaleX: 0.5,
        scaleY: 0.5,
        alpha: 0,
        duration: 400,
      });
    }

    // 车飙走
    this.time.delayedCall(500, () => {
      this.tweens.add({
        targets: this.car,
        y: GAME.HEIGHT + 100,
        duration: 600,
        ease: 'Quad.easeIn',
      });
      this.tweens.add({
        targets: this.carShadow,
        y: GAME.HEIGHT + 100 + 6,
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
    this.robber.angle = 0;
 
    // 被警察抓住时，将大厅覆盖大图从 gameBg4 切换为 gameBg5
    if (this.bgOverlay && this.bgOverlay.active) {
      this.bgOverlay.setTexture('gameBg5');
    }

    // 屏幕剧烈震动
    this.cameras.main.shake(600, 0.025);

    // ── 警车从下方冲入（与劫匪车保持一致大小） ──
    const car1 = this.add.sprite(CAR.X - 150, GAME.HEIGHT + 80, 'police_car_0')
      .setDepth(50)
      .setDisplaySize(56, 92);
    car1.play('police_car_flash');

    const car1Shadow = this.add.graphics()
      .setDepth(49);
    const shadowLayers = 6;
    for (let j = 0; j < shadowLayers; j++) {
      const w = 56 + (j * 4);
      const h = 92 + (j * 5);
      const alpha = 0.12 - (j * 0.02);
      car1Shadow.fillStyle(0x000000, alpha);
      car1Shadow.fillEllipse(0, 0, w, h);
    }
    car1Shadow.x = car1.x + 3;
    car1Shadow.y = car1.y + 6;

    const car2 = this.add.sprite(CAR.X + 150, GAME.HEIGHT + 120, 'police_car_0')
      .setDepth(50)
      .setDisplaySize(56, 92);
    car2.play('police_car_flash');

    const car2Shadow = this.add.graphics()
      .setDepth(49);
    for (let j = 0; j < shadowLayers; j++) {
      const w = 56 + (j * 4);
      const h = 92 + (j * 5);
      const alpha = 0.12 - (j * 0.02);
      car2Shadow.fillStyle(0x000000, alpha);
      car2Shadow.fillEllipse(0, 0, w, h);
    }
    car2Shadow.x = car2.x + 3;
    car2Shadow.y = car2.y + 6;

    // 第一辆警车从下方冲入
    this.tweens.add({
      targets: car1,
      y: CAR.Y,
      duration: 500,
      ease: 'Quad.easeOut',
    });
    this.tweens.add({
      targets: car1Shadow,
      y: CAR.Y + 6,
      duration: 500,
      ease: 'Quad.easeOut',
    });

    // 第二辆警车从下方冲入（稍晚）
    this.tweens.add({
      targets: car2,
      y: CAR.Y,
      duration: 600,
      ease: 'Quad.easeOut',
    });
    this.tweens.add({
      targets: car2Shadow,
      y: CAR.Y + 6,
      duration: 600,
      ease: 'Quad.easeOut',
    });

    // 警车红蓝闪灯叠加层
    let flashCount = 0;
    const policeFlash = this.add.graphics().setDepth(200);
    this.time.addEvent({
      delay: 120,
      repeat: 15,
      callback: () => {
        policeFlash.clear();
        const color = flashCount % 2 === 0 ? 0xff0000 : 0x0044ff;
        policeFlash.fillStyle(color, 0.12);
        policeFlash.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
        flashCount++;
      },
    });

    // 劫匪举手投降 — 切换为正面静止图
    this.setRobberIdle('down');
    this.time.delayedCall(400, () => {
      // 手举起来的视觉：略微拉伸
      const currentScaleX = this.robber.scaleX;
      const currentScaleY = this.robber.scaleY;
      this.tweens.add({
        targets: this.robber,
        scaleX: currentScaleX * 1.4,
        scaleY: currentScaleY * 0.9,
        duration: 300,
      });
    });

    // 警笛音效
    this.playSirenSound();

    this.time.delayedCall(2000, () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(700, () => {
        const moneyIfOneLess = this.bagsCollected > 1
          ? Math.round(this.totalMoney / 1.5)
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
    this.vibrateDevice(300);
  }

  // ==================================================================
  //  UI 更新
  // ==================================================================
  updateMoneyDisplay() {
    const formatted = this.formatMoney(this.totalMoney);
    this.moneyText.setText(`💰 ${formatted}`);

    // 弹跳动画
    this.tweens.add({
      targets: this.moneyText,
      scale: { from: 1.35, to: 1 },
      duration: 300,
      ease: 'Bounce.easeOut',
    });
  }

  formatMoney(n) {
    if (n >= 1e48) return `$${(n / 1e48).toFixed(1)}极`;
    if (n >= 1e44) return `$${(n / 1e44).toFixed(1)}载`;
    if (n >= 1e40) return `$${(n / 1e40).toFixed(1)}正`;
    if (n >= 1e36) return `$${(n / 1e36).toFixed(1)}涧`;
    if (n >= 1e32) return `$${(n / 1e32).toFixed(1)}沟`;
    if (n >= 1e28) return `$${(n / 1e28).toFixed(1)}穰`;
    if (n >= 1e24) return `$${(n / 1e24).toFixed(1)}秭`;
    if (n >= 1e20) return `$${(n / 1e20).toFixed(1)}垓`;
    if (n >= 1e16) return `$${(n / 1e16).toFixed(1)}京`;
    if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}万亿`;
    if (n >= 1e8)  return `$${(n / 1e8).toFixed(1)}亿`;
    if (n >= 1e4)  return `$${(n / 1e4).toFixed(1)}万`;
    return `$${n.toLocaleString()}`;
  }

  showMoneyPopup(x, y) {
    const txt = this.add.text(x, y, this.formatMoney(this.totalMoney), {
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
      const multiplierText = this.add.text(x + 50, y + 5, 'x1.5!', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: '#ff4444',
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(120);

      this.tweens.add({
        targets: multiplierText,
        y: y - 30,
        alpha: { from: 1, to: 0 },
        scale: { from: 1.5, to: 0.5 },
        duration: 600,
        delay: 100,
        onComplete: () => multiplierText.destroy(),
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
    // 播放高品质金币拾取音效
    this.sound.play('collectSound', { volume: 0.85 });
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
    // 播放高品质逃脱成功音效
    this.sound.play('successSound', { volume: 0.95 });
  }
 
  playFailSound() {
    // 播放高品质被捕/失去金钱失败音效
    this.sound.play('failSound', { volume: 0.57 });
  }

  playSirenSound() {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
      // 上下交替的警笛音
      for (let t = 0; t < 2; t += 0.4) {
        osc.frequency.linearRampToValueAtTime(900, this.audioCtx.currentTime + t + 0.2);
        osc.frequency.linearRampToValueAtTime(600, this.audioCtx.currentTime + t + 0.4);
      }
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 2);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 2);
    } catch (e) { /* 降级 */ }
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
    if (this.robberyMusic) {
      this.robberyMusic.stop();
      this.robberyMusic = null;
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
