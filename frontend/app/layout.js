import "./globals.css";

export const metadata = {
  title: "Pulse Board",
  description: "Realtime crypto price board powered by a backend WebSocket bridge."
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
