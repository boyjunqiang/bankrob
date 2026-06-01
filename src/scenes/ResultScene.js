import Phaser from 'phaser';
import { GAME, TITLES } from '../config/gameConfig.js';

// ============================================================
// ResultScene — 结算画面：翻倍动画、出钱特效、揭晓警察到达时间
// ============================================================
export default class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  init(data) {
    this.result = data;
  }

  create(data) {
    // 结算场景也铺满全屏
    if (this.scale.scaleMode !== Phaser.Scale.ENVELOP) {
      this.scale.scaleMode = Phaser.Scale.ENVELOP;
      this.scale.updateScale();
    }

    const cx = GAME.WIDTH / 2;
    this.cameras.main.setBackgroundColor('#08081a');
    this.cameras.main.fadeIn(500);

    // 初始化音频上下文
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.audioCtx = null;
    }

    if (this.result.success) {
      this.showSuccess(cx);
    } else {
      this.showFail(cx);
    }
  }

  // ==================================================================
  //  Helper: scale an image to fit a target width, keeping aspect ratio
  // ==================================================================
  fitImageToWidth(image, targetW) {
    const scale = targetW / image.width;
    image.setScale(scale);
    return scale;
  }

  // Helper: scale to fit within a bounding box, keeping aspect ratio
  fitImageToBox(image, maxW, maxH) {
    const scaleX = maxW / image.width;
    const scaleY = maxH / image.height;
    const scale = Math.min(scaleX, scaleY);
    image.setScale(scale);
    return scale;
  }

  // ── Draw a dark blue rounded card panel ──
  drawCardPanel(x, y, w, h, radius, depth) {
    const g = this.add.graphics().setDepth(depth);

    // Outer glow / border (subtle blue edge)
    g.lineStyle(2, 0x3366aa, 0.6);
    g.strokeRoundedRect(x, y, w, h, radius);

    // Fill with dark blue
    g.fillStyle(0x0c1a3a, 0.85);
    g.fillRoundedRect(x, y, w, h, radius);

    // Top highlight line
    g.lineStyle(1, 0x4488cc, 0.3);
    g.beginPath();
    g.moveTo(x + radius, y + 1);
    g.lineTo(x + w - radius, y + 1);
    g.strokePath();

    return g;
  }

  // ==================================================================
  //  成功逃脱
  // ==================================================================
  showSuccess(cx) {
    const data = this.result;
    const isHighScore = this.checkIsHighScore(data.money);

    // ── Layout constants ──
    const HEADER_BOTTOM = 220;
    const MONEY_CARD_TOP = 225;
    const MONEY_CARD_BOTTOM = 405;
    const STATS_CARD_TOP = 415;
    const STATS_CARD_BOTTOM = 600;
    const RETRY_BTN_Y = 635;
    const SHARE_BTN_Y = 695;

    const CARD_MARGIN = 25;
    const CARD_WIDTH = GAME.WIDTH - CARD_MARGIN * 2;
    const CARD_RADIUS = 16;

    // 1. Full screen background
    this.victoryBg = this.add.image(cx, GAME.HEIGHT / 2, 'victoryBg')
      .setDisplaySize(GAME.WIDTH, GAME.HEIGHT)
      .setDepth(1);

    // 2. Confetti particles
    this.add.particles(cx, 100, 'goldCoin', {
      speed: { min: 3, max: 12 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.3, end: 0 },
      lifespan: 5000,
      frequency: 400,
      quantity: 1,
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-190, -100, 380, 200),
      },
    }).setDepth(2);

    // 3. Title / Header — uniform scale to keep aspect ratio
    const headerKey = isHighScore ? 'successHighScoreHeader' : 'successHeader';
    const header = this.add.image(cx, HEADER_BOTTOM / 2, headerKey)
      .setDepth(4)
      .setScale(0);

    const headerScale = this.fitImageToBox(header, GAME.WIDTH, HEADER_BOTTOM);
    header.setScale(0); // reset for tween animation

    this.tweens.add({
      targets: header,
      scale: headerScale,
      duration: 600,
      ease: 'Back.easeOut',
    });

    this.sound.play('successSound', { volume: 0.95 });

    // 4. Draw dark blue card panels
    this.drawCardPanel(CARD_MARGIN, MONEY_CARD_TOP, CARD_WIDTH, MONEY_CARD_BOTTOM - MONEY_CARD_TOP, CARD_RADIUS, 5);
    this.drawCardPanel(CARD_MARGIN, STATS_CARD_TOP, CARD_WIDTH, STATS_CARD_BOTTOM - STATS_CARD_TOP, CARD_RADIUS, 5);

    // ── 翻倍金额动画 ──
    const moneyCenterY = (MONEY_CARD_TOP + MONEY_CARD_BOTTOM) / 2 - 10;
    const moneySubY = moneyCenterY + 45;

    this.time.delayedCall(1200, () => {
      this.animateMoneyCount(cx, data, moneyCenterY, moneySubY);
    });

    // ── 警察到达及统计揭晓 ──
    this.time.delayedCall(800, () => {
      const checkReady = () => {
        if (this._countDuration !== undefined) {
          const revealDelay = this._countDuration + 800;
          this.time.delayedCall(revealDelay, () => {
            this.revealStatsPanel(cx, data, STATS_CARD_TOP, STATS_CARD_BOTTOM);
          });
          this.time.delayedCall(revealDelay + 1800, () => {
            this.showRetryAndShareButtons(cx, RETRY_BTN_Y, SHARE_BTN_Y);
            this.updateHighScore(data.money);
            this.accumulateSavings(data.money);
            
            setTimeout(() => {
              // 排行榜已被移除
            }, 800);
          });
        } else {
          this.time.delayedCall(100, checkReady);
        }
      };
      checkReady();
    });
  }

  formatMoney(n) {
    if (typeof n !== 'bigint') {
      try { n = BigInt(Math.floor(n)); } catch (e) { n = 0n; }
    }
    if (n === 0n) return '$0';
    const sign = n < 0n ? '-' : '';
    const absN = n < 0n ? -n : n;

    const units = [
      { name: '极', val: 1000000000000000000000000000000000000000000000000n },
      { name: '载', val: 100000000000000000000000000000000000000000000n },
      { name: '正', val: 10000000000000000000000000000000000000000n },
      { name: '涧', val: 1000000000000000000000000000000000000n },
      { name: '沟', val: 100000000000000000000000000000000n },
      { name: '穰', val: 10000000000000000000000000000n },
      { name: '秭', val: 1000000000000000000000000n },
      { name: '垓', val: 100000000000000000000n },
      { name: '京', val: 10000000000000000n },
      { name: '万亿', val: 1000000000000n },
      { name: '亿', val: 100000000n },
      { name: '万', val: 10000n }
    ];

    for (const unit of units) {
      if (absN >= unit.val) {
        const whole = absN / unit.val;
        const frac = (absN / (unit.val / 10n)) % 10n;
        return `${sign}$${whole}.${frac}${unit.name}`;
      }
    }
    return `${sign}$${absN.toString()}`;
  }

  checkIsHighScore(money) {
    let prev = 0n;
    try { prev = BigInt(getStorage('heist_highscore') || '0'); } catch(e) {}
    return money > prev;
  }

  animateMoneyCount(cx, data, centerY, subY) {
    const moneyText = this.add.text(cx, centerY, '$0', {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '36px',
      color: '#ffd700',
      stroke: '#000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(10);

    const maxW = GAME.WIDTH - 150;

    // Decorations left/right
    const decorLeft = this.add.image(cx, centerY, 'popupMoney')
      .setDepth(9)
      .setDisplaySize(42, 34)
      .setScale(0);
    const decorRight = this.add.image(cx, centerY, 'popupMoney')
      .setDepth(9)
      .setDisplaySize(42, 34)
      .setScale(0)
      .setFlipX(true);

    const subText = this.add.text(cx, subY, '', {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ff6644',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    subText.setText('清点赃款中...');
    subText.setAlpha(1);

    let dummy = { val: 0 };
    const duration = data.money <= 200n ? 1000 : 2500;
    let lastPlayTime = 0;

    this.tweens.add({
      targets: dummy,
      val: 1, // 补间动画 0 到 1
      duration: duration,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        let factor = Math.floor(dummy.val * 1000000);
        let displayVal = (data.money * BigInt(factor)) / 1000000n;
        
        // 前200块按10块一档跳动，超过200后就平滑加速跳动
        if (displayVal <= 200n) {
          displayVal = (displayVal / 10n) * 10n;
          if (displayVal === 0n && data.money > 0n && dummy.val > 0) displayVal = data.money < 10n ? data.money : 10n;
        }

        moneyText.setText(this.formatMoney(displayVal));
        moneyText.setScale(1);
        const targetScale = moneyText.width > maxW ? maxW / moneyText.width : 1;
        moneyText.setScale(targetScale);

        const textWidth = moneyText.width * targetScale;
        decorLeft.x = cx - textWidth / 2 - 28;
        decorRight.x = cx + textWidth / 2 + 28;
        decorLeft.setScale(1);
        decorRight.setScale(1);

        const now = this.time.now;
        if (now - lastPlayTime > 60) {
          lastPlayTime = now;
          this.playTone(400 + Math.random() * 200, 0.05, 'square', 0.05);
        }
      },
      onComplete: () => {
        moneyText.setText(this.formatMoney(data.money));
        moneyText.setScale(1);
        const targetScale = moneyText.width > maxW ? maxW / moneyText.width : 1;
        moneyText.setScale(targetScale);

        const textWidth = moneyText.width * targetScale;
        decorLeft.x = cx - textWidth / 2 - 28;
        decorRight.x = cx + textWidth / 2 + 28;
        
        subText.setText('清点完成！');
        this.time.delayedCall(300, () => {
          this.triggerMoneyExplosion(cx, moneyText, targetScale, decorLeft, decorRight);
        });
      }
    });

    this._countDuration = duration + 300;
  }

  triggerMoneyExplosion(cx, moneyText, targetScale = 1, decorLeft, decorRight) {
    this.cameras.main.flash(300, 255, 215, 0);

    this.tweens.add({
      targets: moneyText,
      scale: { from: targetScale * 1.5, to: targetScale * 1.1 },
      duration: 500,
      ease: 'Elastic.easeOut',
    });

    if (decorLeft && decorRight) {
      this.tweens.add({
        targets: [decorLeft, decorRight],
        scaleX: { from: (42 / 162) * 1.5, to: (42 / 162) * 1.1 },
        scaleY: { from: (34 / 131) * 1.5, to: (34 / 131) * 1.1 },
        duration: 500,
        ease: 'Elastic.easeOut',
      });
    }

    this.startMoneyRain(cx);

    this.sound.play('successSound', { volume: 0.95 });
  }

  startMoneyRain(cx) {
    this.add.particles(cx, -20, 'goldCoin', {
      speed: { min: 30, max: 100 },
      angle: { min: 80, max: 100 },
      scale: { start: 1, end: 0.3 },
      alpha: { start: 0.9, end: 0.2 },
      lifespan: 3000,
      frequency: 40,
      quantity: 2,
      rotate: { min: 0, max: 360 },
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-180, 0, 360, 10),
      },
    }).setDepth(2);

    this.add.particles(cx, -20, 'fallingBill', {
      speed: { min: 25, max: 90 },
      angle: { min: 75, max: 105 },
      scale: { start: 0.38, end: 0.22 },
      alpha: { start: 0.95, end: 0.3 },
      lifespan: 4500,
      frequency: 90,
      quantity: 1,
      rotate: { min: -180, max: 180 },
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-190, 0, 380, 10),
      },
    }).setDepth(2);
  }

  revealStatsPanel(cx, data, cardTop, cardBottom) {
    const margin = data.margin;
    const marginSec = Math.max(0, Math.round(margin * 10) / 10);
    const isFast = marginSec <= 3;

    const statsContainer = this.add.container(0, 0).setDepth(15);

    // Layout within the stats card
    const cardCenterY = (cardTop + cardBottom) / 2;
    const row1Y = cardTop + 40;
    const row2Y = cardCenterY + 5;
    const row3Y = cardBottom - 30;

    // Divider line
    const dividerG = this.add.graphics().setDepth(14);
    dividerG.lineStyle(1, 0x3366aa, 0.4);
    dividerG.beginPath();
    dividerG.moveTo(45, row1Y + 30);
    dividerG.lineTo(GAME.WIDTH - 45, row1Y + 30);
    dividerG.strokePath();
    statsContainer.add(dividerG);

    // 1. Police arrival row
    const policeIcon = this.add.image(cx - 120, row1Y, 'popupPoliceCar')
      .setDisplaySize(40, 32)
      .setOrigin(0.5);

    const policeText = this.add.text(cx - 85, row1Y, `警察到达：仅剩 ${marginSec} 秒！`, {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '13px',
      color: marginSec <= 3 ? '#ff3333' : '#aaccff',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0, 0.5);

    // 2. Speed / rating row — human icon moved down 20px
    const humanIconKey = isFast ? 'popupHumanHappy' : 'popupHumanDisdain';
    const humanIcon = this.add.image(cx - 120, row2Y + 20, humanIconKey)
      .setDisplaySize(38, 40)
      .setOrigin(0.5);

    const vehicleEmoji = isFast ? '🚀' : '🐢';
    const ratingColor = isFast ? '#66ff66' : '#ffaa66';
    const ratingTextStr = isFast ? '身手敏捷：快如闪电！' : '太保守了吧…';

    // Emoji and rating text on the SAME line, emoji to the left
    const ratingText = this.add.text(cx - 55, row2Y + 20, `${vehicleEmoji} ${ratingTextStr}`, {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '13px',
      color: ratingColor,
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0, 0.5);

    // 3. Bags & Time row
    const elapsed = Math.round(data.timeUsed * 10) / 10;
    const bagsText = this.add.text(cx, row3Y, `🎒 捡了 ${data.bags} 袋  ⏱️ 用时 ${elapsed}秒`, {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    statsContainer.add([policeIcon, policeText, humanIcon, ratingText, bagsText]);

    statsContainer.setScale(0);
    this.tweens.add({
      targets: statsContainer,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    if (marginSec <= 3) {
      this.cameras.main.shake(300, 0.008);
      this.cameras.main.flash(200, 255, 100, 100, true);
      this.playTone(1200, 0.3, 'square', 0.12);
    } else {
      this.playTone(800, 0.2, 'sine', 0.1);
    }
  }

  // ==================================================================
  //  Retry Button
  // ==================================================================
  showRetryAndShareButtons(cx, rY, sY) {
    // 显示两个按钮：再来一次 和 返回主菜单
    this.showRetryButton(cx - 70, rY);
    this.showReturnButton(cx + 70, rY);
  }

  showRetryButton(x, ypos) {
    const retryScale = (200 / 300) * 0.6; // slightly smaller to fit two buttons

    const retryBtn = this.add.image(x, ypos, 'btnRetry')
      .setScale(retryScale)
      .setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(15).setAlpha(0);
    
    this.tweens.add({
      targets: retryBtn,
      alpha: 1,
      duration: 400,
    });

    this.tweens.add({
      targets: retryBtn,
      scale: { from: retryScale, to: retryScale * 1.04 },
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    retryBtn.on('pointerdown', () => {
      this.tweens.add({
        targets: retryBtn,
        scale: retryScale * 0.9,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          this.cameras.main.fadeOut(300, 0, 0, 0);
          this.time.delayedCall(350, () => {
            this.scene.start('GameScene');
          });
        },
      });
    });
  }

  showReturnButton(x, ypos) {
    const returnBtn = this.add.container(x, ypos).setDepth(15).setAlpha(0);

    const rG = this.add.graphics();
    rG.fillStyle(0x3366aa, 0.9); // 蓝色
    rG.lineStyle(2, 0xffffff, 0.6);
    rG.fillRoundedRect(-55, -20, 110, 40, 12);
    rG.strokeRoundedRect(-55, -20, 110, 40, 12);

    const rText = this.add.text(0, 0, '返回主页', {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    returnBtn.add([rG, rText]);

    const hitArea = this.add.rectangle(0, 0, 110, 40, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    returnBtn.add(hitArea);

    this.tweens.add({
      targets: returnBtn,
      alpha: 1,
      duration: 400,
    });

    hitArea.on('pointerdown', () => {
      this.tweens.add({
        targets: returnBtn,
        scale: 0.9,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          this.cameras.main.fadeOut(300, 0, 0, 0);
          this.time.delayedCall(350, () => {
            this.scene.start('MenuScene');
          });
        }
      });
    });
  }

  updateHighScore(money) {
    let prev = 0n;
    try { prev = BigInt(getStorage('heist_highscore') || '0'); } catch(e) {}
    if (money > prev) {
      setStorage('heist_highscore', money.toString());

      const cx = GAME.WIDTH / 2;
      const hs = this.add.text(cx, 260, '🏆 NEW HIGH SCORE!', {
        fontFamily: '"Zpix", "Press Start 2P", monospace',
        fontSize: '13px',
        color: '#ffee44',
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(20).setAlpha(0);

      this.tweens.add({
        targets: hs,
        alpha: { from: 0, to: 1 },
        scale: { from: 0.5, to: 1 },
        duration: 500,
        delay: 400,
        ease: 'Back.easeOut',
      });

      this.tweens.add({
        targets: hs,
        alpha: { from: 1, to: 0.5 },
        duration: 500,
        yoyo: true,
        repeat: -1,
        delay: 1000,
      });
    }
  }

  accumulateSavings(money) {
    let currentSavings = 0n;
    try { currentSavings = BigInt(getStorage('heist_savings') || '0'); } catch(e) {}

    const cx = GAME.WIDTH / 2;
    const savingsText = this.add.text(cx, 386, `💰 汇入黑市金库: +${this.formatMoney(money)} (总计: ${this.formatMoney(currentSavings)})`, {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '11px',
      color: '#00ffcc',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    this.tweens.add({
      targets: savingsText,
      alpha: { from: 0, to: 1 },
      y: { from: 396, to: 386 },
      duration: 600,
      ease: 'Back.easeOut',
      delay: 500
    });
  }

  // ==================================================================
  //  失败 — 被逮捕了
  // ==================================================================
  showFail(cx) {
    const data = this.result;

    // ── Layout constants matching reference ──
    //   Top area: 0-300  → fail header/title
    //   Info card: 310-620
    //   Retry btn: 660
    //   Share btn: 730

    const HEADER_BOTTOM = 210;
    const CARD_TOP = 225;
    const CARD_BOTTOM = 610;
    const RETRY_BTN_Y = 660;
    const SHARE_BTN_Y = 730;

    const CARD_MARGIN = 25;
    const CARD_WIDTH = GAME.WIDTH - CARD_MARGIN * 2;
    const CARD_RADIUS = 16;

    // 1. Full screen jail background
    this.add.image(cx, GAME.HEIGHT / 2, 'failBg')
      .setDisplaySize(GAME.WIDTH, GAME.HEIGHT)
      .setDepth(1);

    // 2. Red/blue police flash overlay (subtle, pulsing)
    const flashOverlay = this.add.graphics().setDepth(2);
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      onUpdate: (tween) => {
        flashOverlay.clear();
        const v = tween.getValue();
        // Alternate red and blue tint
        if (v < 0.5) {
          flashOverlay.fillStyle(0xff0000, v * 0.06);
        } else {
          flashOverlay.fillStyle(0x0044ff, (1 - v) * 0.06);
        }
        flashOverlay.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
      },
    });

    // 3. Fail header — "被逮捕了！" with uniform scale
    const header = this.add.image(cx, HEADER_BOTTOM / 2 + 10, 'failHeader')
      .setDepth(4)
      .setScale(0);

    const failHeaderScale = this.fitImageToBox(header, GAME.WIDTH - 20, HEADER_BOTTOM - 20);
    header.setScale(0);

    this.tweens.add({
      targets: header,
      scale: failHeaderScale,
      duration: 600,
      ease: 'Back.easeOut',
    });

    // Camera shake for dramatic effect
    this.cameras.main.shake(400, 0.01);

    // Play fail sound
    this.sound.play('failSound', { volume: 0.57 });

    // 4. Draw the info card panel
    this.drawCardPanel(CARD_MARGIN, CARD_TOP, CARD_WIDTH, CARD_BOTTOM - CARD_TOP, CARD_RADIUS, 5);

    // 5. Reveal fail stats after header animation
    this.time.delayedCall(1000, () => {
      this.revealFailStats(cx, data, CARD_TOP, CARD_BOTTOM);
    });

    // 6. Buttons
    this.time.delayedCall(2500, () => {
      this.showRetryAndShareButtons(cx, RETRY_BTN_Y, SHARE_BTN_Y);
    });
  }

  revealFailStats(cx, data, cardTop, cardBottom) {
    const statsContainer = this.add.container(0, 0).setDepth(15);

    // ── Layout inside the fail card ──
    const moneyY = cardTop + 75;        // ¥0 big text
    const hintY = cardTop + 160;        // "如果你少抢1袋钱..."
    const hintY2 = cardTop + 195;       // "你本可以带走"
    const couldHaveY = cardTop + 250;   // ¥512 golden text
    const summaryY = cardBottom - 45;   // "抢了X袋 · 罚没¥Y"

    // 1. ¥0 — big grey text showing zero earnings
    const zeroText = this.add.text(cx, moneyY, '$0', {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '48px',
      color: '#888899',
      stroke: '#000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(10);

    // 2. "如果你少抢1袋钱…" hint
    const moneyIfOneLess = data.moneyIfOneLess || 0;
    const hintText1 = this.add.text(cx, hintY, '如果你少抢 1 袋钱…', {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '13px',
      color: '#aaaacc',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    const hintText2 = this.add.text(cx, hintY2, '你本可以带走', {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '13px',
      color: '#aaaacc',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    // 3. Could-have money — golden big text
    const couldHaveText = this.add.text(cx, couldHaveY, this.formatMoney(moneyIfOneLess), {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '32px',
      color: '#ffd700',
      stroke: '#000',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(10);

    // Divider
    const divG = this.add.graphics().setDepth(14);
    divG.lineStyle(1, 0x445577, 0.5);
    divG.beginPath();
    divG.moveTo(45, couldHaveY + 35);
    divG.lineTo(GAME.WIDTH - 45, couldHaveY + 35);
    divG.strokePath();

    // 4. Summary row
    const totalBeforeCaught = data.totalMoneyBeforeCaught || 0;
    const summaryStr = `💰 抢了 ${data.bags} 袋 · 保留 ${this.formatMoney(totalBeforeCaught)}`;
    const summaryText = this.add.text(cx, summaryY, summaryStr, {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10);

    statsContainer.add([zeroText, hintText1, hintText2, couldHaveText, divG, summaryText]);

    // Animate in
    statsContainer.setScale(0);
    this.tweens.add({
      targets: statsContainer,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Bounce the $0 for dramatic effect
    this.tweens.add({
      targets: zeroText,
      scale: { from: 1.4, to: 1 },
      duration: 400,
      ease: 'Bounce.easeOut',
      delay: 200,
    });

    // Flash the could-have amount
    this.time.delayedCall(600, () => {
      this.tweens.add({
        targets: couldHaveText,
        scale: { from: 0.5, to: 1 },
        alpha: { from: 0, to: 1 },
        duration: 500,
        ease: 'Back.easeOut',
      });
    });

    this.playTone(200, 0.4, 'sawtooth', 0.08);
  }

  // ==================================================================
  //  效果
  // ==================================================================
  spawnCollectParticles(x, y, count = 6) {
    const p = this.add.particles(x, y, 'goldCoin', {
      speed: { min: 30, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 600,
      quantity: count,
      emitting: false,
    }).setDepth(8);
    p.explode(count);
    this.time.delayedCall(800, () => p.destroy());
  }

  // ==================================================================
  //  音效
  // ==================================================================
  playTone(freq, duration, type = 'square', volume = 0.1) {
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

  // 排行榜相关代码已移除
}
