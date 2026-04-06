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

## 배포

지금 바로 외부에서 실시간 가격 사이트를 열려면 정적 `index.html`이 아니라 `frontend`와 `backend`를 각각 배포해야 합니다.

### 1. 백엔드 배포

추천: Railway

공식 참고:

- Railway monorepo root directory: https://docs.railway.com/guides/monorepo
- Railway start command: https://docs.railway.com/deployments/start-command
- Railway variables: https://docs.railway.com/develop/variables
- Railway healthchecks: https://docs.railway.com/diagnose/healthchecks

설정:

1. Railway에서 이 GitHub 저장소를 연결합니다.
2. 서비스 Root Directory를 `/backend`로 지정합니다.
3. 서비스 변수로 아래를 넣습니다.

```env
PORT=4000
FRONTEND_ORIGIN=https://your-frontend-domain.vercel.app
DEFAULT_SYMBOLS=BTCUSDT,ETHUSDT,SOLUSDT
```

4. Start Command가 자동 감지되지 않으면 `npm start`로 지정합니다.
5. Health Check Path는 `/api/health`로 지정합니다.
6. 배포 후 Railway public domain을 발급받습니다.

### 2. 프론트 배포

추천: Vercel

공식 참고:

- Vercel monorepos: https://vercel.com/docs/monorepos
- Next.js on Vercel: https://vercel.com/docs/frameworks/nextjs
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel framework env vars: https://vercel.com/docs/environment-variables/framework-environment-variables

설정:

1. Vercel에서 같은 저장소를 Import 합니다.
2. Root Directory를 `/frontend`로 지정합니다.
3. 환경 변수에 아래를 넣습니다.

```env
NEXT_PUBLIC_SOCKET_URL=https://your-backend-domain.up.railway.app
```

4. 배포합니다.

### 3. 왜 `localhost` 오류가 났는가

`localhost`는 사용자의 현재 기기를 뜻합니다.

- 브라우저에서 `http://localhost:3000`을 열면 그 브라우저가 실행 중인 기기 자신의 3000번 포트로 접속합니다.
- 외부 배포 URL이나 Cloudflare 주소에서 `localhost` 링크를 누르면 서버가 아니라 사용자 기기 로컬 주소를 보게 됩니다.
- 그래서 외부 공개 사이트에서는 항상 실제 배포 도메인을 써야 합니다.

### 4. 접속 흐름

정상 배포 후에는 사용자가 이렇게 접속합니다.

1. `https://your-frontend-domain.vercel.app`
2. 프론트가 `NEXT_PUBLIC_SOCKET_URL`에 설정된 백엔드에 소켓 연결
3. 백엔드가 Binance WebSocket을 구독
4. 실시간 가격 카드 갱신
