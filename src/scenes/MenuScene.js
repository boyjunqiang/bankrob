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
    // 首页保持 FIT 模式（等比完整显示，不裁切，可能有黑边）
    if (this.scale.scaleMode !== Phaser.Scale.FIT) {
      this.scale.scaleMode = Phaser.Scale.FIT;
      this.scale.updateScale();
    }

    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2;

    // ── 背景视频 ──
    const video = this.add.video(cx, cy, 'homeVideo');
    
    // 防止手机浏览器（特别是 iOS）双击屏幕时把视频弹出到原生全屏播放器
    if (video.video) {
      video.video.setAttribute('playsinline', 'true');
      video.video.setAttribute('webkit-playsinline', 'true');
      video.video.disablePictureInPicture = true;
      video.video.style.pointerEvents = 'none';
    }

    video.setMute(true); // 先静音，确保自动播放不被浏览器阻止
    video.play(true); // loop

    // 视频缩放：cover 模式铺满整个屏幕，且绝对保持原视频比例，防止变形
    const fitVideo = () => {
      const htmlVid = video.video;
      // 优先从底层 HTML5 视频元素或 Phaser 视频属性获取真实的视频原始分辨率
      const vw = video.videoWidth || (htmlVid ? htmlVid.videoWidth : 0) || video.width;
      const vh = video.videoHeight || (htmlVid ? htmlVid.videoHeight : 0) || video.height;

      if (vw > 0 && vh > 0) {
        const scale = Math.max(GAME.WIDTH / vw, GAME.HEIGHT / vh);
        const targetW = vw * scale;
        const targetH = vh * scale;
        
        // 使用 setDisplaySize 强行锁定实际渲染大小，彻底解决 Phaser 内部尺寸初始化导致的缩水问题
        if (video.displayWidth !== targetW || video.displayHeight !== targetH) {
          video.setDisplaySize(targetW, targetH);
        }
      }
    };

    // 绑定多个时机进行适配
    video.on('play', fitVideo);
    
    // 在场景的 update 事件中持续检测（带防抖，仅在比例不同时更新），确保最终完美无失真适配
    this.events.on('update', fitVideo);

    // 备用：延迟检测
    this.time.delayedCall(100, fitVideo);
    this.time.delayedCall(500, fitVideo);

    // ── 背景音频 ──
    this.homeAudio = this.sound.add('homeAudio', { loop: true });
    this.menuSiren = this.sound.add('menuSiren', { loop: true, volume: 0.6 });
    
    // 现代浏览器禁止自动播放声音，需等待用户第一次点击
    // 点击后同时播放背景音乐 + 取消视频静音，让两者一起播放
    this.input.once('pointerdown', () => {
      // 播放背景音乐
      if (!this.homeAudio.isPlaying) {
        this.homeAudio.play();
      }
      if (!this.menuSiren.isPlaying) {
        this.menuSiren.play();
      }
      // 同时取消视频静音，让视频声音也播出来
      video.setMute(false);
      if (video.video) {
        video.video.muted = false;
        video.video.volume = 1;
      }
    });

    // ── 游戏标题 (带阴影) ──
    // 阴影层
    const titleShadow = this.add.image(cx + 3, 223, 'homeTitle');
    titleShadow.setScale(0.6);
    titleShadow.setTint(0x000000);
    titleShadow.setAlpha(0.5);

    // 标题层
    const title = this.add.image(cx, 220, 'homeTitle');
    title.setScale(0.6);

    // 标题动画（阴影跟随）
    this.tweens.add({
      targets: [title, titleShadow],
      y: '-=6',
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ── 开始按钮 (带虚化阴影) ──
    // 用 Canvas 生成虚化阴影纹理
    const btnTex = this.textures.get('homeBtn').getSourceImage();
    const btnW = btnTex.width * 0.6;
    const btnH = btnTex.height * 0.6;
    const blur = 20;
    const pad = blur * 2;
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = btnW + pad * 2;
    shadowCanvas.height = btnH + pad * 2;
    const sctx = shadowCanvas.getContext('2d');
    
    // 只投射阴影：将本体画在屏幕外，通过巨大的 offsetX 把阴影投射到画布内
    sctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    sctx.shadowBlur = blur;
    sctx.shadowOffsetX = 1000;
    sctx.shadowOffsetY = 12; // 向下的立体偏移

    // 绘制圆角矩形（在画布外 -1000 的位置）
    const sr = 20; // 圆角半径
    const bx = pad - 1000;
    const by = pad;

    sctx.beginPath();
    sctx.moveTo(bx + sr, by);
    sctx.lineTo(bx + btnW - sr, by);
    sctx.quadraticCurveTo(bx + btnW, by, bx + btnW, by + sr);
    sctx.lineTo(bx + btnW, by + btnH - sr);
    sctx.quadraticCurveTo(bx + btnW, by + btnH, bx + btnW - sr, by + btnH);
    sctx.lineTo(bx + sr, by + btnH);
    sctx.quadraticCurveTo(bx, by + btnH, bx, by + btnH - sr);
    sctx.lineTo(bx, by + sr);
    sctx.quadraticCurveTo(bx, by, bx + sr, by);
    sctx.closePath();
    sctx.fillStyle = 'black'; // 本体颜色随意
    sctx.fill();

    // 注册为 Phaser 纹理
    if (this.textures.exists('btnShadowTex')) {
      this.textures.remove('btnShadowTex');
    }
    this.textures.addCanvas('btnShadowTex', shadowCanvas);

    // 添加虚化阴影
    const btnShadow = this.add.image(cx, 565, 'btnShadowTex');
    btnShadow.setAlpha(0.85);

    // 按钮层
    const btn = this.add.image(cx, 565, 'homeBtn');
    btn.setScale(0.6);

    // 按钮呼吸动画（阴影跟随）
    this.tweens.add({
      targets: btn,
      scaleX: 0.63,
      scaleY: 0.63,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: btnShadow,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 按钮点击区域
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      // 确保点击按钮时如果音乐还没播，这里也能播，虽然上面有 input.once
      if (!this.homeAudio.isPlaying) {
        this.homeAudio.play();
      }
      if (!this.menuSiren.isPlaying) {
        this.menuSiren.play();
      }
      
      // 按下反馈
      this.tweens.add({
        targets: [btn, btnShadow],
        scaleX: 0.55,
        scaleY: 0.55,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          this.homeAudio.stop();
          this.menuSiren.stop();
          this.cameras.main.fadeOut(400, 0, 0, 0);
          this.time.delayedCall(400, () => {
            this.scene.start('GameScene');
          });
        },
      });
    });

    // ── 地下黑市商店按钮 ──
    const shopBtnContainer = this.add.container(cx, 445).setDepth(10);
    
    const sBg = this.add.graphics();
    sBg.fillStyle(0x0c1328, 0.85);
    sBg.lineStyle(2, 0xff007f, 1); // 霓虹粉边框
    sBg.fillRoundedRect(-110, -22, 220, 44, 12);
    sBg.strokeRoundedRect(-110, -22, 220, 44, 12);
    sBg.lineStyle(1, 0x00ffff, 0.4); // 青色内边框
    sBg.strokeRoundedRect(-108, -20, 216, 40, 10);
    
    const shopText = this.add.text(0, 0, '🛒 地下黑市商店', {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ff007f',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    
    shopBtnContainer.add([sBg, shopText]);
    
    const shopHit = this.add.rectangle(0, 0, 220, 44, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    shopBtnContainer.add(shopHit);
    
    // 呼吸动画
    this.tweens.add({
      targets: shopBtnContainer,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    shopHit.on('pointerover', () => {
      shopText.setColor('#00ffff');
      sBg.clear();
      sBg.fillStyle(0x16223f, 0.9);
      sBg.lineStyle(2, 0x00ffff, 1); // 悬停变为青色霓虹
      sBg.fillRoundedRect(-110, -22, 220, 44, 12);
      sBg.strokeRoundedRect(-110, -22, 220, 44, 12);
      
      // 合成轻微的开锁嘟嘟声作为反馈
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 600;
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } catch (e) {}
    });
    
    shopHit.on('pointerout', () => {
      shopText.setColor('#ff007f');
      sBg.clear();
      sBg.fillStyle(0x0c1328, 0.85);
      sBg.lineStyle(2, 0xff007f, 1);
      sBg.fillRoundedRect(-110, -22, 220, 44, 12);
      sBg.strokeRoundedRect(-110, -22, 220, 44, 12);
      sBg.lineStyle(1, 0x00ffff, 0.4);
      sBg.strokeRoundedRect(-108, -20, 216, 40, 10);
    });
    
    shopHit.on('pointerdown', () => {
      this.tweens.add({
        targets: shopBtnContainer,
        scale: 0.9,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          this.homeAudio.stop();
          this.menuSiren.stop();
          this.cameras.main.fadeOut(300, 0, 0, 0);
          this.time.delayedCall(300, () => {
            this.scene.start('ShopScene');
          });
        }
      });
    });

    // ── 最高分 & 黑市资金 ──
    let highScore = 0n;
    try { highScore = BigInt(getStorage('heist_highscore') || '0'); } catch (e) {}
    
    let savings = 0n;
    try { savings = BigInt(getStorage('heist_savings') || '0'); } catch (e) {}
    
    let infoText = '';
    if (highScore > 0n) {
      infoText += `🏆 最高记录: ${this.formatMoney(highScore)}`;
    }
    if (savings > 0n || highScore > 0n) {
      if (infoText !== '') infoText += '  |  ';
      infoText += `💰 黑市资金: ${this.formatMoney(savings)}`;
    }
    
    if (infoText !== '') {
      this.add.text(cx, 638, infoText, {
        fontFamily: '"Zpix", "Press Start 2P", monospace',
        fontSize: '11px',
        color: '#00ffcc',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5);
    }

    // ── 玩法提示 ──
    this.add.text(cx, 700, '点击钱袋抢钱，翻倍到手软，\n但别被警察抓住！', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 6,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // 绘制文字左右的装饰横杠
    const lineY = 691;
    const g = this.add.graphics();
    
    // 黑色描边
    g.lineStyle(4, 0x000000, 1);
    g.strokeLineShape(new Phaser.Geom.Line(cx - 110, lineY, cx - 95, lineY));
    g.strokeLineShape(new Phaser.Geom.Line(cx + 95, lineY, cx + 110, lineY));
    
    // 白色/灰色内线
    g.lineStyle(2, 0xbbbbbb, 1);
    g.strokeLineShape(new Phaser.Geom.Line(cx - 110, lineY, cx - 95, lineY));
    g.strokeLineShape(new Phaser.Geom.Line(cx + 95, lineY, cx + 110, lineY));

    // ── 版本 ──
    this.add.text(cx, 770, 'v1.0', {
      fontSize: '12px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // 淡入
    this.cameras.main.fadeIn(400);
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
}
