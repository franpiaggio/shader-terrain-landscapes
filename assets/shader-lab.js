/* ============================================================
   shader-lab.js — reusable live GLSL playground (vanilla WebGL2)
   No dependencies, no CDN: works offline from file://.
   Shadertoy-compatible: you write `void mainImage(out vec4 c, in vec2 f)`
   and get iResolution / iTime / iMouse uniforms for free.

   LAZY BY DEFAULT: each lab shows a ▶ Run button and creates no WebGL
   context until you click it — so a lesson page with several labs stays
   light and nothing renders until you ask for it. (pass autorun:true to
   start immediately.)

   Features (all opt-in): editable · inspect · uniforms[] · challenges[]
   API: sampleUV(u,v) → [r,g,b] in 0..1 (after the lab is running).
   ============================================================ */

const VERT = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

const PREAMBLE = `#version 300 es
precision highp float;
uniform vec3  iResolution;
uniform float iTime;
uniform vec4  iMouse;
out vec4 _fragColor;
`;
const POSTAMBLE = `
void main(){ mainImage(_fragColor, gl_FragCoord.xy); }
`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    return { error: log };
  }
  return { shader: sh };
}

function remapErrors(log, headerLines) {
  return log.split('\n').filter(Boolean).map(line => {
    const m = line.match(/^(\w+:\s*)(\d+):(\d+):(.*)$/);
    if (!m) return line;
    const userLine = Math.max(1, parseInt(m[3], 10) - headerLines);
    return `line ${userLine}:${m[4]}`;
  }).join('\n');
}

export function createShaderLab(container, opts = {}) {
  const { editable = false, height = 300, inspect = false, autorun = false } = opts;
  const customUniforms = opts.uniforms || [];
  const challenges = opts.challenges || [];
  let source = opts.source || 'void mainImage(out vec4 c, in vec2 f){ c = vec4(0.0,0.0,0.0,1.0); }';

  container.classList.add('shader-lab');
  container.innerHTML = '';

  // public api object — methods get wired once the lab actually runs
  const api = { running: false, run, sampleUV: () => [0, 0, 0] };
  container._lab = api;

  // ---- lazy poster with a Run button ----
  if (!autorun) {
    const poster = document.createElement('div');
    poster.className = 'lab-poster';
    poster.style.height = height + 'px';
    const btn = document.createElement('button');
    btn.className = 'lab-run'; btn.type = 'button'; btn.innerHTML = '▶&nbsp;Run shader';
    const hint = document.createElement('div');
    hint.className = 'lab-poster-hint';
    hint.textContent = editable ? 'live editor · auto-graded challenges'
                   : customUniforms.length ? 'interactive sliders'
                   : inspect ? 'hover to inspect pixels' : 'live render';
    poster.append(btn, hint);
    container.appendChild(poster);
    btn.addEventListener('click', () => { container.removeChild(poster); run(); }, { once: true });
  } else {
    run();
  }

  return api;

  // ============ everything below builds + runs on demand ============
  function run() {
    if (api.running) return;
    api.running = true;

    const stage = document.createElement('div');
    stage.className = 'lab-stage';
    const canvas = document.createElement('canvas');
    canvas.style.height = height + 'px';
    stage.appendChild(canvas);

    let readout = null;
    if (inspect) {
      readout = document.createElement('div');
      readout.className = 'lab-readout';
      readout.textContent = 'hover the image →';
      stage.appendChild(readout);
    }
    container.appendChild(stage);

    const status = document.createElement('div');
    status.className = 'lab-status';
    container.appendChild(status);

    const uniState = {};
    if (customUniforms.length) {
      const panel = document.createElement('div');
      panel.className = 'lab-uniforms';
      customUniforms.forEach(u => {
        uniState[u.name] = u.value;
        const row = document.createElement('label'); row.className = 'uni-row';
        const name = document.createElement('span'); name.className = 'uni-name'; name.textContent = u.label || u.name;
        const range = document.createElement('input');
        range.type = 'range'; range.min = u.min; range.max = u.max; range.step = u.step || 0.01; range.value = u.value;
        const val = document.createElement('span'); val.className = 'uni-val'; val.textContent = (+u.value).toFixed(2);
        range.addEventListener('input', () => { uniState[u.name] = parseFloat(range.value); val.textContent = parseFloat(range.value).toFixed(2); });
        row.append(name, range, val);
        panel.appendChild(row);
      });
      container.appendChild(panel);
    }

    let editor = null;
    if (editable) {
      editor = document.createElement('textarea');
      editor.className = 'lab-editor'; editor.spellcheck = false;
      editor.rows = Math.min(24, source.split('\n').length + 1);
      editor.value = source;
      container.appendChild(editor);
    }

    const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
    if (!gl) { status.className = 'lab-status err'; status.textContent = 'WebGL2 not available.'; return; }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);

    const uniDecls = customUniforms.map(u => `uniform float ${u.name};`).join('\n');
    const header = PREAMBLE + (uniDecls ? uniDecls + '\n' : '');
    const headerLines = header.split('\n').length - 1;

    let program = null, loc = {};

    function build(src) {
      const vs = compile(gl, gl.VERTEX_SHADER, VERT);
      if (vs.error) { fail(vs.error); return false; }
      const fs = compile(gl, gl.FRAGMENT_SHADER, header + src + POSTAMBLE);
      if (fs.error) { fail(remapErrors(fs.error, headerLines)); gl.deleteShader(vs.shader); return false; }
      const p = gl.createProgram();
      gl.attachShader(p, vs.shader); gl.attachShader(p, fs.shader);
      gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
      gl.deleteShader(vs.shader); gl.deleteShader(fs.shader);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { fail(gl.getProgramInfoLog(p)); return false; }
      if (program) gl.deleteProgram(program);
      program = p;
      loc = { iResolution: gl.getUniformLocation(p,'iResolution'), iTime: gl.getUniformLocation(p,'iTime'), iMouse: gl.getUniformLocation(p,'iMouse') };
      customUniforms.forEach(u => loc[u.name] = gl.getUniformLocation(p, u.name));
      status.className = 'lab-status';
      status.textContent = '● compiled' + (inspect ? ' — hover to inspect a pixel' : '');
      return true;
    }
    function fail(msg) { status.className = 'lab-status err'; status.textContent = '✗ ' + msg.trim(); }

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.floor(canvas.clientWidth * dpr), h = Math.floor(height * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    }

    let mx = 0, my = 0, md = 0, hx = -1, hy = -1, hovering = false;
    const toPx = e => { const r = canvas.getBoundingClientRect(); const dpr = Math.min(devicePixelRatio || 1, 2);
      return [ (e.clientX - r.left) * dpr, (r.bottom - e.clientY) * dpr ]; };
    canvas.addEventListener('pointerdown', e => { md = 1; [mx,my] = toPx(e); });
    canvas.addEventListener('pointermove', e => { if (md) [mx,my] = toPx(e); if (inspect) { [hx,hy] = toPx(e); hovering = true; } });
    canvas.addEventListener('pointerleave', () => { hovering = false; if (readout) readout.textContent = 'hover the image →'; });
    addEventListener('pointerup', () => md = 0);

    const px1 = new Uint8Array(4);
    function readPx(x, y) {
      x = Math.max(0, Math.min(canvas.width - 1, Math.round(x)));
      y = Math.max(0, Math.min(canvas.height - 1, Math.round(y)));
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1);
      return [px1[0]/255, px1[1]/255, px1[2]/255];
    }
    const sampleUV = (u, v) => readPx(u * (canvas.width - 1), v * (canvas.height - 1));
    api.sampleUV = sampleUV;

    if (editor) {
      let timer = null;
      editor.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => build(editor.value), 250); });
      editor.addEventListener('keydown', e => {
        if (e.key === 'Tab') { e.preventDefault();
          const s = editor.selectionStart, en = editor.selectionEnd;
          editor.value = editor.value.slice(0,s) + '    ' + editor.value.slice(en);
          editor.selectionStart = editor.selectionEnd = s + 4; }
      });
    }
    api.rebuild = () => build(editor ? editor.value : source);

    if (challenges.length) {
      const S = {
        uv: sampleUV,
        changedOverTime: async (u, v, channel) => {
          const a = sampleUV(u, v)[channel]; await sleep(420); const b = sampleUV(u, v)[channel];
          return Math.abs(a - b) > 0.08;
        },
      };
      const wrap = document.createElement('div'); wrap.className = 'lab-challenges';
      challenges.forEach((c) => {
        const row = document.createElement('div'); row.className = 'chal';
        const mark = document.createElement('span'); mark.className = 'chal-mark'; mark.textContent = '○';
        const text = document.createElement('span'); text.className = 'chal-text'; text.innerHTML = c.text;
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'chal-btn'; btn.textContent = 'Check';
        btn.addEventListener('click', async () => {
          btn.disabled = true; mark.textContent = '…';
          let ok = false; try { ok = await c.check(S); } catch (e) { ok = false; }
          mark.textContent = ok ? '✓' : '✗';
          row.classList.toggle('pass', ok); row.classList.toggle('fail', !ok);
          btn.disabled = false;
        });
        row.append(mark, text, btn);
        wrap.appendChild(row);
      });
      container.appendChild(wrap);
    }

    build(source);

    const t0 = performance.now();
    let visible = true;
    const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0 });
    io.observe(canvas);

    function frame() {
      if (visible && program) {
        resize();
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.uniform3f(loc.iResolution, canvas.width, canvas.height, 1);
        gl.uniform1f(loc.iTime, (performance.now() - t0) / 1000);
        gl.uniform4f(loc.iMouse, mx, my, md, 0);
        customUniforms.forEach(u => gl.uniform1f(loc[u.name], uniState[u.name]));
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        if (inspect && hovering && readout) {
          const rgb = readPx(hx, hy);
          const u = (hx / canvas.width), v = (hy / canvas.height);
          readout.innerHTML =
            `fragCoord <b>${Math.round(hx)}, ${Math.round(hy)}</b> · uv <b>${u.toFixed(2)}, ${v.toFixed(2)}</b>` +
            ` · rgb <b>${rgb[0].toFixed(2)} ${rgb[1].toFixed(2)} ${rgb[2].toFixed(2)}</b>` +
            ` <i class="sw" style="background:rgb(${rgb.map(c=>Math.round(c*255)).join(',')})"></i>`;
        }
      }
      requestAnimationFrame(frame);
    }
    frame();
  }
}

// Auto-wire simple <div class="shader-lab"> labs with a matching shader <script>.
export function autoMount() {
  document.querySelectorAll('div.shader-lab').forEach(div => {
    if (div._lab) return;
    const src = document.querySelector(`script[data-for="${div.id}"]`);
    createShaderLab(div, {
      source: src ? src.textContent.trim() : undefined,
      editable: div.hasAttribute('data-editable'),
      inspect:  div.hasAttribute('data-inspect'),
      height: parseInt(div.dataset.height || '300', 10),
      autorun: div.hasAttribute('data-autorun'),
    });
  });
}

if (document.readyState !== 'loading') autoMount();
else addEventListener('DOMContentLoaded', autoMount);
