// create a simple socket server

const fs = require("fs");
const logger = require("../utils/logger");

const mods = [];

/**
 * This is the socket server
 * act like a singleton for the shared resources
 */
class Socket {
  constructor() {
    if (!Socket.instance) {
      Socket.instance = this;
    }

    return Socket.instance;
  }

  start(server) {
    // read the mods
    this.io = require("socket.io")(server);
    const files = fs.readdirSync("./socket/mods");
    files.forEach((file) => {
      // if folder, call function recursively
      if (!fs.statSync("./socket/mods" + "/" + file).isDirectory()) {
        mods.push({
          path: file.replace(".js", ""),
          inst: require("./mods/" + file),
        });
      }
    });
    var that = this;
    this.io.on("connection", function (socket) {
      logger.logs(`socket user connected: ${socket.id}`);

      socket.on("neonet", function (data) {
        // check this is a json object
        if (typeof data != "object") {
          socket.emit("neonet", { error: "Data must be a json object" });
          return;
        }

        // now play with the data
        const m = mods.find((m) => m.path == data.mod);
        if (!m) {
          socket.emit("neonet", { error: "Mod not found" });
          return;
        }

        if (!socket.auth && data.mod != "auth") {
          socket.emit("neonet", { error: "You must authenticate first" });
          return;
        }

        m.inst(socket, data, that.io);
      });

      socket.on("disconnect", function () {
        logger.logs(`socket user disconnected: ${socket.id}`);
      });
    });
  }

  getSocketByUser(username) {
    for (const [key, client] of this.io.sockets.sockets.entries()) {
      if (client.auth.username === username) {
        return client;
      }
    }
    return null;
  }
}

module.exports = new Socket();
