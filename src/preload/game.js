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