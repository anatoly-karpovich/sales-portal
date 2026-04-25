import { Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import { getDataDataFromToken } from "../utils/utils";

export default (socket: Socket, next: (err?: ExtendedError) => void) => {
  try {
    const token = socket.handshake.auth.token;
    const managerData = getDataDataFromToken(token.replace("Bearer ", ""));
    socket.data.manager = managerData;
    next();
  } catch (e) {
    next(new Error("Authentication error: " + (e as Error).message));
  }
};
