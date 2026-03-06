module.exports=[20287,e=>e.a(async(t,a)=>{try{var r=e.i(89171),i=e.i(36293),n=e.i(57365),o=e.i(10539),s=e.i(87683),l=e.i(10061),d=t([l]);async function c(e,{params:t}){try{let a=await (0,i.auth)();if(!a?.user?.email)return r.NextResponse.json({error:"Unauthorized - Please sign in"},{status:401});let{id:d}=await t,c=await (0,n.getCardById)(d);if(!c)return r.NextResponse.json({error:"Card not found"},{status:404});if(c.userId.toString()!==a.user.id&&!c.isPublic)return r.NextResponse.json({error:"You don't have access to this card"},{status:403});let u=await (0,o.getUserByEmail)(a.user.email);if(!u)return r.NextResponse.json({error:"User not found"},{status:404});let f={grayscale:!1,copies:1};try{let t=await e.json();void 0!==t.grayscale&&(f.grayscale=t.grayscale),void 0!==t.copies&&(f.copies=Math.min(Math.max(1,t.copies),4))}catch{}let h=(0,s.canExportHD)(u.planType),g=(0,s.canRemoveBranding)(u.planType),x=function(e,t,a){let{title:r,description:i,size:n,cells:o,freeSpace:s,style:l}=e,d=s?Math.floor(n*n/2):-1,{grayscale:c,copies:u}=a,f=c?"#ffffff":l.backgroundColor||"#ffffff",h=c?"#000000":l.textColor||"#000000",g=c?"#444444":l.borderColor||"#000000",x=c?"#e5e5e5":"#e0e7ff",m=u>1,v=m?3===n?"9px":4===n?"8px":"7px":l.fontSize||"14px",w=m?"3px":"10px",y=m?"3px":"6px",b=`
    <div class="card-container" style="width: ${4===u?"48%":"100%"};">
      <div class="card-title" style="font-size: ${m?"14px":"28px"};">${p(r)}</div>
      ${i?`<div class="card-desc" style="font-size: ${m?"10px":"16px"};">${p(i)}</div>`:""}
      <div class="bingo-grid" style="grid-template-columns: repeat(${n}, 1fr); gap: ${m?"2px":"6px"}; max-width: ${4===u?"3.2in":2===u?"4.5in":"6.5in"};">
        ${o.map((e,t)=>{let a=s&&t===d;return`
              <div class="cell" style="
                background-color: ${a?x:f};
                color: ${h};
                border: ${m?"1px":"2px"} solid ${g};
                font-size: ${v};
                font-family: ${l.fontFamily||"Arial"}, sans-serif;
                padding: ${w};
                border-radius: ${y};
                ${a?"font-weight: bold;":""}
              ">
                ${a?"FREE":p(e)}
              </div>
            `}).join("")}
      </div>
      ${!t?`<div class="card-footer" style="font-size: ${m?"7px":"12px"};">Created with MyBingoCard.com</div>`:""}
    </div>
  `,R=Array(u).fill(b).join("\n"),C=4===u?"page-2x2":2===u?"page-2x1":"page-1x1";return`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }

          @page {
            size: letter;
            margin: 0;
          }

          body {
            font-family: ${l.fontFamily||"Arial"}, sans-serif;
            background: white;
            ${c?"filter: grayscale(100%);":""}
          }

          .page {
            width: 8.5in;
            height: 11in;
            padding: 0.5in;
            position: relative;
          }

          .page-1x1 {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .page-2x1 {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-around;
          }

          .page-2x2 {
            display: flex;
            flex-wrap: wrap;
            align-content: space-between;
            justify-content: space-between;
          }

          .card-container {
            text-align: center;
            page-break-inside: avoid;
          }

          .card-title {
            font-weight: bold;
            margin-bottom: 6px;
            color: ${c?"#000":"#1e293b"};
          }

          .card-desc {
            color: ${c?"#444":"#64748b"};
            margin-bottom: 12px;
          }

          .bingo-grid {
            display: grid;
            width: 100%;
            aspect-ratio: 1;
            margin: 0 auto;
          }

          .cell {
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            word-wrap: break-word;
            overflow-wrap: break-word;
            overflow: hidden;
            line-height: 1.2;
          }

          .card-footer {
            color: #94a3b8;
            margin-top: 8px;
          }

          /* Cut lines for multi-card layouts */
          ${4===u?`
          .page-2x2::before {
            content: '';
            position: absolute;
            left: 0.3in;
            right: 0.3in;
            top: 50%;
            border-top: 1px dashed #cbd5e1;
          }
          .page-2x2::after {
            content: '';
            position: absolute;
            top: 0.3in;
            bottom: 0.3in;
            left: 50%;
            border-left: 1px dashed #cbd5e1;
          }
          `:2===u?`
          .page-2x1::before {
            content: '';
            position: absolute;
            left: 0.3in;
            right: 0.3in;
            top: 50%;
            border-top: 1px dashed #cbd5e1;
          }
          `:""}

          /* Crop marks at corners */
          ${u>1?`
          .crop-mark {
            position: absolute;
            width: 0.15in;
            height: 0;
            border-top: 0.5px solid #94a3b8;
          }
          .crop-mark-v {
            position: absolute;
            width: 0;
            height: 0.15in;
            border-left: 0.5px solid #94a3b8;
          }
          `:""}
        </style>
      </head>
      <body>
        <div class="page ${C}">
          ${R}
          ${u>1?`
            <!-- Corner crop marks -->
            <div class="crop-mark" style="top: 0.1in; left: 0.1in;"></div>
            <div class="crop-mark-v" style="top: 0.1in; left: 0.1in;"></div>
            <div class="crop-mark" style="top: 0.1in; right: 0.1in;"></div>
            <div class="crop-mark-v" style="top: 0.1in; right: 0.1in;"></div>
            <div class="crop-mark" style="bottom: 0.1in; left: 0.1in;"></div>
            <div class="crop-mark-v" style="bottom: 0.1in; left: 0.1in;"></div>
            <div class="crop-mark" style="bottom: 0.1in; right: 0.1in;"></div>
            <div class="crop-mark-v" style="bottom: 0.1in; right: 0.1in;"></div>
          `:""}
        </div>
      </body>
    </html>
  `}(c,g.allowed,f),m=await l.default.launch({headless:!0,args:["--no-sandbox","--disable-setuid-sandbox"]}),v=await m.newPage(),w=h.allowed?2400:1200;await v.setViewport({width:w,height:w,deviceScaleFactor:h.allowed?2:1}),await v.setContent(x,{waitUntil:"networkidle0"});let y=await v.pdf({format:"letter",printBackground:!0,margin:{top:"0.5in",right:"0.5in",bottom:"0.5in",left:"0.5in"}});return await m.close(),new r.NextResponse(Buffer.from(y),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${c.title.replace(/[^a-z0-9]/gi,"_").toLowerCase().substring(0,50)}.pdf"`,"Cache-Control":"no-cache"}})}catch(e){return console.error("PDF export error:",e),r.NextResponse.json({error:"Failed to generate PDF"},{status:500})}}function p(e){let t={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return e.replace(/[&<>"']/g,e=>t[e]||e)}[l]=d.then?(await d)():d,e.s(["POST",()=>c]),a()}catch(e){a(e)}},!1),65222,e=>e.a(async(t,a)=>{try{var r=e.i(47909),i=e.i(74017),n=e.i(96250),o=e.i(59756),s=e.i(61916),l=e.i(74677),d=e.i(69741),c=e.i(16795),p=e.i(87718),u=e.i(95169),f=e.i(47587),h=e.i(66012),g=e.i(70101),x=e.i(74838),m=e.i(10372),v=e.i(93695);e.i(52474);var w=e.i(220),y=e.i(20287),b=t([y]);[y]=b.then?(await b)():b;let E=new r.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/cards/[id]/export/pdf/route",pathname:"/api/cards/[id]/export/pdf",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/cards/[id]/export/pdf/route.ts",nextConfigOutput:"",userland:y}),{workAsyncStorage:$,workUnitAsyncStorage:k,serverHooks:A}=E;function R(){return(0,n.patchFetch)({workAsyncStorage:$,workUnitAsyncStorage:k})}async function C(e,t,a){E.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let r="/api/cards/[id]/export/pdf/route";r=r.replace(/\/index$/,"")||"/";let n=await E.prepare(e,t,{srcPage:r,multiZoneDraftMode:!1});if(!n)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:y,params:b,nextConfig:R,parsedUrl:C,isDraftMode:$,prerenderManifest:k,routerServerContext:A,isOnDemandRevalidate:P,revalidateOnlyGenerated:T,resolvedPathname:N,clientReferenceManifest:O,serverActionsManifest:S}=n,U=(0,d.normalizeAppPath)(r),_=!!(k.dynamicRoutes[U]||k.routes[N]),j=async()=>((null==A?void 0:A.render404)?await A.render404(e,t,C,!1):t.end("This page could not be found"),null);if(_&&!$){let e=!!k.routes[N],t=k.dynamicRoutes[U];if(t&&!1===t.fallback&&!e){if(R.experimental.adapterPath)return await j();throw new v.NoFallbackError}}let D=null;!_||E.isDev||$||(D=N,D="/index"===D?"/":D);let H=!0===E.isDev||!_,I=_&&!H;S&&O&&(0,l.setManifestsSingleton)({page:r,clientReferenceManifest:O,serverActionsManifest:S});let F=e.method||"GET",M=(0,s.getTracer)(),q=M.getActiveScopeSpan(),B={params:b,prerenderManifest:k,renderOpts:{experimental:{authInterrupts:!!R.experimental.authInterrupts},cacheComponents:!!R.cacheComponents,supportsDynamicResponse:H,incrementalCache:(0,o.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:R.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,i)=>E.onRequestError(e,t,r,i,A)},sharedContext:{buildId:y}},z=new c.NodeNextRequest(e),K=new c.NodeNextResponse(t),L=p.NextRequestAdapter.fromNodeNextRequest(z,(0,p.signalFromNodeResponse)(t));try{let n=async e=>E.handle(L,B).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=M.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let i=a.get("next.route");if(i){let t=`${F} ${i}`;e.setAttributes({"next.route":i,"http.route":i,"next.span_name":t}),e.updateName(t)}else e.updateName(`${F} ${r}`)}),l=!!(0,o.getRequestMeta)(e,"minimalMode"),d=async o=>{var s,d;let c=async({previousCacheEntry:i})=>{try{if(!l&&P&&T&&!i)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let r=await n(o);e.fetchMetrics=B.renderOpts.fetchMetrics;let s=B.renderOpts.pendingWaitUntil;s&&a.waitUntil&&(a.waitUntil(s),s=void 0);let d=B.renderOpts.collectedTags;if(!_)return await (0,h.sendResponse)(z,K,r,B.renderOpts.pendingWaitUntil),null;{let e=await r.blob(),t=(0,g.toNodeOutgoingHttpHeaders)(r.headers);d&&(t[m.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==B.renderOpts.collectedRevalidate&&!(B.renderOpts.collectedRevalidate>=m.INFINITE_CACHE)&&B.renderOpts.collectedRevalidate,i=void 0===B.renderOpts.collectedExpire||B.renderOpts.collectedExpire>=m.INFINITE_CACHE?void 0:B.renderOpts.collectedExpire;return{value:{kind:w.CachedRouteKind.APP_ROUTE,status:r.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:i}}}}catch(t){throw(null==i?void 0:i.isStale)&&await E.onRequestError(e,t,{routerKind:"App Router",routePath:r,routeType:"route",revalidateReason:(0,f.getRevalidateReason)({isStaticGeneration:I,isOnDemandRevalidate:P})},!1,A),t}},p=await E.handleResponse({req:e,nextConfig:R,cacheKey:D,routeKind:i.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:k,isRoutePPREnabled:!1,isOnDemandRevalidate:P,revalidateOnlyGenerated:T,responseGenerator:c,waitUntil:a.waitUntil,isMinimalMode:l});if(!_)return null;if((null==p||null==(s=p.value)?void 0:s.kind)!==w.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==p||null==(d=p.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});l||t.setHeader("x-nextjs-cache",P?"REVALIDATED":p.isMiss?"MISS":p.isStale?"STALE":"HIT"),$&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let u=(0,g.fromNodeOutgoingHttpHeaders)(p.value.headers);return l&&_||u.delete(m.NEXT_CACHE_TAGS_HEADER),!p.cacheControl||t.getHeader("Cache-Control")||u.get("Cache-Control")||u.set("Cache-Control",(0,x.getCacheControlHeader)(p.cacheControl)),await (0,h.sendResponse)(z,K,new Response(p.value.body,{headers:u,status:p.value.status||200})),null};q?await d(q):await M.withPropagatedContext(e.headers,()=>M.trace(u.BaseServerSpan.handleRequest,{spanName:`${F} ${r}`,kind:s.SpanKind.SERVER,attributes:{"http.method":F,"http.target":e.url}},d))}catch(t){if(t instanceof v.NoFallbackError||await E.onRequestError(e,t,{routerKind:"App Router",routePath:U,routeType:"route",revalidateReason:(0,f.getRevalidateReason)({isStaticGeneration:I,isOnDemandRevalidate:P})},!1,A),_)throw t;return await (0,h.sendResponse)(z,K,new Response(null,{status:500})),null}}e.s(["handler",()=>C,"patchFetch",()=>R,"routeModule",()=>E,"serverHooks",()=>A,"workAsyncStorage",()=>$,"workUnitAsyncStorage",()=>k]),a()}catch(e){a(e)}},!1)];

//# sourceMappingURL=_80fa2294._.js.map