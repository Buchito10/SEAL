import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = (__ENV.BASE_URL || "https://localhost").replace(/\/$/, "");

export const options = {
  insecureSkipTLSVerify: BASE_URL.includes("localhost") || BASE_URL.includes("host.docker.internal"),
  scenarios: {
    usuarios_simultaneos: {
      executor: "constant-vus",
      vus: Number(__ENV.VUS || 50),
      duration: __ENV.DURATION || "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
    checks: ["rate>0.99"],
  },
};

export function setup() {
  const response = http.get(`${BASE_URL}/api/health`);
  check(response, {
    "API disponible antes de la carga": (res) => res.status === 200,
  });
}

export default function () {
  const response = http.get(`${BASE_URL}/login`, {
    tags: { endpoint: "login" },
  });

  check(response, {
    "login responde 200": (res) => res.status === 200,
    "respuesta contiene HTML": (res) =>
      String(res.headers["Content-Type"] || "").includes("text/html"),
    "respuesta menor a 500 ms": (res) => res.timings.duration < 500,
  });

  sleep(1);
}
