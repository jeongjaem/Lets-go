# Pulse Board

실시간 가격 사이트용 최소 스타터입니다.

- 프론트: `Next.js`
- 백엔드: `Node.js + Express`
- 실시간 전달: `Socket.IO`
- 데이터 공급원: `Binance WebSocket`
- 배포 방향: 프론트 `Vercel`, 백엔드 `Railway` 또는 `Render`

핵심 구조:

1. 브라우저는 거래소에 직접 붙지 않습니다.
2. 백엔드가 바이낸스 WebSocket에 연결해 가격을 받아옵니다.
3. 백엔드가 필요한 필드만 정리해서 `Socket.IO`로 프론트에 다시 보냅니다.
4. 프론트는 현재가, 등락률, 체결 시각, 미니 차트를 실시간으로 갱신합니다.

## 폴더 구조

```text
frontend/  Next.js 앱
backend/   Express + Socket.IO + Binance bridge
```

## 실행

루트에서:

```bash
npm install
```

그다음 두 터미널에서:

```bash
npm run dev:backend
npm run dev:frontend
```

접속 주소:

- 프론트: `http://localhost:3000`
- 백엔드: `http://localhost:4000`

보조 스크립트:

```bash
bash run.sh
```

단, `run.sh`는 의존성 설치가 끝난 뒤에만 동작합니다.

## 환경 변수

백엔드 예시: [backend/.env.example](/workspaces/Lets-go/backend/.env.example)

프론트 예시: [frontend/.env.local.example](/workspaces/Lets-go/frontend/.env.local.example)

## 현재 범위

현재는 코인만 먼저 붙여둔 상태입니다.

- 기본 감시 종목: `BTCUSDT`, `ETHUSDT`, `SOLUSDT`
- 추가 입력으로 다른 심볼도 감시 가능
- 상장 주식 API는 아직 연결하지 않음

## 다음 단계

주식까지 확장하려면 보통 이렇게 갑니다.

1. 백엔드에 `provider` 레이어를 유지합니다.
2. 바이낸스 외에 한국투자증권 또는 다른 증권사 실시간 공급자를 추가합니다.
3. 공급원별 원본 포맷을 공통 시세 포맷으로 정규화합니다.
4. 프론트는 공급자 차이를 모르고 동일한 카드 UI를 사용합니다.
