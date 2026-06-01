import Phaser from 'phaser';
import { GAME } from '../config/gameConfig.js';
import { getStorage, setStorage } from '../utils/storage.js';

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene');
    
    // 商店商品库设计
    this.shopItems = {
      gear: [
        { id: 'sneakers', name: '🏎️ 超级黄金跑鞋', desc: '正常移速与逃跑冲刺速度永久提升 20%', price: 500000000000000000000n, type: 'passive' },
        { id: 'cigar', name: '🚬 镇定雪茄', desc: '平复情绪，使警察出警时间延迟 5.0 秒', price: 800000000000000000000n, type: 'passive' }
      ],
      tools: [
        { id: 'crowbar', name: '🔨 钛合金开锁锤', desc: '开锁难度降级，自动预填首位密码并延长开锁时间', price: 400000000000000000000n, type: 'passive' },
        { id: 'adrenaline', name: '⚡ 狂暴肾上腺素', desc: '单场兴奋剂，开局前 15 秒钟移速翻倍(+100%)', price: 150000000000000000000n, type: 'passive' }
      ],
      skins: [
        { id: 'skin_godfather', name: '😎 黑手党教父西装', desc: '皮肤：化身教父，威慑柜员，开场基础金额额外 +$1,000', price: 3000000000000000000000n, type: 'skin' },
        { id: 'skin_cat', name: '🐱 古灵精怪猫耳兜帽', desc: '皮肤：戴上粉嫩猫耳！柜员配合度满分，警察延迟 3.5 秒出警', price: 2000000000000000000000n, type: 'skin' },
        { id: 'skin_joker', name: '🤡 魔性小丑面具', desc: '皮肤：带上面具！劫匪所有钱袋与保险箱翻倍系数增加 0.1x', price: 2500000000000000000000n, type: 'skin' }
      ]
    };

    this.activeTab = 'gear'; // 默认页签：个人神装
    this.cheatCount = 0;     // 刷金币开发者后门点击计数
  }

  init() {
    this.loadPlayerData();
  }

  loadPlayerData() {
    // 读取本地存储中的数据
    try {
      this.savings = BigInt(getStorage('heist_savings') || '0');
    } catch (e) {
      this.savings = 0n;
    }
    
    try {
      this.purchasedItems = JSON.parse(getStorage('heist_purchased_items') || '[]');
    } catch (e) {
      this.purchasedItems = [];
    }
    
    this.equippedSkin = getStorage('heist_equipped_skin') || '';
  }

  savePlayerData() {
    setStorage('heist_savings', this.savings.toString());
    setStorage('heist_purchased_items', JSON.stringify(this.purchasedItems));
    setStorage('heist_equipped_skin', this.equippedSkin);
  }

  create() {
    // 强制商店场景使用 FIT 模式，契合主菜单风格
    if (this.scale.scaleMode !== Phaser.Scale.FIT) {
      this.scale.scaleMode = Phaser.Scale.FIT;
      this.scale.updateScale();
    }

    const cx = GAME.WIDTH / 2;
    this.cameras.main.setBackgroundColor('#040512'); // 深沉迷离的黑市星空底色
    this.cameras.main.fadeIn(400);

    // ── 绘制动态霓虹网格背景 (微弱扫描线感觉) ──
    this.drawNeonGrid();

    // ── 1. 标题 ──
    const titleText = this.add.text(cx, 40, '🛒 地下黑市商店', {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '22px',
      color: '#ff007f',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5);

    // 给标题加发光呼吸特效
    this.tweens.add({
      targets: titleText,
      alpha: { from: 0.85, to: 1 },
      scale: { from: 0.98, to: 1.02 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // ── 2. 当前黑市资金面板 ──
    this.drawSavingsPanel(cx);

    // ── 3. 分类选项卡 (Tabs) ──
    this.createTabs(cx);

    // ── 4. 商品列表容器 ──
    this.itemsContainer = this.add.container(0, 0);
    this.renderCurrentTabItems(cx);

    // ── 5. 返回主菜单按钮 ──
    this.createReturnButton(cx);

    // 提示文本
    this.statusTipText = this.add.text(cx, 715, '', {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '12px',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setAlpha(0);
  }

  // ── 绘制科幻霓虹格子背景 ──
  drawNeonGrid() {
    const bgGraphics = this.add.graphics().setAlpha(0.12);
    bgGraphics.lineStyle(1, 0x00ffff, 0.5);
    
    // 纵线
    for (let x = 0; x <= GAME.WIDTH; x += 30) {
      bgGraphics.beginPath();
      bgGraphics.moveTo(x, 0);
      bgGraphics.lineTo(x, GAME.HEIGHT);
      bgGraphics.strokePath();
    }
    // 横线
    for (let y = 0; y <= GAME.HEIGHT; y += 30) {
      bgGraphics.beginPath();
      bgGraphics.moveTo(0, y);
      bgGraphics.lineTo(GAME.WIDTH, y);
      bgGraphics.strokePath();
    }
  }

  // ── 资金面板 ──
  drawSavingsPanel(cx) {
    this.savingsText = this.add.text(cx, 85, `💰 黑市流动资金: ${this.formatMoney(this.savings)}`, {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '13px',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    // 开发者后门：点击钱包 5 次送 5 万流动资金！
    this.savingsText.on('pointerdown', () => {
      this.cheatCount++;
      this.playTone(800 + this.cheatCount * 100, 0.05, 'sine', 0.1);
      
      if (this.cheatCount >= 5) {
        this.cheatCount = 0;
        this.savings += 5000000000000000000000n;
        setStorage('heist_savings', this.savings.toString());
        this.savingsText.setText(`💰 黑市流动资金: ${this.formatMoney(this.savings)}`);
        this.showStatusTip('✨ 注入黑市洗钱资金 +$50,000京！', '#00ffff');
        this.playTone(1200, 0.3, 'square', 0.15);
        this.triggerBillRain();
      }
    });
  }

  // ── 选项卡 (Tabs) ──
  createTabs(cx) {
    const tabsData = [
      { id: 'gear', label: '个人神装' },
      { id: 'tools', label: '高科技工具' },
      { id: 'skins', label: '绝版皮肤' }
    ];

    const tabWidth = 110;
    const startX = cx - tabWidth;
    const tabY = 135;

    this.tabButtons = {};

    tabsData.forEach((tab, index) => {
      const btnX = startX + index * tabWidth;
      const tabContainer = this.add.container(btnX, tabY);

      // 背景网格
      const tabBg = this.add.graphics();
      const isActive = this.activeTab === tab.id;
      
      this.drawTabGraphics(tabBg, isActive);

      const tabText = this.add.text(0, 0, tab.label, {
        fontFamily: '"Zpix", "Press Start 2P", monospace',
        fontSize: '11px',
        color: isActive ? '#ffffff' : '#8899bb',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5);

      tabContainer.add([tabBg, tabText]);

      const tabHit = this.add.rectangle(0, 0, tabWidth - 6, 32, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      tabContainer.add(tabHit);

      this.tabButtons[tab.id] = { container: tabContainer, bg: tabBg, text: tabText };

      tabHit.on('pointerdown', () => {
        if (this.activeTab !== tab.id) {
          this.playTone(500, 0.08, 'sine', 0.08);
          this.switchTab(tab.id, cx);
        }
      });
    });
  }

  drawTabGraphics(g, isActive) {
    g.clear();
    if (isActive) {
      // 激活态：深灰底，明亮青色边缘
      g.fillStyle(0x122a3e, 0.85);
      g.lineStyle(2, 0x00ffff, 1);
      g.fillRoundedRect(-52, -16, 104, 32, 8);
      g.strokeRoundedRect(-52, -16, 104, 32, 8);
    } else {
      // 非激活态：半透明灰底，微弱灰紫边缘
      g.fillStyle(0x0e111a, 0.5);
      g.lineStyle(1.5, 0x3d4459, 0.6);
      g.fillRoundedRect(-52, -16, 104, 32, 8);
      g.strokeRoundedRect(-52, -16, 104, 32, 8);
    }
  }

  switchTab(tabId, cx) {
    // 更新选项卡状态
    const prevTab = this.activeTab;
    this.activeTab = tabId;

    this.drawTabGraphics(this.tabButtons[prevTab].bg, false);
    this.tabButtons[prevTab].text.setColor('#8899bb');

    this.drawTabGraphics(this.tabButtons[this.activeTab].bg, true);
    this.tabButtons[this.activeTab].text.setColor('#ffffff');

    // 缓动清空前一个列表，并淡入新列表
    this.tweens.add({
      targets: this.itemsContainer,
      alpha: 0,
      scaleY: 0.8,
      duration: 150,
      onComplete: () => {
        this.itemsContainer.removeAll(true);
        this.renderCurrentTabItems(cx);
        this.itemsContainer.setScale(1, 0.8);
        this.tweens.add({
          targets: this.itemsContainer,
          alpha: 1,
          scaleY: 1,
          duration: 200,
          ease: 'Back.easeOut'
        });
      }
    });
  }

  // ── 渲染当前选中选项卡的商品 ──
  renderCurrentTabItems(cx) {
    const list = this.shopItems[this.activeTab];
    const cardH = 150;
    const startY = 240;
    const spacing = 160;

    list.forEach((item, index) => {
      const cardY = startY + index * spacing;
      const cardContainer = this.add.container(cx, cardY);

      // Card Background (Glassmorphism rounded box)
      const cG = this.add.graphics();
      cG.fillStyle(0x0a1024, 0.85);
      
      const isOwned = this.purchasedItems.includes(item.id);
      let borderCol = 0x3b82f6; // 皇家蓝
      if (item.type === 'skin') {
        borderCol = 0xff00ff; // 华丽粉 (皮肤)
      } else if (isOwned) {
        borderCol = 0x10b981; // 护眼绿 (已购买物品)
      }
      
      cG.lineStyle(1.5, borderCol, 0.8);
      cG.fillRoundedRect(-205, -70, 410, 140, 14);
      cG.strokeRoundedRect(-205, -70, 410, 140, 14);

      // 商品名称
      const nameText = this.add.text(-190, -55, item.name, {
        fontFamily: '"Zpix", "Press Start 2P", monospace',
        fontSize: '13px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
      });

      // 商品描述 (自动换行)
      const descText = this.add.text(-190, -25, item.desc, {
        fontFamily: '"Zpix", "Press Start 2P", monospace',
        fontSize: '10px',
        color: '#aaccff',
        wordWrap: { width: 260, useAdvancedWrap: true },
        lineSpacing: 5
      });

      cardContainer.add([cG, nameText, descText]);

      // ── 按钮区域 ──
      const btnX = 135;
      const btnY = 32;
      const actBtnContainer = this.add.container(btnX, btnY);

      const aG = this.add.graphics();
      const aText = this.add.text(0, 0, '', {
        fontFamily: '"Zpix", "Press Start 2P", monospace',
        fontSize: '11px',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5);

      actBtnContainer.add([aG, aText]);

      let btnLabel = '';
      let btnColor = 0x000000;
      let fontColor = '#ffffff';
      let clickable = true;

      if (isOwned) {
        if (item.type === 'skin') {
          const isEquipped = this.equippedSkin === item.id;
          btnLabel = isEquipped ? '已启用' : '启用';
          btnColor = isEquipped ? 0xec4899 : 0x4f46e5; // 粉红 vs 紫色
        } else {
          btnLabel = '已解锁';
          btnColor = 0x10b981; // 纯绿色
          clickable = false;
        }
      } else {
        btnLabel = this.formatMoney(item.price);
        btnColor = this.savings >= item.price ? 0x2563eb : 0x4b5563; // 蓝色可买 vs 灰色缺钱
      }

      aText.setText(btnLabel);
      aText.setColor(fontColor);

      // 绘制按钮背景
      aG.fillStyle(btnColor, 1);
      aG.lineStyle(1.5, 0xffffff, 0.4);
      aG.fillRoundedRect(-50, -18, 100, 36, 10);
      aG.strokeRoundedRect(-50, -18, 100, 36, 10);

      cardContainer.add(actBtnContainer);

      if (clickable) {
        const hitArea = this.add.rectangle(btnX, btnY, 100, 36, 0x000000, 0)
          .setInteractive({ useHandCursor: true });
        cardContainer.add(hitArea);

        // 按钮悬停动画
        hitArea.on('pointerover', () => {
          aG.clear();
          aG.fillStyle(btnColor, 0.85);
          aG.lineStyle(1.5, 0x00ffff, 1); // 悬停发出闪耀青色光
          aG.fillRoundedRect(-50, -18, 100, 36, 10);
          aG.strokeRoundedRect(-50, -18, 100, 36, 10);
        });

        hitArea.on('pointerout', () => {
          aG.clear();
          aG.fillStyle(btnColor, 1);
          aG.lineStyle(1.5, 0xffffff, 0.4);
          aG.fillRoundedRect(-50, -18, 100, 36, 10);
          aG.strokeRoundedRect(-50, -18, 100, 36, 10);
        });

        hitArea.on('pointerdown', () => {
          this.tweens.add({
            targets: actBtnContainer,
            scale: 0.9,
            duration: 80,
            yoyo: true,
            onComplete: () => {
              this.handleItemAction(item, isOwned, cx);
            }
          });
        });
      }

      this.itemsContainer.add(cardContainer);
    });
  }

  // ── 处理购买与装备动作 ──
  handleItemAction(item, isOwned, cx) {
    if (isOwned) {
      if (item.type === 'skin') {
        // 装备皮肤
        this.equippedSkin = (this.equippedSkin === item.id) ? '' : item.id;
        this.savePlayerData();
        this.playTone(800, 0.1, 'triangle', 0.12);
        this.showStatusTip(this.equippedSkin === item.id ? `👕 已穿戴: ${item.name}` : `👕 已脱下: ${item.name}`, '#ffff00');
        this.refreshList(cx);
      }
    } else {
      // 购买物品
      if (this.savings >= item.price) {
        this.savings -= item.price;
        this.purchasedItems.push(item.id);
        
        // 如果买的是皮肤，购买后自动帮玩家装备上
        if (item.type === 'skin') {
          this.equippedSkin = item.id;
        }

        this.savePlayerData();
        this.savingsText.setText(`💰 黑市流动资金: ${this.formatMoney(this.savings)}`);
        
        // 庆祝音效与金钞特效
        this.playTone(523.25, 0.1, 'square', 0.12); // C5
        this.time.delayedCall(100, () => this.playTone(659.25, 0.1, 'square', 0.12)); // E5
        this.time.delayedCall(200, () => this.playTone(783.99, 0.25, 'square', 0.15)); // G5
        
        this.showStatusTip(`🎉 成功入手: ${item.name}！`, '#00ffcc');
        this.triggerBillRain();
        this.refreshList(cx);
      } else {
        // 缺钱提示
        this.playTone(180, 0.25, 'sawtooth', 0.15); // buzzer
        this.cameras.main.shake(150, 0.005);
        this.showStatusTip('❌ 你的黑市流动资金不足！多去抢几次银行吧！', '#ff3333');
      }
    }
  }

  refreshList(cx) {
    this.itemsContainer.removeAll(true);
    this.renderCurrentTabItems(cx);
  }

  // ── 返回主菜单按钮 ──
  createReturnButton(cx) {
    const returnBtn = this.add.container(cx, 765).setDepth(20);

    const rG = this.add.graphics();
    rG.fillStyle(0xff2244, 0.85); // 红色荧光
    rG.lineStyle(1.5, 0xffffff, 0.4);
    rG.fillRoundedRect(-75, -18, 150, 36, 10);
    rG.strokeRoundedRect(-75, -18, 150, 36, 10);

    const rText = this.add.text(0, 0, '返回主菜单', {
      fontFamily: '"Zpix", "Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    returnBtn.add([rG, rText]);

    const hitArea = this.add.rectangle(0, 0, 150, 36, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    returnBtn.add(hitArea);

    this.tweens.add({
      targets: returnBtn,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    hitArea.on('pointerover', () => {
      rG.clear();
      rG.fillStyle(0xff4466, 0.95);
      rG.lineStyle(1.5, 0xffffff, 1);
      rG.fillRoundedRect(-75, -18, 150, 36, 10);
      rG.strokeRoundedRect(-75, -18, 150, 36, 10);
    });

    hitArea.on('pointerout', () => {
      rG.clear();
      rG.fillStyle(0xff2244, 0.85);
      rG.lineStyle(1.5, 0xffffff, 0.4);
      rG.fillRoundedRect(-75, -18, 150, 36, 10);
      rG.strokeRoundedRect(-75, -18, 150, 36, 10);
    });

    hitArea.on('pointerdown', () => {
      this.tweens.add({
        targets: returnBtn,
        scale: 0.9,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          this.cameras.main.fadeOut(300, 0, 0, 0);
          this.time.delayedCall(300, () => {
            this.scene.start('MenuScene');
          });
        }
      });
    });
  }

  // ── 飘美钞庆祝特效 ──
  triggerBillRain() {
    this.add.particles(GAME.WIDTH / 2, -20, 'dollarBill', {
      speed: { min: 40, max: 150 },
      angle: { min: 70, max: 110 },
      scale: { start: 0.4, end: 0.2 },
      alpha: { start: 0.9, end: 0.2 },
      lifespan: 3000,
      frequency: 30,
      maxParticles: 40,
      rotate: { min: -180, max: 180 },
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-180, 0, 360, 10),
      },
    }).setDepth(5);
  }

  // ── 提示横幅 ──
  showStatusTip(text, colorHex) {
    this.statusTipText.setText(text);
    this.statusTipText.setColor(colorHex);
    this.statusTipText.setAlpha(1);

    if (this.statusTipTween) {
      this.statusTipTween.stop();
    }

    this.statusTipTween = this.tweens.add({
      targets: this.statusTipText,
      alpha: { from: 1, to: 0 },
      y: { from: 715, to: 705 },
      duration: 1800,
      delay: 1000,
      ease: 'Quad.easeOut'
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

  // ── 8-bit音频波形合成器 ──
  playTone(freq, duration, type = 'square', volume = 0.1) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // 降级静音
    }
  }
}
