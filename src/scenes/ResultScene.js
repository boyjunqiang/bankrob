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

  create() {
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
            
            setTimeout(() => {
              if (data.money > 0) {
                let oldName = localStorage.getItem('bankrob_player_name') || '';
                let playerName = prompt('🎉 抢劫成功！\n请输入你的大名以上传全球排行榜：', oldName);
                
                if (playerName) {
                  localStorage.setItem('bankrob_player_name', playerName);
                  this.submitScoreAndShowRank(playerName, data.money, cx);
                } else if (oldName) {
                  // 如果取消了，但之前有名字，依然自动提交
                  this.submitScoreAndShowRank(oldName, data.money, cx);
                }
              }
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

  checkIsHighScore(money) {
    const prev = parseInt(localStorage.getItem('heist_highscore') || '0', 10);
    return money > prev;
  }

  animateMoneyCount(cx, data, centerY, subY) {
    const moneyText = this.add.text(cx, centerY, '$0', {
      fontFamily: '"Press Start 2P", monospace',
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
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ff6644',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    subText.setText('清点赃款中...');
    subText.setAlpha(1);

    let dummy = { val: 0 };
    const duration = data.money <= 200 ? 1000 : 2500;
    let lastPlayTime = 0;

    this.tweens.add({
      targets: dummy,
      val: data.money,
      duration: duration,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        let displayVal = dummy.val;
        
        // 前200块按10块一档跳动，超过200后就平滑加速跳动
        if (displayVal <= 200) {
          displayVal = Math.floor(displayVal / 10) * 10;
          if (displayVal === 0 && dummy.val > 0) displayVal = Math.floor(dummy.val);
        } else {
          displayVal = Math.floor(displayVal);
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
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
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
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: ratingColor,
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0, 0.5);

    // 3. Bags & Time row
    const elapsed = Math.round(data.timeUsed * 10) / 10;
    const bagsText = this.add.text(cx, row3Y, `🎒 捡了 ${data.bags} 袋  ⏱️ 用时 ${elapsed}秒`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
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
  //  Retry & Share Buttons (shared by success & fail)
  // ==================================================================
  showRetryAndShareButtons(cx, rY, sY) {
    const retryScale = (220 / 300) * 0.7;
    const shareScale = 160 / 238;

    const retryBtn = this.add.image(cx, rY, 'btnRetry')
      .setScale(retryScale)
      .setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(15).setAlpha(0);

    const shareBtn = this.add.image(cx, sY, 'btnShare')
      .setScale(shareScale)
      .setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(15).setAlpha(0);

    const boardBtn = this.add.text(cx, sY + 60, '🏆 查看全球排行榜', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ffd700',
      backgroundColor: '#333333',
      padding: { x: 10, y: 10 }
    }).setOrigin(0.5).setDepth(15).setAlpha(0);
    
    boardBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, boardBtn.width, boardBtn.height), Phaser.Geom.Rectangle.Contains);
    boardBtn.on('pointerdown', () => this.showLeaderboard(cx));

    this.tweens.add({
      targets: [retryBtn, shareBtn, boardBtn],
      alpha: 1,
      duration: 400,
    });

    // Breathing pulse — uniform scale
    this.tweens.add({
      targets: retryBtn,
      scale: { from: retryScale, to: retryScale * 1.04 },
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.tweens.add({
      targets: shareBtn,
      scale: { from: shareScale, to: shareScale * 1.04 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      delay: 150,
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

    shareBtn.on('pointerdown', () => {
      this.tweens.add({
        targets: shareBtn,
        scale: shareScale * 0.9,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          const margin = Math.round(this.result.margin * 10) / 10;
          const shareText = `🏦 一分钟劫匪 🏦\n💰 抢到 ${this.formatMoney(this.result.money)}\n🎒 捡了 ${this.result.bags} 袋\n🚔 警察差 ${margin}秒 才到\n你能比我多抢吗？`;
          navigator.clipboard?.writeText(shareText).then(() => {
            const copiedText = this.add.text(cx, sY + 40, '✅ 战绩已复制到剪贴板！', {
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '9px',
              color: '#66ff66',
              stroke: '#000',
              strokeThickness: 3,
            }).setOrigin(0.5).setDepth(20);
            this.time.delayedCall(1500, () => copiedText.destroy());
          }).catch(() => {
            const copiedText = this.add.text(cx, sY + 40, '❌ 复制失败，请重试', {
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '9px',
              color: '#ff4444',
              stroke: '#000',
              strokeThickness: 3,
            }).setOrigin(0.5).setDepth(20);
            this.time.delayedCall(1500, () => copiedText.destroy());
          });
        },
      });
    });
  }

  showRetryButton(cx, ypos) {
    const retryScale = (200 / 300) * 0.7;

    const retryBtn = this.add.image(cx, ypos, 'btnRetry')
      .setScale(retryScale)
      .setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(15).setAlpha(0);
    
    const boardBtn = this.add.text(cx, ypos + 70, '🏆 查看全球排行榜', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ffd700',
      backgroundColor: '#333333',
      padding: { x: 10, y: 10 }
    }).setOrigin(0.5).setDepth(15).setAlpha(0);
    
    boardBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, boardBtn.width, boardBtn.height), Phaser.Geom.Rectangle.Contains);
    boardBtn.on('pointerdown', () => this.showLeaderboard(cx));

    this.tweens.add({
      targets: [retryBtn, boardBtn],
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

  updateHighScore(money) {
    const prev = parseInt(localStorage.getItem('heist_highscore') || '0', 10);
    if (money > prev) {
      localStorage.setItem('heist_highscore', money.toString());

      const cx = GAME.WIDTH / 2;
      const hs = this.add.text(cx, 260, '🏆 NEW HIGH SCORE!', {
        fontFamily: '"Press Start 2P", monospace',
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
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '48px',
      color: '#888899',
      stroke: '#000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(10);

    // 2. "如果你少抢1袋钱…" hint
    const moneyIfOneLess = data.moneyIfOneLess || 0;
    const hintText1 = this.add.text(cx, hintY, '如果你少抢 1 袋钱…', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: '#aaaacc',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    const hintText2 = this.add.text(cx, hintY2, '你本可以带走', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: '#aaaacc',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    // 3. Could-have money — golden big text
    const couldHaveText = this.add.text(cx, couldHaveY, this.formatMoney(moneyIfOneLess), {
      fontFamily: '"Press Start 2P", monospace',
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
    const summaryStr = `💰 抢了 ${data.bags} 袋 · 罚没 ${this.formatMoney(totalBeforeCaught)}`;
    const summaryText = this.add.text(cx, summaryY, summaryStr, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
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

  // ==================================================================
  //  全球排行榜
  // ==================================================================
  submitScoreAndShowRank(name, money, cx) {
    if (!name || money <= 0) return;
    fetch('http://k165.com:9801/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score: money })
    })
    .then(r => r.json())
    .then(data => {
      if (data.success && data.rank) {
        const rankTxt = this.add.text(cx, 160, `👑 全球排名: 第 ${data.rank} 名 👑`, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '16px',
          color: '#00ff00',
          stroke: '#000',
          strokeThickness: 5,
        }).setOrigin(0.5).setDepth(20).setAlpha(0).setScale(0.5);

        this.tweens.add({
          targets: rankTxt,
          alpha: 1,
          scale: 1,
          duration: 600,
          ease: 'Back.easeOut'
        });
        
        // 自动展开排行榜面板
        this.time.delayedCall(1500, () => this.showLeaderboard(cx));
      }
    })
    .catch(e => console.log('排行榜提交失败', e));
  }

  showLeaderboard(cx) {
    const bg = this.add.graphics().setDepth(100);
    bg.fillStyle(0x000000, 0.9);
    bg.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
    bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT), Phaser.Geom.Rectangle.Contains);

    const title = this.add.text(cx, 100, '🏆 全球悍匪排行榜 🏆', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '20px', color: '#ffd700'
    }).setOrigin(0.5).setDepth(101);

    const closeBtn = this.add.text(cx, GAME.HEIGHT - 80, '[ 关闭面板 ]', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '18px', color: '#ff4444'
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

    const loadingText = this.add.text(cx, 200, '正在潜入数据库...', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '14px', color: '#aaaaaa'
    }).setOrigin(0.5).setDepth(101);

    const container = this.add.container(0, 0, [bg, title, closeBtn, loadingText]);
    closeBtn.on('pointerdown', () => container.destroy());

    fetch('http://k165.com:9801/leaderboard')
      .then(r => r.json())
      .then(data => {
        loadingText.destroy();
        let y = 160;
        data.slice(0, 10).forEach((item, index) => {
          const rankText = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          const color = index === 0 ? '#ffd700' : index === 1 ? '#cccccc' : index === 2 ? '#cd7f32' : '#ffffff';
          
          const nameTxt = this.add.text(40, y, `${rankText} ${item.name}`, {
            fontFamily: 'monospace', fontSize: '16px', color: color, stroke: '#000', strokeThickness: 2
          }).setOrigin(0, 0.5).setDepth(101);
          
          const moneyTxt = this.add.text(GAME.WIDTH - 40, y, `${this.formatMoney(item.score)}`, {
            fontFamily: 'monospace', fontSize: '16px', color: '#00ff00', stroke: '#000', strokeThickness: 2
          }).setOrigin(1, 0.5).setDepth(101);
          
          container.add([nameTxt, moneyTxt]);
          y += 45;
        });
      })
      .catch(e => {
        loadingText.setText('网络波动，获取排行榜失败...');
      });
  }
}
