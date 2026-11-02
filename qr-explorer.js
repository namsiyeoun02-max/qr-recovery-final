(() => {
  "use strict";

  const map = document.getElementById("qx-map");
  if (!map) return;

  const NS = "http://www.w3.org/2000/svg";
  const N = 25;

  // 확대할 때 조각 사이가 벌어지는 정도
  const SPREAD = 0.12;

  const matrix = [
    "1111111000011011001111111",
    "1000001010001001001000001",
    "1011101000111001101011101",
    "1011101000111011101011101",
    "1011101010100011001011101",
    "1000001000001111101000001",
    "1111111010101010101111111",
    "0000000000010111100000000",
    "1010101000110100100010010",
    "1110010010110000101000001",
    "1001011110110000101000111",
    "1111010010000100101100010",
    "0111111000011110001101011",
    "0010010101111000111001001",
    "1010111100111100110100111",
    "0101100110001100100010010",
    "1011011001111101111111000",
    "0000000010110101100011011",
    "1111111001000011101011011",
    "1000001000101111100011000",
    "1011101011011100111111000",
    "1011101001100111100111100",
    "1011101010001010110010001",
    "1000001000110100110011010",
    "1111111010000101111100011"
  ];

  const parts = {
    finder: {
      title: "위치 검출 패턴",
      en: "FINDER PATTERN",
      color: "#475569",
      lead: "세 모서리에서 QR을 찾는 기준",
      body:
        "QR의 위치와 방향을 파악하는 기준입니다. 가운데를 가로지르는 흑백 폭의 비율은 1:1:3:1:1입니다.",
      location: "왼쪽 위·오른쪽 위·왼쪽 아래 / 7 × 7 모듈"
    },
    separator: {
      title: "분리자",
      en: "SEPARATOR",
      color: "#94a3b8",
      lead: "위치 검출 패턴을 구분하는 흰색 띠",
      body:
        "위치 검출 패턴과 주변 데이터 무늬가 이어져 보이지 않도록 구분합니다. 흰색 칸도 QR 구조의 일부입니다.",
      location: "위치 검출 패턴 주변 / 폭 1모듈"
    },
    alignment: {
      title: "정렬 패턴",
      en: "ALIGNMENT PATTERN",
      color: "#059669",
      lead: "휘어짐과 원근 왜곡을 보정하는 기준",
      body:
        "기울거나 곡면에 붙은 QR에서 모듈의 위치를 더 정확히 추정하도록 돕습니다. 버전 2부터 나타나며 버전에 따라 개수와 위치가 달라집니다.",
      location: "이 예시에서는 오른쪽 아래 / 5 × 5 모듈"
    },
    timing: {
      title: "타이밍 패턴",
      en: "TIMING PATTERN",
      color: "#7c3aed",
      lead: "검정과 흰색이 번갈아 나오는 격자 자",
      body:
        "모듈 간격과 행·열 좌표를 추정하는 기준입니다. 데이터를 어느 칸에서 읽어야 하는지 판단하도록 돕습니다.",
      location: "위쪽 가로선과 왼쪽 세로선 / 폭 1모듈"
    },
    format: {
      title: "포맷 정보",
      en: "FORMAT INFORMATION",
      color: "#d97706",
      lead: "오류정정 수준과 마스크 번호",
      body:
        "오류정정 수준 2비트와 마스크 번호 3비트에 BCH 보호 비트 10비트를 더한 15비트 정보입니다. 같은 정보가 두 곳에 배치됩니다. 포맷 정보의 BCH와 데이터 복원의 RS는 구분됩니다.",
      location: "위치 검출 패턴 옆 / 15비트 × 2벌"
    },
    dark: {
      title: "다크 모듈",
      en: "DARK MODULE",
      color: "#0284c7",
      lead: "항상 검은색으로 고정된 한 칸",
      body:
        "QR 내용과 관계없이 항상 검은색으로 지정하는 모듈입니다. 데이터 비트나 오류정정 비트와 구분되는 고정 구조입니다.",
      location: "왼쪽 아래 패턴의 오른쪽 위 부근 / 1모듈"
    },
    data: {
      title: "데이터·오류정정 영역",
      en: "DATA & ERROR CORRECTION",
      color: "#2563eb",
      lead: "내용과 복원에 필요한 정보를 담는 영역",
      body:
        "데이터 코드워드와 Reed–Solomon 오류정정 코드워드가 배치됩니다. 마스크를 해제하고 비트를 읽은 뒤 RS 알고리즘으로 오류를 정정합니다. 일부 칸에는 나머지 비트가 놓입니다.",
      location: "기능 패턴을 제외한 내부 영역"
    },
    quiet: {
      title: "바깥 여백",
      en: "QUIET ZONE",
      color: "#64748b",
      lead: "QR과 주변 배경을 구분하는 빈 공간",
      body:
        "주변 글자나 무늬와 QR의 경계를 구분하도록 돕는 밝은 여백입니다. QR 내부의 분리자와는 다른 영역입니다.",
      location: "QR 바깥 네 면 / 최소 4모듈"
    }
  };

  function element(tag, attributes = {}) {
    const node = document.createElementNS(NS, tag);

    Object.entries(attributes).forEach(([name, value]) => {
      node.setAttribute(name, value);
    });

    return node;
  }

  // 각 모듈의 역할 지정
  const regions = Array.from(
    { length: N },
    () => Array(N).fill("data")
  );

  for (const [ox, oy] of [[0, 0], [18, 0], [0, 18]]) {
    for (let y = Math.max(0, oy - 1);
         y < Math.min(N, oy + 8); y++) {
      for (let x = Math.max(0, ox - 1);
           x < Math.min(N, ox + 8); x++) {
        regions[y][x] =
          x >= ox && x < ox + 7 &&
          y >= oy && y < oy + 7
            ? "finder"
            : "separator";
      }
    }
  }

  for (let i = 8; i < N - 8; i++) {
    regions[6][i] = "timing";
    regions[i][6] = "timing";
  }

  for (let y = 16; y <= 20; y++) {
    for (let x = 16; x <= 20; x++) {
      regions[y][x] = "alignment";
    }
  }

  for (let i = 0; i < 15; i++) {
    const y = i < 6 ? i : i < 8 ? i + 1 : N - 15 + i;
    regions[y][8] = "format";

    const x = i < 8 ? N - i - 1 : i < 9 ? 15 - i : 14 - i;
    regions[8][x] = "format";
  }

  regions[N - 8][8] = "dark";

  const svg = element("svg", {
    viewBox: "-4 -4 33 33",
    "aria-label": "QR 구역을 클릭하면 확대 및 설명"
  });

  const groups = {};
  const cells = new Map();
  const layers = {};

  for (const key of Object.keys(parts)) {
    const group = element("g", { "data-region": key });
    groups[key] = group;
    svg.append(group);
  }

  for (let y = -4; y < N + 4; y++) {
    for (let x = -4; x < N + 4; x++) {
      const outside = x < 0 || y < 0 || x >= N || y >= N;
      const key = outside ? "quiet" : regions[y][x];
      const on = !outside && matrix[y][x] === "1";

      cells.set(`${x},${y}`, { x, y, key, on });

      groups[key].append(element("rect", {
        x, y,
        width: 1,
        height: 1,
        fill: on ? "#142033" : "#fff"
      }));
    }
  }

  // 구역별 색 레이어와 경계선
  for (const [key, group] of Object.entries(groups)) {
    const list = [...cells.values()].filter(c => c.key === key);
    const occupied = new Set(list.map(c => `${c.x},${c.y}`));

    let dark = "";
    let light = "";
    let outline = "";

    for (const { x, y, on } of list) {
      const square = `M${x} ${y}h1v1h-1z`;

      if (on) dark += square;
      else light += square;

      if (!occupied.has(`${x},${y - 1}`)) {
        outline += `M${x} ${y}h1`;
      }
      if (!occupied.has(`${x + 1},${y}`)) {
        outline += `M${x + 1} ${y}v1`;
      }
      if (!occupied.has(`${x},${y + 1}`)) {
        outline += `M${x} ${y + 1}h1`;
      }
      if (!occupied.has(`${x - 1},${y}`)) {
        outline += `M${x} ${y}v1`;
      }
    }

    const layer = element("g", {
      class: "qr-color-layer",
      "pointer-events": "none"
    });

    layer.append(
      element("path", {
        d: dark,
        fill: parts[key].color
      }),
      element("path", {
        d: light,
        fill: parts[key].color,
        "fill-opacity": 0.28
      })
    );

    group.append(
      layer,
      element("path", {
        d: outline,
        fill: "none",
        stroke: parts[key].color,
        "stroke-width": 1,
        "vector-effect": "non-scaling-stroke",
        "pointer-events": "none"
      })
    );

    layers[key] = layer;
  }

  // 초록색 정렬 패턴 테두리를 가장 위에 표시
  svg.append(groups.alignment);
  map.replaceChildren(svg);

  // 설명은 QR 바깥의 별도 공간에 표시
  document.querySelectorAll(".qr-concept-popup")
    .forEach(node => node.remove());

  const card = document.createElement("aside");
  card.className = "qr-concept-popup";
  card.hidden = true;
  card.innerHTML = `
    <button type="button" aria-label="설명 닫기">×</button>
    <small></small>
    <h3></h3>
    <p class="qr-popup-lead"></p>
    <p class="qr-popup-body"></p>
    <div class="qr-popup-location"></div>
  `;

  const layout = document.querySelector(".qx-layout");
  layout.append(card);

  // 이 파일에서 필요한 표시 효과
  document.getElementById("qr-explorer-final-style")?.remove();

  const style = document.createElement("style");
  style.id = "qr-explorer-final-style";
  style.textContent = `
    .qx-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 330px;
      gap: 28px;
      align-items: start;
    }

    .qx-board {
      grid-column: 1;
      min-width: 0;
      width: 100%;
      box-sizing: border-box;
    }

    .qx-detail, .qx-legend {
      display: none !important;
    }

    #qx-map svg {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
      touch-action: manipulation;
    }

    #qx-map .qr-color-layer {
      opacity: 0;
      transition: opacity 0.55s ease;
      pointer-events: none;
    }

    #qx-map .qr-color-layer.is-hovered {
      opacity: 1;
    }

    #qx-map svg > g[data-region] {
      transition: opacity 0.3s ease;
    }

    #qx-map svg:has(.qr-selection) > g[data-region] {
      opacity: 0.65;
    }

    #qx-map svg > g[data-extracted="true"] {
      visibility: hidden;
    }

    #qx-map .qr-selection {
      pointer-events: none;
      filter:
        drop-shadow(0 0.35px 0.2px rgba(15,23,42,0.45))
        drop-shadow(0 0 0.3px rgba(99,102,241,0.35));
    }

    .qx-layout > .qr-concept-popup {
      grid-column: 2;
      grid-row: 1;
      position: sticky;
      top: 150px;
      left: auto;
      width: 100%;
      max-width: none;
      max-height: calc(100vh - 170px);
      overflow-y: auto;
      box-sizing: border-box;
      padding: 24px;
      background: white;
      border: 1px solid #e0e6f0;
      border-top: 4px solid var(--accent);
      border-radius: 18px;
      box-shadow: 0 16px 48px #24314d25;
      margin: 0;
      z-index: 5;
    }

    .qr-concept-popup[hidden] {
      display: none !important;
    }

    .qr-concept-popup button {
      position: absolute;
      right: 12px;
      top: 10px;
      border: 0;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      background: #f1f5f9;
      color: #475569;
      font-size: 20px;
      cursor: pointer;
    }

    .qr-concept-popup small {
      display: block;
      padding-right: 28px;
      font-size: 11px;
      letter-spacing: 0.1em;
      color: var(--accent);
    }

    .qr-concept-popup h3 {
      margin: 12px 0;
      font-size: 24px;
      line-height: 1.35;
      color: #172033;
    }

    .qr-popup-lead {
      font-size: 16px;
      line-height: 1.6;
      color: #334155;
      margin: 0 0 14px;
    }

    .qr-popup-body {
      font-size: 14px;
      line-height: 1.85;
      color: #526078;
      margin: 0;
    }

    .qr-popup-location {
      font-size: 12px;
      line-height: 1.6;
      color: #68758a;
      background: #f4f6fa;
      padding: 12px;
      border-radius: 10px;
      margin-top: 16px;
    }

    @media (max-width: 950px) {
      .qx-layout {
        grid-template-columns: minmax(0, 1fr);
        gap: 20px;
      }

      .qx-layout > .qr-concept-popup {
        grid-column: 1;
        grid-row: 2;
        position: static;
        max-height: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #qx-map .qr-color-layer {
        transition: none;
      }
    }
  `;

  document.head.append(style);

  let hovered = null;
  let raised = null;

  // 확대된 그림과 관계없이 원래 QR 좌표로 판정
  function cellAt(event) {
    const transform = svg.getScreenCTM();
    if (!transform) return null;

    const point = new DOMPoint(
      event.clientX,
      event.clientY
    ).matrixTransform(transform.inverse());

    return cells.get(
      `${Math.floor(point.x)},${Math.floor(point.y)}`
    ) || null;
  }

  function setHover(key) {
    if (hovered === key) return;
    hovered = key;

    Object.entries(layers).forEach(([name, layer]) => {
      layer.classList.toggle("is-hovered", name === key);
    });

    svg.style.cursor = key ? "pointer" : "default";
  }

  function close() {
    raised?.remove();
    raised = null;
    Object.values(groups).forEach(group => group.removeAttribute("data-extracted"));
    card.hidden = true;
  }

  // 같은 종류 중 서로 연결된 한 조각 찾기
  function component(start) {
    const queue = [start];
    const result = [];
    const visited = new Set();

    while (queue.length) {
      const cell = queue.pop();
      const id = `${cell.x},${cell.y}`;

      if (visited.has(id)) continue;

      visited.add(id);
      result.push(cell);

      const neighbors = [
        [cell.x - 1, cell.y],
        [cell.x + 1, cell.y],
        [cell.x, cell.y - 1],
        [cell.x, cell.y + 1]
      ];

      neighbors.forEach(([x, y]) => {
        const next = cells.get(`${x},${y}`);

        if (
          next &&
          next.key === start.key &&
          !visited.has(`${x},${y}`)
        ) {
          queue.push(next);
        }
      });
    }

    return result;
  }

  function show(cell) {
    close();

    const item = parts[cell.key];
    const matching = [...cells.values()].filter(
      c => c.key === cell.key
    );

    const visited = new Set();
    const pieces = [];

    // 같은 종류의 떨어진 구역들을 모두 찾기
    matching.forEach(start => {
      const id = `${start.x},${start.y}`;
      if (visited.has(id)) return;

      const piece = component(start);

      piece.forEach(c => {
        visited.add(`${c.x},${c.y}`);
      });

      pieces.push(piece);
    });

    raised = element("g", {
      class: "qr-selection",
      "pointer-events": "none",
      "aria-hidden": "true"
    });

    const animated = pieces.map(piece => {
      const group = element("g");

      piece.forEach(({ x, y, on }) => {
        group.append(
          element("rect", {
            x, y,
            width: 1,
            height: 1,
            fill: "#fff"
          }),
          element("rect", {
            x, y,
            width: 1,
            height: 1,
            fill: item.color,
            "fill-opacity": on ? 1 : 0.24
          })
        );
      });

      raised.append(group);

      const xs = piece.map(c => c.x);
      const ys = piece.map(c => c.y);

      return {
        group,
        cx: (Math.min(...xs) + Math.max(...xs) + 1) / 2,
        cy: (Math.min(...ys) + Math.max(...ys) + 1) / 2,
        scale: piece.length > 100 ? 1.055 : 1.18
      };
    });

    // 원래 구역을 숨겨 복제본이 아니라 실제로 뽑아낸 듯한 빈자리를 남깁니다.
    groups[cell.key].setAttribute("data-extracted", "true");
    svg.append(raised);

    const current = raised;
    let startTime;

    function frame(now) {
      if (!current.isConnected) return;
      if (startTime === undefined) startTime = now;

      const progress = Math.min((now - startTime) / 300, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      animated.forEach(({ group, cx, cy, scale }) => {
        const size = 1 + (scale - 1) * eased;

        // 확대와 동시에 조각들을 바깥으로 조금 이동
        group.setAttribute(
          "transform",
          `translate(
            ${cx + (cx - 12) * SPREAD * eased}
            ${cy + (cy - 12) * SPREAD * eased}
          )
          scale(${size})
          translate(${-cx} ${-cy})`
        );
      });

      if (progress < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);

    card.style.setProperty("--accent", item.color);
    card.querySelector("small").textContent = item.en;
    card.querySelector("h3").textContent = item.title;
    card.querySelector(".qr-popup-lead").textContent = item.lead;
    card.querySelector(".qr-popup-body").textContent = item.body;
    card.querySelector(".qr-popup-location").textContent =
      item.location;

    card.hidden = false;
  }

  svg.addEventListener("pointermove", event => {
    setHover(cellAt(event)?.key || null);
  });

  svg.addEventListener("pointerleave", () => {
    setHover(null);
  });

  svg.addEventListener("click", event => {
    const cell = cellAt(event);
    if (!cell) return;

    setHover(cell.key);
    show(cell);
  });

  card.querySelector("button").addEventListener("click", close);

  document.addEventListener("pointerdown", event => {
    if (
      !svg.contains(event.target) &&
      !card.contains(event.target)
    ) {
      close();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") close();
  });

  window.addEventListener("resize", close);

  document.getElementById("qx-clear")?.addEventListener(
    "click",
    () => {
      setHover(null);
      close();
    }
  );

  const note = document.querySelector(".qx-note");

  if (note) {
    note.textContent =
      "마우스 올리기: 색 강조 · 클릭: 같은 구역 전체 확대와 설명 · Esc: 닫기";
  }
})();