const state = {
  records: [],
  filtered: [],
  selected: null,
  outputFilter: "all",
  mode: "search",
  pinnedRecord: null,
  lastQuery: "",
  suggestionRecords: [],
  searchFocused: false,
  bomItems: [],
};

const el = {
  backLink: document.querySelector("#backLink"),
  modeTabs: [...document.querySelectorAll(".modeTab")],
  appearancePanel: document.querySelector("#appearancePanel"),
  appearanceGroups: document.querySelector("#appearanceGroups"),
  searchInput: document.querySelector("#searchInput"),
  suggestions: document.querySelector("#suggestions"),
  chips: [...document.querySelectorAll(".chip")],
  productPhoto: document.querySelector("#productPhoto"),
  photoFallback: document.querySelector("#photoFallback"),
  panasonicModel: document.querySelector("#panasonicModel"),
  omronModel: document.querySelector("#omronModel"),
  series: document.querySelector("#series"),
  shape: document.querySelector("#shape"),
  cable: document.querySelector("#cable"),
  output: document.querySelector("#output"),
  baseModel: document.querySelector("#baseModel"),
  downloadList: document.querySelector("#downloadList"),
  bomQty: document.querySelector("#bomQty"),
  addBomBtn: document.querySelector("#addBomBtn"),
  bomCount: document.querySelector("#bomCount"),
  bomRows: document.querySelector("#bomRows"),
  exportBomBtn: document.querySelector("#exportBomBtn"),
  clearBomBtn: document.querySelector("#clearBomBtn"),
};

const bomStorageKey = "panasonicA6QuoteItems";

const normalize = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

const compact = (value) => normalize(value).replace(/[^A-Z0-9]/g, "");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const scoreRecord = (record, query) => {
  if (!query) return 1;
  const q = normalize(query);
  const cq = compact(query);
  const fields = [record.omron, record.panasonic, record.panasonicBase, record.group, record.shape].map(normalize);
  const compactFields = fields.map(compact);

  if (fields.some((field) => field === q) || compactFields.some((field) => field === cq)) return 100;
  if (fields.some((field) => field.startsWith(q)) || compactFields.some((field) => field.startsWith(cq))) return 75;
  if (fields.some((field) => field.includes(q)) || compactFields.some((field) => field.includes(cq))) return 50;

  const parts = q.split(" ").filter(Boolean);
  if (parts.length && parts.every((part) => fields.some((field) => field.includes(part)))) return 25;
  return 0;
};

const matchPriority = (record, query) => {
  if (!query) return 0;
  const q = normalize(query);
  const cq = compact(query);
  const panasonic = normalize(record.panasonic);
  const panasonicBase = normalize(record.panasonicBase);
  const omron = normalize(record.omron);
  const cPanasonic = compact(record.panasonic);
  const cPanasonicBase = compact(record.panasonicBase);
  const cOmron = compact(record.omron);

  if (panasonic === q || cPanasonic === cq) return 90;
  if (panasonicBase === q || cPanasonicBase === cq) return 80;
  if (omron === q || cOmron === cq) return 70;
  if (panasonic.startsWith(q) || cPanasonic.startsWith(cq)) return 60;
  if (panasonicBase.startsWith(q) || cPanasonicBase.startsWith(cq)) return 50;
  if (omron.startsWith(q) || cOmron.startsWith(cq)) return 40;
  if (panasonic.includes(q) || cPanasonic.includes(cq)) return 30;
  if (panasonicBase.includes(q) || cPanasonicBase.includes(cq)) return 20;
  if (omron.includes(q) || cOmron.includes(cq)) return 10;
  return 0;
};

const findExactRecord = (records, query) => {
  if (!query) return null;
  const q = normalize(query);
  const cq = compact(query);
  return (
    records.find((record) => normalize(record.panasonic) === q || compact(record.panasonic) === cq) ||
    records.find((record) => normalize(record.panasonicBase) === q || compact(record.panasonicBase) === cq) ||
    records.find((record) => normalize(record.omron) === q || compact(record.omron) === cq) ||
    null
  );
};

const fileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
};

const plainText = (value) => String(value || "").replace(/\s+/g, " ").trim();

const sanitizeQty = (value) => Math.max(1, Math.floor(Number(value) || 1));

const cableModel = "CN-14A-C2-YY";

const needsSeparateCable = (record) => String(record?.cable || "").includes(cableModel);

const cleanCableForSpec = (value) =>
  plainText(value)
    .replace(cableModel, "")
    .replace(/\s+/g, "")
    .trim();

const bomSpecFor = (record) => {
  if (!record) return "";
  const shape = plainText(record.shape);
  const cable = needsSeparateCable(record) ? "外接線" : cleanCableForSpec(record.cable);
  const output = plainText(record.output);
  return [`光電素子 ${shape}`, cable ? `${needsSeparateCable(record) ? "" : "線長"}${cable}` : "", output].filter(Boolean).join("/");
};

const quoteKey = (item) => `${item.category}|${item.model}|${item.spec}|${item.note ?? ""}`;

function saveBom() {
  try {
    localStorage.setItem(bomStorageKey, JSON.stringify(state.bomItems));
  } catch (error) {
    console.warn("BOM save failed", error);
  }
}

function normalizeBomItem(item) {
  const sourceRecord = state.records.find((record) => record.panasonic === item.model);
  const normalized = {
    category: item.category || "光電素子",
    model: item.model || "",
    spec: item.spec || "",
    qty: sanitizeQty(item.qty),
    note: item.note || "",
  };

  if (normalized.category === "光電素子") {
    normalized.spec = bomSpecFor(sourceRecord);
    normalized.note = "";
  }

  normalized.key = quoteKey(normalized);
  return normalized;
}

function mergeBomItem(item) {
  const normalized = normalizeBomItem(item);
  if (!normalized.model) return null;
  const existing = state.bomItems.find((bomItem) => bomItem.key === normalized.key);
  if (existing) {
    existing.qty = sanitizeQty(existing.qty) + sanitizeQty(normalized.qty);
    return existing;
  }
  state.bomItems.push(normalized);
  return normalized;
}

function loadBom() {
  try {
    const saved = JSON.parse(localStorage.getItem(bomStorageKey) || "[]");
    state.bomItems = [];
    if (Array.isArray(saved)) {
      saved.forEach((item) => mergeBomItem(item));
      saveBom();
    }
  } catch (error) {
    state.bomItems = [];
  }
}

const formatCable = (value) => {
  const text = String(value || "--");
  const target = "CN-14A-C2-YY";
  if (!text.includes(target)) return escapeHtml(text);
  return `${escapeHtml(text).replaceAll(target, `<span class="buySeparately">${target}</span>`)} <span class="note">(線需單獨購買)</span>`;
};

const appearanceOrder = {
  "PM-25": ["PM-K25", "PM-L25", "PM-U25", "PM-F25", "PM-R25"],
  "PM-45": ["PM-K45", "PM-T45", "PM-L45", "PM-Y45", "PM-F45", "PM-R45"],
  "PM-65": ["PM-K65", "PM-T65", "PM-T65W", "PM-L65", "PM-Y65", "PM-F65", "PM-F65W", "PM-R65", "PM-R65W"],
};

const groupTitle = {
  "PM-25": "PM-25 系列",
  "PM-45": "PM-45 系列",
  "PM-65": "PM-65 系列",
};

const appearanceImageFor = (model) => `assets/appearance/${model.toLowerCase()}.png?v=2`;

function configureBackLink() {
  const params = new URLSearchParams(window.location.search);
  const backUrl = params.get("back") || params.get("from");
  const backLabel = params.get("backLabel");

  if (backUrl && backUrl.toLowerCase() === "hide") {
    el.backLink.hidden = true;
    return;
  }

  if (backUrl) {
    el.backLink.href = backUrl;
  }

  if (backLabel) {
    el.backLink.textContent = backLabel;
  }
}

function applyFilters() {
  const query = el.searchInput.value;
  state.lastQuery = query;
  const exactRecord = findExactRecord(state.records, query);
  const scored = state.records
    .map((record) => ({ record, score: scoreRecord(record, query), priority: matchPriority(record, query) }))
    .filter(({ record, score }) => {
      const outputOk = state.outputFilter === "all" || record.output === state.outputFilter;
      const exactOk = exactRecord === record;
      return score > 0 && (outputOk || exactOk);
    })
    .sort((a, b) => b.priority - a.priority || b.score - a.score || a.record.panasonic.localeCompare(b.record.panasonic));

  const records = scored.map(({ record }) => record);
  state.filtered = exactRecord && !records.includes(exactRecord) ? [exactRecord, ...records] : records;
  state.selected = state.filtered.includes(state.pinnedRecord) ? state.pinnedRecord : exactRecord || state.filtered[0] || null;
  state.suggestionRecords = state.filtered.slice(0, 12);
  renderSuggestions(query);
  render();
}

function getBaseRecord(baseModel) {
  return (
    state.records.find((record) => record.panasonic === baseModel) ||
    state.records.find((record) => record.panasonicBase === baseModel && record.output === "NPN") ||
    state.records.find((record) => record.panasonicBase === baseModel) ||
    null
  );
}

function selectRecord(record, options = {}) {
  if (!record) return;
  state.pinnedRecord = record;
  state.selected = record;
  if (options.syncSearch !== false) {
    el.searchInput.value = record.panasonic;
  }
  applyFilters();
}

function setMode(mode) {
  state.mode = mode;
  el.modeTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === mode));
  el.appearancePanel.hidden = mode !== "appearance";
}

function renderAppearanceSelector() {
  el.appearanceGroups.innerHTML = Object.entries(appearanceOrder)
    .map(([group, models]) => {
      const cards = models
        .map((model) => getBaseRecord(model))
        .filter(Boolean)
        .map(
          (record) => `
            <button class="appearanceCard" type="button" data-model="${escapeHtml(record.panasonicBase)}">
              <span class="appearanceImage">
                <img src="${escapeHtml(appearanceImageFor(record.panasonicBase))}" alt="${escapeHtml(record.panasonicBase)} 外型照片" />
              </span>
              <strong>${escapeHtml(record.panasonicBase)}</strong>
              <span>${escapeHtml(record.shape)} / ${escapeHtml(record.group)}</span>
            </button>
          `,
        )
        .join("");
      return `
        <section class="appearanceGroup">
          <h3>${escapeHtml(groupTitle[group] || group)}</h3>
          <div class="appearanceGrid">${cards}</div>
        </section>
      `;
    })
    .join("");
}

function updateAppearanceSelection() {
  const current = state.selected?.panasonicBase;
  document.querySelectorAll(".appearanceCard").forEach((card) => {
    card.classList.toggle("selected", card.dataset.model === current);
  });
}

function renderSuggestions(query = el.searchInput.value) {
  const shouldShow = state.searchFocused && query.trim() && state.suggestionRecords.length;
  if (!shouldShow) {
    el.suggestions.classList.remove("active");
    el.suggestions.innerHTML = "";
    return;
  }

  el.suggestions.classList.add("active");
  el.suggestions.innerHTML = state.suggestionRecords
    .map(
      (record, index) => `
        <button class="suggestion" type="button" data-index="${index}">
          <strong>${escapeHtml(record.panasonic)}</strong>
          <span>OMRON: ${escapeHtml(record.omron)}</span>
          <span>${escapeHtml(record.group)} / ${escapeHtml(record.shape)} / ${formatCable(record.cable)} / ${escapeHtml(record.output || "--")}</span>
        </button>
      `,
    )
    .join("");
}

function renderDetail() {
  const record = state.selected;
  if (!record) {
    el.panasonicModel.textContent = "--";
    el.omronModel.textContent = "--";
    el.series.textContent = "--";
    el.shape.textContent = "--";
    el.cable.textContent = "--";
    el.output.textContent = "--";
    el.baseModel.textContent = "--";
    el.productPhoto.removeAttribute("src");
    el.productPhoto.style.display = "none";
    el.photoFallback.style.display = "block";
    el.downloadList.innerHTML = `<div class="empty">沒有符合的型號</div>`;
    return;
  }

  el.panasonicModel.textContent = record.panasonic;
  el.omronModel.textContent = record.omron;
  el.series.textContent = record.group || "--";
  el.shape.textContent = record.shape || "--";
  el.cable.innerHTML = formatCable(record.cable);
  el.output.textContent = record.output || "--";
  el.baseModel.textContent = record.panasonicBase;

  if (record.photo) {
    el.productPhoto.src = record.photo;
    el.productPhoto.style.display = "block";
    el.photoFallback.style.display = "none";
  } else {
    el.productPhoto.removeAttribute("src");
    el.productPhoto.style.display = "none";
    el.photoFallback.style.display = "block";
  }

  if (!record.files.length) {
    el.downloadList.innerHTML = `<div class="empty">此型號目前沒有可下載圖檔</div>`;
    return;
  }

  el.downloadList.innerHTML = record.files
    .map(
      (file) => `
        <a class="download" data-type="${file.type}" href="${encodeURI(file.url)}" download>
          <span class="downloadType">${escapeHtml(file.type)}</span>
          <span class="downloadName">${escapeHtml(file.name)}</span>
          <span class="downloadSize">${fileSize(file.size)}</span>
        </a>
      `,
    )
    .join("");
}

function renderBom() {
  el.bomCount.textContent = `${state.bomItems.length} 項`;
  if (!state.bomItems.length) {
    el.bomRows.innerHTML = `<tr><td colspan="6">尚未加入 BOM。</td></tr>`;
    return;
  }

  el.bomRows.innerHTML = state.bomItems
    .map(
      (item, index) => `
        <tr>
          <td>${escapeHtml(item.category)}</td>
          <td>
            <strong>${escapeHtml(item.model)}</strong>
          </td>
          <td>${escapeHtml(item.spec)}</td>
          <td>
            <input class="bomQtyInput" type="number" min="1" step="1" value="${escapeHtml(item.qty)}" data-bom-qty="${index}" />
          </td>
          <td><input class="bomNoteInput" type="text" value="${escapeHtml(item.note ?? "")}" data-bom-note="${index}" /></td>
          <td><button class="bomDelete" type="button" data-bom-delete="${index}">刪除</button></td>
        </tr>
      `,
    )
    .join("");
}

function render() {
  renderDetail();
  renderBom();
  updateAppearanceSelection();
}

function addSelectedToBom() {
  const record = state.selected;
  if (!record) return;
  const qty = sanitizeQty(el.bomQty.value);
  el.bomQty.value = qty;
  const sensorItem = {
    category: "光電素子",
    model: record.panasonic,
    spec: bomSpecFor(record),
    qty,
    note: "",
  };

  const addedItems = [mergeBomItem(sensorItem)];

  if (needsSeparateCable(record)) {
    addedItems.push(
      mergeBomItem({
        category: "連接線",
        model: cableModel,
        spec: "外接2M線",
        qty,
        note: "線需單獨購買",
      }),
    );
  }

  saveBom();
  renderBom();
  addedItems.filter(Boolean).forEach((item) => {
    window.dispatchEvent(new CustomEvent("panasonic-bom-item-added", { detail: item }));
  });
}

function rowsToCsv(rows) {
  return "\ufeff" + rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
}

function exportBom() {
  const rows = [
    ["類別", "型號", "規格", "數量", "備註"],
    ...state.bomItems.map((item) => [item.category, item.model, item.spec, item.qty, item.note ?? ""]),
  ];
  const blob = new Blob([rowsToCsv(rows)], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "photoelectric-bom.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function chooseSuggestion(button) {
  if (!button) return;
  const record = state.suggestionRecords[Number(button.dataset.index)];
  if (!record) return;
  state.searchFocused = false;
  selectRecord(record);
  renderSuggestions();
}

function bindEvents() {
  const updateFromSearch = () => {
    state.pinnedRecord = null;
    applyFilters();
  };

  el.searchInput.addEventListener("input", updateFromSearch);
  el.searchInput.addEventListener("beforeinput", () => window.setTimeout(updateFromSearch, 0));
  el.searchInput.addEventListener("paste", () => window.setTimeout(updateFromSearch, 0));
  el.searchInput.addEventListener("keyup", updateFromSearch);
  el.searchInput.addEventListener("keydown", () => window.setTimeout(updateFromSearch, 0));
  el.searchInput.addEventListener("search", updateFromSearch);
  el.searchInput.addEventListener("compositionend", updateFromSearch);
  el.searchInput.addEventListener("focus", () => {
    setMode("search");
    state.searchFocused = true;
    applyFilters();
  });
  el.searchInput.addEventListener("blur", () => {
    window.setTimeout(() => {
      state.searchFocused = false;
      renderSuggestions();
    }, 160);
  });

  el.searchInput.addEventListener("change", () => {
    state.pinnedRecord = findExactRecord(state.records, el.searchInput.value);
    applyFilters();
  });

  el.modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setMode(tab.dataset.mode);
    });
  });

  el.appearanceGroups.addEventListener("click", (event) => {
    const card = event.target.closest(".appearanceCard");
    if (!card) return;
    const record = getBaseRecord(card.dataset.model);
    setMode("appearance");
    selectRecord(record);
  });

  el.suggestions.addEventListener("pointerdown", (event) => {
    const button = event.target.closest(".suggestion");
    if (!button) return;
    event.preventDefault();
    chooseSuggestion(button);
  });

  el.suggestions.addEventListener("mousedown", (event) => {
    const button = event.target.closest(".suggestion");
    if (!button) return;
    event.preventDefault();
  });

  el.suggestions.addEventListener("click", (event) => {
    chooseSuggestion(event.target.closest(".suggestion"));
  });

  el.chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      state.outputFilter = chip.dataset.filter;
      el.chips.forEach((item) => item.classList.toggle("active", item === chip));
      applyFilters();
    });
  });

  el.addBomBtn.addEventListener("click", addSelectedToBom);
  el.exportBomBtn.addEventListener("click", exportBom);
  el.clearBomBtn.addEventListener("click", () => {
    state.bomItems = [];
    saveBom();
    renderBom();
  });

  el.bomRows.addEventListener("change", (event) => {
    const input = event.target.closest("[data-bom-qty]");
    if (!input) return;
    const index = Number(input.dataset.bomQty);
    state.bomItems[index].qty = sanitizeQty(input.value);
    input.value = state.bomItems[index].qty;
    saveBom();
    renderBom();
  });

  el.bomRows.addEventListener("input", (event) => {
    const input = event.target.closest("[data-bom-note]");
    if (!input) return;
    const index = Number(input.dataset.bomNote);
    state.bomItems[index].note = input.value;
    state.bomItems[index].key = quoteKey(state.bomItems[index]);
    saveBom();
  });

  el.bomRows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-bom-delete]");
    if (!button) return;
    state.bomItems.splice(Number(button.dataset.bomDelete), 1);
    saveBom();
    renderBom();
  });

  window.setInterval(() => {
    if (el.searchInput.value !== state.lastQuery) {
      state.pinnedRecord = findExactRecord(state.records, el.searchInput.value);
      applyFilters();
    }
  }, 250);
}

async function init() {
  let data = window.PRODUCT_DATA;
  if (!data) {
    const response = await fetch("data/products.json");
    data = await response.json();
  }
  state.records = data.records;
  state.filtered = data.records;
  state.selected = state.records[0] || null;
  loadBom();
  configureBackLink();
  renderAppearanceSelector();
  bindEvents();
  render();
}

init().catch((error) => {
  console.error(error);
  el.downloadList.innerHTML = `<div class="empty">資料載入失敗，請確認 data/products.json 存在</div>`;
});
