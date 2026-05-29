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
  //  成功逃脱
  // ==================================================================
  showSuccess(cx) {
    const data = this.result;

    // ── 背景星星粒子 ──
    this.add.particles(cx, 400, 'goldCoin', {
      speed: { min: 3, max: 12 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.3, end: 0 },
      lifespan: 5000,
      frequency: 400,
      quantity: 1,
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-190, -400, 380, 800),
      },
    });

    // ── 标题 ──
    this.time.delayedCall(300, () => {
      const title = this.add.text(cx, 120, '🎉 成功逃脱！', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '22px',
        color: '#ffd700',
        stroke: '#000',
        strokeThickness: 6,
      }).setOrigin(0.5).setScale(0).setDepth(10);

      this.tweens.add({
        targets: title,
        scale: 1,
        duration: 500,
        ease: 'Back.easeOut',
      });

      this.playTone(880, 0.15, 'square', 0.1);
    });

    // ── 翻倍金额动画 ──
    this.time.delayedCall(1200, () => {
      this.animateMoneyCount(cx, data);
    });

    // ── 警察到达揭晓 ──
    const revealDelay = 1200 + data.bags * 350 + 800;
    this.time.delayedCall(revealDelay, () => {
      this.revealPoliceMargin(cx, data);
    });

    // ── 统计 & 按钮 ──
    const btnDelay = revealDelay + 1800;
    this.time.delayedCall(btnDelay, () => {
      this.showStats(cx, data);
      this.showRetryButton(cx, 720);
      this.updateHighScore(data.money);
    });
  }

  animateMoneyCount(cx, data) {
    const moneyText = this.add.text(cx, 300, '$0', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '36px',
      color: '#ffd700',
      stroke: '#000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(10);

    // 副标题
    const subText = this.add.text(cx, 350, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: '#ff6644',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    let amount = 0;
    for (let i = 0; i < data.bags; i++) {
      amount = i === 0 ? 100 : amount * 2;
      const displayAmount = amount;
      const isLast = i === data.bags - 1;

      this.time.delayedCall(i * 350, () => {
        moneyText.setText(`$${displayAmount.toLocaleString()}`);

        if (i > 0) {
          subText.setText(`第${i + 1}袋 · x2 翻倍！`);
          subText.setAlpha(1);
          this.tweens.add({
            targets: subText,
            alpha: { from: 1, to: 0.5 },
            duration: 300,
          });
        } else {
          subText.setText('第1袋');
        }

        // 弹跳放大效果
        this.tweens.add({
          targets: moneyText,
          scale: { from: 1.4, to: 1 },
          duration: 250,
          ease: 'Bounce.easeOut',
        });

        // 金币粒子
        this.spawnCollectParticles(cx, 300, isLast ? 20 : 6);

        // 升调音效
        const freq = 400 + i * 80;
        this.playTone(freq, 0.15, 'square', 0.1);
        setTimeout(() => this.playTone(freq * 1.25, 0.1, 'square', 0.08), 80);

        // 最终金额定格 → 大爆炸
        if (isLast) {
          this.time.delayedCall(400, () => {
            this.triggerMoneyExplosion(cx, moneyText);
          });
        }
      });
    }
  }

  triggerMoneyExplosion(cx, moneyText) {
    // 屏幕闪金
    this.cameras.main.flash(300, 255, 215, 0);

    // 最终金额放大稳定
    this.tweens.add({
      targets: moneyText,
      scale: { from: 1.6, to: 1.1 },
      duration: 500,
      ease: 'Elastic.easeOut',
    });

    // 全屏撒钱雨！
    this.startMoneyRain(cx);

    // 胜利音效
    [523, 659, 784, 1047, 1318].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.25, 'square', 0.1), i * 100);
    });
  }

  startMoneyRain(cx) {
    // 金币雨
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
    }).setDepth(5);

    // 钞票雨
    this.add.particles(cx, -20, 'dollarBill', {
      speed: { min: 20, max: 80 },
      angle: { min: 75, max: 105 },
      scale: { start: 1.5, end: 0.5 },
      alpha: { start: 0.8, end: 0.1 },
      lifespan: 4000,
      frequency: 80,
      quantity: 1,
      rotate: { min: -180, max: 180 },
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-190, 0, 380, 10),
      },
    }).setDepth(4);
  }

  revealPoliceMargin(cx, data) {
    const margin = data.margin;
    const marginSec = Math.max(0, Math.round(margin * 10) / 10);

    // 分隔线
    const line = this.add.graphics().setDepth(10);
    line.lineStyle(1, 0x555577, 0.6);
    line.lineBetween(60, 460, GAME.WIDTH - 60, 460);

    // 文字
    const revealText = this.add.text(cx, 490,
      margin > 0
        ? `🚔 警察在你逃跑后\n${marginSec} 秒到达！`
        : `🚔 警察在你上车的\n同时到达！`,
      {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#aaccff',
        stroke: '#000',
        strokeThickness: 4,
        align: 'center',
        lineSpacing: 8,
      }
    ).setOrigin(0.5).setDepth(10).setScale(0);

    this.tweens.add({
      targets: revealText,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });

    // 称号
    this.time.delayedCall(600, () => {
      const title = this.getTitle(marginSec);
      const titleText = this.add.text(cx, 545, title.text, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '16px',
        color: title.color,
        stroke: '#000',
        strokeThickness: 5,
      }).setOrigin(0.5).setDepth(10).setScale(0);

      this.tweens.add({
        targets: titleText,
        scale: 1,
        duration: 400,
        ease: 'Back.easeOut',
      });

      // 千钧一发特效
      if (marginSec <= 3) {
        this.cameras.main.shake(300, 0.008);
        this.cameras.main.flash(200, 255, 100, 100, true);
        this.playTone(1200, 0.3, 'square', 0.12);
      }
    });
  }

  getTitle(marginSec) {
    for (const t of TITLES) {
      if (marginSec <= t.maxMargin) return t;
    }
    return TITLES[TITLES.length - 1];
  }

  // ==================================================================
  //  失败画面
  // ==================================================================
  showFail(cx) {
    const data = this.result;

    // 红色暗色调背景
    const overlay = this.add.graphics().setDepth(1);
    overlay.fillStyle(0x330000, 0.4);
    overlay.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);

    // 红蓝闪烁
    let flashCount = 0;
    this.time.addEvent({
      delay: 300,
      repeat: 5,
      callback: () => {
        const color = flashCount % 2 === 0 ? 0xff0000 : 0x0044ff;
        this.cameras.main.flash(150, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff, true);
        flashCount++;
      },
    });

    // 标题
    this.time.delayedCall(800, () => {
      const title = this.add.text(cx, 150, '🚔 被逮捕了！', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '22px',
        color: '#ff4444',
        stroke: '#000',
        strokeThickness: 6,
      }).setOrigin(0.5).setScale(0).setDepth(10);

      this.tweens.add({
        targets: title,
        scale: 1,
        duration: 500,
        ease: 'Back.easeOut',
      });

      // 失败音效
      [400, 350, 300, 200].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.4, 'sawtooth', 0.08), i * 200);
      });
    });

    // $0 显示
    this.time.delayedCall(1800, () => {
      this.add.text(cx, 300, '$0', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '48px',
        color: '#555555',
        stroke: '#000',
        strokeThickness: 8,
      }).setOrigin(0.5).setDepth(10);
    });

    // 后悔提示 — 核心驱动力
    this.time.delayedCall(3000, () => {
      if (data.moneyIfOneLess > 0) {
        const regretText = this.add.text(cx, 400,
          `如果你少捡 1 袋钱…\n你本可以带走`, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '11px',
            color: '#aaaaaa',
            stroke: '#000',
            strokeThickness: 3,
            align: 'center',
            lineSpacing: 8,
          }
        ).setOrigin(0.5).setDepth(10).setAlpha(0);

        this.tweens.add({
          targets: regretText,
          alpha: 1,
          duration: 500,
        });

        this.time.delayedCall(800, () => {
          const amountText = this.add.text(cx, 470,
            `$${data.moneyIfOneLess.toLocaleString()}`, {
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '28px',
              color: '#ffd700',
              stroke: '#000',
              strokeThickness: 6,
            }
          ).setOrigin(0.5).setDepth(10).setScale(0);

          this.tweens.add({
            targets: amountText,
            scale: 1,
            duration: 400,
            ease: 'Back.easeOut',
          });

          // 扎心音效
          this.playTone(600, 0.2, 'triangle', 0.1);
          setTimeout(() => this.playTone(800, 0.15, 'triangle', 0.08), 150);
        });
      }

      // 显示统计信息
      this.time.delayedCall(1500, () => {
        const statsY = data.moneyIfOneLess > 0 ? 540 : 450;

        this.add.text(cx, statsY,
          `捡了 ${data.bags} 袋 · 累积 $${(data.totalMoneyBeforeCaught || 0).toLocaleString()}`, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '9px',
            color: '#777777',
            stroke: '#000',
            strokeThickness: 2,
          }
        ).setOrigin(0.5).setDepth(10);

        this.showRetryButton(cx, 680);
      });
    });
  }

  // ==================================================================
  //  通用 UI
  // ==================================================================
  showStats(cx, data) {
    const elapsed = Math.round(data.timeUsed * 10) / 10;
    this.add.text(cx, 610,
      `捡了 ${data.bags} 袋 · 用时 ${elapsed}秒`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: '#8888aa',
        stroke: '#000',
        strokeThickness: 2,
      }
    ).setOrigin(0.5).setDepth(10);
  }

  showRetryButton(cx, y) {
    // 按钮背景
    const btnW = 220, btnH = 52;
    const bg = this.add.graphics().setDepth(10);
    bg.fillStyle(0x4488ff, 1);
    bg.fillRoundedRect(cx - btnW / 2, y, btnW, btnH, 12);
    bg.lineStyle(2, 0x88bbff);
    bg.strokeRoundedRect(cx - btnW / 2, y, btnW, btnH, 12);

    const btnText = this.add.text(cx, y + btnH / 2, '🔄 再来一次！', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(11);

    // 入场动画
    bg.setAlpha(0);
    btnText.setAlpha(0);
    this.tweens.add({
      targets: [bg, btnText],
      alpha: 1,
      duration: 400,
    });

    // 呼吸
    this.tweens.add({
      targets: [bg, btnText],
      scaleX: { from: 1, to: 1.03 },
      scaleY: { from: 1, to: 1.03 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      delay: 500,
    });

    // 点击
    const zone = this.add.zone(cx, y + btnH / 2, btnW, btnH)
      .setInteractive({ useHandCursor: true })
      .setDepth(12);

    zone.on('pointerdown', () => {
      this.tweens.add({
        targets: [bg, btnText],
        scale: 0.93,
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

    // ── 分享按钮（仅成功时） ──
    if (this.result.success) {
      const shareY = y + 70;
      const shareTxt = this.add.text(cx, shareY, '📤 复制战绩', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#aaaacc',
      }).setOrigin(0.5).setDepth(11).setInteractive({ useHandCursor: true });

      shareTxt.on('pointerdown', () => {
        const margin = Math.round(this.result.margin * 10) / 10;
        const shareText = `🏦 一分钟劫匪 🏦\n💰 抢到 $${this.result.money.toLocaleString()}\n🎒 捡了 ${this.result.bags} 袋\n🚔 警察差 ${margin}秒 才到\n你能比我多抢吗？`;
        navigator.clipboard?.writeText(shareText).then(() => {
          shareTxt.setText('✅ 已复制！');
          this.time.delayedCall(1500, () => shareTxt.setText('📤 复制战绩'));
        }).catch(() => {
          shareTxt.setText('❌ 复制失败');
          this.time.delayedCall(1500, () => shareTxt.setText('📤 复制战绩'));
        });
      });
    }
  }

  updateHighScore(money) {
    const prev = parseInt(localStorage.getItem('heist_highscore') || '0', 10);
    if (money > prev) {
      localStorage.setItem('heist_highscore', money.toString());

      // NEW HIGH SCORE 提示
      const cx = GAME.WIDTH / 2;
      const hs = this.add.text(cx, 170, '🏆 NEW HIGH SCORE!', {
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

      // 闪烁
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
}
