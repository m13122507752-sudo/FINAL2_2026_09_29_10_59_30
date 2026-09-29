/**
 * 数字化疲劳度可视化 - 终极生物逻辑与冷银罗盘版
 * 特性：睡眠瓶颈逻辑、动态黑暗/模糊反馈、高级金属质感 UI
 */

// --- 变量定义：背景与网格 ---
let BackGroundframes = [];
let totalFrames = 200;
let backgroundVisible = true; // 第四个按钮控制：true=显示背景，false=完全不绘制背景
let patternImgs = [];
const rowCounts = [25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25];
let tileScales = [];
let tileImgIndex = [];

// --- 变量定义：原版眼睛数据系统 ---
let table;
let eyes = [];
let hoverEye = null;
let yearEyes = { 1: [], 2: [], 3: [], 4: [] };

// --- 变量定义：按钮与对话系统 ---
let buttons = [], yearButtons = [], dialogButtons = [], controlButtons = [];
let otherButton = null;
let dialogText = "", dialogImage = null, currentDialogIndex = -1;
let popupImage = null, popupVisible = false;
let yearButtonsCreated = false, dialogButtonsHidden = false, dialogImgs = [];

let introMessages = [
  "Some students sleep in silence, some stay awake in fragments.",
  "Move closer. Each rhythm holds a different story.",
  "It’s so late—aren’t you asleep yet?",
  "Try touching these glowing objects. It might be interesting."
];
let introStartTime = 0, introFinished = false;

const dialogSettings = [
  { text: "Book: Speaking of sleep...", path: "Pattern/Dio5.png", w: 200, h: 250, imgX: -520, imgY: -670 },
  { text: "Spoon: Sleep quality...", path: "Pattern/Dio6.png", w: 200, h: 250, imgX: -520, imgY: -670 },
  { text: "Coffee cup: Caffeine intake...", path: "Pattern/Dio7.png", w: 200, h: 250, imgX: -520, imgY: -670 },
  { text: "Microwave: Fatigue affects vision. Use the compass to adjust. Sleep is the foundation.", path: "Pattern/Dio13.png", w: 200, h: 250, imgX: -520, imgY: -670 }
];

let bgm, bgmStarted = false;

// --- 变量定义：罗盘系统 ---
let compassCenterX, compassCenterY, compassRadius = 150;
let handleAngles = [0, 90, 180, 270]; // 睡眠, 学习, 屏幕, 运动
let compassLabels = ["Sleep", "Study", "Screen", "Exercise"];
let activeHandle = -1, compassHours = [0, 0, 0, 0], compassStars = [];
let showCompass = false, microwaveStartTime = 0, currentFLevel = 0, smoothFLevel = 0;

// --- 类定义：交互按钮 ---
class Button {
  constructor(x, y, width, height, image, text, onClickCallback, applyScaleEffect = false, scaleFactor = 1) {
    this.x = x; this.y = y; this.width = width; this.height = height;
    this.image = image; this.text = text; this.onClickCallback = onClickCallback;
    this.applyScaleEffect = applyScaleEffect; this.scaleFactor = scaleFactor;
    this.button = createButton('');
    this.textElement = createDiv(text);
    this.setupButton();
  }
  setupButton() {
    this.button.position(this.x, this.y);
    this.button.size(this.width * this.scaleFactor, this.height * this.scaleFactor);
    this.button.style('background-color', 'transparent');
    this.button.style('border', 'none');
    this.button.style('z-index', '5'); 
    this.button.elt.style.backgroundImage = `url(${this.image})`;
    this.button.elt.style.backgroundSize = 'cover';
    this.textElement.style('z-index', '6');
    this.textElement.position(this.x + 15, this.y - 20);
    this.textElement.style('font-size', '30px');
    this.textElement.style('color', 'white');
    this.textElement.style('display', 'none');
    this.textElement.style('pointer-events', 'none');
    this.button.mouseOver(() => {
      this.textElement.style('display', 'block');
      if (this.applyScaleEffect) this.button.elt.style.transform = `scale(${this.scaleFactor * 1.2})`;
    });
    this.button.mouseOut(() => {
      this.textElement.style('display', 'none');
      if (this.applyScaleEffect) this.button.elt.style.transform = `scale(${this.scaleFactor})`;
    });
    this.button.mousePressed(() => this.onClickCallback());
  }
  setOpacity(val) {
    this.button.style('opacity', val);
    if (val <= 0.05) this.button.style('visibility', 'hidden');
    else this.button.style('visibility', 'visible');
  }
  applyEffects() {
    let d = dist(mouseX, mouseY, this.x + (this.width/2), this.y + (this.height/2));
    let scaleVal = constrain(map(d, 0, width/2, 1.5, 1), 1, 7);
    if (this.applyScaleEffect) this.button.elt.style.transform = `scale(${scaleVal})`;
  }
  hide() { this.button.hide(); this.textElement.hide(); }
  show() { this.button.show(); this.textElement.show(); this.textElement.style('display', 'none'); }
  remove() { this.button.remove(); this.textElement.remove(); }
}

// --- 预加载 ---
function preload() {
  bgm = loadSound("bgm/bgm.mp3");
  for (let i = 0; i < 200; i++) BackGroundframes[i] = loadImage("BackGround/Video_" + nf(i, 5) + ".jpg");
  patternImgs.push(loadImage("Pattern/Pattern1.png"), loadImage("Pattern/Pattern2.png"), loadImage("Pattern/Pattern3.png"));
  popupImage = loadImage("UI/INF.png");
  for (let i = 0; i < dialogSettings.length; i++) dialogImgs[i] = loadImage(dialogSettings[i].path);

  // 原版眼睛数据
  table = loadTable("student_sleep_patterns6.csv", "csv", "header");
}

// --- 设置 ---
function setup() {
  let cnv = createCanvas(1920, 1080);
  cnv.style('z-index', '10'); 
  cnv.style('pointer-events', 'none'); 

  noSmooth();
  pixelDensity(1);
  angleMode(DEGREES);
  window.addEventListener("click", startBGM, { once: true });

  const totalTiles = rowCounts.reduce((a, b) => a + b, 0);
  tileScales = new Array(totalTiles).fill(1);
  tileImgIndex = new Array(totalTiles);
  for (let i = 0; i < totalTiles; i++) tileImgIndex[i] = floor(random(patternImgs.length));

  // 按原版逻辑把 CSV 数据转成眼睛，并按年级存入 yearEyes
  initEyesData();

  createOtherButton(); 
  createDialogButtons(); 
  createControlButtons();
  
  compassCenterX = width / 2;
  compassCenterY = height / 2 - 80;
  for (let i = 0; i < 60; i++) compassStars.push(new OrbitStar());
  introStartTime = millis();
}

// --- 主循环 ---
function draw() {
  clear();
  hoverEye = null;

  // 1. 生物逻辑计算
  if (showCompass) {
    calculateCompassHours();
    
    // A. 压力积累 (学习 & 屏幕)
    let stress = (compassHours[1] * 1.5) + (compassHours[2] * 1.3);
    
    // B. 睡眠瓶颈：如果睡眠不足，恢复效率被锁死
    let sleepFactor = map(constrain(compassHours[0], 0, 8), 0, 8, 0.1, 1.0);
    sleepFactor = pow(sleepFactor, 1.5); // 指数级惩罚
    
    // C. 运动恢复：受睡眠因子影响
    let exerciseRecovery = compassHours[3] * 1.2 * (sleepFactor + 0.1);
    
    // D. 计算初始分数
    let fScore = stress - (compassHours[0] * 3 + exerciseRecovery);
    currentFLevel = constrain(map(fScore, -15, 25, 0, 1), 0, 1);

    // E. 核心封顶逻辑：睡眠少则 Recovery 强行压低
    let recoveryCap = map(constrain(compassHours[0], 0, 5), 0, 5, 0.2, 1.0);
    let currentRec = 1 - currentFLevel;
    if (currentRec > recoveryCap) currentRec = recoveryCap;
    currentFLevel = 1 - currentRec;
  } else {
    currentFLevel = 0;
  }
  
  // 平滑过渡
  smoothFLevel = lerp(smoothFLevel, currentFLevel, 0.08);

  // 2. 绘制背景视频 (受疲劳度变暗)
  drawBackground(smoothFLevel);

  // 3. 视觉反馈层：模糊 + 黑暗叠加
  if (showCompass && smoothFLevel > 0.01) {
    let f = pow(smoothFLevel, 0.8); 
    
    // 模拟视力模糊
    let resScale = map(f, 0, 1, 1, 12); 
    if (resScale > 1.1) {
      let temp = get(0, 0, width, height);
      temp.resize(width / resScale, height / resScale);
      image(temp, 0, 0, width, height);
    }
    
    // Recovery越低，画面遮罩越黑
    let darkness = map(f, 0, 1, 0, 230); 
    fill(0, darkness);
    rect(0, 0, width, height);
    
    // 绘制暗角
    drawVignette(f);
  }

  // 4. 绘制网格 (始终保持清晰)
  drawDiamondPattern();

  // 4.5 原版数据眼睛（眼睛模式与罗盘模式互斥）
  if (!showCompass) {
    eyes.forEach(eye => {
      eye.draw();
      if (eye.isHovered()) hoverEye = eye;
    });
    if (hoverEye) displayHoverInfo(hoverEye);
  }

  // 5. 更新UI系统
  updateButtonVisibilities();
  handleDialogs();

  // 6. 绘制高亮冷银罗盘系统
  if (showCompass) {
    renderComplexCompassUI(smoothFLevel);
  }

  if (popupVisible && popupImage) drawPopupImage();
}

/**
 * 核心：绘制复杂冷银罗盘
 */
function renderComplexCompassUI(f) {
  let recoveryVal = floor((1 - f) * 100);

  // 轨道粒子
  for (let s of compassStars) { s.update(f); s.display(f); }

  push();
  translate(compassCenterX, compassCenterY);

  // --- A. 外部冷银刻度环 ---
  noFill();
  stroke(200, 205, 210, 120); 
  strokeWeight(1);
  let outerR = compassRadius + 50;
  ellipse(0, 0, outerR * 2);

  for (let a = 0; a < 360; a += 10) {
    let isMajor = (a % 90 === 0);
    let tickLen = isMajor ? 15 : 7;
    stroke(220, 225, 230, isMajor ? 200 : 100); 
    strokeWeight(isMajor ? 2.5 : 1);
    line(cos(a) * outerR, sin(a) * outerR, cos(a) * (outerR - tickLen), sin(a) * (outerR - tickLen));
  }

  // 流动光点
  push();
  rotate((frameCount * 0.8) % 360);
  noStroke(); fill(255);
  drawingContext.shadowBlur = 15; drawingContext.shadowColor = 'white';
  circle(outerR, 0, 5);
  pop();

  // --- B. 银色金属交互轨道 ---
  stroke(180, 185, 190, 80); strokeWeight(12);
  ellipse(0, 0, compassRadius * 2);
  
  drawingContext.shadowBlur = 15;
  drawingContext.shadowColor = color(255, 255, 255, 180);
  stroke(245, 250, 255, 220); strokeWeight(2);
  ellipse(0, 0, compassRadius * 2);
  drawingContext.shadowBlur = 0; 

  // --- C. 手柄、引导线与文字 ---
  for (let i = 0; i < 4; i++) {
    let x = cos(handleAngles[i]) * compassRadius, y = sin(handleAngles[i]) * compassRadius;
    stroke(255, 70); strokeWeight(1);
    drawingContext.setLineDash([4, 10]);
    line(x * 0.3, y * 0.3, x * 0.9, y * 0.9);
    drawingContext.setLineDash([]); 

    push();
    drawingContext.shadowBlur = (activeHandle === i) ? 35 : 15;
    drawingContext.shadowColor = 'white';
    fill(255); noStroke();
    circle(x, y, (activeHandle === i) ? 25 : 16);
    pop();

    let nextA = handleAngles[(i + 1) % 4], diffA = (nextA - handleAngles[i] + 360) % 360;
    let txtA = handleAngles[i] + diffA / 2;
    let tx = cos(txtA) * (compassRadius + 85), ty = sin(txtA) * (compassRadius + 85);
    
    textAlign(CENTER, CENTER);
    drawingContext.shadowBlur = 12; drawingContext.shadowColor = 'black'; 
    fill(255, 200); textSize(12); text(compassLabels[i].toUpperCase(), tx, ty - 12);
    fill(255); textSize(16); text(compassHours[i].toFixed(1) + "H", tx, ty + 12);
    drawingContext.shadowBlur = 0;
  }

  // --- D. 中心HUD核心 (Recovery百分比) ---
  fill(0, 160); stroke(255, 40); ellipse(0, 0, 110);
  push();
  rotate(frameCount * 0.5); noFill(); stroke(255, 120); 
  drawingContext.setLineDash([5, 15]); ellipse(0, 0, 135);
  pop();
  
  fill(255); textAlign(CENTER, CENTER); textSize(40); textStyle(BOLD); text(recoveryVal, 0, -8);
  textStyle(NORMAL); textSize(10); fill(255, 180); text("RECOVERY", 0, 28);
  noFill(); stroke(255, 80); ellipse(0, 0, 95);
  pop();

  // --- E. 极端疲劳警告文字 ---
  if (recoveryVal < 55) {
    push();
    translate(compassCenterX, compassCenterY + 300);
    textAlign(CENTER, CENTER);
    let pulse = sin(frameCount * 8) * 5; 
    drawingContext.shadowBlur = 20; drawingContext.shadowColor = 'red';
    fill(255, 50, 50); textSize(35 + pulse); textStyle(BOLD);
    text("GO TO SLEEP NOW!", 0, -250);
    pop();
  }

  // 绘制动态闭眼效果
  drawOrganicEyelids(f);
}

// --- 视觉支持函数 ---

function drawBackground(f) {
  // 第四个按钮关闭背景后，直接绘制纯黑背景。
  if (!backgroundVisible) {
    push();
    background(0);
    pop();
    return;
  }

  let index = frameCount % BackGroundframes.length;
  if (BackGroundframes[index]) {
    push();
    let br = map(f, 0, 1, 255, 30); // Recovery越低，视频越黑
    tint(br); 
    image(BackGroundframes[index], 0, 0, width, height);
    pop();
  }
}

function drawVignette(f) {
  push();
  let innerR = map(f, 0, 1, 400, 50);
  let outerR = map(f, 0, 1, width * 0.8, width * 0.45);
  let grad = drawingContext.createRadialGradient(width/2, height/2, innerR, width/2, height/2, outerR);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${f * 255})`);
  drawingContext.fillStyle = grad;
  rect(0, 0, width, height);
  pop();
}

function drawOrganicEyelids(f) {
  let lidF = pow(f, 0.75); 
  let upperY = map(lidF, 0, 1, -200, height / 2 - 15);
  let lowerY = map(lidF, 0, 1, height + 200, height / 2 + 15);
  noStroke(); fill(12, 14, 16);
  // 上
  beginShape();
  vertex(0, 0); vertex(width, 0); vertex(width, upperY);
  bezierVertex(width * 0.7, upperY + 200 * lidF, width * 0.3, upperY + 200 * lidF, 0, upperY);
  endShape(CLOSE);
  // 下
  beginShape();
  vertex(0, height); vertex(width, height); vertex(width, lowerY);
  bezierVertex(width * 0.7, lowerY - 200 * lidF, width * 0.3, lowerY - 200 * lidF, 0, lowerY);
  endShape(CLOSE);
}

function updateButtonVisibilities() {
  let lidInfluence = pow(smoothFLevel, 0.7);
  let upperLidPos = map(lidInfluence, 0, 1, -100, height/2 - 50);
  let lowerLidPos = map(lidInfluence, 0, 1, height + 100, height/2 + 50);

  // 如果在罗盘交互区，启用点击穿透
  let cnv = select('canvas');
  if (showCompass && dist(mouseX, mouseY, compassCenterX, compassCenterY) < 400) {
    cnv.style('pointer-events', 'auto');
  } else {
    cnv.style('pointer-events', 'none');
  }

  let allBtns = [...buttons, ...dialogButtons, ...yearButtons];
  if (otherButton) allBtns.push(otherButton);

  allBtns.forEach(btn => {
    btn.applyEffects();
    if (showCompass) {
      if (btn.y < upperLidPos || (btn.y + 100) > lowerLidPos) btn.setOpacity(0);
      else btn.setOpacity(1 - lidInfluence * 1.5);
    } else btn.setOpacity(1);
  });
}

function drawDiamondPattern() {
  push(); blendMode(SCREEN); imageMode(CENTER);
  const size = 140, step = size * 0.85;
  const cX = width / 2, cY = height / 2;
  const startY = cY - ((rowCounts.length - 1) * step) / 2;
  let tileIdx = 0;
  for (let r = 0; r < rowCounts.length; r++) {
    let count = rowCounts[r];
    let startX = cX - ((count - 1) * step) / 2;
    for (let c = 0; c < count; c++) {
      let x = startX + c * step, y = startY + r * step;
      let d = dist(mouseX, mouseY, x, y);
      let influence = constrain(map(d, 0, 350, 1, 0), 0, 1);
      tileScales[tileIdx] = lerp(tileScales[tileIdx], 1 + influence * 0.35, 0.15);
      push(); translate(x, y); scale(tileScales[tileIdx]);
      stroke(255, 60 + influence * 200); strokeWeight(1.5); noFill();
      quad(0, -size/2, size/2, 0, 0, size/2, -size/2, 0);
      if (patternImgs[tileImgIndex[tileIdx]]) {
        tint(255, 60 + influence * 200);
        image(patternImgs[tileImgIndex[tileIdx]], 0, 0, size * 0.5, size * 0.5);
      }
      pop();
      tileIdx++;
    }
  }
  pop();
}

// --- 交互系统函数 ---

function createDialogButtons() {
  let imgs = ["button/Dio1.png", "button/Dio2.png", "button/Dio3.png", "button/Dio4.png"];
  let pos = [
    { x: 10, y: height - 265, w: 220, h: 260, sc: 0.99 },
    { x: 560, y: height - 270, w: 200, h: 320, sc: 0.79 },
    { x: 1300, y: height - 220, w: 180, h: 230, sc: 0.8 },
    { x: 1420, y: height - 210, w: 700, h: 400, sc: 0.5 }
  ];
  for (let i = 0; i < 4; i++) {
    let btn = new Button(pos[i].x, pos[i].y, pos[i].w, pos[i].h, imgs[i], "", () => showDialog(i + 1), false, pos[i].sc);
    dialogButtons.push(btn);
  }
}

function createControlButtons() {
  let imgs = ["UI/restart.png", "UI/download.png", "UI/Information.png", "UI/back.png"];
  for (let i = 0; i < 4; i++) {
    let btn = new Button(20 + i * 85, 20, 70, 70, imgs[i], "", () => handleControl(i), false, 1);
    controlButtons.push(btn); buttons.push(btn);
  }
}

function createOtherButton() {
  otherButton = new Button(width - 170, height - 450, 300, 700, "button/Cbutton1.png", "Flower", () => handleFlowerClick(), false, 0.6);
}

function createYearButtons() {
  let texts = ["University_Year：1", "University_Year：2", "University_Year：3", "University_Year：4"];
  let imgs = ["button/button11.png", "button/button12.png", "button/button13.png", "button/button14.png"];

  for (let i = 0; i < 4; i++) {
    let btn = new Button(
      width / 2 - 800 + i * 500,
      height - 200,
      120,
      120,
      imgs[i],
      texts[i],
      () => showYearGroup(i + 1),
      true,
      1.2
    );
    yearButtons.push(btn);
    buttons.push(btn);
  }
  yearButtonsCreated = true;
}

function handleControl(id) {
  if (id === 0) restartSketch();
  if (id === 1) saveCanvas("疲劳度可视化", "png");
  if (id === 2) popupVisible = !popupVisible;
  if (id === 3) backgroundVisible = !backgroundVisible;
}

function showDialog(id) {
  currentDialogIndex = id - 1;
  dialogText = dialogSettings[currentDialogIndex].text;
  dialogImage = dialogImgs[currentDialogIndex];

  if (id === 4) {
    // 微波炉：进入罗盘模式，同时关闭眼睛数据显示
    eyes = [];
    showCompass = true;
    microwaveStartTime = millis();
  } else {
    showCompass = false;
    activeHandle = -1;
  }
}

function handleFlowerClick() {
  // 显示数据按钮：第一时间关闭罗盘功能
  showCompass = false;
  activeHandle = -1;
  currentFLevel = 0;
  smoothFLevel = 0;

  // 清掉微波炉对话，避免关闭罗盘后对话还留在画面上
  dialogText = "";
  dialogImage = null;
  currentDialogIndex = -1;

  if (!yearButtonsCreated) createYearButtons();

  if (!dialogButtonsHidden) {
    dialogButtons.forEach(btn => btn.hide());
    dialogButtonsHidden = true;
  }

  if (otherButton) {
    otherButton.remove();
    otherButton = null;
  }
}

function showYearGroup(year) {
  // 年级数据显示时也强制保持罗盘关闭
  showCompass = false;
  activeHandle = -1;
  currentFLevel = 0;
  smoothFLevel = 0;

  eyes = [];
  for (let i = 1; i <= year; i++) {
    eyes = eyes.concat(yearEyes[i]);
  }
}

function restartSketch() {
  eyes = [];
  showCompass = false;
  activeHandle = -1;
  currentFLevel = 0;
  smoothFLevel = 0;
  dialogText = "";
  dialogImage = null;
  currentDialogIndex = -1;
  popupVisible = false;
  backgroundVisible = true;

  yearButtons.forEach(btn => btn.remove());
  buttons = buttons.filter(btn => !yearButtons.includes(btn));
  yearButtons = [];
  yearButtonsCreated = false;

  dialogButtons.forEach(btn => btn.show());
  dialogButtonsHidden = false;

  // 让原版眼睛下次重新从 0 长出来
  for (let y = 1; y <= 4; y++) {
    yearEyes[y].forEach(eye => {
      eye.currentSize = 0;
      eye.hoverStartTime = null;
    });
  }

  if (otherButton) otherButton.remove();
  createOtherButton();
}


// --- 原版眼睛数据初始化 ---
function initEyesData() {
  yearEyes = { 1: [], 2: [], 3: [], 4: [] };

  if (!table) return;

  let rows = table.getRows();
  const totalParts = 4;
  const gap = 20;
  const partWidth = (width - (gap * (totalParts - 1))) / totalParts;

  rows.forEach(row => {
    let year = row.getNum("University_Year") - 1;
    let yearKey = year + 1;

    if (yearKey < 1 || yearKey > 4) return;

    let centerX = (year % totalParts) * (partWidth + gap) + random(partWidth * 2);
    let centerY = random(height * 0.78) + 80;

    let eyeSize = map(
      row.getNum("Sleep_Quality"),
      1, 10,
      width * 0.05,
      width * 0.26
    );

    let pupilSize = map(
      row.getNum("Caffeine_Intake"),
      0, 10,
      0.4,
      0.6
    );

    let eyeColors = [
      '#F7C8D0',
      '#FBE7C6',
      '#D6EADF',
      '#DCE6F2',
      '#E4D7F5',
      '#F3D8C7'
    ];

    let eye = new Eye(centerX, centerY, eyeSize, eyeColors, pupilSize, row);
    yearEyes[yearKey].push(eye);
  });
}

// --- 睡眠质量三档眼睛 ---
// High   : 7-10  -> 保留原版四三角眼睛
// Medium : 4-6   -> 外框不变，内部更扁、更有分段感
// Low    : 1-3   -> 外框不变，内部是明显眯眼/窄缝状态
class Eye {
  constructor(x, y, size, pupilColors, pupilSize, data) {
    this.x = x;
    this.y = y - 60;
    this.baseSize = size * 0.29;
    this.colors = pupilColors;
    this.pupilSize = pupilSize;
    this.data = data;
    this.year = data.getNum("University_Year");
    this.sleepQuality = data.getNum("Sleep_Quality");

    if (this.sleepQuality >= 7) this.sleepLevel = "HIGH";
    else if (this.sleepQuality >= 4) this.sleepLevel = "MEDIUM";
    else this.sleepLevel = "LOW";

    this.rotOffset = random(1000);
    this.floatOffset = random(1000);
    this.currentSize = 0;
    this.targetSize = size * 0.19;
    this.growthSpeed = 0.03;
    this.hoverStartTime = null;
  }

  draw() {
    push();
    translate(this.x, this.y);

    let scaleFactor = this.isHovered() ? 1.5 : 1;
    this.currentSize = lerp(this.currentSize, this.targetSize, this.growthSpeed);
    scale(scaleFactor);

    // 保留原版整体轻微摆动，高中低一致
    let angle = sin(frameCount * 3 + this.rotOffset) * 8;
    rotate(angle);

    let r = this.currentSize / 2;
    let t = this.currentSize / 6;

    // 外面四个角完全沿用原版运动方式
    let triX = sin(frameCount * 2 + this.floatOffset) * 5;
    let triY = cos(frameCount * 2 + this.floatOffset) * 5;

    let sc = color(235);
    if (this.year === 2) sc = color(235, 195, 235);
    else if (this.year === 3) sc = color(195, 235, 235);
    else if (this.year === 4) sc = color(235, 235, 195);

    stroke(sc);
    strokeWeight(1);
    fill(255, 255, 255, 130);

    // 外部四角与原版完全一致，不改位置、不改比例
    this.drawOriginalOuterCorners(r, t, triX, triY);

    if (this.sleepLevel === "HIGH") {
      this.drawIrisPieChart(r, "HIGH");

      // High：完全恢复原版菱形/方形瞳孔与原版鼠标跟随方式
      let mx = map(mouseX, 0, width, -this.currentSize * 0.08, this.currentSize * 0.08);
      let my = map(mouseY, 0, height, -this.currentSize * 0.05, this.currentSize * 0.05);
      fill(85, 85, 85, 149);
      let pupilD = (this.currentSize / 1.6) * this.pupilSize;
      diamond(mx * 1.8, my * 1.8, pupilD, pupilD);
    }

    else if (this.sleepLevel === "MEDIUM") {
      // 中档：保持外框比例不变，只让内部更扁、更宽，一眼区别于高档
      push();
      scale(1.08, 0.62);
      this.drawIrisPieChart(r * 1.02, "MEDIUM");
      pop();

      let mx = map(mouseX, 0, width, -this.currentSize * 0.09, this.currentSize * 0.09);
      let my = map(mouseY, 0, height, -this.currentSize * 0.016, this.currentSize * 0.016);
      fill(70, 70, 70, 185);
      let pupilW = (this.currentSize / 1.18) * this.pupilSize;
      let pupilH = pupilW * 0.42;
      ellipse(mx * 1.45, my * 1.05, pupilW, pupilH);

      // 再加一层浅色外轮廓，让中档瞳孔更容易识别
      noFill();
      stroke(235, 235, 235, 115);
      strokeWeight(max(1, r * 0.022));
      ellipse(mx * 1.45, my * 1.05, pupilW * 1.24, pupilH * 1.55);

      this.drawMediumInnerLids(r);
    }

    else {
      // 低档：内部明显眯眼，虹膜成窄带，瞳孔是超扁细缝
      push();
      scale(1.12, 0.24);
      this.drawIrisPieChart(r * 1.05, "LOW");
      pop();

      // 低档瞳孔固定在中心，不再跟随鼠标移动
      let mx = 0;
      let my = 0;

      let pupilW = (this.currentSize / 0.96) * this.pupilSize;
      let pupilH = pupilW * 0.12;
      fill(48, 48, 48, 220);
      ellipse(mx, my, pupilW, pupilH);

      // 两侧补短线，形成更明显的“细缝瞳孔”辨识度
      stroke(245, 245, 245, 125);
      strokeWeight(max(1, r * 0.018));
      line(-pupilW * 0.76, my, -pupilW * 0.50, my);
      line( pupilW * 0.50, my,  pupilW * 0.76, my);

      this.drawLowSquintLids(r);
    }

    if (this.isHovered() && !this.hoverStartTime) {
      this.hoverStartTime = millis();
    } else if (!this.isHovered()) {
      this.hoverStartTime = null;
    }

    pop();
  }

  drawOriginalOuterCorners(r, t, triX, triY) {
    triangle(triX, -r - t + triY, -r, 0, r, 0);
    triangle(r + t + triX, triY, 0, -r, 0, r);
    triangle(triX, r + t + triY, -r, 0, r, 0);
    triangle(-r - t + triX, triY, 0, -r, 0, r);
  }

  drawMediumInnerLids(r) {
    push();
    noFill();
    stroke(230, 230, 230, 95);
    strokeWeight(max(1, r * 0.025));

    bezier(
      -r * 0.70, -r * 0.18,
      -r * 0.30, -r * 0.08,
       r * 0.30, -r * 0.08,
       r * 0.70, -r * 0.18
    );

    bezier(
      -r * 0.70,  r * 0.18,
      -r * 0.30,  r * 0.08,
       r * 0.30,  r * 0.08,
       r * 0.70,  r * 0.18
    );
    pop();
  }

  drawLowSquintLids(r) {
    push();
    noFill();

    stroke(235, 235, 235, 190);
    strokeWeight(max(1.8, r * 0.048));

    bezier(
      -r * 0.78, -r * 0.12,
      -r * 0.32, -r * 0.005,
       r * 0.32, -r * 0.005,
       r * 0.78, -r * 0.12
    );

    bezier(
      -r * 0.78,  r * 0.12,
      -r * 0.32,  r * 0.005,
       r * 0.32,  r * 0.005,
       r * 0.78,  r * 0.12
    );

    stroke(235, 235, 235, 120);
    strokeWeight(max(1, r * 0.025));
    line(-r * 0.68, -r * 0.09, -r * 0.50, -r * 0.01);
    line(-r * 0.68,  r * 0.09, -r * 0.50,  r * 0.01);
    line( r * 0.68, -r * 0.09,  r * 0.50, -r * 0.01);
    line( r * 0.68,  r * 0.09,  r * 0.50,  r * 0.01);
    pop();
  }

  isHovered() {
    return dist(mouseX, mouseY, this.x, this.y) < this.currentSize * 1.5;
  }

  drawIrisPieChart(radius, style = "HIGH") {
    let data = [
      this.data.getNum("Sleep_Duration"),
      this.data.getNum("Study_Hours"),
      this.data.getNum("Screen_Time"),
      this.data.getNum("Physical_Activity")
    ];

    let total = data.reduce((a, b) => a + b, 0) || 1;
    let proportions = data.map(d => d / total);
    let colors = [
      color(84, 93, 95),
      color(53, 58, 60),
      color(138, 143, 144),
      color(227, 227, 228)
    ];

    let startA = 0;

    if (style === "HIGH") {
      for (let i = 0; i < proportions.length; i++) {
        let angle = proportions[i] * 360;
        fill(colors[i]);
        arc(0, 0, radius, radius, startA, startA + angle);
        startA += angle;
      }
      return;
    }

    if (style === "MEDIUM") {
      for (let i = 0; i < proportions.length; i++) {
        let angle = proportions[i] * 360;
        fill(red(colors[i]), green(colors[i]), blue(colors[i]), 230);
        arc(0, 0, radius, radius, startA, startA + angle);

        // 中档：给 pie 图加分段边界，一眼比高档更“机械/分层”
        stroke(255, 110);
        strokeWeight(max(1, radius * 0.022));
        let sx = cos(startA) * radius * 0.50;
        let sy = sin(startA) * radius * 0.50;
        line(0, 0, sx, sy);
        startA += angle;
      }

      // 中档：加一个细外环，增强识别度
      noFill();
      stroke(255, 125);
      strokeWeight(max(1, radius * 0.028));
      ellipse(0, 0, radius * 0.98, radius * 0.98);
      return;
    }

    // LOW：窄缝虹膜，保留数据分段，但用横带+分界线强调“低睡眠质量”
    for (let i = 0; i < proportions.length; i++) {
      let angle = proportions[i] * 360;
      fill(red(colors[i]), green(colors[i]), blue(colors[i]), 245);
      arc(0, 0, radius, radius, startA, startA + angle);
      startA += angle;
    }

    // 低档：上下各加一条内遮罩线，把 pie 图视觉上压成中间窄带，但不改变外部四角
    noStroke();
    fill(12, 14, 16, 110);
    rect(-radius * 0.60, -radius * 0.50, radius * 1.20, radius * 0.28, radius * 0.08);
    rect(-radius * 0.60,  radius * 0.22, radius * 1.20, radius * 0.28, radius * 0.08);

    // 低档：分段竖线更明显
    startA = 0;
    stroke(255, 135);
    strokeWeight(max(1, radius * 0.026));
    for (let i = 0; i < proportions.length; i++) {
      let x = cos(startA) * radius * 0.48;
      let y = sin(startA) * radius * 0.48;
      line(0, 0, x, y);
      startA += proportions[i] * 360;
    }

    // 低档：中部加一条亮线，形成瞇眼窄缝内部结构
    stroke(255, 85);
    strokeWeight(max(1, radius * 0.018));
    line(-radius * 0.46, 0, radius * 0.46, 0);
  }
}

function diamond(cx, cy, w, h) {
  beginShape();
  vertex(cx, cy - h / 2);
  vertex(cx + w / 2, cy);
  vertex(cx, cy + h / 2);
  vertex(cx - w / 2, cy);
  endShape(CLOSE);
}

function displayHoverInfo(e) {
  if (!e.hoverStartTime) return;

  // 完全按原版：hover 后前 1 秒显示信息
  if (millis() - e.hoverStartTime < 1000) {
    push();
    fill(255);
    textSize(18);
    textAlign(CENTER);

    let base = e.y + e.baseSize;
    text(`ID: ${e.data.getString('Student_ID')}`, e.x, base + 30);
    text(`Caffeine: ${e.data.getNum('Caffeine_Intake')} mg`, e.x, base + 50);
    text(`Quality: ${e.data.getNum('Sleep_Quality')}`, e.x, base + 70);
    pop();
  }
}

// --- 鼠标输入逻辑 ---

function mousePressed() {
  if (showCompass) {
    for (let i = 0; i < 4; i++) {
      let x = compassCenterX + cos(handleAngles[i]) * compassRadius;
      let y = compassCenterY + sin(handleAngles[i]) * compassRadius;
      if (dist(mouseX, mouseY, x, y) < 45) { activeHandle = i; return; }
    }
  }
}

function mouseDragged() {
  if (showCompass && activeHandle !== -1) {
    let a = atan2(mouseY - compassCenterY, mouseX - compassCenterX);
    if (a < 0) a += 360;
    handleAngles[activeHandle] = a;
  }
}

function mouseReleased() { activeHandle = -1; }

function calculateCompassHours() {
  for (let i = 0; i < 4; i++) {
    let diff = (handleAngles[(i + 1) % 4] - handleAngles[i] + 360) % 360;
    compassHours[i] = map(diff, 0, 360, 0, 20);
  }
}

// --- 轨道粒子类 ---
class OrbitStar {
  constructor() { 
    this.angle = random(360); 
    this.dist = random(compassRadius + 20, compassRadius + 180); 
    this.speed = random(0.05, 0.2); 
    this.size = random(1.5, 3.5);
  }
  update(f) { this.angle += this.speed * (1.2 - f); }
  display(f) {
    let x = compassCenterX + cos(this.angle) * this.dist;
    let y = compassCenterY + sin(this.angle) * this.dist;
    noStroke(); 
    fill(255, 180 * (1 - f * 0.7)); 
    circle(x, y, this.size);
  }
}

// --- 对话框绘制与引导 ---

function getIntroText() {
  let idx = floor((millis() - introStartTime) / 2500);
  if (idx < introMessages.length) return introMessages[idx];
  introFinished = true; return "";
}

function drawDialogBox(t) {
  push(); fill(210, 218, 230, 90); stroke(255, 180); rect(width/2-420, height-620, 840, 220, 28);
  fill(255); textSize(24); textAlign(LEFT, TOP); text(t, width/2-280, height-580, 660, 150); pop();
}

function drawPopupImage() {
  push(); fill(0, 220); rect(0, 0, width, height); imageMode(CENTER);
  let sc = min(width*0.5/popupImage.width, height*0.5/popupImage.height);
  image(popupImage, width/2, height/2, popupImage.width*sc*1.8, popupImage.height*sc*1.8); pop();
}

function handleDialogs() {
  if (dialogText !== "") {
    if (currentDialogIndex === 3 && millis() - microwaveStartTime > 10000) {
      dialogText = ""; dialogImage = null;
    } else {
      drawDialogBox(dialogText);
      if (dialogImage) {
        let cfg = dialogSettings[currentDialogIndex];
        image(dialogImage, width / 2 + cfg.imgX, height + cfg.imgY, cfg.w, cfg.h);
      }
    }
  } else if (!introFinished) {
    let it = getIntroText();
    if (it !== "") drawDialogBox(it);
  }
}

function startBGM() { if (!bgmStarted && bgm) { userStartAudio(); bgm.loop(); bgmStarted = true; } }