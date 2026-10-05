let catalog = window.PANASONIC_A6_CATALOG;

const state = {
  series: "A6",
  selectedMotorId: "",
  filters: {
    workingVoltage: "",
    encoder: "L1",
    inertia: "",
    watt: "",
    brake: "",
    ipRating: "IP65",
    control: "",
    speedTorque: "false",
    sto: "false",
    closedLoop: "false",
    absMemory: "standard",
    cableLength: "3 m",
    cableFlex: "標準"
  }
};

const labels = {
  workingVoltage: "請選擇工作電壓",
  encoder: "請選擇編碼器",
  inertia: "請選擇慣量",
  watt: "請選擇瓦數",
  brake: "請選擇煞車",
  ipRating: "請選擇 IP 等級",
  control: "請選擇控制模式",
  speedTorque: "否",
  sto: "否",
  closedLoop: "否",
  absMemory: "一般線材不記憶",
  cableLength: "請選擇線長",
  cableFlex: "請選擇線材材質"
};

const $ = (id) => document.getElementById(id);
const visibleControlModes = ["Pulse", "EtherCAT"];
const accessoryLengths = ["0.5", "1", "2", "3"];
const defaultAccessoryLength = "1";
const accessoryState = {};
const cableSelectionState = {};
const regenResistorState = { checked: false };
const opticalScaleState = { model: "" };
const quoteStorageKey = "panasonicA6QuoteItems";
const legacyQuoteStorageKey = "panasonic-selector-shared-bom-v1";
let quoteItems = loadQuoteItems();

function loadQuoteItems() {
  try {
    const stored = localStorage.getItem(quoteStorageKey);
    const items = JSON.parse(stored ?? localStorage.getItem(legacyQuoteStorageKey) ?? "[]");
    if (!stored && Array.isArray(items) && items.length) {
      localStorage.setItem(quoteStorageKey, JSON.stringify(items));
    }
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function saveQuoteItems() {
  localStorage.setItem(quoteStorageKey, JSON.stringify(quoteItems));
}

window.addEventListener("storage", (event) => {
  if (event.key !== quoteStorageKey && event.key !== legacyQuoteStorageKey) return;
  quoteItems = loadQuoteItems();
  renderQuote();
});

function isA6V() {
  return state.series === "A6V";
}

function setActiveSeries(series) {
  state.series = series === "A6V" ? "A6V" : "A6";
  catalog = isA6V() ? window.PANASONIC_A6V_CATALOG : window.PANASONIC_A6_CATALOG;
  state.selectedMotorId = "";
  Object.keys(cableSelectionState).forEach((id) => delete cableSelectionState[id]);
  Object.assign(state.filters, {
    workingVoltage: "",
    encoder: isA6V() ? "A1" : "L1",
    inertia: "",
    watt: "",
    brake: "",
    ipRating: "IP65",
    control: isA6V() ? "EtherCAT" : "",
    speedTorque: "false",
    sto: "false",
    closedLoop: "false",
    absMemory: "standard",
    cableLength: "3 m",
    cableFlex: "標準"
  });
  buildFilters();
  render();
}

function bindSeriesMenu() {
  const hotspot = $("seriesMenuHotspot");
  const seriesFilter = $("seriesFilter");
  if (!hotspot || !seriesFilter) return;
  seriesFilter.hidden = true;
  seriesFilter.classList.remove("is-unlocked");
  let holdTimer = null;
  const cancelHold = () => {
    clearTimeout(holdTimer);
    holdTimer = null;
  };
  hotspot.addEventListener("pointerdown", () => {
    cancelHold();
    holdTimer = setTimeout(() => {
      seriesFilter.hidden = false;
      seriesFilter.classList.add("is-unlocked");
      $("series").focus();
    }, 3000);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => {
    hotspot.addEventListener(eventName, cancelHold);
  });
  hotspot.addEventListener("contextmenu", (event) => event.preventDefault());
  $("series").addEventListener("change", (event) => setActiveSeries(event.target.value));
}

function lengthsForAccessory(item) {
  if (item.useCableLengths) return cableLengthValues();
  return item.noHalfMeter ? ["1", "2", "3"] : accessoryLengths;
}

function cableLengthValue(length) {
  return String(length).replace(/\s*m$/i, "");
}

function cableLengthValues() {
  return unique(catalog.cableRules.map((cable) => cableLengthValue(cable.length)))
    .sort((a, b) => Number(a) - Number(b));
}

function defaultLengthForAccessory(item) {
  return item.syncCableLength ? cableLengthValue(state.filters.cableLength) : defaultAccessoryLength;
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ""))];
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function formatWatt(watt) {
  if (!watt) return "未分類";
  return watt >= 1000 ? `${watt / 1000} kW` : `${watt} W`;
}

function speedRangeForInertia(inertia) {
  return {
    "高慣量": "3000 / 6500 rpm",
    "低慣量": "3000 / 6000 rpm",
    "中慣量": "2000 / 3000 rpm"
  }[inertia] ?? "待補";
}

function optionLabel(key, value) {
  if (key === "encoder") {
    return { L1: "一般絕對式", A1: "無電池絕對式" }[value] ?? value;
  }
  if (key === "workingVoltage") {
    return { C: "DC24V", B: "DC48V" }[value] ?? value;
  }
  if (key === "watt") return formatWatt(Number(value));
  if (key === "control") return controlModeLabel(value);
  if (key === "inertia") {
    if (isA6V() && value === "高慣量") return "高慣量 - 50W~266W";
    return {
      "高慣量": "高慣量 - 50W~750W",
      "中慣量": "中慣量 - 1KW~5KW",
      "低慣量": "低慣量 - 50W~100W"
    }[value] ?? value;
  }
  if (["brake", "speedTorque", "sto", "closedLoop"].includes(key)) return value === "true" ? "是" : "否";
  if (key === "absMemory") {
    return {
      standard: "一般線材不記憶",
      battery: "帶電池線記憶"
    }[value] ?? value;
  }
  return value;
}

function controlModeLabel(mode) {
  return {
    Pulse: "脈衝型(IO控制/RS485表單控制)",
    EtherCAT: "EtherCAT型",
    RTEX: "RTEX型"
  }[mode] ?? `${mode}型`;
}

const filterOrder = [
  "workingVoltage",
  "inertia",
  "watt",
  "brake",
  "ipRating",
  "control",
  "speedTorque",
  "sto",
  "closedLoop",
  "absMemory",
  "cableLength",
  "cableFlex"
];

function motorMatchesWith(filters, override = {}) {
  const f = { ...filters, ...override };
  return (motor) => (
    (!f.workingVoltage || motor.voltageCode === f.workingVoltage) &&
    (!f.inertia || motor.inertia === f.inertia) &&
    (!f.watt || String(motor.watt) === String(f.watt)) &&
    (!f.brake || String(motor.brake) === String(f.brake)) &&
    (!f.ipRating || motor.ipRating === f.ipRating)
  );
}

function visibleMotors() {
  return catalog.motors.filter((motor) => motor.ipRating !== "IP67");
}

function availabilityFor(id, value) {
  const prior = {};
  for (const key of filterOrder) {
    if (key === id) break;
    prior[key] = state.filters[key];
  }

  if (["workingVoltage", "inertia", "watt", "brake", "ipRating"].includes(id)) {
    return visibleMotors().some(motorMatchesWith(prior, { [id]: value }));
  }

  if (id === "control") {
    const motors = visibleMotors().filter(motorMatchesWith(prior));
    return motors.some((motor) => catalog.drivers.some((driver) => driver.mode === value && wattCompatible(driver, motor)));
  }

  if (["cableLength", "cableFlex"].includes(id)) {
    const motors = visibleMotors().filter(motorMatchesWith(prior));
    return motors.some((motor) => {
      if (motor.ipRating === "IP67" || motor.watt > 5000) return false;
      return catalog.cableRules.some((cable) => (
        (!prior.cableLength || cable.length === prior.cableLength) &&
        (!prior.cableFlex || cable.flex === prior.cableFlex) &&
        String(cable[id === "cableLength" ? "length" : "flex"]) === String(value) &&
        motor.watt >= cable.minWatt &&
        motor.watt <= cable.maxWatt &&
        (!cable.ipRating || cable.ipRating === motor.ipRating) &&
        (!cable.noBrakeOnly || !motor.brake) &&
        (!cable.requiresBrake || motor.brake)
      ));
    });
  }

  return true;
}

function unavailableLabelFor(id) {
  if (isA6V() && id === "watt") {
    return "無此規格";
  }
  if (id === "ipRating") {
    return "非常用規格";
  }
  if (id === "watt" && ["低慣量", "高慣量"].includes(state.filters.inertia)) {
    return "非常用規格";
  }
  return "目前無對應";
}

function noticeLabelFor(id, value, available) {
  if (!available) return unavailableLabelFor(id);
  if (isA6V() && id === "watt") {
    const candidates = visibleMotors().filter((motor) => (
      motor.watt === Number(value) &&
      (!state.filters.workingVoltage || motor.voltageCode === state.filters.workingVoltage) &&
      (!state.filters.brake || String(motor.brake) === state.filters.brake)
    ));
    if (candidates.length && candidates.every((motor) => !isA6VStandardMotor(motor))) return "非常用規格";
  }
  if (
    id === "watt" &&
    Number(value) === 50 &&
    state.filters.inertia === "高慣量" &&
    state.filters.ipRating === "IP65"
  ) {
    return "非常用規格";
  }
  return "";
}

function isA6VStandardMotor(motor) {
  if (!isA6V() || motor.voltageCode !== "B") return false;
  if (state.filters.encoder === "A1" && motor.watt === 266) return true;
  return state.filters.encoder === "L1" && motor.watt === 100 && !motor.brake;
}

function fillSelect(id, values, defaultValue = "") {
  const select = $(id);
  const current = state.filters[id] ?? defaultValue;
  select.innerHTML = "";
  const placeholderValue = values.map(String).includes(String(defaultValue)) ? "" : defaultValue;
  if (!["ipRating", "cableFlex"].includes(id)) {
    select.append(new Option(labels[id], placeholderValue));
  }
  values.forEach((value) => {
    const available = availabilityFor(id, value);
    const notice = noticeLabelFor(id, value, available);
    const option = new Option(`${optionLabel(id, String(value))}${notice ? `（${notice}）` : ""}`, String(value));
    if (isA6V() && id === "watt" && !available) option.disabled = true;
    if (!available) {
      option.className = "no-spec-option";
    } else if (notice) {
      option.className = "uncommon-option";
    }
    select.append(option);
  });
  const currentIsAvailable = !isA6V() || id !== "watt" || !current || availabilityFor(id, current);
  select.value = currentIsAvailable && values.map(String).includes(String(current)) ? current : defaultValue;
  state.filters[id] = select.value;
  updateSelectWarning(select);
}

function setFilterVisible(id, visible) {
  const select = $(id);
  select.closest("label").style.display = visible ? "" : "none";
}

function buildFilters() {
  const inertiaOrder = ["高慣量", "中慣量", "低慣量"];
  const motors = visibleMotors();
  const ipOptions = unique(motors.map((motor) => motor.ipRating)).sort();
  fillSelect("workingVoltage", isA6V() ? ["C", "B"] : []);
  setFilterVisible("workingVoltage", isA6V());
  fillSelect("encoder", ["L1", "A1"]);
  setFilterVisible("encoder", isA6V());
  fillSelect("inertia", inertiaOrder.filter((value) => unique(motors.map((motor) => motor.inertia)).includes(value)));
  fillSelect("watt", unique(motors.map((motor) => motor.watt)).sort((a, b) => a - b));
  fillSelect("brake", ["false", "true"]);
  fillSelect("ipRating", ipOptions, "IP65");
  setFilterVisible("ipRating", ipOptions.length > 1);
  fillSelect("control", visibleControlModes.filter((mode) => unique(catalog.drivers.map((driver) => driver.mode)).includes(mode)), isA6V() ? "EtherCAT" : "");
  fillSelect("speedTorque", ["true"], "false");
  fillSelect("sto", ["true"], "false");
  fillSelect("closedLoop", ["true"], "false");
  fillSelect("absMemory", ["battery"], "standard");
  fillSelect("cableLength", unique(catalog.cableRules.map((cable) => cable.length)), "3 m");
  fillSelect("cableFlex", unique(catalog.cableRules.map((cable) => cable.flex)), "標準");
  ["speedTorque", "sto", "closedLoop", "absMemory"].forEach((id) => setFilterVisible(id, !isA6V()));
  $("series").value = state.series;
}

function updateSelectWarning(select) {
  select.classList.toggle("needs-selection", select.value === "");
}

function needsFullFunction() {
  return !isA6V() && (state.filters.sto === "true" || state.filters.closedLoop === "true");
}

function needsSpeedTorque() {
  return state.filters.speedTorque === "true";
}

function motorModelForEncoder(motor) {
  const encoderCode = state.filters.encoder || (isA6V() ? "A1" : "L1");
  return motor.model.replace(/(?:L1|A1)(?=[UV][12]M)/, encoderCode);
}

function motorCadForEncoder(motor) {
  if (!isA6V()) return { dwgZip: motor.dwgZip, stepZip: motor.stepZip };
  return motor.cadFilesByEncoder?.[state.filters.encoder] ?? { dwgZip: "", stepZip: "" };
}

function fullFunctionModel(model) {
  if (!model || model.length < 2) return model;
  const chars = model.split("");
  chars[4] = "T";
  chars[chars.length - 1] = "F";
  return chars.join("");
}

function withFullFunctionRule(driver) {
  if (!needsFullFunction()) return driver;
  const model = fullFunctionModel(driver.model);
  return {
    ...driver,
    model,
    fullFunction: true,
    derivedFrom: driver.model,
    path: model === driver.model ? driver.path : "",
    dwgFiles: model === driver.model ? driver.dwgFiles : [],
    stepFiles: model === driver.model ? driver.stepFiles : []
  };
}

function motorMatches(motor) {
  return motorMatchesWith(state.filters)(motor);
}

function filteredMotors() {
  return visibleMotors().filter(motorMatches);
}

function selectedMotor(motors) {
  if (!motors.some((motor) => motor.id === state.selectedMotorId)) {
    state.selectedMotorId = motors[0]?.id ?? "";
  }
  return motors.find((motor) => motor.id === state.selectedMotorId);
}

function wattCompatible(driver, motor) {
  if (!driver.watt || !motor?.watt) return false;
  if (isA6V()) {
    return driver.voltageCode === motor.voltageCode &&
      (driver.supportedWatts ?? [driver.watt]).includes(motor.watt);
  }
  if (motor.watt === 50) return driver.watt === 100;
  if (driver.folderName.includes("4&5KW")) return motor.watt === 4000 || motor.watt === 5000;
  return driver.watt === motor.watt;
}

function matchingDrivers(motor) {
  if (!motor) return [];
  if (isA6V()) {
    return catalog.drivers.filter((driver) => (
      (!state.filters.control || driver.mode === state.filters.control) &&
      wattCompatible(driver, motor)
    ));
  }
  const requireFull = needsFullFunction();
  const baseDrivers = catalog.drivers.filter((driver) => {
    return (
      (!state.filters.control || driver.mode === state.filters.control) &&
      visibleControlModes.includes(driver.mode) &&
      wattCompatible(driver, motor) &&
      (!requireFull || driver.fullFunction)
    );
  });
  if (!requireFull) return baseDrivers.filter((driver) => !driver.fullFunction || driver.mode === "Pulse");
  if (baseDrivers.length) return baseDrivers;

  return catalog.drivers.filter((driver) => (
    (!state.filters.control || driver.mode === state.filters.control) &&
    visibleControlModes.includes(driver.mode) &&
    wattCompatible(driver, motor)
  )).map(withFullFunctionRule);
}

function matchingCables(motor) {
  if (!motor || motor.watt > 5000) return [];
  if (motor.ipRating === "IP67") return [];
  const matched = catalog.cableRules.filter((cable) => {
    return (
      (!state.filters.cableLength || cable.length === state.filters.cableLength) &&
      (!state.filters.cableFlex || cable.flex === state.filters.cableFlex) &&
      motor.watt >= cable.minWatt &&
      motor.watt <= cable.maxWatt &&
      (!cable.ipRating || cable.ipRating === motor.ipRating) &&
      (!cable.noBrakeOnly || !motor.brake) &&
      (!cable.requiresBrake || motor.brake)
    );
  });
  return isA6V() ? [...matched, ...(catalog.fixedCables ?? [])] : matched;
}

function selectedCables(motor) {
  const cables = matchingCables(motor).map(cableForMemory).sort((a, b) => cableOrderValue(a) - cableOrderValue(b));
  return isA6V() ? cables.filter((cable) => cableSelectionState[cable.id]) : cables;
}

function cableForMemory(cable) {
  if (isA6V()) return cable;
  if (state.filters.absMemory !== "battery" || cable.type !== "編碼線") return cable;
  return {
    ...cable,
    model: cable.model.replace(/EAD(-TKD)?$/, "EAE$1").replace(/ESD(-TKD)?$/, "ESE$1"),
    memoryNote: "帶電池線記憶"
  };
}

function accessoryModel(template, length) {
  return template.replace("XXX", length);
}

function regenResistorForDriver(driver) {
  if (isA6V()) return null;
  const grade = driver?.model?.[1]?.toUpperCase() ?? "";
  if (!grade) return null;
  if (grade === "A") {
    return {
      id: "regen-resistor",
      grade: driver.watt === 200 ? "A級(200W用)" : "A級(100W用)",
      model: driver.watt === 200 ? "鋁制50^/60W" : "鋁制100^/25W",
      spec: driver.watt === 200 ? "鋁製電阻50Ω/60W" : "鋁製電阻100Ω/25W"
    };
  }
  return {
    B: { grade: "B級", model: "鋁制50^/60W", spec: "鋁製電阻50Ω/60W" },
    C: { grade: "C級", model: "鋁制50^/60W", spec: "鋁製電阻50Ω/60W" },
    D: { grade: "D級", model: "鋁制30^/100W", spec: "鋁製電阻30Ω/100W" },
    E: { grade: "E級", model: "鋁制30^/100W *2並聯", spec: "鋁製電阻30Ω/100W *2並聯" },
    F: { grade: "F級", model: "鋁制20^/150W *2並聯", spec: "鋁製電阻20Ω/150W *2並聯" }
  }[grade] ?? null;
}

function selectedRegenResistor(driver) {
  const resistor = regenResistorForDriver(driver);
  return resistor && regenResistorState.checked ? resistor : null;
}

function accessoryDefinitions(driver) {
  if (isA6V()) return [];
  const mode = driver?.mode ?? "";
  const shared = mode === "EtherCAT" ? [] : [
    {
      group: "X2 通訊接頭",
      items: [
        { id: "x2-rs485-connector", exclusiveGroup: "x2", label: "RS485通訊線", model: "DVOPM20024" },
        { id: "x2-rs485-cable", exclusiveGroup: "x2", label: "RS485通訊線", template: "DVOPM20024-XXXM", length: true }
      ]
    }
  ];
  if (state.filters.sto === "true") {
    shared.push({
      group: "X3 安全接頭",
      exclusiveGroup: "x3-x5",
      items: [
        { id: "x3-sto-connector", label: "STO連接器", model: "DVOPM20103" },
        { id: "x3-sto-cable", label: "STO連接線", template: "DVOPM20103-XXXM", length: true }
      ]
    });
  }
  const io = mode === "Pulse"
    ? {
        group: "X4 IO接頭",
        items: [
          { id: "x4-io-connector-pulse", exclusiveGroup: "x4", label: "IO連接器", model: "SCS12-50P" },
          { id: "x4-io-terminal-connector-pulse", exclusiveGroup: "x4", label: "IO連接器(端子型)", model: "FA-SCSI-50P" },
          { id: "x4-io-loose-pulse", exclusiveGroup: "x4", label: "IO連線", detail: "全出散線", template: "SN50-XXXTB-I", length: true, noHalfMeter: true },
          { id: "x4-io-double-pulse", exclusiveGroup: "x4", label: "IO連線", detail: "雙邊連接器", template: "SS50-XXXTB-I", length: true, noHalfMeter: true, companionModel: "HG-50TSC", companionLabel: "端子台" },
          { id: "x4-terminal-pulse", label: "端子台", model: "HG-50TSC", passive: true }
        ]
      }
    : ["EtherCAT", "RTEX"].includes(mode)
      ? {
          group: "X4 IO接頭",
          items: [
            { id: "x4-io-connector-network", exclusiveGroup: "x4", label: "IO連接器", model: "SCS12-26P" },
            { id: "x4-io-terminal-connector-network", exclusiveGroup: "x4", label: "IO連接器(端子型)", model: "FA-SCSI-26P" },
            { id: "x4-io-loose-network", exclusiveGroup: "x4", label: "IO連線", detail: "全出散線", template: "SN26-XXXTB-I", length: true, noHalfMeter: true },
            { id: "x4-io-double-network", exclusiveGroup: "x4", label: "IO連線", detail: "雙邊連接器", template: "SS26-XXXTB-I", length: true, noHalfMeter: true, companionModel: "HG-26TSC", companionLabel: "端子台" },
            { id: "x4-terminal-network", label: "端子台", model: "HG-26TSC", passive: true }
          ]
        }
      : null;
  const opticalScale = state.filters.closedLoop === "true"
    ? {
        group: "X5 光學尺接頭",
        exclusiveGroup: "x3-x5",
        modelInput: true,
        items: [
          { id: "x5-scale-connector", label: "光學尺連接器", model: "MUF-PK10K-X" },
          { id: "x5-scale-cable", label: "光學尺連接線", model: "具體型號請洽業務人員", length: true, useCableLengths: true, syncCableLength: true }
        ]
      }
    : null;
  return [
    ...shared,
    ...(io ? [io] : []),
    ...(opticalScale ? [opticalScale] : [])
  ];
}

function selectedAccessories(driver) {
  return accessoryDefinitions(driver).flatMap((group) => group.items.map((item) => ({
    ...item,
    groupName: group.group,
    groupExclusiveGroup: group.exclusiveGroup
  }))).filter((item) => !item.passive && accessoryState[item.id]?.checked).flatMap((item) => {
    const length = accessoryState[item.id]?.length ?? defaultLengthForAccessory(item);
    const selected = {
      id: item.id,
      groupName: item.groupName,
      label: item.detail ? `${item.label}(${item.detail})` : item.label,
      model: item.template ? accessoryModel(item.template, length) : item.model,
      length: item.length ? `${length}M` : ""
    };
    if (!item.companionModel) return [selected];
    return [
      selected,
      {
        groupName: item.groupName,
        label: item.companionLabel,
        model: item.companionModel,
        length: ""
      }
    ];
  });
}

function clearAccessoryStates(ids) {
  ids.forEach((id) => {
    if (accessoryState[id]) {
      accessoryState[id].checked = false;
    }
  });
}

function clearExclusiveAccessoryGroup(driver, currentId) {
  const groups = accessoryDefinitions(driver);
  const items = groups.flatMap((group) => group.items.map((item) => ({
    ...item,
    groupName: group.group,
    groupExclusiveGroup: group.exclusiveGroup
  })));
  const current = items.find((item) => item.id === currentId);
  if (current?.groupExclusiveGroup) {
    items.filter((item) => item.groupExclusiveGroup === current.groupExclusiveGroup && item.id !== currentId).forEach((item) => {
      if (accessoryState[item.id]) {
        accessoryState[item.id].checked = false;
      }
    });
  }
  if (!current?.exclusiveGroup) return;
  items.filter((item) => item.exclusiveGroup === current.exclusiveGroup && item.id !== currentId).forEach((item) => {
    if (accessoryState[item.id]) {
      accessoryState[item.id].checked = false;
    }
  });
}

function accessoryItemById(driver, id) {
  return accessoryDefinitions(driver).flatMap((group) => group.items).find((item) => item.id === id) ?? {};
}

function cableOrderValue(cable) {
  const cableOrder = {
    "電源線": 1,
    "電源+煞車線": 1,
    "XA-1驅動器動力線": 1,
    "XA-2驅動器控制線": 2,
    "XB馬達電源線": 3,
    "X6編碼線": 4,
    "煞車線": 5,
    "X4 IO連接線": 6,
    "X2A上位網路線(RJ45)": 7,
    "X2A驅動器串聯連接線": 8,
    "編碼線": 2
  };
  return cableOrder[cable.type] ?? 9;
}

function formatMotorSpec(motor) {
  return `${formatWatt(motor.watt)}伺服馬達(${motor.brake ? "有煞車" : "無煞車"})`;
}

function formatDriverWatt(watt) {
  return watt >= 1000 ? `${watt / 1000}KW` : `${watt}W`;
}

function formatDriverSpec(driver, motor) {
  const functionLabel = driver.functionLabel ?? (driver.fullFunction ? "全功能型" : "通用型");
  return `${formatDriverWatt(motor.watt)} ${controlModeLabel(driver.mode)}驅動器(${functionLabel})`;
}

function compactCableLength(length) {
  return String(length).replace(/\s*m$/i, "M");
}

function formatCableSpec(cable) {
  const length = compactCableLength(cable.length);
  const flexText = cable.flex === "耐曲折" ? "(耐曲)" : "";
  const type = cable.type === "編碼線" && cable.memoryNote ? "編碼線(含電池絕對型)" : cable.type;
  return `${type}-${length}${flexText}`;
}

function accessoryGroupSpec(groupName) {
  return {
    "X2 通訊接頭": "X2(通訊)",
    "X3 安全接頭": "X3(安全)",
    "X4 IO接頭": "X4(IO)",
    "X5 光學尺接頭": "X5(光學尺)"
  }[groupName] ?? groupName.replace(/\s+/g, "");
}

function formatAccessorySpec(item) {
  return `${accessoryGroupSpec(item.groupName)}-${item.label}${item.length ? `-${item.length}` : ""}`;
}

function currentSelectionItems() {
  const motors = filteredMotors();
  const motor = selectedMotor(motors);
  if (!motor) return [];
  const drivers = matchingDrivers(motor);
  const driver = drivers[0];
  const cables = selectedCables(motor);
  const accessories = selectedAccessories(driver);
  const regenResistor = selectedRegenResistor(driver);
  const opticalScaleModel = opticalScaleState.model.trim();
  return [
    {
      category: "馬達",
      model: motorModelForEncoder(motor),
      spec: formatMotorSpec(motor)
    },
    ...(driver ? [{
      category: "驅動器",
      model: driver.model,
      spec: formatDriverSpec(driver, motor)
    }] : []),
    ...cables.map((cable) => ({
      category: cable.type,
      model: cable.model,
      spec: formatCableSpec(cable)
    })),
    ...(regenResistor ? [{
      category: "再生電阻",
      model: regenResistor.model,
      spec: `${regenResistor.grade} / ${regenResistor.spec}`
    }] : []),
    ...accessories.map((item) => ({
      category: "接頭與控制線",
      model: item.model,
      spec: formatAccessorySpec(item),
      note: item.id === "x5-scale-cable" && opticalScaleModel ? `光學尺型號：${opticalScaleModel}` : ""
    }))
  ];
}

function quoteKey(item) {
  return `${item.category}|${item.model}|${item.spec}|${item.note ?? ""}`;
}

function opticalScaleModelRequired() {
  return Boolean(accessoryState["x5-scale-cable"]?.checked);
}

function validateOpticalScaleModel() {
  if (!opticalScaleModelRequired() || opticalScaleState.model.trim()) return true;
  const input = document.querySelector("[data-optical-scale-model]");
  input?.focus();
  input?.reportValidity?.();
  return false;
}

function addCurrentSelectionToQuote() {
  if (!validateOpticalScaleModel()) return;
  const qty = Math.max(1, Number($("addQty").value || 1));
  currentSelectionItems().forEach((item) => {
    const key = quoteKey(item);
    const existing = quoteItems.find((quoteItem) => quoteItem.key === key);
    if (existing) {
      existing.qty += qty;
    } else {
      quoteItems.push({ ...item, key, qty, note: item.note ?? "" });
    }
  });
  saveQuoteItems();
  renderQuote();
}

function renderCurrentSelectionList() {
  const container = $("currentSelectionList");
  if (!container) return;
  const items = currentSelectionItems();
  if (!items.length) {
    container.innerHTML = `<div class="empty">目前沒有可加入的產品。</div>`;
    return;
  }
  container.innerHTML = items.map((item) => `
    <article class="selection-chip">
      <span>${item.category}</span>
      <strong>${item.model}</strong>
      <em>${item.spec}</em>
    </article>
  `).join("");
}

function renderQuote() {
  const rows = $("quoteRows");
  if (!rows) return;
  if (!quoteItems.length) {
    rows.innerHTML = `<tr><td colspan="6">尚未加入詢價項目。</td></tr>`;
    return;
  }
  rows.innerHTML = quoteItems.map((item, index) => `
    <tr>
      <td>${item.category}</td>
      <td>${item.model}</td>
      <td>${item.spec}</td>
      <td><input class="quote-qty-input" type="number" min="1" step="1" value="${item.qty}" data-quote-qty="${index}"></td>
      <td><input class="quote-note-input" type="text" value="${escapeHtml(item.note ?? "")}" data-quote-note="${index}"></td>
      <td><button class="delete-quote-btn" type="button" data-quote-delete="${index}">刪除</button></td>
    </tr>
  `).join("");
  rows.querySelectorAll("[data-quote-qty]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const index = Number(event.target.dataset.quoteQty);
      quoteItems[index].qty = Math.max(1, Number(event.target.value || 1));
      event.target.value = quoteItems[index].qty;
      saveQuoteItems();
    });
  });
  rows.querySelectorAll("[data-quote-note]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const index = Number(event.target.dataset.quoteNote);
      quoteItems[index].note = event.target.value;
      saveQuoteItems();
    });
  });
  rows.querySelectorAll("[data-quote-delete]").forEach((button) => {
    button.addEventListener("click", (event) => {
      quoteItems.splice(Number(event.target.dataset.quoteDelete), 1);
      saveQuoteItems();
      renderQuote();
    });
  });
}

function fallbackDownload(blobOrUrl, filename) {
  const link = document.createElement("a");
  link.href = typeof blobOrUrl === "string" ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  link.download = filename;
  link.click();
  if (typeof blobOrUrl !== "string") {
    URL.revokeObjectURL(link.href);
  }
}

async function saveBlobWithPicker(blob, filename) {
  if (!window.showSaveFilePicker) {
    fallbackDownload(blob, filename);
    return;
  }
  const handle = await window.showSaveFilePicker({ suggestedName: filename });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

function filenameFromPath(path) {
  return decodeURIComponent(String(path).split(/[\\/]/).pop() || "download");
}

async function saveUrlWithPicker(path) {
  const filename = filenameFromPath(path);
  if (!window.showSaveFilePicker) {
    fallbackDownload(path, filename);
    return;
  }
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    await saveBlobWithPicker(await response.blob(), filename);
  } catch (error) {
    fallbackDownload(path, filename);
  }
}

async function handleSmartDownload(event) {
  const link = event.target.closest("[data-download-url]");
  if (!link) return;
  event.preventDefault();
  await saveUrlWithPicker(link.dataset.downloadUrl);
}

function validateQuoteContact() {
  const requiredIds = ["contactCompany", "contactName", "contactPhone"];
  const missing = requiredIds.map((id) => $(id)).find((input) => !input.value.trim());
  if (!missing) return true;
  missing.focus();
  missing.reportValidity?.();
  return false;
}

async function exportQuote() {
  if (!validateQuoteContact()) return;
  const contactRows = [
    ["案件號/機台名稱", $("projectMachineName").value],
    ["公司名稱", $("contactCompany").value],
    ["姓名", $("contactName").value],
    ["連絡電話", $("contactPhone").value],
    ["Email", $("contactEmail").value],
    [],
  ];
  const rows = [
    ...contactRows,
    ["類別", "型號", "規格", "數量", "備註"],
    ...quoteItems.map((item) => [item.category, item.model, item.spec, item.qty, item.note ?? ""])
  ];
  const csv = "\ufeff" + rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  await saveBlobWithPicker(blob, "panasonic-a6-rfq.csv");
}

function downloadLink(path, label) {
  if (!path) return "未找到";
  const encodedPath = encodeURI(path);
  return `<a href="${encodedPath}" download title="${path}" data-download-url="${encodedPath}">${label}</a>`;
}

function driverManualLinks(driver) {
  if (driver.manuals?.length) {
    return driver.manuals.map((manual) => downloadLink(manual.path, manual.label));
  }
  if (driver.mode === "Pulse") {
    return [downloadLink("manuals/A6-pulse-manual.pdf", "A6脈波型手冊")];
  }
  if (driver.mode === "EtherCAT") {
    return [
      downloadLink("manuals/A6B-EtherCAT-basic-manual.pdf", "A6 EtherCAT型-基本功能手冊"),
      downloadLink("manuals/A6B-EtherCAT-communication-manual.pdf", "A6 EtherCAT型-通訊規格手冊")
    ];
  }
  return [];
}

function firstFile(files) {
  return files?.[0] ?? "";
}

function motorEmptyMessage() {
  const motorFilterIds = ["workingVoltage", "inertia", "watt", "brake", "ipRating"];
  const hasUncommonSelection = motorFilterIds.some((id) => {
    const value = state.filters[id];
    return value && !availabilityFor(id, value) && unavailableLabelFor(id) === "非常用規格";
  });
  return hasUncommonSelection
    ? "非常用規格，請與業務人員聯繫確認"
    : "沒有符合條件的馬達，請放寬慣量、瓦數、IP 或煞車條件。";
}

function renderMotors(motors) {
  const rows = $("motorRows");
  rows.innerHTML = "";
  if (!motors.length) {
    rows.innerHTML = `<tr><td colspan="6">${motorEmptyMessage()}</td></tr>`;
    return;
  }
  motors.forEach((motor) => {
    const model = motorModelForEncoder(motor);
    const tr = document.createElement("tr");
    tr.className = motor.id === state.selectedMotorId ? "active" : "";
    tr.innerHTML = `
      <td><span class="badge">${model.slice(0, 4)}</span></td>
      <td>${model}</td>
      <td>${formatWatt(motor.watt)}</td>
      <td>${motor.inertia}</td>
      <td>${motor.ipRating}</td>
      <td>${motor.brake ? "有" : "無"}</td>
    `;
    tr.addEventListener("click", () => {
      state.selectedMotorId = motor.id;
      render();
    });
    rows.append(tr);
  });
}

function renderSelected(motor, drivers) {
  const card = $("selectedCard");
  const primaryDriver = drivers[0];
  if (!motor) {
    card.innerHTML = `<div class="empty">請先選擇條件。</div>`;
    return;
  }
  const fullText = isA6V()
    ? "A6V EtherCAT / DC 電源規格"
    : needsFullFunction()
      ? "STO / 閉環需求：套用全功能型尾碼規則"
      : needsSpeedTorque()
        ? "速度 / 轉矩模式：維持通訊型驅動器"
        : "一般功能";
  const motorModel = motorModelForEncoder(motor);
  const motorCad = motorCadForEncoder(motor);
  const folderName = motor.folderName.replace(motor.model, motorModel);
  card.innerHTML = `
    <div>
      <span class="badge">${motor.inertia}</span>
      <span class="selected-type-label">伺服馬達</span>
      <h3>${motorModel}</h3>
    </div>
    <div class="kv">
      <span>容量</span><span>${formatWatt(motor.watt)}</span>
      <span>轉速/最高轉速</span><span>${motor.maxSpeed ? `${motor.ratedSpeed} / ${motor.maxSpeed} rpm` : speedRangeForInertia(motor.inertia)}</span>
      <span>法蘭面</span><span>${motor.flange ?? "待補"}</span>
      <span>軸心大小</span><span>${motor.shaft ?? "待補"}</span>
      <span>額定轉矩</span><span>${motor.ratedTorque ? `${motor.ratedTorque} N·m` : "待補"}</span>
      <span>使用電壓</span><span>${motor.voltage ?? "AC 單相/三相200V"}</span>
      <span>煞車</span><span>${motor.brake ? "有煞車" : "無煞車"}</span>
      <span>防護等級</span><span>${motor.ipRating}${motor.derived ? `，由 ${motor.derivedFrom} 衍生` : ""}</span>
      <span>編碼器</span><span>${optionLabel("encoder", state.filters.encoder)}</span>
      <span>馬達資料夾</span><span>${folderName}</span>
      <span>驅動器需求</span><span>${fullText}</span>
      <span>建議驅動器</span><span>${primaryDriver ? `${primaryDriver.model}（${controlModeLabel(primaryDriver.mode)}）` : "沒有符合條件"}</span>
      <span>馬達 2D</span><span>${downloadLink(motorCad.dwgZip, "2D")}</span>
      <span>馬達 3D</span><span>${downloadLink(motorCad.stepZip, "3D")}</span>
    </div>
  `;
}

function renderDrivers(drivers) {
  const container = $("driverList");
  $("driverCount").textContent = String(drivers.length);
  if (!drivers.length) {
    const note = needsFullFunction()
      ? "沒有符合容量與通訊模式的基礎驅動器，無法套用全功能型尾碼規則。"
      : "沒有符合容量與通訊模式的驅動器。";
    container.innerHTML = `<div class="empty">${note}</div>`;
    return;
  }
  container.innerHTML = drivers.map((driver) => `
    <article class="driver-card">
      <strong class="driver-card-title">伺服驅動器</strong>
      <h3>${driver.model}</h3>
      <div class="driver-kv">
        <span>系列</span><span>${driver.series}</span>
        <span>控制模式</span><span>${controlModeLabel(driver.mode)}</span>
        <span>容量</span><span>${driver.capacityLabel ?? formatWatt(driver.watt)}</span>
        <span>功能類型</span><span>${driver.functionLabel ?? (driver.fullFunction ? "全功能型" : "一般型")}</span>
        ${driver.derivedFrom ? `<span>轉換來源</span><span>${driver.derivedFrom}<br>依尾碼規則轉換</span>` : ""}
        <span>驅動器 2D</span><span>${downloadLink(driver.dwgZip, "2D")}</span>
        <span>驅動器 3D</span><span>${downloadLink(driver.stepZip, "3D")}</span>
        <span>手冊</span><span>${driverManualLinks(driver).join("<br>") || "未提供"}</span>
      </div>
    </article>
  `).join("");
}

function renderCables(motor) {
  const cables = matchingCables(motor);
  const container = $("cableList");
  $("cableDescription").textContent = isA6V()
    ? "請勾選需要加入詢價的 A6V 專用線材。"
    : "目前依長度與耐曲折列出，型號待你補正式料號。";
  if (motor?.ipRating === "IP67") {
    $("cableCount").textContent = "0";
    container.innerHTML = `<div class="empty">IP67 線材型號規則尚未建立，目前不自動配線。</div>`;
    return;
  }
  const displayCables = cables.map(cableForMemory).sort((a, b) => cableOrderValue(a) - cableOrderValue(b));
  $("cableCount").textContent = String(isA6V() ? selectedCables(motor).length : displayCables.length);
  if (motor?.watt > 5000) {
    container.innerHTML = `<div class="empty">5 kW 以上線材規則後補，目前不自動配線。</div>`;
    return;
  }
  if (!cables.length) {
    container.innerHTML = `<div class="empty">請選擇線長與是否耐曲折；無煞車馬達不會列出煞車線。</div>`;
    return;
  }
  container.innerHTML = displayCables.map((cable) => isA6V() ? `
    <label class="item cable-option">
      <input type="checkbox" data-cable-check="${escapeHtml(cable.id)}" ${cableSelectionState[cable.id] ? "checked" : ""}>
      <span>
        <strong>${escapeHtml(cable.model)}</strong>
        <p>${escapeHtml(cable.type)}｜${escapeHtml(cable.length)}｜${escapeHtml(cable.flex)}${cable.stock ? "｜常備庫存" : ""}</p>
      </span>
    </label>
  ` : `
    <article class="item">
      <strong>${cable.model}</strong>
      <p>${cable.type}｜${cable.length}｜${cable.flex}${cable.stock ? "｜常備庫存" : ""}${cable.memoryNote ? `｜${cable.memoryNote}` : ""}</p>
    </article>
  `).join("");
  container.querySelectorAll("[data-cable-check]").forEach((input) => {
    input.addEventListener("change", (event) => {
      cableSelectionState[event.target.dataset.cableCheck] = event.target.checked;
      $("cableCount").textContent = String(selectedCables(motor).length);
      renderCurrentSelectionList();
    });
  });
}

function renderRegenResistor(driver) {
  const container = $("regenResistorList");
  if (!container) return;
  $("regenResistorBlock").hidden = isA6V();
  if (isA6V()) {
    container.innerHTML = "";
    return;
  }
  const resistor = regenResistorForDriver(driver);
  if (!resistor) {
    container.innerHTML = `<div class="empty">目前沒有符合驅動器規格的再生電阻。</div>`;
    return;
  }
  container.innerHTML = `
    <section class="accessory-group">
      <label class="accessory-row">
        <input type="checkbox" id="regenResistorCheck" ${regenResistorState.checked ? "checked" : ""}>
        <span>再生電阻</span>
        <strong>${resistor.model}｜${resistor.grade} - ${resistor.spec}</strong>
      </label>
    </section>
  `;
  $("regenResistorCheck")?.addEventListener("change", (event) => {
    regenResistorState.checked = event.target.checked;
    render();
  });
}

function renderAccessories(driver) {
  const container = $("accessoryList");
  if (!container) return;
  $("accessoryBlock").hidden = isA6V();
  if (isA6V()) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = accessoryDefinitions(driver).map((group) => `
    <section class="accessory-group">
      <h3>${group.group}</h3>
      ${group.items.map((item) => {
        const current = accessoryState[item.id] ?? { checked: false, length: defaultLengthForAccessory(item) };
        const allowedLengths = lengthsForAccessory(item);
        const selectedLength = allowedLengths.includes(current.length) ? current.length : allowedLengths[0];
        const model = item.template ? accessoryModel(item.template, selectedLength) : item.model;
        const lengthSelect = item.length
          ? `<select class="inline-length" data-accessory-length="${item.id}">${allowedLengths.map((length) => `<option value="${length}" ${selectedLength === length ? "selected" : ""}>${length}</option>`).join("")}</select><span>M</span>`
          : "";
        const label = item.detail ? `${item.label}${item.length ? "" : ""}(${item.detail})` : item.label;
        if (item.passive) {
          return `<div class="accessory-row passive-row"><span></span><span>${label}</span><strong>${model}</strong></div>`;
        }
        return `
          <label class="accessory-row">
            <input type="checkbox" data-accessory-check="${item.id}" ${current.checked ? "checked" : ""}>
            <span>${label}${lengthSelect}</span>
            <strong>${model}</strong>
          </label>
        `;
      }).join("")}
      ${group.modelInput && opticalScaleModelRequired() ? `
        <label class="accessory-model-row ${opticalScaleModelRequired() ? "is-required" : ""}">
          <span>光學尺型號</span>
          <input type="text" data-optical-scale-model value="${escapeHtml(opticalScaleState.model)}" placeholder="請自行填入，必填" required>
        </label>
      ` : ""}
      ${group.note ? `<p class="accessory-note">${escapeHtml(group.note)}</p>` : ""}
    </section>
  `).join("");

  container.querySelectorAll("[data-accessory-check]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const id = event.target.dataset.accessoryCheck;
      if (event.target.checked) {
        clearExclusiveAccessoryGroup(driver, id);
      }
      const item = accessoryItemById(driver, id);
      accessoryState[id] = { ...(accessoryState[id] ?? { length: defaultLengthForAccessory(item) }), checked: event.target.checked };
      render();
    });
  });
  container.querySelectorAll("[data-accessory-length]").forEach((select) => {
    select.addEventListener("change", (event) => {
      const id = event.target.dataset.accessoryLength;
      accessoryState[id] = { ...(accessoryState[id] ?? { checked: false }), length: event.target.value };
      render();
    });
  });
  container.querySelectorAll("[data-optical-scale-model]").forEach((input) => {
    input.addEventListener("input", (event) => {
      opticalScaleState.model = event.target.value;
      renderCurrentSelectionList();
      renderQuote();
    });
  });
}

function render() {
  const motors = filteredMotors();
  const motor = selectedMotor(motors);
  const drivers = matchingDrivers(motor);
  $("motorCount").textContent = String(motors.length);
  renderMotors(motors);
  renderSelected(motor, drivers);
  renderDrivers(drivers);
  renderCables(motor);
  renderRegenResistor(drivers[0]);
  renderAccessories(drivers[0]);
  renderCurrentSelectionList();
  renderQuote();
}

function bindEvents() {
  document.addEventListener("click", handleSmartDownload);
  Object.keys(state.filters).forEach((id) => {
    $(id).addEventListener("change", (event) => {
      state.filters[id] = event.target.value;
      if (id === "cableLength") {
        accessoryState["x5-scale-cable"] = {
          ...(accessoryState["x5-scale-cable"] ?? { checked: false }),
          length: cableLengthValue(state.filters.cableLength)
        };
      }
      buildFilters();
      updateSelectWarning(event.target);
      render();
    });
  });
  $("resetBtn").addEventListener("click", () => {
    Object.keys(cableSelectionState).forEach((id) => delete cableSelectionState[id]);
    Object.keys(state.filters).forEach((key) => {
      state.filters[key] = ["speedTorque", "sto", "closedLoop"].includes(key)
        ? "false"
        : key === "absMemory"
          ? "standard"
          : key === "encoder"
            ? isA6V() ? "A1" : "L1"
          : key === "control" && isA6V()
            ? "EtherCAT"
          : key === "ipRating"
            ? "IP65"
          : key === "cableLength"
            ? "3 m"
            : key === "cableFlex"
              ? "標準"
              : "";
      $(key).value = state.filters[key];
      updateSelectWarning($(key));
    });
    accessoryState["x5-scale-cable"] = {
      ...(accessoryState["x5-scale-cable"] ?? { checked: false }),
      length: cableLengthValue(state.filters.cableLength)
    };
    buildFilters();
    render();
  });
  $("addQuoteBtn").addEventListener("click", addCurrentSelectionToQuote);
  $("exportQuoteBtn").addEventListener("click", exportQuote);
}

buildFilters();
bindEvents();
bindSeriesMenu();
render();
