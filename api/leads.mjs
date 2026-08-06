import { createServer } from "../server.mjs";

const server = createServer();

export default function handler(request, response) {
  server.emit("request", request, response);
}
