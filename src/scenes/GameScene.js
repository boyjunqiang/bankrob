import Phaser from 'phaser';
import {
  GAME, TIMER, MONEY, ROBBER, BAGS, CAR, PARTNER,
  BANK, PARTNER_LINES, ROBBER_LINES, ROBBER_QUIPS,
} from '../config/gameConfig.js';

const BAG_SCALE = 1.2;
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
    this.createSafes();
    this.createRobber();
    this.createHUD();
    this.createEscapeButton();
    this.createPromptText();

    // 自由寻路点击监听
    this.input.on('pointerdown', (pointer, currentlyOver) => {
      // 如果点击在特定对象上（有交互的元素），或者在剧情/结束/开锁中，则不处理
      if (currentlyOver.length > 0 || this.introPlaying || this.gameEnded || this.isCracking) return;
      
      this.robberTarget = { x: pointer.x, y: pointer.y, isFreeMove: true };
      this.isEscaping = false;

      // 初始化音频（需在用户交互中）
      if (!this.audioCtx) {
        try { this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
      }

      this.robberBobTween.resume();
      
      if (this.promptText.alpha > 0) {
        this.tweens.add({ targets: this.promptText, alpha: 0, duration: 200 });
      }
    });

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

    if (this.activeBubble && this.activeBubbleTarget) {
      this.activeBubble.x = Phaser.Math.Clamp(this.activeBubbleTarget.x, 70, GAME.WIDTH - 70);
      this.activeBubble.y = this.activeBubbleTarget.y - 40;
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
    const positions = [
      // 柜台附近 (x3) - 10个
      { x: 90, y: 210, multiplier: 3 },
      { x: 150, y: 210, multiplier: 3 },
      { x: 225, y: 210, multiplier: 3 },
      { x: 300, y: 210, multiplier: 3 },
      { x: 360, y: 210, multiplier: 3 },
      { x: 120, y: 240, multiplier: 3 },
      { x: 180, y: 240, multiplier: 3 },
      { x: 260, y: 240, multiplier: 3 },
      { x: 330, y: 240, multiplier: 3 },
      { x: 380, y: 240, multiplier: 3 },
      // 柜台到中央之间 (x2.5) - 10个
      { x: 100, y: 280, multiplier: 2.5 },
      { x: 160, y: 280, multiplier: 2.5 },
      { x: 225, y: 280, multiplier: 2.5 },
      { x: 290, y: 280, multiplier: 2.5 },
      { x: 350, y: 280, multiplier: 2.5 },
      { x: 130, y: 320, multiplier: 2.5 },
      { x: 190, y: 320, multiplier: 2.5 },
      { x: 260, y: 320, multiplier: 2.5 },
      { x: 320, y: 320, multiplier: 2.5 },
      { x: 370, y: 320, multiplier: 2.5 },
      // 中央保险箱周围 (x2) - 12个
      { x: 100, y: 380, multiplier: 2 },
      { x: 140, y: 380, multiplier: 2 },
      { x: 120, y: 430, multiplier: 2 },
      { x: 160, y: 430, multiplier: 2 },
      { x: 140, y: 480, multiplier: 2 },
      { x: 350, y: 380, multiplier: 2 },
      { x: 310, y: 380, multiplier: 2 },
      { x: 330, y: 430, multiplier: 2 },
      { x: 290, y: 430, multiplier: 2 },
      { x: 310, y: 480, multiplier: 2 },
      { x: 225, y: 350, multiplier: 2 },
      { x: 225, y: 480, multiplier: 2 },
      // 改为加20 - 8个
      { x: 90, y: 520, amount: 20 },
      { x: 140, y: 540, amount: 20 },
      { x: 190, y: 520, amount: 20 },
      { x: 260, y: 540, amount: 20 },
      { x: 310, y: 520, amount: 20 },
      { x: 360, y: 540, amount: 20 },
      { x: 120, y: 570, amount: 20 },
      { x: 330, y: 570, amount: 20 },
      // 靠近大门 改为加20 - 6个
      { x: 160, y: 600, amount: 20 },
      { x: 225, y: 600, amount: 20 },
      { x: 290, y: 600, amount: 20 },
      { x: 130, y: 620, amount: 20 },
      { x: 320, y: 620, amount: 20 },
      { x: 225, y: 630, amount: 20 },
    ];

    positions.forEach(pos => {
      let bagTexture = 'bag_yellow';
      if (pos.amount === 20) bagTexture = 'bag_brown';
      else if (pos.multiplier === 2) bagTexture = 'bag_dark';
      else if (pos.multiplier === 2.5) bagTexture = 'bag_green';
      else if (pos.multiplier === 3) bagTexture = 'bag_gold';

      const bag = this.add.image(pos.x, pos.y, bagTexture)
        .setDepth(8)
        .setScale(0)
        .setAlpha(0)
        .setInteractive({ useHandCursor: true, pixelPerfect: false });

      let labelText = '';
      if (pos.multiplier) {
        bag.multiplier = pos.multiplier;
        labelText = `x${pos.multiplier}`;
      } else if (pos.amount) {
        bag.amount = pos.amount;
        labelText = `+$${pos.amount}`;
      }

      // 添加印在钱袋上的文字 (小号，直接贴在袋子上)
      const label = this.add.text(pos.x, pos.y + 12, labelText, {
        fontFamily: '"Zpix", "Press Start 2P", monospace',
        fontSize: '10px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(9).setAlpha(0).setScale(0); // 初始隐藏

      bag.label = label;
      bag.collected = false;
      bag.on('pointerdown', () => this.onBagClicked(bag));
      this.moneyBags.push(bag);
    });
  }

  createSafes() {
    this.safes = [];
    const positions = [
      { x: 75, y: 190, mult: 5 },  // Top Left
      { x: 375, y: 190, mult: 15 }, // Top Right (Button safe)
      { x: 75, y: 350, mult: 35 }, // Bottom Left (Fingerprint safe)
      { x: 375, y: 350, mult: 40 }, // Bottom Right (Password 5-digits + Rotating)
      { x: GAME.WIDTH / 2, y: GAME.HEIGHT / 2 - 50, mult: 20 } // Center (Rotating)
    ];

    positions.forEach((pos) => {
      let textureKey = 'safe_bg';
      if (pos.mult === 5) textureKey = 'safe_5';
      else if (pos.mult === 35) textureKey = 'safe_35';
      else if (pos.mult === 15) textureKey = 'safe_15';
      else if (pos.mult === 20) textureKey = 'safe_diamond';
      else if (pos.mult === 40) textureKey = 'safe_bg';

      const safe = this.add.image(pos.x, pos.y, textureKey)
        .setDepth(8)
        .setInteractive({ useHandCursor: true });

      let targetW = 44;
      if (pos.mult === 20) targetW = 45;
      else if (pos.mult === 40) targetW = 53;
      else if (pos.mult === 35) targetW = 50;
      const safeScale = targetW / safe.width;
      safe.setScale(safeScale);

      const targetH = safe.height * safeScale;

      const shadow = this.add.graphics().setDepth(7);
      shadow.fillStyle(0x000000, 0.5);
      shadow.fillEllipse(0, 0, targetW * 0.8, targetW * 0.3);
      shadow.x = pos.x;
      shadow.y = pos.y + targetH * 0.4; // 往下移增加立体感

      safe.multiplier = pos.mult;
      safe.shadow = shadow;
      safe.isSafe = true;
      safe.collected = false;

      const multiplierText = `x${pos.mult}`;

      const label = this.add.text(pos.x, pos.y - targetH * 0.5 + 15, multiplierText, {
        fontFamily: '"Zpix", "Press Start 2P", monospace',
        fontSize: '20px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5).setDepth(9);

      this.tweens.add({
        targets: label,
        y: pos.y - targetH * 0.5 + 5,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      safe.label = label;
      safe.on('pointerdown', () => this.onSafeClicked(safe));
      this.safes.push(safe);
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
    this.hudBg.fillRoundedRect(GAME.WIDTH / 2 - 100, 6, 200, 64, 8);
    this.hudBg.setAlpha(0);

    // 金额（靠上居中）
    this.moneyText = this.add.text(GAME.WIDTH / 2, 14, '💰 $0', {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '16px',
      color: '#ffd700',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(100).setAlpha(0);

    // 倒计时（靠下居中）
    this.timerText = this.add.text(GAME.WIDTH / 2, 40, '⏱️ 60.0s', {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '16px',
      color: '#ff4444',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(100).setAlpha(0);

    // 翻倍弹出数字（复用）
    this.popupText = this.add.text(0, 0, '', {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
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
      fontFamily: '"Zpix", "Press Start 2P", monospace',
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

            // 贴在钱袋上的文字也同步飞出
            if (bag.label) {
              bag.label.x = bag.x;
              bag.label.y = bag.y;
              this.tweens.add({
                targets: bag.label,
                x: targetX,
                y: targetY + 12,
                alpha: 1,
                scale: 1,
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
          this.promptText.setText('👆 警察要来了，快抢！');
          this.tweens.add({
            targets: this.promptText,
            alpha: { from: 0, to: 1 },
            duration: 400,
          });

          // 自动触发警报和倒计时
          if (this.totalMoney === 0) {
            this.totalMoney = MONEY.INITIAL;
          }
          this.triggerAlarm();

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
  onSafeClicked(safe) {
    if (this.introPlaying || this.gameEnded || safe.opened || this.isCracking) return;
    
    // 初始化音频
    if (!this.audioCtx) {
      try { this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }

    this.robberTarget = safe;
    this.isEscaping = false;
    this.robberBobTween.resume();
    
    if (this.promptText.alpha > 0) {
      this.tweens.add({ targets: this.promptText, alpha: 0, duration: 200 });
    }
  }

  onBagClicked(bag) {
    if (this.introPlaying || this.gameEnded || bag.collected || this.isCracking) return;

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
    if (this.gameEnded || this.isCracking) return;

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
      } else if (target.isSafe) {
        this.onReachedSafe(target);
      } else if (target.isFreeMove) {
        // 自由移动到达目标，什么都不用做
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

    const oldMoney = this.totalMoney;

    if (bag.amount) {
      this.totalMoney += bag.amount;
    } else if (this.bagsCollected === 1 && this.totalMoney === MONEY.INITIAL) {
      // 如果还没拿过其他钱（比如解开过保险箱），那第一个袋子就保持初始金额 $1
      this.totalMoney = MONEY.INITIAL;
    } else {
      // 正常乘以专属倍数，确保至少涨1块钱
      this.totalMoney = Math.max(this.totalMoney + 1, Math.round(this.totalMoney * bag.multiplier));
    }

    const gained = this.totalMoney - oldMoney;

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

    // 印在钱袋上的文字同步消失并销毁
    if (bag.label) {
      this.tweens.add({
        targets: bag.label,
        scale: 0,
        alpha: 0,
        y: bag.label.y - 20,
        duration: 250,
        ease: 'Back.easeIn',
        onComplete: () => bag.label.destroy(),
      });
    }

    // ── 视觉反馈 ──
    this.updateMoneyDisplay();
    if (gained > 0) {
      this.showMoneyPopup(bag.x, bag.y - 20, this.formatMoney(gained).replace('$', '+$'));
    } else {
      if (bag.amount) {
        this.showMoneyPopup(bag.x, bag.y - 20, `+$${bag.amount}`);
      } else {
        this.showMoneyPopup(bag.x, bag.y - 20, `+$0`);
      }
    }

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

  onReachedSafe(safe) {
    if (safe.opened || this.isCracking) return;
    this.currentSafe = safe;
    
    if (safe.multiplier === 20) {
      this.showDiamondSafeUI(safe);
    } else if (safe.multiplier === 15) {
      this.showButtonSafeUI(safe);
    } else if (safe.multiplier === 35) {
      this.showFingerprintSafeUI(safe);
    } else {
      this.showSafeCrackingUI(safe);
    }
  }

  showSafeCrackingUI(safe) {
    this.safePassword = '';
    const maxLength = safe.multiplier === 40 ? 5 : 3;
    for (let i = 0; i < maxLength; i++) {
      this.safePassword += Phaser.Math.Between(1, 9).toString();
    }
    this.safeInput = '';

    const MORSE_CODE = {
      '1': '.----', '2': '..---', '3': '...--',
      '4': '....-', '5': '.....', '6': '-....',
      '7': '--...', '8': '---..', '9': '----.'
    };

    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2;

    this.safeUIContainer = this.add.container(0, 0).setDepth(200);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT), Phaser.Geom.Rectangle.Contains);
    this.safeUIContainer.add(overlay);

    const titleText = this.add.text(cx, 100, '🔒 破解保险箱', {
      fontFamily: '"Zpix", "Press Start 2P", monospace', fontSize: '20px', color: '#ffd700'
    }).setOrigin(0.5);
    
    let morseHintStr = '';
    for (let i = 0; i < maxLength; i++) {
      morseHintStr += MORSE_CODE[this.safePassword[i]] + '\n';
    }
    const hintY = maxLength === 5 ? 190 : 180;
    const hintText = this.add.text(cx, hintY, morseHintStr, {
      fontFamily: 'monospace', 
      fontSize: maxLength === 5 ? '16px' : '24px', 
      color: '#ffffff', align: 'center', 
      lineSpacing: maxLength === 5 ? 5 : 10
    }).setOrigin(0.5);
    
    const underscores = '_'.repeat(maxLength);
    this.safeInputDisplay = this.add.text(cx, 280, underscores, {
      fontFamily: '"Zpix", "Press Start 2P", monospace', fontSize: '28px', color: '#00ff00', letterSpacing: 10
    }).setOrigin(0.5);
    
    const delBtnX = cx + (maxLength === 5 ? 130 : 90);
    const delBtn = this.add.text(delBtnX, 280, '[删]', {
      fontFamily: '"Zpix", "Press Start 2P", monospace', fontSize: '18px', color: '#ffaaaa'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    delBtn.on('pointerdown', () => {
      if (this.safeInput.length > 0) {
        this.safeInput = this.safeInput.slice(0, -1);
        let displayStr = this.safeInput;
        while (displayStr.length < maxLength) displayStr += '_';
        this.safeInputDisplay.setText(displayStr);
      }
    });

    this.safeUIContainer.add([titleText, hintText, this.safeInputDisplay, delBtn]);

    const padStartX = cx - 70;
    const padStartY = 360;
    const padSpacing = 70;

    for (let i = 1; i <= 9; i++) {
      const row = Math.floor((i - 1) / 3);
      const col = (i - 1) % 3;
      const btnX = padStartX + col * padSpacing;
      const btnY = padStartY + row * padSpacing;

      const btnBg = this.add.graphics();
      btnBg.fillStyle(0x333333, 1);
      btnBg.lineStyle(2, 0xaaaaaa);
      btnBg.fillRoundedRect(btnX - 25, btnY - 25, 50, 50, 8);
      btnBg.strokeRoundedRect(btnX - 25, btnY - 25, 50, 50, 8);

      const btnText = this.add.text(btnX, btnY, i.toString(), {
        fontFamily: '"Zpix", "Press Start 2P", monospace', fontSize: '20px', color: '#ffffff'
      }).setOrigin(0.5);

      const hitArea = this.add.rectangle(btnX, btnY, 50, 50, 0x000000, 0).setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => this.onSafeNumpadClick(i));
      
      this.safeUIContainer.add([btnBg, btnText, hitArea]);
    }

    const dictStartX = cx - 140;
    const dictStartY = 580;
    let dictStr1 = '';
    let dictStr2 = '';
    for (let i = 1; i <= 5; i++) dictStr1 += `${i}: ${MORSE_CODE[i]}\n`;
    for (let i = 6; i <= 9; i++) dictStr2 += `${i}: ${MORSE_CODE[i]}\n`;
    
    const dictText1 = this.add.text(dictStartX, dictStartY, dictStr1, {
      fontFamily: 'monospace', fontSize: '14px', color: '#aaaaaa', lineSpacing: 5
    });
    const dictText2 = this.add.text(dictStartX + 140, dictStartY, dictStr2, {
      fontFamily: 'monospace', fontSize: '14px', color: '#aaaaaa', lineSpacing: 5
    });
    
    const closeBtn = this.add.text(cx, 720, '[ 放弃破解 ]', {
      fontFamily: '"Zpix", "Press Start 2P", monospace', fontSize: '14px', color: '#ff4444'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeSafeCrackingUI(false));
    
    this.safeUIContainer.add([dictText1, dictText2, closeBtn]);
  }

  onSafeNumpadClick(num) {
    const maxLength = this.currentSafe.multiplier === 40 ? 5 : 3;
    if (this.safeInput.length < maxLength) {
      this.safeInput += num.toString();
      let displayStr = this.safeInput;
      while (displayStr.length < maxLength) displayStr += '_';
      this.safeInputDisplay.setText(displayStr);

      if (this.safeInput.length === maxLength) {
        this.time.delayedCall(200, () => this.checkSafePassword());
      }
    }
  }

  checkSafePassword() {
    if (this.safeInput === this.safePassword) {
      if (this.currentSafe.multiplier === 40) {
        this.closeSafeCrackingUI(true, true);
        this.time.delayedCall(100, () => {
          this.showDiamondSafeUI(this.currentSafe);
        });
      } else {
        this.closeSafeCrackingUI(true);
      }
    } else {
      this.cameras.main.shake(200, 0.01);
      const maxLength = this.currentSafe.multiplier === 40 ? 5 : 3;
      this.safeInputDisplay.setText('_'.repeat(maxLength));
      this.safeInputDisplay.setColor('#ff0000');
      this.time.delayedCall(300, () => {
        this.safeInput = '';
        this.safeInputDisplay.setColor('#00ff00');
      });
    }
  }

  closeSafeCrackingUI(success, isPartial = false) {
    if (this.diamondSafeCleanup) {
      this.diamondSafeCleanup();
      this.diamondSafeCleanup = null;
    }
    
    if (this.safeUIContainer) {
      this.safeUIContainer.destroy();
      this.safeUIContainer = null;
    }
    this.isCracking = false;

    if (success && !isPartial) {
      this.openSafe(this.currentSafe);
    }
  }

  openSafe(safe) {
    safe.collected = true;
    const oldMoney = this.totalMoney;
    
    this.totalMoney *= safe.multiplier;
    
    const gained = this.totalMoney - oldMoney;
    this.showMoneyPopup(safe.x, safe.y - 20, this.formatMoney(gained).replace('$', '+$'));

    this.updateMoneyDisplay();
    this.spawnGoldParticles(safe.x, safe.y);
    this.playCollectSound();
    this.vibrateDevice(50);

    this.tweens.add({
      targets: safe, scale: 0, alpha: 0, y: safe.y - 20, duration: 250, ease: 'Back.easeIn',
      onComplete: () => safe.destroy(),
    });
    if (safe.label) {
      this.tweens.add({ targets: safe.label, scale: 0, alpha: 0, duration: 250, onComplete: () => safe.label.destroy() });
    }
    if (safe.glow) {
      this.tweens.add({ targets: safe.glow, scale: 0, alpha: 0, duration: 250, onComplete: () => safe.glow.destroy() });
    }
    if (safe.shadow) {
      this.tweens.add({ targets: safe.shadow, scale: 0, alpha: 0, duration: 250, onComplete: () => safe.shadow.destroy() });
    }
    this.currentSafe = null;
  }

  showFingerprintSafeUI(safe) {
    this.isCracking = true;
    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2;

    this.safeUIContainer = this.add.container(0, 0).setDepth(200);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT), Phaser.Geom.Rectangle.Contains);
    
    const titleText = this.add.text(cx, 160, '👆 指纹识别 (35x)', {
      fontFamily: '"Zpix", "Press Start 2P", monospace', fontSize: '18px', color: '#ffd700'
    }).setOrigin(0.5);
    
    const hintText = this.add.text(cx, 230, '长按下方指纹印\n在心里默数 3 秒\n(必须在2.8秒~3.2秒内松开)', {
      fontFamily: '"Zpix", "Press Start 2P", monospace', fontSize: '12px', color: '#aaaaaa', align: 'center', lineSpacing: 10
    }).setOrigin(0.5);

    const statusText = this.add.text(cx, cy - 80, '等待录入...', {
      fontFamily: '"Zpix", "Press Start 2P", monospace', fontSize: '16px', color: '#ffffff'
    }).setOrigin(0.5);

    const btnGraphic = this.add.graphics();
    const btnHitArea = new Phaser.Geom.Circle(cx, cy + 60, 60);
    
    const fpIcon = this.add.text(cx, cy + 60, '◎', {
      fontSize: '60px', color: '#00ff00'
    }).setOrigin(0.5);

    let pressStartTime = 0;
    let isPressing = false;
    let failTimer = null;
    
    const pulseTween = this.tweens.add({
      targets: [btnGraphic, fpIcon],
      scale: 1.15,
      alpha: 0.6,
      duration: 300,
      yoyo: true,
      repeat: -1,
      paused: true
    });

    const drawCircle = (color, alpha, thickness) => {
      btnGraphic.clear();
      btnGraphic.lineStyle(thickness, color, 1);
      btnGraphic.fillStyle(color, alpha);
      btnGraphic.fillCircle(cx, cy + 60, 60);
      btnGraphic.strokeCircle(cx, cy + 60, 60);
      fpIcon.setColor(color === 0x00ff00 ? '#00ff00' : (color === 0x00ffff ? '#00ffff' : '#ff0000'));
    };

    drawCircle(0x00ff00, 0.4, 4);
    btnGraphic.setInteractive(btnHitArea, Phaser.Geom.Circle.Contains);

    const resetUI = () => {
      isPressing = false;
      pulseTween.pause();
      btnGraphic.setScale(1);
      fpIcon.setScale(1);
      drawCircle(0x00ff00, 0.4, 4);
    };

    btnGraphic.on('pointerdown', () => {
      isPressing = true;
      pressStartTime = this.time.now;
      statusText.setText('扫描中...');
      statusText.setColor('#00ffff');
      
      drawCircle(0x00ffff, 0.5, 6);
      pulseTween.play();
      this.vibrateDevice(50);

      if (failTimer) failTimer.remove();
      failTimer = this.time.delayedCall(3201, () => {
        if (isPressing) {
          isPressing = false;
          statusText.setText('按太久了！触发警报');
          statusText.setColor('#ff0000');
          this.cameras.main.shake(300, 0.015);
          this.vibrateDevice(200);
          resetUI();
          drawCircle(0xff0000, 0.6, 6);
        }
      });
    });

    btnGraphic.on('pointerup', () => {
      if (!isPressing) return; // Already failed due to holding too long
      isPressing = false;
      if (failTimer) failTimer.remove();
      
      const holdTime = this.time.now - pressStartTime;
      
      if (holdTime >= 2800 && holdTime <= 3200) {
        statusText.setText(`成功! (${(holdTime/1000).toFixed(2)}秒)`);
        statusText.setColor('#00ff00');
        btnGraphic.disableInteractive();
        resetUI();
        this.time.delayedCall(600, () => {
          this.closeSafeCrackingUI(true);
        });
      } else if (holdTime < 2800) {
        statusText.setText(`太快了! (${(holdTime/1000).toFixed(2)}秒)`);
        statusText.setColor('#ff0000');
        this.cameras.main.shake(200, 0.01);
        this.vibrateDevice(100);
        resetUI();
        drawCircle(0xff0000, 0.5, 4);
      }
    });

    btnGraphic.on('pointerout', () => {
      if (isPressing) btnGraphic.emit('pointerup');
    });

    const closeBtn = this.add.text(cx, 720, '[ 放弃破解 ]', {
      fontFamily: '"Zpix", "Press Start 2P", monospace', fontSize: '14px', color: '#ff4444'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      if (failTimer) failTimer.remove();
      this.closeSafeCrackingUI(false);
    });

    this.safeUIContainer.add([overlay, titleText, hintText, statusText, btnGraphic, fpIcon, closeBtn]);
  }

  showButtonSafeUI(safe) {
    this.isCracking = true;
    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2;

    this.safeUIContainer = this.add.container(0, 0).setDepth(200);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT), Phaser.Geom.Rectangle.Contains);
    
    const titleText = this.add.text(cx, 200, '🖱️ 疯狂点击按钮', {
      fontFamily: '"Zpix", "Press Start 2P", monospace', fontSize: '20px', color: '#ffd700'
    }).setOrigin(0.5);
    
    let pressCount = 0;
    const requiredPresses = 20;
    
    const progressText = this.add.text(cx, cy - 100, `0 / ${requiredPresses}`, {
      fontFamily: '"Zpix", "Press Start 2P", monospace', fontSize: '24px', color: '#00ff00'
    }).setOrigin(0.5);

    const btnImg = this.add.image(cx, cy + 50, 'btn_normal').setInteractive({ useHandCursor: true });
    
    btnImg.on('pointerdown', () => {
      btnImg.setTexture('btn_pressed');
      pressCount++;
      progressText.setText(`${Math.min(pressCount, requiredPresses)} / ${requiredPresses}`);
      this.vibrateDevice(20);
      
      if (pressCount >= requiredPresses) {
        btnImg.disableInteractive();
        progressText.setText('解锁成功！');
        this.time.delayedCall(500, () => {
          this.closeSafeCrackingUI(true);
        });
      }
    });

    btnImg.on('pointerup', () => {
      btnImg.setTexture('btn_normal');
    });
    btnImg.on('pointerout', () => {
      btnImg.setTexture('btn_normal');
    });

    const closeBtn = this.add.text(cx, 720, '[ 放弃破解 ]', {
      fontFamily: '"Zpix", "Press Start 2P", monospace', fontSize: '14px', color: '#ff4444'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeSafeCrackingUI(false));

    this.safeUIContainer.add([overlay, titleText, progressText, btnImg, closeBtn]);
  }

  showDiamondSafeUI(safe) {
    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2;

    this.safeUIContainer = this.add.container(0, 0).setDepth(200);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT), Phaser.Geom.Rectangle.Contains);
    this.safeUIContainer.add(overlay);

    const titleText = this.add.text(cx, 100, '💎 暴力破解钻石保险箱', {
      fontFamily: '"Zpix", "Press Start 2P", monospace', fontSize: '18px', color: '#00ffff'
    }).setOrigin(0.5);

    const hintText = this.add.text(cx, 150, '按住轮盘旋转10圈 (3600度)！', {
      fontFamily: '"Zpix", "Press Start 2P", monospace', fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);

    const dialContainer = this.add.container(cx, cy);
    
    // 换成新的把手图片
    const handleImg = this.add.image(0, 0, 'handle');
    
    // 自动缩放把手以适应大小
    const handleTargetW = 180;
    handleImg.setScale(handleTargetW / handleImg.width);
    
    dialContainer.add(handleImg);

    const hitArea = new Phaser.Geom.Circle(0, 0, 150);
    dialContainer.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
    
    const progressText = this.add.text(cx, cy + 150, '0 / 3600°', {
      fontFamily: '"Zpix", "Press Start 2P", monospace', fontSize: '20px', color: '#00ff00'
    }).setOrigin(0.5);

    const closeBtn = this.add.text(cx, GAME.HEIGHT - 80, '[ 放弃 ]', {
      fontFamily: '"Zpix", "Press Start 2P", monospace', fontSize: '18px', color: '#ffaaaa'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeSafeCrackingUI(false));

    this.safeUIContainer.add([titleText, hintText, dialContainer, progressText, closeBtn]);

    let isDragging = false;
    let lastAngle = 0;
    let totalAngle = 0;

    dialContainer.on('pointerdown', (pointer) => {
      isDragging = true;
      lastAngle = Phaser.Math.Angle.Between(cx, cy, pointer.x, pointer.y);
    });

    const onMove = (pointer) => {
      if (!isDragging) return;
      const currentAngle = Phaser.Math.Angle.Between(cx, cy, pointer.x, pointer.y);
      let diff = currentAngle - lastAngle;
      
      if (diff > Math.PI) diff -= Math.PI * 2;
      else if (diff < -Math.PI) diff += Math.PI * 2;
      
      totalAngle += Math.abs(diff);
      lastAngle = currentAngle;

      const degrees = Math.floor(Phaser.Math.RadToDeg(totalAngle));
      dialContainer.rotation += diff;
      
      progressText.setText(`${Math.min(3600, degrees)} / 3600°`);

      // 每次转满一圈(360度)给一个轻微震动反馈
      if (degrees > 0 && degrees % 360 < Math.floor(Phaser.Math.RadToDeg(Math.abs(diff)))) {
        this.vibrateDevice(20);
      }

      if (degrees >= 3600) {
        isDragging = false;
        dialContainer.disableInteractive();
        progressText.setText('解锁成功！');
        progressText.setColor('#ffff00');
        this.time.delayedCall(400, () => this.closeSafeCrackingUI(true));
      }
    };

    const onUp = () => {
      isDragging = false;
    };

    this.input.on('pointermove', onMove);
    this.input.on('pointerup', onUp);
    
    this.diamondSafeCleanup = () => {
      this.input.off('pointermove', onMove);
      this.input.off('pointerup', onUp);
    };
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

  showMoneyPopup(x, y, customText) {
    if (!customText) return;

    const txt = this.add.text(x, y, customText, {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '24px',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(150);

    this.tweens.add({
      targets: txt,
      y: y - 80,
      alpha: { from: 1, to: 0 },
      scale: { from: 0.5, to: 1.2 },
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    });
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
    this.activeBubbleTarget = target;

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
              this.activeBubbleTarget = null;
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
