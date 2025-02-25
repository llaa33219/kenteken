/********************************************************
 * popup.js
 ********************************************************/

// 전역 변수
let nicknameImageMap = {};  // { 닉네임: dataURL, ..., others: dataURL }
let currentSelectedDataURL = "";  // 파일 업로드/SVG 생성/이미지 클릭 등으로 만든 dataURL

// DOM 요소
const nicknameContainer = document.getElementById('nicknameContainer');
const addNicknameBtn = document.getElementById('addNicknameBtn');
const othersPreview = document.getElementById('othersPreview');
const othersChangeBtn = document.getElementById('othersChangeBtn');
const fileUpload = document.getElementById('fileUpload');

// SVG 프리셋 관련
const svgBgColor = document.getElementById('svgBgColor');
const svgTextColor = document.getElementById('svgTextColor');
const svgTextValue = document.getElementById('svgTextValue');
const svgTextSize  = document.getElementById('svgTextSize');
const svgPreview = document.getElementById('svgPreview');

const saveBtn = document.getElementById('saveBtn');


/********************************************************
 * 초기 로드 시점
 ********************************************************/
document.addEventListener('DOMContentLoaded', () => {
  // chrome.storage.local에서 nicknameImageMap 불러오기
  chrome.storage.local.get(["nicknameImageMap"], (result) => {
    if (result.nicknameImageMap) {
      nicknameImageMap = result.nicknameImageMap;
    } else {
      nicknameImageMap = {};
    }
    renderNicknamesUI();
    updateOthersPreview();

    // [수정1] 처음 팝업 열릴 때, 한 번 기본 SVG 프리뷰 업데이트
    updateSvgPreview();
  });
});


/********************************************************
 * (공통) nicknameContainer UI를 읽어와 storage에 저장
 ********************************************************/
function saveToStorage() {
  // 1) nicknameContainer에 있는 모든 row 스캔
  const rows = nicknameContainer.querySelectorAll('.row');
  const tempMap = {};

  rows.forEach((row) => {
    const nickInput = row.querySelector('.nickInput');
    const previewImg = row.querySelector('.nickPreview');
    const nick = nickInput.value.trim();
    if (nick) {
      tempMap[nick] = previewImg.src;
    }
  });

  // 2) 기존 others 값이 있으면 포함
  if (nicknameImageMap["others"]) {
    tempMap["others"] = nicknameImageMap["others"];
  }

  // 3) nicknameImageMap 갱신
  nicknameImageMap = tempMap;

  // 4) 실제 chrome.storage.local에 저장
  chrome.storage.local.set({ nicknameImageMap }, () => {
    console.log("자동 저장 완료:", nicknameImageMap);
  });
}


/********************************************************
 * 닉네임별 이미지 목록 UI
 ********************************************************/
function renderNicknamesUI() {
  nicknameContainer.innerHTML = "";
  
  // nicknameImageMap 중 "others"는 제외하고 표시
  const entries = Object.entries(nicknameImageMap).filter(([nick]) => nick !== "others");
  
  entries.forEach(([nick, dataURL]) => {
    addNicknameRow(nick, dataURL);
  });
}

// row를 추가하는 함수
function addNicknameRow(nickname = "", dataURL = "") {
  const row = document.createElement('div');
  row.className = "row";

  row.innerHTML = `
    <input type="text" class="nickInput" value="${nickname}" placeholder="닉네임"/>
    <img class="preview-img nickPreview" src="${dataURL}" />
    <button class="changeBtn">변경</button>
    <button class="removeBtn">삭제</button>
  `;
  nicknameContainer.appendChild(row);

  const nickInput = row.querySelector('.nickInput');
  const previewImg = row.querySelector('.nickPreview');
  const changeBtn = row.querySelector('.changeBtn');
  const removeBtn = row.querySelector('.removeBtn');

  // [추가] "이미지 없음" 버튼 만들기
  const noImageBtn = document.createElement('button');
  noImageBtn.textContent = "이미지 없음";
  noImageBtn.style.marginLeft = "3px"; 
  noImageBtn.style.width = "130px";
  row.appendChild(noImageBtn);

  // **닉네임 text 입력 변경 시 자동저장
  nickInput.addEventListener('input', () => {
    saveToStorage();
  });

  // "변경" 버튼 → currentSelectedDataURL을 적용
  changeBtn.addEventListener('click', () => {
    if (!currentSelectedDataURL) {
      alert("파일 업로드나 SVG 커스텀으로 이미지를 선택 후 변경하세요.");
      return;
    }
    previewImg.src = currentSelectedDataURL;
    saveToStorage();  // 자동저장
  });

  // "삭제" 버튼
  removeBtn.addEventListener('click', () => {
    row.remove();
    saveToStorage();  // 자동저장
  });

  // "이미지 없음" 버튼
  noImageBtn.addEventListener('click', () => {
    previewImg.src = "";
    saveToStorage();
  });

  // 미리보기 이미지 클릭 → 해당 이미지를 재편집 가능하도록 로드
  previewImg.addEventListener('click', () => {
    currentSelectedDataURL = previewImg.src;
    svgPreview.src = previewImg.src;

    // 만약 SVG라면 배경색/글자색/글자값/글자크기 파싱
    parseSVGandSetFormFields(previewImg.src);
  });
}


// "닉네임 추가" 버튼
addNicknameBtn.addEventListener('click', () => {
  addNicknameRow("", "");
});


/********************************************************
 * 기타 닉네임(others)용 이미지
 ********************************************************/
function updateOthersPreview() {
  const othersDataURL = nicknameImageMap["others"];
  if (othersDataURL) {
    othersPreview.src = othersDataURL;
  } else {
    othersPreview.src = "";
  }
}

othersChangeBtn.addEventListener('click', () => {
  if (!currentSelectedDataURL) {
    alert("파일 업로드나 SVG 커스텀으로 이미지를 선택 후 변경하세요.");
    return;
  }
  nicknameImageMap["others"] = currentSelectedDataURL;
  updateOthersPreview();
  saveToStorage();  // 자동저장
});

// [추가] 기타(others)용 "이미지 없음" 버튼도 추가
const othersClearBtn = document.createElement('button');
othersClearBtn.textContent = "이미지 없음";
othersClearBtn.style.marginLeft = "10px";
othersClearBtn.style.width = "130px";
othersChangeBtn.insertAdjacentElement('afterend', othersClearBtn);

othersClearBtn.addEventListener('click', () => {
  nicknameImageMap["others"] = "";
  updateOthersPreview();
  saveToStorage();  // 자동저장
});


/********************************************************
 * 파일 업로드 → dataURL 변환
 ********************************************************/
fileUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(ev) {
    currentSelectedDataURL = ev.target.result;
    svgPreview.src = currentSelectedDataURL;
    parseSVGandSetFormFields(currentSelectedDataURL);

    saveToStorage(); // 자동저장 (업로드 후)
  };
  reader.readAsDataURL(file);
});


/********************************************************
 * SVG 프리셋 → dataURL (실시간 생성)
 ********************************************************/
function generateSvgDataURL() {
  const bgColor = svgBgColor.value;
  const textColor = svgTextColor.value;
  const textValue = svgTextValue.value || "";

  // 글씨 크기 (기본값 22)
  let fontSize = parseInt(svgTextSize.value, 10);
  if (isNaN(fontSize) || fontSize <= 0) {
    fontSize = 22; 
  }

  // 여기서부터 UTF-8로 생성
  const svgTemplate = `
<svg xmlns="http://www.w3.org/2000/svg" width="45" height="40" viewBox="0 0 45 40">
  <g fill="none" font-family="'Malgun Gothic','Apple SD Gothic Neo',sans-serif">
    <path fill="${bgColor}"
          d="M41,11.3353857 C41,10.381262 40.4927265,9.49947256 39.6718345,9.02241071 
             L23.9199314,0.357796388 C23.0973257,-0.119265463 22.0844924,-0.119265463 
             21.2618867,0.357796388 L6.32816548,9.02241071 
             C5.50727352,9.49947256 5,10.381262 5,11.3353857 
             L5,28.6646143 C5,29.618738 5.50727352,30.5005274 
             6.32816548,30.9775893 L21.2618867,39.6422036 
             C22.0844924,40.1192655 23.0973257,40.1192655 
             23.9199314,39.6422036 L39.6718345,30.9775893 
             C40.4927265,30.5005274 41,29.618738 41,28.6646143 
             L41,11.3353857 Z"/>
    <text x="50%" y="55%" 
          font-size="${fontSize}" 
          text-anchor="middle" 
          fill="${textColor}" 
          dominant-baseline="middle">
      ${textValue}
    </text>
  </g>
</svg>`;

  // Blob 생성 시 charset 명시
  const blob = new Blob([svgTemplate], { type: "image/svg+xml;charset=utf-8" });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      resolve(ev.target.result); // data:image/svg+xml;base64,...
    };
    reader.readAsDataURL(blob);
  });
}


/********************************************************
 * 실시간 미리보기 업데이트
 ********************************************************/
async function updateSvgPreview() {
  const dataUrl = await generateSvgDataURL();
  currentSelectedDataURL = dataUrl;
  svgPreview.src = dataUrl;
  saveToStorage(); // 변경 시마다 자동 저장
}

// SVG 입력값(배경색/글자색/글자내용/글자크기)이 바뀔 때마다 자동 호출
[svgBgColor, svgTextColor, svgTextValue, svgTextSize].forEach(el => {
  el.addEventListener('input', updateSvgPreview);
});


/********************************************************
 * Base64 -> UTF-8 디코딩 (한글 깨짐 방지)
 ********************************************************/
function decodeBase64ToUTF8(b64Str) {
  // atob()로 디코딩 → binary → UTF-8로 다시 디코딩
  const binary = atob(b64Str); 
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(bytes);
}


/********************************************************
 * 기존 SVG를 파싱해서 배경색/글자색/글자/글자크기 폼 세팅
 ********************************************************/
function parseSVGandSetFormFields(dataURL) {
  // data:image/svg+xml;base64,..... 형태인지 확인
  if (!dataURL.startsWith("data:image/svg+xml")) {
    // SVG가 아니면 무시
    return;
  }

  try {
    const base64part = dataURL.split(",")[1];
    // [수정2] UTF-8 디코딩 함수 적용
    const svgString = decodeBase64ToUTF8(base64part);

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(svgString, "image/svg+xml");

    const pathEl = xmlDoc.querySelector("path");
    if (pathEl) {
      const fillColor = pathEl.getAttribute("fill");
      if (fillColor) {
        svgBgColor.value = fillColor;
      }
    }

    const textEl = xmlDoc.querySelector("text");
    if (textEl) {
      const textFill = textEl.getAttribute("fill");
      if (textFill) {
        svgTextColor.value = textFill;
      }
      const fs = textEl.getAttribute("font-size");
      if (fs) {
        svgTextSize.value = parseInt(fs, 10);
      }
      const textContent = textEl.textContent;
      if (textContent) {
        svgTextValue.value = textContent.trim();
      }
    }

    // 폼 필드 설정 후 실시간 미리보기 다시 업데이트
    updateSvgPreview();

  } catch (err) {
    console.warn("SVG 파싱 에러:", err);
  }
}


/********************************************************
 * "저장" 버튼 (수동 저장도 가능)
 ********************************************************/
saveBtn.addEventListener('click', () => {
  saveToStorage();
  alert("저장 완료!");
});
