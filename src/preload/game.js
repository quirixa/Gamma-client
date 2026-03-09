const Menu = require("./menu");
const { opener } = require("../addons/opener");
const { customReqScripts } = require("../addons/customReqScripts");
const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");

const scriptsPath = ipcRenderer.sendSync("get-scripts-path");
const scripts = fs.readdirSync(scriptsPath);

const settings = ipcRenderer.sendSync("get-settings");
const base_url = settings.base_url;

if (!window.location.href.startsWith(base_url)) {
  delete window.process;
  delete window.require;
  return;
} else {
  scripts.forEach((script) => {
    if (!script.endsWith(".js")) return;
    const scriptPath = path.join(scriptsPath, script);
    try {
      require(scriptPath);
    }
    catch (error) {
      console.error(`Error loading script ${script}:`, error);
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const menu = new Menu();
  menu.init();

  opener();
  customReqScripts(settings);

  const fetchAll = async () => {
    const [customizations, user] = await Promise.all([
      fetch("https://juice-api.irrvlo.xyz/api/customizations").then((r) =>
        r.json()
      ),
      fetch(`https://api.kirka.io/api/user`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }).then((r) => r.json()),
    ]);

    localStorage.setItem(
      "juice-customizations",
      JSON.stringify(customizations)
    );
    localStorage.setItem(
      "current-user",
      JSON.stringify(user.statusCode === 401 ? "" : user)
    );
  };
  fetchAll();

  const formatLink = (link) => link.replace(/\\/g, "/");

  const lobbyKeybindReminder = (settings) => {
    const keybindReminder = document.createElement("span");
    keybindReminder.id = "juice-keybind-reminder";
    keybindReminder.style = `position: absolute; left: 147px; bottom: 10px; font-size: 0.9rem; color: #fff; width: max-content`;

    keybindReminder.innerText = `Press ${settings.menu_keybind} to open the client menu.`;

    if (
      !document.querySelector("#app > .interface") ||
      document.querySelector("#juice-keybind-reminder")
    )
      return;

    document.querySelector("#app #left-icons").appendChild(keybindReminder);
    document.addEventListener("juice-settings-changed", ({ detail }) => {
      if (detail.setting === "menu_keybind") {
        const keybindReminder = document.querySelector(
          "#juice-keybind-reminder"
        );
        if (keybindReminder)
          keybindReminder.innerText = `Press ${detail.value} to open the client menu.`;
      }
    });
  };

  const lobbyNews = async (settings) => {
    if (
      !document.querySelector("#app > .interface") ||
      document.querySelector(".lobby-news")
    )
      return;

    const { general_news, promotional_news, event_news, alert_news } = settings;
    if (!general_news && !promotional_news && !event_news && !alert_news)
      return;

    let news = await fetch("https://juice-api.irrvlo.xyz/api/news").then((r) =>
      r.json()
    );
    if (!news.length) return;

    news = news.filter(({ category }) => {
      const categories = {
        general: general_news,
        promotional: promotional_news,
        event: event_news,
        alert: alert_news,
      };
      return categories[category];
    });

    const lobbyNewsContainer = document.createElement("div");
    lobbyNewsContainer.id = "lobby-news";
    lobbyNewsContainer.className = "lobby-news";
    lobbyNewsContainer.style = `
      width: 250px;
      position: absolute;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      top: 178px;
      left: 148px;
      pointer-events: auto;
    `;
    document
      .querySelector("#app #left-interface")
      .appendChild(lobbyNewsContainer);

    const createNewsCard = (newsItem) => {
      const div = document.createElement("div");
      div.className = "news-card";
      div.style = `
        width: 100%;
        border: 4px solid #3e4d7c;
        border-bottom: solid 4px #26335b;
        border-top: 4px solid #4d5c8b;
        background-color: #3b4975;
        display: flex;
        position: relative;
        ${newsItem.link ? "cursor: pointer;" : ""}
        ${newsItem.imgType === "banner" ? "flex-direction: column;" : ""}
      `;
      lobbyNewsContainer.appendChild(div);

      const addImage = () => {
        const img = document.createElement("img");
        img.className = `news-img ${newsItem.imgType}`;
        img.src = newsItem.img;
        img.style = `
          width: ${newsItem.imgType === "banner" ? "100%" : "4rem"};
          max-height: ${newsItem.imgType === "banner" ? "7.5rem" : "4rem"};
          object-fit: cover;
          object-position: center;
        `;
        div.appendChild(img);
      };

      const addBadge = (text, color) => {
        const badgeSpan = document.createElement("span");
        badgeSpan.className = "badge";
        badgeSpan.innerText = text;
        badgeSpan.style = `
          position: absolute;
          top: 0;
          right: 0;
          background-color: ${color};
          color: #fff;
          padding: 0.15rem 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 0 0 0 0.25rem;
        `;
        div.appendChild(badgeSpan);
      };

      const addContent = () => {
        const content = document.createElement("div");
        content.className = "news-container";
        content.style = `
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          text-align: left;
        `;

        const title = document.createElement("span");
        title.className = "news-title";
        title.innerText = newsItem.title;
        title.style = `
          font-size: 1.2rem;
          font-weight: 600;
          color: #fff;
          margin: 0;
          color: #ffb914;
        `;
        content.appendChild(title);

        const text = document.createElement("span");
        text.className = "news-content";
        text.innerText = newsItem.content;
        text.style = `
          font-size: 0.9rem;
          color: #fff;
          margin: 0;
        `;

        if (newsItem.content) content.appendChild(text);
        div.appendChild(content);
      };

      if (newsItem.img && newsItem.img !== "") addImage();
      if (
        newsItem.updatedAt &&
        newsItem.updatedAt > Date.now() - 432000000 &&
        !newsItem.live
      )
        addBadge("NEW", "#e24f4f");
      else if (newsItem.live) addBadge("LIVE", "#4dbf4d");
      addContent();

      div.onclick = () => {
        if (newsItem.link) {
          if (newsItem.link.startsWith("https://kirka.io/"))
            window.location.href = newsItem.link;
          else
            window.open(
              newsItem.link.replace("https://kirka.io/", base_url),
              "_blank"
            );
        }
      };
    };

    news.forEach((newsItem) => createNewsCard(newsItem));
  };

  const juiceDiscordButton = () => {
    const btn = document.querySelectorAll(".card-cont.soc-group")[1];
    if (!btn || document.querySelector("#gamma-discord-btn")) return;

    const discordBtn = btn.cloneNode(true);
    discordBtn.className =
      "card-cont soc-group transfer-list-top-enter transfer-list-top-enter-active";
    discordBtn.id = "gamma-discord-btn";
    discordBtn.style = `
    background: linear-gradient(to top, rgba(255,147,45,.75), rgba(172,250,112,.75)) !important;
    border-bottom-color: #c47022 !important;
    border-top-color: #c5ff99 !important;
    border-right-color: #e48329 !important;`;
    const textDivs = discordBtn.querySelector(".text-soc").children;
    textDivs[0].innerText = "GAMMA";
    textDivs[1].innerText = "DISCORD";

    const i = document.createElement("i");
    i.className = "fab fa-discord";
    i.style.fontSize = "48px";
    i.style.fontFamily = "Font Awesome 6 Brands";
    i.style.margin = "3.2px 1.6px 0 1.6px";
    i.style.textShadow = "0 0 0 transparent";
    discordBtn.querySelector("svg").replaceWith(i);

    discordBtn.onclick = () => {
      window.open("https://discord.com/invite/FefKyX7VrF", "_blank");
    };

    btn.replaceWith(discordBtn);

    setInterval(() => {
      discordBtn.className = "card-cont soc-group";
    }, 300);
  };

  const loadTheme = () => {
    const addedStyles = document.createElement("style");
    addedStyles.id = "juice-styles-theme";
    document.head.appendChild(addedStyles);

    const customStyles = document.createElement("style");
    customStyles.id = "juice-styles-custom";
    document.head.appendChild(customStyles);

    const updateTheme = () => {
      const settings = ipcRenderer.sendSync("get-settings");
      const cssLink = settings.css_link;
      const advancedCSS = settings.advanced_css;

      if (cssLink && settings.css_enabled) {
        addedStyles.innerHTML = `@import url('${formatLink(cssLink)}');`;
      } else {
        addedStyles.innerHTML = "";
      }

      customStyles.innerHTML = advancedCSS;
    };

    document.addEventListener("juice-settings-changed", (e) => {
      if (
        e.detail.setting === "css_link" ||
        e.detail.setting === "css_enabled" ||
        e.detail.setting === "advanced_css"
      ) {
        updateTheme();
      }
    });

    updateTheme();
  };

  const applyUIFeatures = () => {
    const addedStyles = document.createElement("style");
    addedStyles.id = "juice-styles-ui-features";
    document.head.appendChild(addedStyles);

    const updateUIFeatures = () => {
      const settings = ipcRenderer.sendSync("get-settings");
      const styles = [];

      if (settings.perm_crosshair)
        styles.push(
          ".crosshair-static { opacity: 1 !important; visibility: visible !important; display: block !important; }"
        );
      if (settings.hide_chat)
        styles.push(
          ".desktop-game-interface > #bottom-left > .chat { display: none !important; }"
        );
      if (settings.hide_interface)
        styles.push(
          ".desktop-game-interface, .crosshair-cont, .ach-cont, .hitme-cont, .sniper-mwNMW-cont, .team-score, .score { display: none !important; }"
        );
      if (settings.skip_loading)
        styles.push(".loading-scene { display: none !important; }");
      if (settings.interface_opacity)
        styles.push(
          `.desktop-game-interface { opacity: ${settings.interface_opacity}% !important; }`
        );
      if (settings.interface_bounds) {
        let scale =
          settings.interface_bounds === "1"
            ? 0.9
            : settings.interface_bounds === "0"
              ? 0.8
              : 1;
        styles.push(
          `.desktop-game-interface { transform: scale(${scale}) !important; }`
        );
      }
      if (settings.hitmarker_link !== "")
        styles.push(
          `.hitmark { content: url(${formatLink(
            settings.hitmarker_link
          )}) !important; }`
        );
      if (settings.killicon_link !== "")
        styles.push(`.animate-cont::before { content: ""; 
      background: url(${formatLink(
          settings.killicon_link
        )}); width: 10rem; height: 10rem; margin-bottom: 2rem; display: inline-block; background-position: center; background-size: contain; background-repeat: no-repeat; }
      .animate-cont svg { display: none; }`);
      if (!settings.ui_animations)
        styles.push(
          "* { transition: none !important; animation: none !important; }"
        );
      if (settings.rave_mode)
        styles.push(
          "canvas { animation: rotateHue 1s linear infinite !important; }"
        );
      if (!settings.lobby_keybind_reminder)
        styles.push("#juice-keybind-reminder { display: none; }");

      addedStyles.innerHTML = styles.join("");
    };

    document.addEventListener("juice-settings-changed", (e) => {
      const relevantSettings = [
        "perm_crosshair",
        "hide_chat",
        "hide_interface",
        "skip_loading",
        "interface_opacity",
        "interface_bounds",
        "hitmarker_link",
        "ui_animations",
        "rave_mode",
        "lobby_keybind_reminder",
      ];
      if (relevantSettings.includes(e.detail.setting)) updateUIFeatures();
    });
    updateUIFeatures();
  };

  const handleLobby = () => {
    const settings = ipcRenderer.sendSync("get-settings");

    lobbyKeybindReminder(settings);
    lobbyNews(settings);
    juiceDiscordButton();

    const customizations = JSON.parse(
      localStorage.getItem("juice-customizations")
    );
    const currentUser = JSON.parse(localStorage.getItem("current-user"));

    const applyCustomizations = () => {
      if (customizations?.find((c) => c.shortId === currentUser?.shortId)) {
        const customs = customizations.find(
          (c) => c.shortId === currentUser.shortId
        );
        const lobbyNickname = document.querySelector(
          ".team-section .heads .nickname"
        );
      }
    }
  }

  const customNotification = (data) => {
    const notifElement = document.createElement("div");
    notifElement.classList.add("vue-notification-wrapper");
    notifElement.style =
      "transition-timing-function: ease; transition-delay: 0s; transition-property: all;";
    notifElement.innerHTML = `
    <div
      style="
        display: flex;
        align-items: center;
        padding: .9rem 1.1rem;
        margin-bottom: .5rem;
        color: var(--white);
        cursor: pointer;
        box-shadow: 0 0 0.7rem rgba(0,0,0,.25);
        border-radius: .2rem;
        background: linear-gradient(262.54deg,#202639 9.46%,#223163 100.16%);
        margin-left: 1rem;
        border: solid .15rem #ffb914;
        font-family: Exo\ 2;" class="alert-default"
    > ${data.icon
        ? `
        <img
          src="${data.icon}"
          style="
            min-width: 2rem;
            height: 2rem;
            margin-right: .9rem;"
        />`
        : ""
      }
      <span style="font-size: 1rem; font-weight: 600; text-align: left;" class="text">${data.message
      }</span>
    </div>`;

    document
      .getElementsByClassName("vue-notification-group")[0]
      .children[0].appendChild(notifElement);

    setTimeout(() => {
      try {
        notifElement.remove();
      } catch { }
    }, 5000);
  };

  ipcRenderer.on("notification", (_, data) => customNotification(data));

  ipcRenderer.on("url-change", (_, url) => {
    if (url === `${base_url}`) {
      handleLobby();
      handleInGame();
    }
    if (url.startsWith(`${base_url}games`)) handleInGame();
    if (url.startsWith(`${base_url}servers/`)) handleServers();
    if (url.startsWith(`${base_url}profile/`)) handleProfile();
    if (url === `${base_url}hub/market`) handleMarket();
    if (url === `${base_url}friends`) handleFriends();
  });

  const handleInitialLoad = () => {
    const url = window.location.href;
    if (url === `${base_url}`) {
      handleLobby();
      handleInGame();
    }
    if (url.startsWith(`${base_url}games`)) handleInGame();
    if (url.startsWith(`${base_url}servers/`)) handleServers();
    if (url.startsWith(`${base_url}profile/`)) handleProfile();
    if (url === `${base_url}hub/market`) handleMarket();
    if (url === `${base_url}friends`) handleFriends();

    loadTheme();
    applyUIFeatures();
  };

  handleInitialLoad();
});
