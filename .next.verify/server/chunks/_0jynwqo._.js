module.exports=[84045,e=>{"use strict";var t=e.i(87775),n=e.i(66072),r=e.i(51566);function a(e){return JSON.stringify(e)}function i(e){return e.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}let o="body{padding:8px 0}",s=`(function () {
  var jar = "";
  try {
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: function () { return jar; },
      set: function (v) {
        var pair = String(v).split(";")[0];
        var name = pair.split("=")[0];
        jar = jar.split("; ").filter(function (c) { return c && c.split("=")[0] !== name; }).concat(pair).join("; ");
      }
    });
  } catch (e) {}
  function mem() {
    var s = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(s, k) ? s[k] : null; },
      setItem: function (k, v) { s[k] = String(v); },
      removeItem: function (k) { delete s[k]; },
      clear: function () { s = {}; },
      key: function (i) { return Object.keys(s)[i] || null; },
      get length() { return Object.keys(s).length; }
    };
  }
  ["localStorage", "sessionStorage"].forEach(function (n) {
    try { window[n].length; } catch (e) {
      try { Object.defineProperty(window, n, { configurable: true, value: mem() }); } catch (e2) {}
    }
  });
})();`;function c(e,t,n="body{display:flex;align-items:center;justify-content:center;height:100vh}"){return e=(e?`<script nonce="${i(t)}">${s}</script>`:"")+e,new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style nonce="${i(t)}">
html,body{margin:0;padding:0;background:transparent;overflow:hidden}
${n}
iframe,img{border:0;display:block;max-width:100%}
</style></head><body>${e}</body></html>`,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Robots-Tag":"noindex"}})}function l(e){return`
(function () {
  var box = document.getElementById(${a(e)});
  var last = 0;
  function send() {
    var drawn = box ? box.offsetHeight : 0;
    if (!drawn) return;
    var h = Math.ceil(document.body.scrollHeight);
    if (h !== last) { last = h; parent.postMessage({ type: "pas-ad-height", h: h }, "*"); }
  }
  if (window.ResizeObserver && box) new ResizeObserver(send).observe(box);
  var n = 0, t = setInterval(function () { send(); if (++n > 40) clearInterval(t); }, 500);
})();`}async function d(e){let o=e.headers.get("x-nonce")??"",s=e.nextUrl.searchParams,d=s.get("slot")??"",p=s.get("size")??"";if("native"===s.get("kind"))return u(d,o);if(!Object.prototype.hasOwnProperty.call(t.AD_SLOTS,d)||!(0,t.isAdsterraSize)(p))return c("",o);let h=await (0,n.readSettings)(),f=h.adsterra[p],m=t.AD_SLOTS[d].fixedBox?"":h.native,v=m?(0,r.adsterraKey)(m):null;if(!f)return c("",o);let{width:g,height:y}=(0,t.adsterraDimensions)(p),w=m&&v?`
<script nonce="${i(o)}">
(function () {
  var waited = 0;
  // What the network draws when it has something: an iframe, a picture, or
  // the <ins> its own widgets use. The script tag itself proves nothing.
  function drawn() { return !!document.querySelector("iframe, img, ins"); }
  var timer = setInterval(function () {
    waited += 250;
    if (drawn()) { clearInterval(timer); return; }
    if (waited < 2500) return;
    clearInterval(timer);
    // Nothing came. Ask for the native widget in the same box.
    var box = document.createElement("div");
    box.id = ${a(`container-${v}`)};
    document.body.appendChild(box);
    // Built as an element, not written as markup: a script assigned through
    // innerHTML is parsed but never run. This one carries no nonce and does
    // not need one, because a script added by a script the nonce vouched for
    // is already trusted under strict-dynamic.
    var script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = ${a(m)};
    document.body.appendChild(script);
    document.body.style.display = "block";
    ${l(`container-${v}`)}
  }, 250);
})();
</script>`:"";return c(`
<script nonce="${i(o)}">
atOptions = { key: ${a(f.key)}, format: "iframe", height: ${y}, width: ${g}, params: {} };
</script>
<script nonce="${i(o)}" data-cfasync="false" src="${i(f.src)}"></script>${w}`,o)}async function u(e,a){if(!(0,t.isNativeSlot)(e))return c("",a,o);let{native:s}=await (0,n.readSettings)(),d=s?(0,r.adsterraKey)(s):null;return s&&d?c(`
<script nonce="${i(a)}" async data-cfasync="false" src="${i(s)}"></script>
<div id="container-${i(d)}"></div>
<script nonce="${i(a)}">${l(`container-${d}`)}</script>`,a,o):c("",a,o)}e.s(["GET",0,d,"dynamic",0,"force-dynamic","runtime",0,"nodejs"])},81e3,e=>{"use strict";var t=e.i(47909),n=e.i(74017),r=e.i(96250),a=e.i(59756),i=e.i(61916),o=e.i(74677),s=e.i(69741),c=e.i(16795),l=e.i(87718),d=e.i(95169),u=e.i(47587),p=e.i(66012),h=e.i(70101),f=e.i(26937),m=e.i(10372),v=e.i(93695);e.i(52474);var g=e.i(220);let y=new t.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/ads/frame/route",pathname:"/ads/frame",filename:"route",bundlePath:""},distDir:".next.verify",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/ads/frame/route.ts",nextConfigOutput:"standalone",userland:()=>e.r(84045),...{}}),{workAsyncStorage:w,workUnitAsyncStorage:R,serverHooks:b}=y;async function x(e,t,r){r.requestMeta&&(0,a.setRequestMeta)(e,r.requestMeta),y.isDev&&(0,a.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let w="/ads/frame/route";w=w.replace(/\/index$/,"")||"/";let R=await y.prepare(e,t,{srcPage:w,multiZoneDraftMode:!1});if(!R)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:b,deploymentId:x,params:E,nextConfig:C,parsedUrl:S,isDraftMode:T,prerenderManifest:A,routerServerContext:O,isOnDemandRevalidate:k,revalidateOnlyGenerated:$,resolvedPathname:P,clientReferenceManifest:N,serverActionsManifest:I}=R,_=(0,s.normalizeAppPath)(w),H=!!(A.dynamicRoutes[_]||A.routes[P]),q=async()=>((null==O?void 0:O.render404)?await O.render404(e,t,S,!1):t.end("This page could not be found"),null);if(H&&!T){let e=!!A.routes[P],t=A.dynamicRoutes[_];if(t&&!1===t.fallback&&!e){if(C.adapterPath)return await q();throw new v.NoFallbackError}}let j=null;!H||y.isDev||T||(j="/index"===(j=P)?"/":j);let M=!0===y.isDev||!H,D=H&&!M;I&&N&&(0,o.setManifestsSingleton)({page:w,clientReferenceManifest:N,serverActionsManifest:I});let U=e.method||"GET",K=(0,i.getTracer)(),L=K.getActiveScopeSpan(),B=!!(null==O?void 0:O.isWrappedByNextServer),F=!!(0,a.getRequestMeta)(e,"minimalMode"),G=(0,a.getRequestMeta)(e,"incrementalCache")||await y.getIncrementalCache(e,C,A,F);null==G||G.resetRequestCache(),globalThis.__incrementalCache=G;let z={params:E,previewProps:A.preview,renderOpts:{experimental:{authInterrupts:!!C.experimental.authInterrupts,useCacheTimeout:C.experimental.useCacheTimeout},cacheComponents:!!C.cacheComponents,validationLevel:C.experimental.instantInsights.validationLevel,supportsDynamicResponse:M,incrementalCache:G,hmrRefreshHash:(0,a.getRequestMeta)(e,"hmrRefreshHash"),cacheLifeProfiles:C.cacheLife,staticPageGenerationTimeout:C.staticPageGenerationTimeout,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,n,r,a)=>y.onRequestError(e,t,r,a,O)},sharedContext:{buildId:b,deploymentId:x}},X=new c.NodeNextRequest(e),V=new c.NodeNextResponse(t),W=l.NextRequestAdapter.fromNodeNextRequest(X,(0,l.signalFromNodeResponse)(t)),J=async({previousCacheEntry:n})=>{try{if(!F&&k&&$&&!n)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let a=await y.handle(W,z);e.fetchMetrics=z.renderOpts.fetchMetrics;let i=z.renderOpts.pendingWaitUntil;i&&r.waitUntil&&(r.waitUntil(i),i=void 0);let o=z.renderOpts.collectedTags;if(!H)return await (0,p.sendResponse)(X,V,a,i),null;{let e=await a.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(a.headers);o&&(t[m.NEXT_CACHE_TAGS_HEADER]=o),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let n=void 0!==z.renderOpts.collectedRevalidate&&!(z.renderOpts.collectedRevalidate>=m.INFINITE_CACHE)&&z.renderOpts.collectedRevalidate,r=void 0===z.renderOpts.collectedExpire||z.renderOpts.collectedExpire>=m.INFINITE_CACHE?!1!==n&&n>0?C.expireTime:void 0:z.renderOpts.collectedExpire;return{value:{kind:g.CachedRouteKind.APP_ROUTE,status:a.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:n,expire:r}}}}catch(t){throw(null==n?void 0:n.isStale)&&await y.onRequestError(e,t,{routerKind:"App Router",routePath:w,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:D,isOnDemandRevalidate:k})},!1,O),t}},Z=async(a,o)=>{try{var s,c;let a=await y.handleResponse({req:e,nextConfig:C,cacheKey:j,routeKind:n.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:A,isRoutePPREnabled:!1,isOnDemandRevalidate:k,revalidateOnlyGenerated:$,responseGenerator:J,waitUntil:r.waitUntil,isMinimalMode:F});if(!H)return;if((null==a||null==(s=a.value)?void 0:s.kind)!==g.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==a||null==(c=a.value)?void 0:c.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});F||t.setHeader("x-nextjs-cache",k?"REVALIDATED":a.isMiss?"MISS":a.isStale?"STALE":"HIT"),T&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let i=(0,h.fromNodeOutgoingHttpHeaders)(a.value.headers);F&&H||i.delete(m.NEXT_CACHE_TAGS_HEADER),!a.cacheControl||t.getHeader("Cache-Control")||i.get("Cache-Control")||i.set("Cache-Control",(0,f.getCacheControlHeader)(a.cacheControl)),await (0,p.sendResponse)(X,V,new Response(a.value.body,{headers:i,status:a.value.status||200}));return}catch(t){if(t instanceof v.NoFallbackError||await y.onRequestError(e,t,{routerKind:"App Router",routePath:_,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:D,isOnDemandRevalidate:k})},!1,O),H)throw t;await (0,p.sendResponse)(X,V,new Response(null,{status:500}));return}finally{(()=>{if(!a)return;let e=t.statusCode;a.setAttributes({"http.status_code":e,"next.rsc":!1}),e&&e>=500&&(a.setStatus({code:i.SpanStatusCode.ERROR}),a.setAttribute("error.type",e.toString()));let n=K.getRootSpanAttributes();if(!n)return;if(n.get("next.span_type")!==d.BaseServerSpan.handleRequest)return console.warn(`Unexpected root span type '${n.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=n.get("next.route")||_,s=`${U} ${r}`;a.setAttributes({"next.route":r,"http.route":r,"next.span_name":s}),a.updateName(s),o&&o!==a&&(o.setAttribute("http.route",r),o.updateName(s))})()}};if(B&&L)await Z(L,void 0);else{let t=K.getActiveScopeSpan();await K.withPropagatedContext(e.headers,()=>K.trace(d.BaseServerSpan.handleRequest,{spanName:`${U} ${w}`,kind:i.SpanKind.SERVER,attributes:{"http.method":U,"http.target":e.url}},e=>Z(e,t)),void 0,!B)}}e.s(["handler",0,x,"patchFetch",0,function(){return(0,r.patchFetch)({workAsyncStorage:w,workUnitAsyncStorage:R})},"routeModule",0,y,"serverHooks",0,b,"workAsyncStorage",0,w,"workUnitAsyncStorage",0,R])}];

//# sourceMappingURL=_0jynwqo._.js.map