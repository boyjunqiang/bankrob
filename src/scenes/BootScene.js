import Phaser from 'phaser';

// ============================================================
// BootScene — 生成所有游戏纹理（无需外部图片资源）
// ============================================================
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    // 等待字体加载，然后生成纹理
    document.fonts.ready.then(() => {
      this.generateAllTextures();
      this.scene.start('MenuScene');
    });
  }

  generateAllTextures() {
    this.genRobber();
    this.genPartner();
    this.genMoneyBag();
    this.genCar();
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
