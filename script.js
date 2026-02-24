const dataStore = window.REGION_SCHOOLS_DATA;

const candidateRecords = [
  {
    regionCode: "11",
    schoolCode: "10001",
    name: "赵晨曦",
    idLast4: "1024",
    examNo: "202611110001",
    major: "计算机科学与技术",
    scores: { politics: 72, english: 79, course1: 131, course2: 122 }
  },
  {
    regionCode: "11",
    schoolCode: "10003",
    name: "韩子宁",
    idLast4: "3381",
    examNo: "202611110002",
    major: "电子信息",
    scores: { politics: 68, english: 81, course1: 134, course2: 120 }
  },
  {
    regionCode: "31",
    schoolCode: "10248",
    name: "陈雨彤",
    idLast4: "5607",
    examNo: "202631000001",
    major: "软件工程",
    scores: { politics: 70, english: 77, course1: 128, course2: 124 }
  },
  {
    regionCode: "32",
    schoolCode: "10284",
    name: "唐思远",
    idLast4: "4412",
    examNo: "202632000001",
    major: "法学",
    scores: { politics: 76, english: 83, course1: 118, course2: 126 }
  },
  {
    regionCode: "33",
    schoolCode: "10335",
    name: "王启航",
    idLast4: "7731",
    examNo: "202633000001",
    major: "控制科学与工程",
    scores: { politics: 69, english: 78, course1: 127, course2: 121 }
  },
  {
    regionCode: "42",
    schoolCode: "10486",
    name: "徐若涵",
    idLast4: "2268",
    examNo: "202642000001",
    major: "临床医学",
    scores: { politics: 74, english: 75, course1: 119, course2: 123 }
  },
  {
    regionCode: "44",
    schoolCode: "10558",
    name: "林可欣",
    idLast4: "8186",
    examNo: "202644000001",
    major: "工商管理",
    scores: { politics: 73, english: 84, course1: 116, course2: 129 }
  },
  {
    regionCode: "51",
    schoolCode: "10610",
    name: "杨泽宇",
    idLast4: "9032",
    examNo: "202651000001",
    major: "土木工程",
    scores: { politics: 67, english: 74, course1: 130, course2: 118 }
  },
  {
    regionCode: "61",
    schoolCode: "10698",
    name: "周子涵",
    idLast4: "6670",
    examNo: "202661000001",
    major: "机械工程",
    scores: { politics: 71, english: 76, course1: 132, course2: 120 }
  },
  {
    regionCode: "62",
    schoolCode: "10730",
    name: "冯嘉懿",
    idLast4: "4509",
    examNo: "202662000001",
    major: "化学工程",
    scores: { politics: 68, english: 72, course1: 126, course2: 119 }
  }
];

const dom = {
  form: document.getElementById("scoreForm"),
  region: document.getElementById("region"),
  org: document.getElementById("org"),
  name: document.getElementById("name"),
  idLast4: document.getElementById("idLast4"),
  examNo: document.getElementById("examNo"),
  captchaInput: document.getElementById("captchaInput"),
  captchaText: document.getElementById("captchaText"),
  refreshCaptcha: document.getElementById("refreshCaptcha"),
  message: document.getElementById("message"),
  sampleHint: document.getElementById("sampleHint"),
  resultPanel: document.getElementById("resultPanel"),
  generatedAtText: document.getElementById("generatedAtText"),
  metaGrid: document.getElementById("metaGrid"),
  regionTableBody: document.getElementById("regionTableBody"),
  rName: document.getElementById("rName"),
  rRegion: document.getElementById("rRegion"),
  rOrg: document.getElementById("rOrg"),
  rMajor: document.getElementById("rMajor"),
  rPolitics: document.getElementById("rPolitics"),
  rEnglish: document.getElementById("rEnglish"),
  rMath: document.getElementById("rMath"),
  rMajorCourse: document.getElementById("rMajorCourse"),
  rTotal: document.getElementById("rTotal"),
  rTime: document.getElementById("rTime")
};

let currentCaptcha = "";

function assertDataReady() {
  if (!dataStore || !Array.isArray(dataStore.regions) || dataStore.regions.length === 0) {
    setMessage("院校数据加载失败，请检查 data/region-schools.js。", "error");
    dom.form.querySelectorAll("input, select, button").forEach((el) => {
      el.disabled = true;
    });
    return false;
  }
  return true;
}

function normalize(text) {
  return String(text || "").trim();
}

function maskName(name) {
  if (name.length <= 1) return name;
  return `${name[0]}${"*".repeat(name.length - 1)}`;
}

function getRegionByCode(regionCode) {
  return dataStore.regions.find((region) => region.code === regionCode) || null;
}

function getSchoolByCode(regionCode, schoolCode) {
  const region = getRegionByCode(regionCode);
  if (!region) return null;
  return region.schools.find((school) => school.code === schoolCode) || null;
}

function nowString() {
  const date = new Date();
  const two = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
}

function formatDataTime() {
  const sourceTime = dataStore.generatedAt || dataStore.generatedAtUtc;
  if (!sourceTime) return "数据快照时间：未知";
  const dt = new Date(sourceTime);
  if (Number.isNaN(dt.getTime())) return `数据快照时间：${sourceTime}`;
  return `数据快照时间：${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

function setMessage(text, type = "") {
  dom.message.className = `message${type ? ` ${type}` : ""}`;
  dom.message.textContent = text;
}

function buildCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let text = "";
  for (let i = 0; i < 4; i += 1) {
    text += chars[Math.floor(Math.random() * chars.length)];
  }
  currentCaptcha = text;
  dom.captchaText.textContent = text;
}

function updateMeta() {
  const items = [
    { label: "覆盖省级地区", value: `${dataStore.totalRegions || dataStore.regions.length} 个` },
    { label: "覆盖招生单位", value: `${dataStore.totalSchools || 0} 所` },
    { label: "数据来源", value: "研招网公开接口快照" },
    { label: "资源模式", value: "本地静态 HTML/CSS/JS" }
  ];
  dom.metaGrid.innerHTML = items
    .map((item) => `<div class="meta-item"><span>${item.label}</span><strong>${item.value}</strong></div>`)
    .join("");
}

function renderRegionTable() {
  dom.regionTableBody.innerHTML = dataStore.regions
    .map((region) => {
      const preview = region.schools.slice(0, 3).map((school) => school.name).join("、");
      return `<tr>
        <td>${region.code}</td>
        <td>${region.name}</td>
        <td>${region.schoolCount}</td>
        <td>${preview || "-"}</td>
      </tr>`;
    })
    .join("");
}

function renderRegionOptions() {
  const options = dataStore.regions
    .map((region) => `<option value="${region.code}">${region.name}</option>`)
    .join("");
  dom.region.innerHTML = `<option value="">请选择省份</option>${options}`;
}

function renderSchoolOptions(regionCode) {
  const region = getRegionByCode(regionCode);
  if (!region) {
    dom.org.disabled = true;
    dom.org.innerHTML = "<option value=\"\">请先选择省份</option>";
    dom.sampleHint.textContent = "请选择省份后查看示例";
    return;
  }

  const options = region.schools
    .map((school) => {
      const suffix = school.enabled ? "" : "（未开通）";
      return `<option value="${school.code}">${school.name}${suffix}</option>`;
    })
    .join("");

  dom.org.disabled = false;
  dom.org.innerHTML = `<option value="">请选择院校</option>${options}`;

  const samples = candidateRecords
    .filter((record) => record.regionCode === regionCode)
    .map((record) => {
      const school = getSchoolByCode(record.regionCode, record.schoolCode);
      return `${record.name}（${school ? school.name : record.schoolCode} / ${record.examNo}）`;
    });

  dom.sampleHint.textContent = samples.length > 0
    ? `本省示例：${samples.join("；")}`
    : `当前省份包含 ${region.schoolCount} 所院校，暂无内置示例考生。`;
}

function validateInput(input) {
  if (!input.regionCode || !input.schoolCode || !input.name || !input.idLast4 || !input.examNo || !input.captchaInput) {
    return "请完整填写所有查询字段。";
  }

  if (!/^\d{4}$/.test(input.idLast4)) {
    return "证件号码后四位必须为4位数字。";
  }

  if (!/^\d{12}$/.test(input.examNo)) {
    return "准考证号必须为12位数字。";
  }

  if (input.captchaInput.toUpperCase() !== currentCaptcha) {
    return "验证码错误，请重试。";
  }

  const selectedSchool = getSchoolByCode(input.regionCode, input.schoolCode);
  if (!selectedSchool) {
    return "所选院校不存在，请重新选择。";
  }

  return "";
}

function lookupRecord(input) {
  return candidateRecords.find((record) => {
    return (
      record.regionCode === input.regionCode
      && record.schoolCode === input.schoolCode
      && record.name === input.name
      && record.idLast4 === input.idLast4
      && record.examNo === input.examNo
    );
  });
}

function renderRecord(record) {
  const region = getRegionByCode(record.regionCode);
  const school = getSchoolByCode(record.regionCode, record.schoolCode);
  const total = record.scores.politics + record.scores.english + record.scores.course1 + record.scores.course2;

  dom.rName.textContent = maskName(record.name);
  dom.rRegion.textContent = region ? region.name : record.regionCode;
  dom.rOrg.textContent = school ? school.name : record.schoolCode;
  dom.rMajor.textContent = record.major;
  dom.rPolitics.textContent = String(record.scores.politics);
  dom.rEnglish.textContent = String(record.scores.english);
  dom.rMath.textContent = String(record.scores.course1);
  dom.rMajorCourse.textContent = String(record.scores.course2);
  dom.rTotal.textContent = String(total);
  dom.rTime.textContent = nowString();
  dom.resultPanel.classList.remove("hidden");
}

function resetResult() {
  dom.resultPanel.classList.add("hidden");
}

function bindEvents() {
  dom.region.addEventListener("change", () => {
    renderSchoolOptions(dom.region.value);
    dom.org.value = "";
    resetResult();
    setMessage("");
  });

  dom.form.addEventListener("submit", (event) => {
    event.preventDefault();

    const input = {
      regionCode: dom.region.value,
      schoolCode: dom.org.value,
      name: normalize(dom.name.value),
      idLast4: normalize(dom.idLast4.value),
      examNo: normalize(dom.examNo.value),
      captchaInput: normalize(dom.captchaInput.value)
    };

    const error = validateInput(input);
    if (error) {
      resetResult();
      setMessage(error, "error");
      buildCaptcha();
      dom.captchaInput.value = "";
      return;
    }

    const record = lookupRecord(input);
    if (!record) {
      resetResult();
      setMessage("未查询到匹配记录，请核对姓名、准考证号、证件后四位与院校。", "error");
      buildCaptcha();
      dom.captchaInput.value = "";
      return;
    }

    renderRecord(record);
    setMessage("查询成功。当前结果来自本地静态示例数据。", "ok");
    buildCaptcha();
    dom.captchaInput.value = "";
  });

  dom.refreshCaptcha.addEventListener("click", buildCaptcha);

  dom.form.addEventListener("reset", () => {
    window.setTimeout(() => {
      dom.region.value = "";
      renderSchoolOptions("");
      setMessage("");
      resetResult();
      buildCaptcha();
    }, 0);
  });
}

function init() {
  if (!assertDataReady()) return;

  dom.generatedAtText.textContent = formatDataTime();
  updateMeta();
  renderRegionOptions();
  renderRegionTable();
  renderSchoolOptions("");
  bindEvents();
  buildCaptcha();
  setMessage("请输入示例考生信息进行查询。");
}

init();
