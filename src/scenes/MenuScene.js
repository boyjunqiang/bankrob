import Phaser from 'phaser';
import { GAME } from '../config/gameConfig.js';

// ============================================================
// MenuScene — 主菜单：标题 + 开始按钮 + 最高分
// ============================================================
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2;
    this.cameras.main.setBackgroundColor('#0a0a1a');

    // ── 背景装饰粒子 ──
    this.add.particles(cx, cy, 'goldCoin', {
      speed: { min: 5, max: 20 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.4, end: 0 },
      lifespan: 4000,
      frequency: 300,
      quantity: 1,
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-180, -400, 360, 800),
      },
    });

    // ── 游戏标题 ──
    const title1 = this.add.text(cx, 200, '一分钟', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '32px',
      color: '#ffd700',
      stroke: '#000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    const title2 = this.add.text(cx, 260, '劫匪', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '48px',
      color: '#ff4444',
      stroke: '#000',
      strokeThickness: 8,
    }).setOrigin(0.5);

    // 标题动画
    this.tweens.add({
      targets: [title1, title2],
      y: '-=6',
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ── 角色预览 ──
    const robber = this.add.image(cx - 40, 380, 'robber').setScale(2.5);
    const partner = this.add.image(cx + 45, 375, 'partner').setScale(2.2);

    this.tweens.add({
      targets: robber,
      y: '-=4',
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: partner,
      y: '-=4',
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 200,
    });

    // ── 钱袋装饰 ──
    [-80, 0, 80].forEach((offset, i) => {
      const bag = this.add.image(cx + offset, 460, 'moneybag').setScale(1.5);
      this.tweens.add({
        targets: bag,
        angle: { from: -5, to: 5 },
        duration: 600 + i * 100,
        yoyo: true,
        repeat: -1,
      });
    });

    // ── 开始按钮 ──
    const btnBg = this.add.graphics();
    const btnW = 220, btnH = 56, btnX = cx - btnW / 2, btnY = 540;

    btnBg.fillStyle(0xff4444, 1);
    btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 14);
    btnBg.lineStyle(3, 0xff8888);
    btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 14);

    const btnText = this.add.text(cx, btnY + btnH / 2, '▶  开始抢劫', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // 按钮呼吸动画
    this.tweens.add({
      targets: [btnBg, btnText],
      scaleX: { from: 1, to: 1.04 },
      scaleY: { from: 1, to: 1.04 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 按钮点击区域
    const btnZone = this.add.zone(cx, btnY + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
    btnZone.on('pointerdown', () => {
      // 按下反馈
      this.tweens.add({
        targets: [btnBg, btnText],
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          this.cameras.main.fadeOut(400, 0, 0, 0);
          this.time.delayedCall(400, () => {
            this.scene.start('GameScene');
          });
        },
      });
    });

    // ── 最高分 ──
    const highScore = parseInt(localStorage.getItem('heist_highscore') || '0', 10);
    if (highScore > 0) {
      this.add.text(cx, 630, `🏆 最高记录: $${highScore.toLocaleString()}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#ffd700',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5);
    }

    // ── 玩法提示 ──
    this.add.text(cx, 700, '点击钱袋捡钱 · 翻倍到手软\n但别被警察抓住！', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#8888aa',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5);

    // ── 版本 ──
    this.add.text(cx, 810, 'v1.0', {
      fontSize: '10px',
      color: '#333',
    }).setOrigin(0.5);

    // 淡入
    this.cameras.main.fadeIn(400);
  }
}
