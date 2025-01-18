/**************************************************************
 * content.js
 **************************************************************/
(function () {
  console.log("[content.js] 🔥 Loaded and running...");

  let nicknameImageMap = {}; // 닉네임별 이미지 맵

  /**************************************************************
   * 초기화
   **************************************************************/
  function init() {
    chrome.storage.local.get(["nicknameImageMap"], (result) => {
      nicknameImageMap = result.nicknameImageMap || {};
      console.log("[init()] nicknameImageMap:", nicknameImageMap);

      // 예: 0.5초마다 반복 검사
      setInterval(() => {
        transformAllProfileLinks(nicknameImageMap);
        transformAllStrongNicknames(nicknameImageMap);
        transformB9bnu2Spans(nicknameImageMap);
      }, 500);
    });
  }

  /**************************************************************
   * [A] 닉네임 추출 함수들
   **************************************************************/
  function getNicknameFromLink(linkElement) {
    const clone = linkElement.cloneNode(true);
    clone.querySelectorAll("span").forEach((s) => s.remove());
    return (clone.innerText || clone.textContent || "").trim();
  }

  function getNicknameFromStrong(strongElement) {
    const clone = strongElement.cloneNode(true);
    clone.querySelectorAll("span").forEach((s) => s.remove());
    clone.querySelectorAll("em").forEach((e) => e.remove());
    let nickname = (clone.innerText || clone.textContent || "").trim();
    nickname = nickname.replace(/\(.*?\)/g, "").trim();
    return nickname;
  }

  /**************************************************************
   * [B] "공통" 이미지 span 찾는 함수 (기존 or 플러그인)
   * 
   *  - 이미 삽입된 "플러그인 span" (data-our-image)가 있는지?
   *  - 없는 경우, "HTML 기본" background-image 가진 span이 있는지?
   *  => 둘 중 하나라도 찾으면 "존재"로 간주
   **************************************************************/
  function getAnyImageSpan(container) {
    // (1) 플러그인 span 먼저 찾기
    const pluginSpan = container.querySelector('span[data-our-image]');
    if (pluginSpan) {
      return pluginSpan;
    }

    // (2) HTML 기본 span 중 background-image가 있는지
    const spans = container.querySelectorAll("span");
    for (const sp of spans) {
      // 플러그인 span이 아닌데
      if (!sp.hasAttribute("data-our-image")) {
        const bg = window.getComputedStyle(sp).backgroundImage;
        if (bg && bg !== "none") {
          return sp; 
        }
      }
    }

    // (3) 아무것도 없으면 null
    return null;
  }

  /**************************************************************
   * [C] "공통" 이미지 span 생성 (플러그인 용)
   **************************************************************/
  function createOurImageSpan(imageDataUrl, width = 20, height = 18) {
    const span = document.createElement("span");
    span.setAttribute("data-our-image", "true"); 
    // ↑ 이 속성이 있으면 "플러그인 span"으로 간주

    span.style.display = "inline-block";
    span.style.width = width + "px";
    span.style.height = height + "px";
    span.style.marginRight = "4px";
    span.style.backgroundSize = `auto ${height}px`;
    span.style.backgroundPosition = "center center";
    span.style.backgroundRepeat = "no-repeat";
    span.style.verticalAlign = "middle";
    span.style.backgroundImage = `url("${imageDataUrl}"), url("/img/EmptyImage.svg")`;

    // 접근성용 blind text
    const blindSpan = document.createElement("span");
    blindSpan.className = "blind";
    blindSpan.innerText = "닉네임 이미지";
    span.appendChild(blindSpan);

    return span;
  }

  /**************************************************************
   * [1] transformAllProfileLinks
   * 
   * 시나리오:
   *   - anyImageSpan 없음 -> 
   *       nickname in map && nickname!='others' => 그 이미지,
   *       else if map['others'] => 그 이미지,
   *   - anyImageSpan 있음 ->
   *       nickname in map && nickname!='others' => 기존 span 제거 후 새 span
   *       else => do nothing
   **************************************************************/
  function transformAllProfileLinks(map) {
    const linkSelector = `
      div.css-1t19ptn.ee2n3ac5 a[href^="/profile/"],
      div.css-1ytfdae.ee2n3ac5 a[href^="/profile/"]
    `;
    const linkElements = document.querySelectorAll(linkSelector);

    linkElements.forEach((link) => {
      const nickname = getNicknameFromLink(link);
      if (!nickname) return;

      const anySpan = getAnyImageSpan(link); // (1) 이미지 span 탐색
      if (anySpan) {
        // (3) or (4) : 이미지 span 있음
        if (map.hasOwnProperty(nickname) && nickname !== "others") {
          // -> (4) 기존 span 제거, 새 span 추가
          anySpan.remove();

          const imageDataUrl = map[nickname];
          if (imageDataUrl) {
            const newSpan = createOurImageSpan(imageDataUrl, 20, 18);
            link.insertBefore(newSpan, link.firstChild);
          }
        } else {
          // (3) 기타 닉네임 or map에 없음 -> 아무것도 안 함
        }
      } else {
        // (1) or (2) : 이미지 span 없음
        let imageDataUrl = null;
        if (map.hasOwnProperty(nickname) && nickname !== "others") {
          // (2) 닉네임별 이미지
          imageDataUrl = map[nickname];
        } else if (map["others"]) {
          // (1) 기타 이미지
          imageDataUrl = map["others"];
        }

        if (imageDataUrl) {
          const newSpan = createOurImageSpan(imageDataUrl, 20, 18);
          link.insertBefore(newSpan, link.firstChild);
        }
      }
    });
  }

  /**************************************************************
   * [2] transformAllStrongNicknames
   *    - same scenario
   **************************************************************/
  function transformAllStrongNicknames(map) {
    const strongEls = document.querySelectorAll("strong.css-1oo5mxg.e1e59sjh6");

    strongEls.forEach((strong) => {
      const nickname = getNicknameFromStrong(strong);
      if (!nickname) return;

      const anySpan = getAnyImageSpan(strong);

      if (anySpan) {
        // (3) or (4)
        if (map.hasOwnProperty(nickname) && nickname !== "others") {
          // -> (4)
          anySpan.remove();

          const imageDataUrl = map[nickname];
          if (imageDataUrl) {
            // strong용으로 크기 다르게
            const newSpan = createOurImageSpan(imageDataUrl, 34, 30);
            strong.insertBefore(newSpan, strong.firstChild);
          }
        } else {
          // (3) do nothing
        }
      } else {
        // (1) or (2)
        let imageDataUrl = null;
        if (map.hasOwnProperty(nickname) && nickname !== "others") {
          imageDataUrl = map[nickname];
        } else if (map["others"]) {
          imageDataUrl = map["others"];
        }

        if (imageDataUrl) {
          const newSpan = createOurImageSpan(imageDataUrl, 34, 30);
          strong.insertBefore(newSpan, strong.firstChild);
        }
      }
    });
  }

  /**************************************************************
   * [3] transformB9bnu2Spans
   **************************************************************/
  function transformB9bnu2Spans(map) {
    const outerSpans = document.querySelectorAll("span.css-1b9bnu2.ezcv0b16");

    outerSpans.forEach((outerSpan) => {
      const strong = outerSpan.querySelector("strong.css-idoyix.ezcv0b17");
      if (!strong) return;
      const innerName = strong.querySelector("span.inner_name");
      if (!innerName) return;

      const nickname = (innerName.textContent || innerName.innerText || "").trim();
      if (!nickname) return;

      const anySpan = getAnyImageSpan(outerSpan);

      if (anySpan) {
        // (3) or (4)
        if (map.hasOwnProperty(nickname) && nickname !== "others") {
          // -> (4)
          anySpan.remove();

          const imageDataUrl = map[nickname];
          if (imageDataUrl) {
            const newSpan = createOurImageSpan(imageDataUrl, 20, 18);
            outerSpan.insertBefore(newSpan, strong);
          }
        } else {
          // (3) do nothing
        }
      } else {
        // (1) or (2)
        let imageDataUrl = null;
        if (map.hasOwnProperty(nickname) && nickname !== "others") {
          imageDataUrl = map[nickname];
        } else if (map["others"]) {
          imageDataUrl = map["others"];
        }

        if (imageDataUrl) {
          const newSpan = createOurImageSpan(imageDataUrl, 20, 18);
          outerSpan.insertBefore(newSpan, strong);
        }
      }
    });
  }

  /**************************************************************
   * 실행
   **************************************************************/
  init();
})();
