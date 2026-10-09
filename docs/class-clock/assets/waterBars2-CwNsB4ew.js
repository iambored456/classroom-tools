import{S as v,c as y}from"./index-iXvo8Gll.js";const l=64,x=1/120,w=1100,f=(m,t,s)=>Math.max(t,Math.min(s,m));class R{constructor(t,s=Math.random){this.random=s,this.bounds=t}bounds;ratio=0;status="future";offsets=new Float64Array(l);velocities=new Float64Array(l);nextVelocities=new Float64Array(l);drops=[];elapsed=0;formation=0;sourceX=null;radius=5;impacts=0;setProgress(t,s){this.ratio=f(Number.isFinite(t)?t:0,0,1),this.status=s,s!=="current"&&(this.formation=0,this.sourceX=null)}setDetail(t){this.radius=f(t,2,Math.max(2,Math.min(10,this.bounds.width*.13,this.bounds.height*.07)))}clearMotion(){this.drops.length=0,this.formation=0,this.sourceX=null,this.offsets.fill(0),this.velocities.fill(0)}surfaceAt(t){const{bounds:s,ratio:a,offsets:e}=this,o=f((t-s.x)/s.width,0,1),n=o*(l-1),i=Math.floor(n),c=e[i]+(e[Math.min(i+1,l-1)]-e[i])*(n-i),r=a>0?Math.min(2.8,s.width*.025,s.height*a*.25):0;return s.yBottom-s.height*a+c-r*(Math.exp(-o*36)+Math.exp(-(1-o)*36))}impulse(t,s,a){const e=f((t-this.bounds.x)/this.bounds.width,0,1)*(l-1),o=Math.max(1.5,a/this.bounds.width*l*.7),n=f(s*a*.045,8,95);for(let i=0;i<l;i++){const c=(i-e)/o;this.velocities[i]+=n*Math.exp(-c*c*.5)}}impact(t,s){if(this.impacts++,this.impulse(t.x,t.vy,t.radius),!t.splash&&this.ratio>.005&&this.ratio<.96&&t.vy>100){const a=Math.min(150,t.vy*.28);for(let e=0;e<4&&this.drops.length<18;e++){const o=e%2===0?-1:1;this.drops.push({x:t.x+o*t.radius*.55,y:s-1,vx:o*a*(.35+this.random()*.35),vy:-a*(.65+this.random()*.3),radius:t.radius*(.15+this.random()*.12),age:0,splash:!0})}}}chooseSourceX(){const t=Math.min(this.bounds.width/2,Math.max(this.radius*1.2,this.bounds.cornerRadius+1));return this.bounds.x+t+f(this.random(),0,1)*(this.bounds.width-t*2)}step(t=x,s=!0){this.elapsed+=t;const{bounds:a,radius:e}=this;s&&this.status==="current"&&this.sourceX===null&&(this.sourceX=this.chooseSourceX());const o=this.sourceX!==null&&this.surfaceAt(this.sourceX)-a.yTop>e*4.2;if(s&&this.status==="current"&&o){const r=1.45+e*.055;this.formation+=t/r,this.formation>=1&&(this.formation-=1,this.drops.push({x:this.sourceX,y:a.yTop+e*2.65,vx:0,vy:12,radius:e,age:0,splash:!1}),this.sourceX=this.chooseSourceX())}else this.formation=0,(!s||this.status!=="current")&&(this.sourceX=null);for(let r=this.drops.length-1;r>=0;r--){const h=this.drops[r];h.age+=t,h.vy+=w*t,h.x+=h.vx*t,h.y+=h.vy*t;const u=a.x+h.radius,d=a.x+a.width-h.radius;(h.x<u||h.x>d)&&(h.x=f(h.x,u,d),h.vx*=-.25);const g=this.surfaceAt(h.x);h.vy>0&&h.y>=g+h.radius*.2?(this.drops.splice(r,1),this.impact(h,g)):h.age>3&&this.drops.splice(r,1)}const n=Math.pow((l-1)*1.05,2),i=Math.exp(-4.4*t),c=Math.min(a.height*.12,a.height*this.ratio*.65,a.width*.2);for(let r=0;r<l;r++){const h=this.offsets[Math.max(0,r-1)],u=this.offsets[Math.min(l-1,r+1)],d=n*(h+u-2*this.offsets[r])-this.offsets[r]*22;this.nextVelocities[r]=(this.velocities[r]+d*t)*i}for(let r=0;r<l;r++)this.velocities[r]=this.nextVelocities[r],this.offsets[r]=f(this.offsets[r]+this.velocities[r]*t,-c,c)}shapes(t=!0){const s=this.drops.map(a=>{const e=Math.sin(a.age*28)*Math.exp(-a.age*4)*.2,o=a.splash?1.08:1.04+e;return{x:a.x,y:a.y,rx:a.radius/Math.sqrt(o),ry:a.radius*o}});if(t&&this.formation>0){const a=this.radius*Math.pow(this.formation,.45),e=Math.pow(f((this.formation-.67)/.33,0,1),2),o=this.sourceX??this.bounds.x+this.bounds.width/2,n=this.bounds.yTop+a*(1.05+e*1.6);s.unshift({x:o,y:n,rx:a*(1-e*.1),ry:a*(1+e*.14)},{x:o,y:this.bounds.yTop+(n-this.bounds.yTop)*.4,rx:Math.max(.65,a*(.37-e*.26)),ry:Math.max(1,(n-this.bounds.yTop)*.55)})}return s}}const p=20,E=`
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`,M=`
precision highp float;
uniform vec3 uResolution;
uniform float uTime;
uniform vec3 uBackground;
uniform vec4 uRects[5];
uniform vec4 uStyle[5];
uniform vec3 uColors[5];
uniform vec4 uDrops[${p}];
uniform float uDropBars[${p}];
uniform sampler2D uSurface;

float roundedBox(vec2 p, vec2 size, float r) {
    vec2 q = abs(p) - size + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float wave(float x, float bar, float range) {
    vec4 data = texture2D(uSurface, vec2((clamp(x, 0.0, 1.0) * 63.0 + 0.5) / 64.0, (bar + 0.5) / 5.0));
    return (data.r * (256.0 / 257.0) + data.g / 257.0 - 0.5) * 2.0 * range;
}
vec3 smoothUnion(vec3 a, vec3 b, float k) {
    float h = clamp(0.5 + 0.5 * (b.x - a.x) / k, 0.0, 1.0);
    return vec3(mix(b.x, a.x, h) - k * h * (1.0 - h), mix(b.yz, a.yz, h));
}
void main() {
    vec2 p = vec2(gl_FragCoord.x / uResolution.z, uResolution.y - gl_FragCoord.y / uResolution.z);
    float aa = 0.8 / uResolution.z;
    gl_FragColor = vec4(0.0);
    for (int bar = 0; bar < 5; bar++) {
        vec4 rect = uRects[bar];
        vec4 style = uStyle[bar];
        vec2 local = p - rect.xy;
        if (local.x < -1.0 || local.x > rect.z + 1.0 || local.y < -1.0 || local.y > rect.w + 1.0) continue;
        float glassDistance = roundedBox(local - rect.zw * 0.5, rect.zw * 0.5, style.x);
        float glassMask = 1.0 - smoothstep(-aa, aa, glassDistance);
        if (glassMask < 0.001) continue;

        float tx = clamp(local.x / rect.z, 0.0, 1.0);
        float surfaceWave = wave(tx, float(bar), style.z);
        float dx = 1.0 / 63.0;
        float slope = (wave(tx + dx, float(bar), style.z) - wave(tx - dx, float(bar), style.z)) / (2.0 * dx * rect.z);
        float meniscus = min(min(2.8, rect.z * 0.025), rect.w * style.y * 0.25);
        float wallLeft = exp(-tx * 36.0);
        float wallRight = exp(-(1.0 - tx) * 36.0);
        float surfaceY = rect.y + rect.w * (1.0 - style.y) + surfaceWave - meniscus * (wallLeft + wallRight);
        slope += meniscus * 36.0 / rect.z * (wallLeft - wallRight);
        vec3 field = vec3(style.y > 0.00001 ? surfaceY - p.y : 10000.0, slope, -1.0);

        for (int d = 0; d < ${p}; d++) {
            vec4 drop = uDrops[d];
            if (abs(uDropBars[d] - float(bar)) > 0.1 || drop.z < 0.1) continue;
            vec2 q = (p - drop.xy) / drop.zw;
            float radial = length(q);
            float distance = (radial - 1.0) * min(drop.z, drop.w);
            vec2 gradient = radial > 0.0001 ? q / (drop.zw * radial) * min(drop.z, drop.w) : vec2(0.0);
            field = smoothUnion(field, vec3(distance, gradient), max(1.0, drop.z * 0.8));
        }

        float liquidMask = (1.0 - smoothstep(-aa, aa, field.x)) * glassMask;
        // The empty jar has zero alpha. Only the water and drops receive material lighting.
        if (liquidMask < 0.001) {
            gl_FragColor = vec4(0.0);
            return;
        }

        vec3 tint = uColors[bar];
        float bevel = exp(-max(0.0, -field.x) / max(2.0, rect.z * 0.075));
        float sideBevel = exp(-min(local.x, rect.z - local.x) / max(1.0, rect.z * 0.055));
        vec3 normal = normalize(vec3(
            field.y * bevel + (tx - 0.5) * (0.5 + sideBevel * 1.8),
            field.z * bevel, 0.68));
        float fresnel = 0.02 + 0.98 * pow(1.0 - normal.z, 5.0);
        float opticalDepth = 0.65 + 1.55 * sqrt(max(0.0, 1.0 - pow(tx * 2.0 - 1.0, 2.0)));
        vec3 transmission = exp(-(vec3(1.0) - tint + 0.08) * opticalDepth * 1.6);
        vec3 behind = mix(uBackground, vec3(0.82, 0.85, 0.89), 0.64);
        vec3 color = transmission * behind + tint * (vec3(1.0) - transmission) * 0.32 + tint * 0.22;

        // Broad softbox reflection, a narrow opposite rim, and a bright surface reflection.
        float refraction = normal.x * 0.055 + surfaceWave / max(40.0, rect.w) * 0.3;
        float rightLight = exp(-pow((tx - 0.94) / 0.018, 2.0));
        float softbox = exp(-pow((tx + refraction - 0.2) / 0.095, 2.0));
        float fineReflection = exp(-pow((tx + refraction - 0.27) / 0.013, 2.0));
        float specular = pow(max(0.0, dot(normal, normalize(vec3(-0.48, -0.64, 0.74)))), 32.0);
        color += vec3(0.98, 0.99, 1.0) * (softbox * 0.15 + fineReflection * 0.12 + rightLight * 0.18);
        color += vec3(1.0) * (specular * 0.78 + fresnel * 0.3);
        color += mix(tint, vec3(1.0), 0.78) * exp(-abs(field.x) / 0.85) * 0.52;

        // Refracted light on the lower glass: subtle moving caustics, strongest after an impact.
        float belowSurface = smoothstep(3.0, 18.0, p.y - surfaceY);
        float caustic = pow(abs(sin((local.x + surfaceWave * 2.0) * 0.14 + uTime * 0.42)
            * sin(local.y * 0.09 - uTime * 0.3 + sin(tx * 9.0))), 12.0);
        color += tint * caustic * 0.13 * belowSurface * (0.25 + min(1.0, abs(surfaceWave) * 0.4));

        // A few tiny trapped bubbles catch the light under the moving surface.
        for (int b = 0; b < 3; b++) {
            float seed = float(b) * 0.317 + float(bar) * 0.173;
            float bubbleX = rect.x + rect.z * (0.4 + 0.42 * fract(seed * 3.71));
            float rise = fract(seed + uTime * 0.018);
            float bubbleY = rect.y + rect.w - rise * rect.w * style.y;
            float r = 0.7 + fract(seed * 8.3) * 0.8;
            float ring = exp(-pow((length(p - vec2(bubbleX, bubbleY)) - r) / 0.4, 2.0));
            color += vec3(0.26) * ring * belowSurface;
        }
        color = pow(max(color, 0.0), vec3(0.9));
        gl_FragColor = vec4(clamp(color, 0.0, 1.0), liquidMask * 0.96);
        return;
    }
}
`;function b(m){const t=/^#[0-9a-f]{6}$/i.test(m||"")?m:"#000000";return[1,3,5].map(s=>parseInt(t.slice(s,s+2),16)/255)}class T{canvas=null;bars=[];isInitialized=!1;isRunning=!1;renderer="canvas";gl=null;program=null;buffer=null;texture=null;uniforms={};fallbackCanvas=null;fallbackCtx=null;options={};width=0;height=0;dpr=1;rafId=0;lastFrameMs=0;lastRenderMs=0;accumulator=0;elapsed=0;motionQuery=null;drain=null;surfaceData=new Uint8Array(l*5*4);rectData=new Float32Array(20);styleData=new Float32Array(20);colorData=new Float32Array(v.SAND_COLORS.flatMap(t=>b(t)));dropData=new Float32Array(p*4);dropBars=new Float32Array(p);init(t,s,a,e={}){this.canvas!==t&&(this.destroy(),this.canvas=t,t.addEventListener("webglcontextlost",this.onContextLost),t.addEventListener("webglcontextrestored",this.onContextRestored),this.motionQuery=window.matchMedia("(prefers-reduced-motion: reduce)"),this.motionQuery.addEventListener("change",this.onMotionChange),document.addEventListener("visibilitychange",this.onVisibilityChange),this.initGpu()),this.options=e,this.resize(s,a),this.isInitialized=!0,this.renderOnce()}resize(t,s){if(!this.canvas||t<=0||s<=0)return;this.width=Math.max(1,Math.round(t)),this.height=Math.max(1,Math.round(s)),this.dpr=Math.max(.5,Math.min(window.devicePixelRatio||1,2,Math.sqrt(12e5/(this.width*this.height)))),this.canvas.width=Math.round(this.width*this.dpr),this.canvas.height=Math.round(this.height*this.dpr);const a=this.options.measureLayout?.()||y(this.width,this.height,5);this.bars.length===0?this.bars=a.bars.map(e=>new R(e)):this.bars.forEach((e,o)=>{e.bounds=a.bars[o],e.clearMotion()}),this.bars.forEach(e=>e.setDetail(this.options.particleRadius||5)),this.resizeFallback(),this.gl?.viewport(0,0,this.canvas.width,this.canvas.height)}initGpu(){if(this.canvas){try{const t=this.canvas.getContext("webgl",{alpha:!0,premultipliedAlpha:!1,antialias:!1,depth:!1,stencil:!1});if(!t)throw new Error("WebGL unavailable");this.gl=t;const s=t.getShaderPrecisionFormat(t.FRAGMENT_SHADER,t.HIGH_FLOAT)?.precision?"highp":"mediump",a=[],e=t.createProgram();if(!e)throw new Error("Cannot create water material");this.program=e;for(const[i,c]of[[t.VERTEX_SHADER,E],[t.FRAGMENT_SHADER,M.replace("precision highp",`precision ${s}`)]]){const r=t.createShader(i);if(!r)throw new Error("Cannot create water shader");t.shaderSource(r,c),t.compileShader(r),t.attachShader(e,r),a.push(r)}t.bindAttribLocation(e,0,"aPosition"),t.linkProgram(e);const o=t.getProgramParameter(e,t.LINK_STATUS),n=o?"":t.getProgramInfoLog(e)+a.map(i=>t.getShaderInfoLog(i)).join(`
`);if(a.forEach(i=>t.deleteShader(i)),!o)throw new Error(n);if(t.useProgram(e),this.buffer=t.createBuffer(),this.texture=t.createTexture(),!this.buffer||!this.texture)throw new Error("Cannot allocate water resources");t.bindBuffer(t.ARRAY_BUFFER,this.buffer),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,this.texture),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,l,5,0,t.RGBA,t.UNSIGNED_BYTE,this.surfaceData);for(const i of["uResolution","uTime","uBackground","uRects[0]","uStyle[0]","uColors[0]","uDrops[0]","uDropBars[0]","uSurface"])this.uniforms[i]=t.getUniformLocation(e,i);t.uniform1i(this.uniforms.uSurface,0),this.renderer="webgl",this.fallbackCanvas?.remove(),this.fallbackCanvas=null,this.fallbackCtx=null}catch(t){console.info("Water Bars 2 is using its Canvas renderer.",t),this.releaseGpu(),this.enableFallback()}this.canvas&&(this.canvas.dataset.waterRenderer=this.renderer)}}enableFallback(){this.renderer="canvas",!this.fallbackCanvas&&this.canvas?.parentElement&&(this.fallbackCanvas=document.createElement("canvas"),this.fallbackCanvas.className="water2-fallback-canvas",this.canvas.parentElement.append(this.fallbackCanvas),this.fallbackCtx=this.fallbackCanvas.getContext("2d")),this.resizeFallback(),this.canvas&&(this.canvas.dataset.waterRenderer="canvas")}resizeFallback(){this.fallbackCanvas&&(this.fallbackCanvas.width=Math.round(this.width*this.dpr),this.fallbackCanvas.height=Math.round(this.height*this.dpr),this.fallbackCtx?.setTransform(this.dpr,0,0,this.dpr,0,0))}releaseGpu(){this.gl&&(this.gl.deleteProgram(this.program),this.gl.deleteBuffer(this.buffer),this.gl.deleteTexture(this.texture)),this.program=null,this.buffer=null,this.texture=null,this.gl=null}onContextLost=t=>{t.preventDefault(),this.gl=null,this.enableFallback(),this.renderOnce()};onContextRestored=()=>{this.initGpu(),this.canvas&&this.gl?.viewport(0,0,this.canvas.width,this.canvas.height),this.renderOnce()};onMotionChange=()=>{this.bars.forEach(t=>t.clearMotion()),this.renderOnce()};onVisibilityChange=()=>{document.hidden?(cancelAnimationFrame(this.rafId),this.rafId=0):this.isRunning&&(this.lastFrameMs=performance.now(),this.accumulator=0,this.syncProgress(),this.scheduleFrame())};syncProgress(){if(this.drain)return;const t=this.options.getState?.();this.bars.forEach((s,a)=>{const e=t?.bars[a];s.setProgress(e?.progress||0,e?.status||"future")})}setBackgroundColor(t){this.options.backgroundColor=t,this.renderOnce()}start(){!this.isInitialized||this.isRunning||(this.isRunning=!0,this.lastFrameMs=performance.now(),this.accumulator=0,this.scheduleFrame())}scheduleFrame(){this.isRunning&&!document.hidden&&!this.rafId&&(this.rafId=requestAnimationFrame(this.tick))}stop(){this.isRunning=!1,cancelAnimationFrame(this.rafId),this.rafId=0,this.cancelDrain()}cancelDrain(){const t=this.drain;this.drain=null,t?.resolve()}async drainReset(){if(this.cancelDrain(),this.motionQuery?.matches||!this.bars.some(s=>s.ratio>.01)){this.bars.forEach(s=>{s.ratio=0,s.clearMotion()});return}const t=new Promise(s=>{this.drain={start:performance.now(),source:this.bars.map(a=>a.ratio),resolve:s}});return this.bars.forEach(s=>{s.status="future",s.clearMotion()}),this.start(),t}tick=t=>{if(this.rafId=0,!this.isRunning||document.hidden)return;const s=Math.min(.1,Math.max(0,(t-this.lastFrameMs)/1e3));if(this.lastFrameMs=t,this.elapsed+=s,this.syncProgress(),this.drain){const a=this.drain;this.bars.forEach((e,o)=>{const n=f((t-a.start-(4-o)*100)/950,0,1);e.ratio=a.source[o]*Math.pow(1-n,2)}),t-a.start>=1350&&(this.bars.forEach(e=>e.clearMotion()),this.cancelDrain())}if(!this.motionQuery?.matches)for(this.accumulator+=s;this.accumulator>=x;)this.bars.forEach(a=>a.step(x,!this.drain)),this.accumulator-=x;(!this.motionQuery?.matches||t-this.lastRenderMs>250)&&(this.renderOnce(),this.lastRenderMs=t),this.scheduleFrame()};renderOnce(){if(!this.canvas||this.bars.length!==5)return;if(this.renderer==="canvas"){this.renderFallback();return}const t=this.gl;if(!t||!this.program)return;this.dropData.fill(0),this.dropBars.fill(-1);let s=0;this.bars.forEach((a,e)=>{const o=a.bounds,n=Math.max(1,o.height*.16);this.rectData.set([o.x,o.yTop,o.width,o.height],e*4),this.styleData.set([o.cornerRadius,a.ratio,n,0],e*4);for(let i=0;i<l;i++){const c=Math.round(f(a.offsets[i]/n*.5+.5,0,1)*65535),r=(e*l+i)*4;this.surfaceData[r]=c>>8,this.surfaceData[r+1]=c&255,this.surfaceData[r+3]=255}for(const i of a.shapes(!this.motionQuery?.matches)){if(s>=p)break;this.dropData.set([i.x,i.y,i.rx,i.ry],s*4),this.dropBars[s++]=e}}),t.useProgram(this.program),t.uniform3f(this.uniforms.uResolution,this.width,this.height,this.dpr),t.uniform1f(this.uniforms.uTime,this.motionQuery?.matches?0:this.elapsed),t.uniform3fv(this.uniforms.uBackground,b(this.options.backgroundColor||"#000000")),t.uniform4fv(this.uniforms["uRects[0]"],this.rectData),t.uniform4fv(this.uniforms["uStyle[0]"],this.styleData),t.uniform3fv(this.uniforms["uColors[0]"],this.colorData),t.uniform4fv(this.uniforms["uDrops[0]"],this.dropData),t.uniform1fv(this.uniforms["uDropBars[0]"],this.dropBars),t.bindTexture(t.TEXTURE_2D,this.texture),t.texSubImage2D(t.TEXTURE_2D,0,0,0,l,5,t.RGBA,t.UNSIGNED_BYTE,this.surfaceData),t.drawArrays(t.TRIANGLES,0,6)}renderFallback(){const t=this.fallbackCtx;t&&(t.clearRect(0,0,this.width,this.height),this.bars.forEach((s,a)=>{const e=s.bounds,o=v.SAND_COLORS[a];if(t.save(),t.beginPath(),t.roundRect(e.x,e.yTop,e.width,e.height,e.cornerRadius),t.clip(),s.ratio>0){const n=Array.from({length:l},(h,u)=>{const d=e.x+u/(l-1)*e.width;return{x:d,y:s.surfaceAt(d)}}),i=new Path2D;i.moveTo(n[0].x,n[0].y);for(let h=1;h<n.length;h++){const u=n[h-1],d=n[h];i.quadraticCurveTo(u.x,u.y,(u.x+d.x)/2,(u.y+d.y)/2)}i.lineTo(e.x+e.width,n[n.length-1].y);const c=new Path2D(i);i.lineTo(e.x+e.width,e.yBottom),i.lineTo(e.x,e.yBottom),i.closePath();const r=t.createLinearGradient(e.x,0,e.x+e.width,0);r.addColorStop(0,`${o}70`),r.addColorStop(.2,`${o}ec`),r.addColorStop(.3,`${o}a8`),r.addColorStop(.86,`${o}aa`),r.addColorStop(1,`${o}55`),t.fillStyle=r,t.fill(i),t.strokeStyle="rgba(255,255,255,0.75)",t.lineWidth=1.2,t.stroke(c),t.save(),t.clip(i),t.fillStyle="rgba(255,255,255,0.15)",t.fillRect(e.x+e.width*.18,e.yTop,Math.max(1,e.width*.025),e.height),t.restore()}for(const n of s.shapes(!this.motionQuery?.matches)){const i=t.createRadialGradient(n.x-n.rx*.3,n.y-n.ry*.4,0,n.x,n.y,Math.max(n.rx,n.ry));i.addColorStop(0,"#ffffff"),i.addColorStop(.32,`${o}dd`),i.addColorStop(1,`${o}70`),t.beginPath(),t.ellipse(n.x,n.y,n.rx,n.ry,0,0,Math.PI*2),t.fillStyle=i,t.fill()}t.restore()}))}destroy(){this.stop(),this.canvas?.removeEventListener("webglcontextlost",this.onContextLost),this.canvas?.removeEventListener("webglcontextrestored",this.onContextRestored),this.motionQuery?.removeEventListener("change",this.onMotionChange),document.removeEventListener("visibilitychange",this.onVisibilityChange),this.releaseGpu(),this.fallbackCanvas?.remove(),this.fallbackCanvas=null,this.fallbackCtx=null,this.canvas=null,this.bars=[],this.isInitialized=!1}}const D=new T;export{D as WaterBars2};
