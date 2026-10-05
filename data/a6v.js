(() => {
  const powerOptions = [
    { code: "5A", watt: 50 },
    { code: "01", watt: 100 },
    { code: "1E", watt: 133 },
    { code: "02", watt: 200 },
    { code: "2J", watt: 266 }
  ];
  const voltageByPower = {
    "5A": [{ code: "B", voltage: "DC48V" }],
    "01": [{ code: "B", voltage: "DC48V" }],
    "1E": [{ code: "C", voltage: "DC24V" }],
    "02": [{ code: "B", voltage: "DC48V" }],
    "2J": [{ code: "B", voltage: "DC48V" }]
  };
  const speedByPower = {
    "5A": { ratedSpeed: 3000, maxSpeed: 6500 },
    "01": { ratedSpeed: 3000, maxSpeed: 6500 },
    "1E": { ratedSpeed: 2000, maxSpeed: 3500 },
    "02": { ratedSpeed: 3000, maxSpeed: 4500 },
    "2J": { ratedSpeed: 2000, maxSpeed: 3000 }
  };
  const structures = [
    { code: "U2M", brake: false },
    { code: "V2M", brake: true }
  ];
  const motorCadModels = {
    MHMF5ABA1U2M: "MHMF5ABA1U2M",
    MHMF5ABA1V2M: "MHMF5ABA1V2M",
    MHMF01BA1U2M: "MHMF01BL1U2M",
    MHMF01BA1V2M: "MHMF01BL1V2M",
    MHMF1ECA1U2M: "MHMF1ECA1U2M",
    MHMF1ECA1V2M: "MHMF1ECA1V2M",
    MHMF02BA1U2M: "MHMF02BA1U2M",
    MHMF02BA1V2M: "MHMF02BA1V2M",
    MHMF2JBA1U2M: "MHMF2JBA1U2M",
    MHMF2JBA1V2M: "MHMF2JBA1V2M"
  };
  const motors = structures.flatMap((structure) =>
    powerOptions.flatMap((power) =>
      voltageByPower[power.code].map((voltage) => {
    const model = `MHMF${power.code}${voltage.code}A1${structure.code}`;
    const cadModel = motorCadModels[model] ?? "";
    const l1CadModel = model.replace(/A1(?=[UV]2M)/, "L1");
    return {
      id: `motor-${model}`,
      series: "A6V",
      folderName: `A6V ${power.watt}W伺服馬達${structure.brake ? "(煞車)" : ""} ${model}`,
      model,
      inertia: "高慣量",
      watt: power.watt,
      brake: structure.brake,
      ipRating: "IP65",
      flange: "請參閱A6V型錄",
      shaft: "請參閱A6V型錄",
      ratedSpeed: speedByPower[power.code].ratedSpeed,
      maxSpeed: speedByPower[power.code].maxSpeed,
      ratedTorque: Number((power.watt * 60 / (2 * Math.PI * 2000)).toFixed(3)),
      voltage: voltage.voltage,
      voltageCode: voltage.code,
      positionMemory: "無電池絕對式",
      derived: false,
      path: "",
      dwgFiles: [],
      stepFiles: [],
      cadFilesByEncoder: {
        L1: cadModel ? { dwgZip: `downloads/${l1CadModel}_2D.zip`, stepZip: `downloads/${l1CadModel}_3D.zip` } : { dwgZip: "", stepZip: "" },
        A1: cadModel ? { dwgZip: `downloads/${cadModel}_2D.zip`, stepZip: `downloads/${cadModel}_3D.zip` } : { dwgZip: "", stepZip: "" }
      },
      dwgZip: cadModel ? `downloads/${cadModel}_2D.zip` : "",
      stepZip: cadModel ? `downloads/${cadModel}_3D.zip` : ""
        };
      })
    )
  );

  const drivers = [
    {
      id: "driver-MVDLN4CBE",
      folderName: "A6V EtherCAT DC24V驅動器 MVDLN4CBE",
      series: "A6V",
      model: "MVDLN4CBE",
      mode: "EtherCAT",
      voltageCode: "C",
      supportedWatts: [50],
      watt: 50,
      capacityLabel: "50 W / DC24V",
      functionLabel: "旋轉馬達位置控制型",
      fullFunction: false,
      manuals: [{ label: "MINAS A6V 型錄", path: "manuals/MINAS-A6V-catalog.pdf" }],
      path: "",
      dwgFiles: [],
      stepFiles: [],
      dwgZip: "downloads/MVDLN4CBE_2D.zip",
      stepZip: "downloads/MVDLN4CBE_3D.zip"
    },
    {
      id: "driver-MVDLN5CBE",
      folderName: "A6V EtherCAT DC24V驅動器 MVDLN5CBE",
      series: "A6V",
      model: "MVDLN5CBE",
      mode: "EtherCAT",
      voltageCode: "C",
      supportedWatts: [100, 133],
      watt: 133,
      capacityLabel: "100 / 133 W / DC24V",
      functionLabel: "旋轉馬達位置控制型",
      fullFunction: false,
      manuals: [{ label: "MINAS A6V 型錄", path: "manuals/MINAS-A6V-catalog.pdf" }],
      path: "",
      dwgFiles: [],
      stepFiles: [],
      dwgZip: "downloads/MVDLN5CBE_2D.zip",
      stepZip: "downloads/MVDLN5CBE_3D.zip"
    },
    {
      id: "driver-MVDLN4BBE",
      folderName: "A6V EtherCAT DC48V驅動器 MVDLN4BBE",
      series: "A6V",
      model: "MVDLN4BBE",
      mode: "EtherCAT",
      voltageCode: "B",
      supportedWatts: [50, 100],
      watt: 100,
      capacityLabel: "50 / 100 W / DC48V",
      functionLabel: "旋轉馬達位置控制型",
      fullFunction: false,
      manuals: [{ label: "MINAS A6V 型錄", path: "manuals/MINAS-A6V-catalog.pdf" }],
      path: "",
      dwgFiles: [],
      stepFiles: [],
      dwgZip: "downloads/MVDLN4BBE_2D.zip",
      stepZip: "downloads/MVDLN4BBE_3D.zip"
    },
    {
      id: "driver-MVDLN5BBE",
      folderName: "A6V EtherCAT DC48V驅動器 MVDLN5BBE",
      series: "A6V",
      model: "MVDLN5BBE",
      mode: "EtherCAT",
      voltageCode: "B",
      supportedWatts: [200, 266],
      watt: 266,
      capacityLabel: "200 / 266 W / DC48V",
      functionLabel: "旋轉馬達位置控制型",
      fullFunction: false,
      manuals: [{ label: "MINAS A6V 型錄", path: "manuals/MINAS-A6V-catalog.pdf" }],
      path: "",
      dwgFiles: [],
      stepFiles: [],
      dwgZip: "downloads/MVDLN5BBE_2D.zip",
      stepZip: "downloads/MVDLN5BBE_3D.zip"
    }
  ];

  const lengths = [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const flexOptions = [
    { label: "標準", suffix: "" },
    { label: "耐曲折", suffix: "-TKD" }
  ];
  const lengthText = (length) => Number.isInteger(length) ? String(length) : String(length);
  const lengthCode = (length) => String(Math.round(length * 10)).padStart(4, "0");
  const motorPowerCode = (length) => length === 0.5 ? "0005" : `${String(length).padStart(3, "0")}1`;
  const cableRules = lengths.flatMap((length) => flexOptions.flatMap((flex) => {
    const text = lengthText(length);
    const code = lengthCode(length);
    const common = {
      length: `${text} m`,
      flex: flex.label,
      minWatt: 50,
      maxWatt: 266,
      ipRating: "IP65",
      stock: false
    };
    return [
      { ...common, id: `a6v-x4-${code}-${flex.label}`, type: "X4 IO連接線", model: `DVOPM24618-${text}M${flex.suffix}` },
      { ...common, id: `a6v-x6-${code}-${flex.label}`, type: "X6編碼線", model: `MFECA${code}EAD-A6V${flex.suffix}` },
      { ...common, id: `a6v-xb-${code}-${flex.label}`, type: "XB馬達電源線", model: `MFMCA${motorPowerCode(length)}EHG${flex.suffix}` },
      { ...common, id: `a6v-xa1-${code}-${flex.label}`, type: "XA-1驅動器動力線", model: `DVOPM24619${Math.round(length * 10)}-${text}M${flex.suffix}` },
      { ...common, id: `a6v-xa2-${code}-${flex.label}`, type: "XA-2驅動器控制線", model: `DVOPM24600-${text}M${flex.suffix}` },
      { ...common, id: `a6v-brake-${code}-${flex.label}`, type: "煞車線", model: `MFMCB${code}GET${flex.suffix}`, requiresBrake: true }
    ];
  }));

  window.PANASONIC_A6V_CATALOG = {
    motors,
    drivers,
    cableRules,
    fixedCables: [
      {
        id: "a6v-x2a-rj45",
        type: "X2A上位網路線(RJ45)",
        model: "A6VB-ECAT-RJ45-0.3M",
        length: "0.3 m",
        flex: "標準",
        stock: false
      },
      {
        id: "a6v-x2a-series",
        type: "X2A驅動器串聯連接線",
        model: "A6VB-ECAT-0.3M",
        length: "0.3 m",
        flex: "標準",
        stock: false
      }
    ]
  };
})();
