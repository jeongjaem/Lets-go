import EventEmitter from "node:events";
import WebSocket from "ws";

const BINANCE_STREAM_BASE = "wss://stream.binance.com:9443/stream?streams=";
const MAX_UPSTREAM_AGE_MS = 23 * 60 * 60 * 1000 + 55 * 60 * 1000;

function toStreamName(symbol) {
  return `${symbol.toLowerCase()}@miniTicker`;
}

function normalizeTicker(payload) {
  return {
    provider: "binance",
    symbol: payload.s,
    price: Number(payload.c),
    open: Number(payload.o),
    high: Number(payload.h),
    low: Number(payload.l),
    volume: Number(payload.v),
    quoteVolume: Number(payload.q),
    changePercent: Number(payload.P),
    eventTime: payload.E
  };
}

export class BinanceStream extends EventEmitter {
  constructor() {
    super();
    this.symbols = new Set();
    this.socket = null;
    this.reconnectTimer = null;
    this.rotationTimer = null;
    this.manualClose = false;
  }

  setSymbols(symbols) {
    const nextSymbols = new Set(symbols);
    const hasChanged =
      nextSymbols.size !== this.symbols.size ||
      [...nextSymbols].some((symbol) => !this.symbols.has(symbol));

    if (!hasChanged) {
      return;
    }

    this.symbols = nextSymbols;
    this.refreshConnection();
  }

  close() {
    this.manualClose = true;
    this.clearTimers();
    this.socket?.close();
  }

  refreshConnection() {
    this.manualClose = false;

    if (!this.symbols.size) {
      this.clearTimers();
      this.socket?.close();
      this.socket = null;
      this.emit("status", { connected: false, reason: "idle" });
      return;
    }

    this.connect();
  }

  connect() {
    this.clearTimers();
    this.socket?.removeAllListeners();
    this.socket?.close();

    const streamUrl = `${BINANCE_STREAM_BASE}${[...this.symbols].map(toStreamName).join("/")}`;
    const socket = new WebSocket(streamUrl);
    this.socket = socket;

    socket.on("open", () => {
      this.emit("status", { connected: true, symbols: [...this.symbols] });
      this.rotationTimer = setTimeout(() => {
        this.connect();
      }, MAX_UPSTREAM_AGE_MS);
    });

    socket.on("ping", (data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.pong(data);
      }
    });

    socket.on("message", (raw) => {
      try {
        const parsed = JSON.parse(raw.toString());
        const payload = parsed.data ?? parsed;

        if (!payload?.s || typeof payload?.c === "undefined") {
          return;
        }

        this.emit("ticker", normalizeTicker(payload));
      } catch (error) {
        this.emit("error", error);
      }
    });

    socket.on("error", (error) => {
      this.emit("error", error);
    });

    socket.on("close", () => {
      this.emit("status", { connected: false, reason: "closed" });
      this.socket = null;

      if (!this.manualClose && this.symbols.size) {
        this.reconnectTimer = setTimeout(() => {
          this.connect();
        }, 3000);
      }
    });
  }

  clearTimers() {
    clearTimeout(this.reconnectTimer);
    clearTimeout(this.rotationTimer);
    this.reconnectTimer = null;
    this.rotationTimer = null;
  }
}
