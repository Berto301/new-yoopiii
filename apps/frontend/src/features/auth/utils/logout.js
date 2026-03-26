import { socket } from "../../../lib/socket/socket.js";

export const performLogout = (logout) => {
  if (socket.connected) {
    socket.disconnect();
  }

  logout();
};
