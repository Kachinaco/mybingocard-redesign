module.exports=[4889,e=>e.a(async(t,a)=>{try{var r=e.i(89171),n=e.i(36293),i=e.i(57365),o=e.i(10539),s=e.i(87683),l=e.i(71528),d=e.i(10061),c=t([d]);function p(e){let t={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return e.replace(/[&<>"']/g,e=>t[e]||e)}async function u(e){try{let t=await (0,n.auth)();if(!t?.user?.email)return r.NextResponse.json({error:"Unauthorized - Please sign in"},{status:401});let a=await (0,o.getUserByEmail)(t.user.email);if(!a)return r.NextResponse.json({error:"User not found"},{status:404});if(!l.PLANS[a.planType].limits.canBulkGenerate)return r.NextResponse.json({error:"Batch PDF download requires a Business plan."},{status:403});let{cardIds:c,grayscale:u=!1,cardsPerPage:g=1,showCutLines:h=!0}=await e.json();if(!c||!Array.isArray(c)||0===c.length)return r.NextResponse.json({error:"cardIds array required"},{status:400});if(c.length>100)return r.NextResponse.json({error:"Maximum 100 cards per batch PDF"},{status:400});let f=[];for(let e of c){let t=await (0,i.getCardById)(e);t&&f.push(t)}if(0===f.length)return r.NextResponse.json({error:"No valid cards found"},{status:404});let x=(0,s.canRemoveBranding)(a.planType),m=function(e,t,a){let{grayscale:r,cardsPerPage:n,showCutLines:i}=a,o=e.map((e,a)=>{let{title:i,size:o,cells:s,freeSpace:l,style:d}=e,c=l?Math.floor(o*o/2):-1,u=3===o?"11px":4===o?"9px":"8px";return`
      <div class="card-container" ${n>1?`style="width: ${4===n?"48%":"100%"}; page-break-inside: avoid;"`:""}>
        <div class="card-title">${p(i)}</div>
        <div class="bingo-grid grid-${o}">
          ${s.map((e,t)=>{let a=l&&t===c,n=r?"#ffffff":d.backgroundColor||"#ffffff",i=r?"#000000":d.textColor||"#000000",o=r?"#666666":d.borderColor||"#000000";return`
                <div class="cell" style="
                  background-color: ${a&&!r?"#e0e7ff":n};
                  color: ${i};
                  border: 1.5px solid ${o};
                  font-size: ${u};
                ">
                  ${a?'<span class="free">FREE</span>':p(e)}
                </div>
              `}).join("")}
        </div>
        ${!t?'<div class="card-footer">MyBingoCard.com</div>':""}
      </div>
    `}),s=[];for(let e=0;e<o.length;e+=n){let t=o.slice(e,e+n);s.push(`
      <div class="page ${4===n?"page-grid-2x2":2===n?"page-grid-2x1":"page-grid-1x1"}">
        ${t.join("\n")}
        ${i&&n>1?'<div class="cut-lines"></div>':""}
      </div>
    `)}return`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }

          @page {
            size: letter;
            margin: 0.5in;
          }

          body {
            font-family: Arial, sans-serif;
            ${r?"filter: grayscale(100%);":""}
          }

          .page {
            width: 7.5in;
            height: 10in;
            padding: 0.25in;
            page-break-after: always;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.3in;
          }

          .page:last-child {
            page-break-after: avoid;
          }

          .page-grid-2x2 {
            display: flex;
            flex-wrap: wrap;
            flex-direction: row;
            justify-content: space-between;
            align-content: space-between;
          }

          .page-grid-2x1 {
            display: flex;
            flex-direction: column;
            justify-content: space-around;
          }

          .card-container {
            text-align: center;
          }

          .page-grid-1x1 .card-container {
            width: 100%;
          }

          .page-grid-2x1 .card-container {
            width: 100%;
            max-height: 4.5in;
          }

          .page-grid-2x2 .card-container {
            width: 48%;
            max-height: 4.5in;
          }

          .card-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #1e293b;
          }

          .page-grid-2x2 .card-title,
          .page-grid-2x1 .card-title {
            font-size: 12px;
            margin-bottom: 4px;
          }

          .bingo-grid {
            display: grid;
            gap: 3px;
            width: 100%;
            aspect-ratio: 1;
            max-width: 6in;
            margin: 0 auto;
          }

          .page-grid-2x2 .bingo-grid {
            max-width: 3.2in;
          }

          .page-grid-2x1 .bingo-grid {
            max-width: 4.2in;
          }

          .grid-3 { grid-template-columns: repeat(3, 1fr); }
          .grid-4 { grid-template-columns: repeat(4, 1fr); }
          .grid-5 { grid-template-columns: repeat(5, 1fr); }

          .cell {
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 4px;
            border-radius: 4px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            overflow: hidden;
            line-height: 1.2;
          }

          .free {
            font-weight: bold;
            font-size: 1.1em;
          }

          .card-footer {
            font-size: 8px;
            color: #94a3b8;
            margin-top: 4px;
          }

          /* Cut lines */
          .cut-lines {
            position: absolute;
            inset: 0;
            pointer-events: none;
          }

          .page-grid-2x2 .cut-lines::before {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            top: 50%;
            border-top: 1px dashed #cbd5e1;
          }

          .page-grid-2x2 .cut-lines::after {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            border-left: 1px dashed #cbd5e1;
          }

          .page-grid-2x1 .cut-lines::before {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            top: 50%;
            border-top: 1px dashed #cbd5e1;
          }

          /* Crop marks at corners */
          .page-grid-2x2 .cut-lines .crop-tl,
          .page-grid-2x2 .cut-lines .crop-tr,
          .page-grid-2x2 .cut-lines .crop-bl,
          .page-grid-2x2 .cut-lines .crop-br {
            position: absolute;
            width: 12px;
            height: 12px;
          }
        </style>
      </head>
      <body>
        ${s.join("\n")}
      </body>
    </html>
  `}(f,x.allowed,{grayscale:u,cardsPerPage:[1,2,4].includes(g)?g:1,showCutLines:h}),w=await d.default.launch({headless:!0,args:["--no-sandbox","--disable-setuid-sandbox"]}),b=await w.newPage();await b.setViewport({width:1200,height:1600}),await b.setContent(m,{waitUntil:"networkidle0"});let v=await b.pdf({format:"letter",printBackground:!0,margin:{top:"0.5in",right:"0.5in",bottom:"0.5in",left:"0.5in"}});return await w.close(),new r.NextResponse(Buffer.from(v),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="bingo-cards-batch-${f.length}.pdf"`,"Cache-Control":"no-cache"}})}catch(e){return console.error("Batch PDF error:",e),r.NextResponse.json({error:"Failed to generate batch PDF"},{status:500})}}[d]=c.then?(await c)():c,e.s(["POST",()=>u]),a()}catch(e){a(e)}},!1),53624,e=>e.a(async(t,a)=>{try{var r=e.i(47909),n=e.i(74017),i=e.i(96250),o=e.i(59756),s=e.i(61916),l=e.i(74677),d=e.i(69741),c=e.i(16795),p=e.i(87718),u=e.i(95169),g=e.i(47587),h=e.i(66012),f=e.i(70101),x=e.i(74838),m=e.i(10372),w=e.i(93695);e.i(52474);var b=e.i(220),v=e.i(4889),R=t([v]);[v]=R.then?(await R)():R;let E=new r.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/cards/batch/pdf/route",pathname:"/api/cards/batch/pdf",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/cards/batch/pdf/route.ts",nextConfigOutput:"",userland:v}),{workAsyncStorage:P,workUnitAsyncStorage:A,serverHooks:N}=E;function y(){return(0,i.patchFetch)({workAsyncStorage:P,workUnitAsyncStorage:A})}async function C(e,t,a){E.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let r="/api/cards/batch/pdf/route";r=r.replace(/\/index$/,"")||"/";let i=await E.prepare(e,t,{srcPage:r,multiZoneDraftMode:!1});if(!i)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:v,params:R,nextConfig:y,parsedUrl:C,isDraftMode:P,prerenderManifest:A,routerServerContext:N,isOnDemandRevalidate:T,revalidateOnlyGenerated:$,resolvedPathname:k,clientReferenceManifest:O,serverActionsManifest:j}=i,S=(0,d.normalizeAppPath)(r),U=!!(A.dynamicRoutes[S]||A.routes[k]),_=async()=>((null==N?void 0:N.render404)?await N.render404(e,t,C,!1):t.end("This page could not be found"),null);if(U&&!P){let e=!!A.routes[k],t=A.dynamicRoutes[S];if(t&&!1===t.fallback&&!e){if(y.experimental.adapterPath)return await _();throw new w.NoFallbackError}}let D=null;!U||E.isDev||P||(D=k,D="/index"===D?"/":D);let q=!0===E.isDev||!U,H=U&&!q;j&&O&&(0,l.setManifestsSingleton)({page:r,clientReferenceManifest:O,serverActionsManifest:j});let I=e.method||"GET",B=(0,s.getTracer)(),F=B.getActiveScopeSpan(),M={params:R,prerenderManifest:A,renderOpts:{experimental:{authInterrupts:!!y.experimental.authInterrupts},cacheComponents:!!y.cacheComponents,supportsDynamicResponse:q,incrementalCache:(0,o.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:y.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,n)=>E.onRequestError(e,t,r,n,N)},sharedContext:{buildId:v}},z=new c.NodeNextRequest(e),K=new c.NodeNextResponse(t),L=p.NextRequestAdapter.fromNodeNextRequest(z,(0,p.signalFromNodeResponse)(t));try{let i=async e=>E.handle(L,M).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=B.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=a.get("next.route");if(n){let t=`${I} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t)}else e.updateName(`${I} ${r}`)}),l=!!(0,o.getRequestMeta)(e,"minimalMode"),d=async o=>{var s,d;let c=async({previousCacheEntry:n})=>{try{if(!l&&T&&$&&!n)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let r=await i(o);e.fetchMetrics=M.renderOpts.fetchMetrics;let s=M.renderOpts.pendingWaitUntil;s&&a.waitUntil&&(a.waitUntil(s),s=void 0);let d=M.renderOpts.collectedTags;if(!U)return await (0,h.sendResponse)(z,K,r,M.renderOpts.pendingWaitUntil),null;{let e=await r.blob(),t=(0,f.toNodeOutgoingHttpHeaders)(r.headers);d&&(t[m.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=m.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,n=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=m.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:b.CachedRouteKind.APP_ROUTE,status:r.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:n}}}}catch(t){throw(null==n?void 0:n.isStale)&&await E.onRequestError(e,t,{routerKind:"App Router",routePath:r,routeType:"route",revalidateReason:(0,g.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:T})},!1,N),t}},p=await E.handleResponse({req:e,nextConfig:y,cacheKey:D,routeKind:n.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:A,isRoutePPREnabled:!1,isOnDemandRevalidate:T,revalidateOnlyGenerated:$,responseGenerator:c,waitUntil:a.waitUntil,isMinimalMode:l});if(!U)return null;if((null==p||null==(s=p.value)?void 0:s.kind)!==b.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==p||null==(d=p.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});l||t.setHeader("x-nextjs-cache",T?"REVALIDATED":p.isMiss?"MISS":p.isStale?"STALE":"HIT"),P&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let u=(0,f.fromNodeOutgoingHttpHeaders)(p.value.headers);return l&&U||u.delete(m.NEXT_CACHE_TAGS_HEADER),!p.cacheControl||t.getHeader("Cache-Control")||u.get("Cache-Control")||u.set("Cache-Control",(0,x.getCacheControlHeader)(p.cacheControl)),await (0,h.sendResponse)(z,K,new Response(p.value.body,{headers:u,status:p.value.status||200})),null};F?await d(F):await B.withPropagatedContext(e.headers,()=>B.trace(u.BaseServerSpan.handleRequest,{spanName:`${I} ${r}`,kind:s.SpanKind.SERVER,attributes:{"http.method":I,"http.target":e.url}},d))}catch(t){if(t instanceof w.NoFallbackError||await E.onRequestError(e,t,{routerKind:"App Router",routePath:S,routeType:"route",revalidateReason:(0,g.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:T})},!1,N),U)throw t;return await (0,h.sendResponse)(z,K,new Response(null,{status:500})),null}}e.s(["handler",()=>C,"patchFetch",()=>y,"routeModule",()=>E,"serverHooks",()=>N,"workAsyncStorage",()=>P,"workUnitAsyncStorage",()=>A]),a()}catch(e){a(e)}},!1)];

//# sourceMappingURL=_7271d58f._.js.map