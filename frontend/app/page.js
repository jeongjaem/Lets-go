"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
const starterSymbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
const quickSymbols = ["XRPUSDT", "DOGEUSDT", "BNBUSDT", "ADAUSDT"];
const historyLimit = 32;

function formatPrice(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  if (value >= 1000) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  if (value >= 1) {
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }

  return value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

function formatPercent(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatTime(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function Sparkline({ points }) {
  if (!points.length) {
    return <div className="sparkline-empty">waiting for ticks</div>;
  }

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const chartPoints = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 100 - ((point - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={chartPoints} />
    </svg>
  );
}

function PriceCard({ symbol, entry, onRemove }) {
  const last = entry?.last;
  const points = entry?.history || [];
  const direction = (last?.changePercent || 0) >= 0 ? "up" : "down";

  return (
    <article className={`price-card ${direction}`}>
      <div className="card-head">
        <div>
          <p className="symbol">{symbol}</p>
          <p className="meta">Binance mini ticker</p>
        </div>
        <button type="button" className="ghost-button" onClick={() => onRemove(symbol)}>
          제거
        </button>
      </div>

      <p className="price">${formatPrice(last?.price)}</p>
      <p className={`delta ${direction}`}>{formatPercent(last?.changePercent)}</p>
      <p className="meta">체결 시각 {formatTime(last?.eventTime)}</p>

      <div className="sparkline-wrap">
        <Sparkline points={points} />
      </div>

      <dl className="stats">
        <div>
          <dt>고가</dt>
          <dd>${formatPrice(last?.high)}</dd>
        </div>
        <div>
          <dt>저가</dt>
          <dd>${formatPrice(last?.low)}</dd>
        </div>
        <div>
          <dt>거래량</dt>
          <dd>{last?.volume ? Number(last.volume).toLocaleString("en-US", { maximumFractionDigits: 0 }) : "-"}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function HomePage() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [watchlist, setWatchlist] = useState(starterSymbols);
  const [prices, setPrices] = useState({});
  const [inputValue, setInputValue] = useState("");
  const [providerStatus, setProviderStatus] = useState("connecting");

  useEffect(() => {
    const socket = io(socketUrl, {
      transports: ["websocket"]
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("watchlist:set", { symbols: watchlist });
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("market:status", (payload) => {
      setProviderStatus(payload?.connected ? "live" : "reconnecting");
    });

    socket.on("watchlist:accepted", (payload) => {
      if (Array.isArray(payload?.symbols)) {
        setWatchlist(payload.symbols);
      }
    });

    socket.on("price:update", (payload) => {
      setPrices((current) => {
        const previous = current[payload.symbol];
        const history = [...(previous?.history || []), payload.price].slice(-historyLimit);

        return {
          ...current,
          [payload.symbol]: {
            last: payload,
            history
          }
        };
      });
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!socketRef.current) {
      return;
    }

    socketRef.current.emit("watchlist:set", { symbols: watchlist });
  }, [watchlist]);

  function addSymbol(nextSymbol) {
    const normalized = String(nextSymbol || "").trim().toUpperCase();

    if (!/^[A-Z0-9]{5,20}$/.test(normalized) || watchlist.includes(normalized)) {
      return;
    }

    setWatchlist((current) => [...current, normalized].slice(0, 12));
    setInputValue("");
  }

  function removeSymbol(symbol) {
    setWatchlist((current) => current.filter((item) => item !== symbol));
    setPrices((current) => {
      const next = { ...current };
      delete next[symbol];
      return next;
    });
  }

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Realtime market board</p>
          <h1>브라우저가 거래소에 직접 붙지 않는 실시간 가격 사이트.</h1>
          <p className="lead">
            프론트는 백엔드 소켓만 구독하고, 백엔드는 바이낸스 WebSocket을 한 번만 연결해서 가격을 받아
            정리한 뒤 사용자에게 다시 뿌립니다.
          </p>
        </div>

        <div className="status-panel">
          <div className={`status-chip ${connected ? "live" : "down"}`}>
            client {connected ? "connected" : "offline"}
          </div>
          <div className={`status-chip ${providerStatus === "live" ? "live" : "warm"}`}>
            provider {providerStatus}
          </div>
          <p className="stack-note">Next.js + Express + Socket.IO + Binance stream</p>
        </div>
      </section>

      <section className="control-panel">
        <div className="control-copy">
          <p className="section-label">Watchlist</p>
          <h2>종목을 추가해서 바로 스트리밍 받기</h2>
        </div>

        <div className="input-row">
          <input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                addSymbol(inputValue);
              }
            }}
            className="symbol-input"
            placeholder="예: BTCUSDT"
          />
          <button type="button" className="primary-button" onClick={() => addSymbol(inputValue)}>
            추가
          </button>
        </div>

        <div className="quick-row">
          {quickSymbols.map((symbol) => (
            <button key={symbol} type="button" className="chip-button" onClick={() => addSymbol(symbol)}>
              {symbol}
            </button>
          ))}
        </div>
      </section>

      <section className="board-grid">
        {watchlist.map((symbol) => (
          <PriceCard key={symbol} symbol={symbol} entry={prices[symbol]} onRemove={removeSymbol} />
        ))}
      </section>
    </main>
  );
}
