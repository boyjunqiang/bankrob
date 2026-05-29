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

    // ── 背景视频 ──
    const video = this.add.video(cx, cy, 'homeVideo');
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
    
    // 现代浏览器禁止自动播放声音，需等待用户第一次点击
    // 点击后同时播放背景音乐 + 取消视频静音，让两者一起播放
    this.input.once('pointerdown', () => {
      // 播放背景音乐
      if (!this.homeAudio.isPlaying) {
        this.homeAudio.play();
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
    titleShadow.setScale(0.5);
    titleShadow.setTint(0x000000);
    titleShadow.setAlpha(0.5);

    // 标题层
    const title = this.add.image(cx, 220, 'homeTitle');
    title.setScale(0.5);

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
    const btnW = btnTex.width * 0.45;
    const btnH = btnTex.height * 0.45;
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
    btn.setScale(0.45);

    // 按钮呼吸动画（阴影跟随）
    this.tweens.add({
      targets: btn,
      scaleX: 0.48,
      scaleY: 0.48,
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
      
      // 按下反馈
      this.tweens.add({
        targets: [btn, btnShadow],
        scaleX: 0.4,
        scaleY: 0.4,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          this.homeAudio.stop();
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
      this.add.text(cx, 640, `🏆 最高记录: $${highScore.toLocaleString()}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#ffd700',
        stroke: '#000',
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
}
