import { handleLeadRequest } from "../src/lead-handler.mjs";

function nodeRequestToWebRequest(request) {
  const protocol = request.headers?.["x-forwarded-proto"] || "https";
  const host = request.headers?.host || "quiz.invalid";
  const body = request.body === undefined
    ? undefined
    : typeof request.body === "string"
      ? request.body
      : JSON.stringify(request.body);
  return new Request(`${protocol}://${host}${request.url || "/api/leads"}`, {
    method: request.method,
    headers: request.headers,
    ...(body === undefined ? {} : { body })
  });
}

export default async function handler(request, response) {
  const webResponse = await handleLeadRequest(nodeRequestToWebRequest(request));
  response.status(webResponse.status);
  for (const [name, value] of webResponse.headers) response.setHeader(name, value);
  response.send(await webResponse.text());
}
