const DEFAULT_ALLOWED_ORIGIN = "https://yjh0590.github.io";
const CACHE_SECONDS = 10;

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGIN)
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = allowedOrigins(env);
  const selected = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": selected,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex"
  };
}

function json(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request, env),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function originAllowed(request, env) {
  const origin = request.headers.get("Origin");
  return !origin || allowedOrigins(env).includes(origin);
}

function validStationName(value) {
  return value.length >= 1 && value.length <= 40 && !/[\\/<>]/.test(value);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      if (!originAllowed(request, env)) return json(request, env, {error:"Origin not allowed"}, 403);
      return new Response(null, {status:204, headers:corsHeaders(request, env)});
    }

    if (request.method !== "GET") return json(request, env, {error:"Method not allowed"}, 405);
    if (!originAllowed(request, env)) return json(request, env, {error:"Origin not allowed"}, 403);

    if (url.pathname === "/health") {
      return json(request, env, {ok:true, service:"naerineun-mun-subway-proxy"});
    }

    if (url.pathname !== "/api/subway/arrivals") {
      return json(request, env, {error:"Not found"}, 404);
    }

    const station = String(url.searchParams.get("station") || "").trim();
    if (!validStationName(station)) {
      return json(request, env, {error:"A valid station query is required"}, 400);
    }
    if (!env.SEOUL_API_KEY) {
      return json(request, env, {error:"Server API key is not configured"}, 500);
    }

    const cache = caches.default;
    const cacheKey = new Request(`${url.origin}/__cache/arrivals?station=${encodeURIComponent(station)}`);
    const cached = await cache.match(cacheKey);
    if (cached) {
      const text = await cached.text();
      return new Response(text, {
        status:200,
        headers:{...corsHeaders(request, env), "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Proxy-Cache":"HIT"}
      });
    }

    const key = encodeURIComponent(env.SEOUL_API_KEY);
    const stationPath = encodeURIComponent(station);
    const upstreamUrl = `http://swopenapi.seoul.go.kr/api/subway/${key}/json/realtimeStationArrival/0/30/${stationPath}`;

    try {
      const upstream = await fetch(upstreamUrl, {headers:{Accept:"application/json"}});
      const text = await upstream.text();
      if (!upstream.ok) {
        return json(request, env, {error:"Seoul API request failed", status:upstream.status}, 502);
      }

      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        return json(request, env, {error:"Seoul API returned invalid JSON"}, 502);
      }

      const apiStatus = String(payload?.errorMessage?.status ?? "200");
      if (apiStatus !== "200") {
        return json(request, env, {
          error:"Seoul API rejected the request",
          code:payload?.errorMessage?.code || null,
          message:payload?.errorMessage?.message || null
        }, 502);
      }

      const responseText = JSON.stringify(payload);
      ctx.waitUntil(cache.put(cacheKey, new Response(responseText, {
        headers:{"Content-Type":"application/json; charset=utf-8", "Cache-Control":`public, max-age=${CACHE_SECONDS}`}
      })));

      return new Response(responseText, {
        status:200,
        headers:{...corsHeaders(request, env), "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Proxy-Cache":"MISS"}
      });
    } catch (error) {
      return json(request, env, {error:"Upstream connection failed", message:error.message}, 502);
    }
  }
};
