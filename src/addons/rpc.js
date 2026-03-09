const rpc = require("discord-rpc");
const { version } = require("../../package.json");

class DiscordRPC {
  constructor() {
    this.clientId = "1388058787583365263";
    this.startTimestamp = Date.now();
    this.client = new rpc.Client({ transport: "ipc" });
    this.init();
  }

  init() {
    this.client.on("ready", () => this.setActivity());
    this.client.on("disconnected", () => this.login());
    this.login();
  }

  login() {
    this.client.login({ clientId: this.clientId }).catch(console.error);
  }

  setActivity(activity = this.defaultActivity()) {
    this.client.setActivity(activity).catch(console.error);
  }

  setState(state) {
    const activity = this.defaultActivity();
    activity.state = state;
    this.setActivity(activity);
  }

  defaultActivity() {
    return {
      startTimestamp: this.startTimestamp,
      state: "In the lobby",
      largeImageKey: "icon", // Updated to "icon"
      largeImageText: `Gamma Client v${version}`,
      instance: false,
      buttons: [
        { label: "Download", url: "https://github.com/quirixa/Gamma-client" }, // Updated Download URL
        { label: "Discord", url: "https://discord.gg/FefKyX7VrF" }, // Updated Discord URL
      ],
    };
  }
}

module.exports = DiscordRPC;