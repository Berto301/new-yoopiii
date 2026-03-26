import { socket } from "../../../lib/socket/socket.js";

export const performLogout = (dispatch, logoutAction) => {
  if (socket.connected) {
    socket.disconnect();
  }

  dispatch(logoutAction());
};
