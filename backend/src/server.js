import http from "node:http";
import process from "node:process";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { Server } from "socket.io";
import { BinanceStream } from "./binance-stream.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = Number(process.env.PORT || 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const defaultSymbols = (process.env.DEFAULT_SYMBOLS || "BTCUSDT,ETHUSDT,SOLUSDT")
  .split(",")
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean);
const maxSymbolsPerClient = 12;

const io = new Server(server, {
  cors: {
    origin: frontendOrigin,
    credentials: true
  }
});

const snapshotStore = new Map();
const marketStream = new BinanceStream();

function sanitizeSymbols(input) {
  if (!Array.isArray(input)) {
    return defaultSymbols;
  }

  const sanitized = input
    .map((value) => String(value || "").trim().toUpperCase())
    .filter((value) => /^[A-Z0-9]{5,20}$/.test(value));

  return [...new Set(sanitized)].slice(0, maxSymbolsPerClient);
}

function collectActiveSymbols() {
  const active = new Set();

  for (const socket of io.sockets.sockets.values()) {
    for (const symbol of socket.data.watchlist || []) {
      active.add(symbol);
    }
  }

  return [...active];
}

function syncUpstreamSymbols() {
  const activeSymbols = collectActiveSymbols();
  marketStream.setSymbols(activeSymbols.length ? activeSymbols : defaultSymbols);
}

function sendSnapshots(socket, symbols) {
  for (const symbol of symbols) {
    const snapshot = snapshotStore.get(symbol);
    if (snapshot) {
      socket.emit("price:update", snapshot);
    }
  }
}

app.use(cors({ origin: frontendOrigin, credentials: true }));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    provider: "binance",
    trackedSymbols: collectActiveSymbols(),
    cachedSymbols: [...snapshotStore.keys()]
  });
});

app.get("/api/default-symbols", (_request, response) => {
  response.json({ symbols: defaultSymbols });
});

marketStream.on("ticker", (payload) => {
  snapshotStore.set(payload.symbol, payload);
  io.to(payload.symbol).emit("price:update", payload);
});

marketStream.on("status", (status) => {
  io.emit("market:status", status);
});

marketStream.on("error", (error) => {
  console.error("[binance]", error);
});

io.on("connection", (socket) => {
  const initialWatchlist = defaultSymbols;
  socket.data.watchlist = initialWatchlist;

  for (const symbol of initialWatchlist) {
    socket.join(symbol);
  }

  socket.emit("watchlist:accepted", { symbols: initialWatchlist });
  sendSnapshots(socket, initialWatchlist);
  syncUpstreamSymbols();

  socket.on("watchlist:set", (payload, callback) => {
    const nextWatchlist = sanitizeSymbols(payload?.symbols);
    const previousWatchlist = socket.data.watchlist || [];

    for (const symbol of previousWatchlist) {
      if (!nextWatchlist.includes(symbol)) {
        socket.leave(symbol);
      }
    }

    for (const symbol of nextWatchlist) {
      if (!previousWatchlist.includes(symbol)) {
        socket.join(symbol);
      }
    }

    socket.data.watchlist = nextWatchlist;
    socket.emit("watchlist:accepted", { symbols: nextWatchlist });
    sendSnapshots(socket, nextWatchlist);
    syncUpstreamSymbols();

    if (typeof callback === "function") {
      callback({ ok: true, symbols: nextWatchlist });
    }
  });

  socket.on("disconnect", () => {
    syncUpstreamSymbols();
  });
});

server.listen(port, () => {
  syncUpstreamSymbols();
  console.log(`Realtime backend listening on http://localhost:${port}`);
});
