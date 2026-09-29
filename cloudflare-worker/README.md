# Cloudflare Worker 중계 서버

서울시 실시간 지하철 API 인증키를 브라우저와 GitHub에 노출하지 않기 위한 중계 서버입니다.

## 배포

```bash
npm install
npx wrangler login
npx wrangler secret put SEOUL_API_KEY
npm run deploy
```

`secret put` 명령이 값을 요청하면 발급받은 서울시 실시간 지하철 인증키를 붙여넣습니다. 대시보드에서 이미 `SEOUL_API_KEY`를 Secret으로 등록했다면 다시 실행할 필요가 없습니다. 인증키를 소스 파일이나 `wrangler.jsonc`에 작성하면 안 됩니다.

배포가 완료되면 출력되는 `https://naerineun-mun-api.<계정>.workers.dev` 주소를 루트의 `config.js`에 입력합니다.

```js
window.SUBWAY_API_BASE_URL = "https://naerineun-mun-api.<계정>.workers.dev";
```

## 확인

```text
https://naerineun-mun-api.ipasssony1234.workers.dev/health
https://naerineun-mun-api.ipasssony1234.workers.dev/api/subway/arrivals?station=서울
```

첫 번째 주소는 키 없이 상태만 확인합니다. 두 번째 주소의 인증키는 Worker 내부 Secret에서만 사용됩니다.
