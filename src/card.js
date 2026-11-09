/**
 * Lionel Train Card
 * https://github.com/BlackandBlue1908/ha_lionel_card
 */
import {
  mdiArrowLeft, mdiArrowRight, mdiBell, mdiBellRing, mdiBluetoothConnect, mdiBluetoothOff,
  mdiBullhorn, mdiCog, mdiDiceMultiple, mdiLightbulbOff, mdiLightbulbOn, mdiTrain,
  mdiWeatherNight, mdiWeatherSunny,
} from '@mdi/js';

const VERSION = '3.0.0';

// Announcement names per locomotive model (the train's sensor tells us which).
const TRAIN_MODELS = {
  'Generic': {
    random: 'Random', ready_to_roll: 'Ready to Roll', hey_there: 'Hey There', squeaky: 'Squeaky',
    water_and_fire: 'Water & Fire', fastest_freight: 'Fastest Freight', penna_flyer: 'Penna Flyer',
  },
  'Polar Express': {
    random: 'Random', ready_to_roll: 'Polar Express', hey_there: 'All Aboard', squeaky: 'You Coming?',
    water_and_fire: 'Tickets', fastest_freight: 'First Gift', penna_flyer: 'The King',
  },
};
const ANNOUNCEMENT_ORDER = Object.keys(TRAIN_MODELS.Generic);
const VOLUMES = [
  ['master_volume', 'Master'], ['engine_volume', 'Engine'], ['horn_volume', 'Horn'],
  ['bell_volume', 'Bell'], ['speech_volume', 'Speech'],
];
const THROTTLE_SEND_MS = 150;   // at most one Bluetooth command per 150 ms while dragging
const THROTTLE_HOLD_MS = 1500;  // ignore state echoes this long after the user moved it
const HORN_HOLD_MS = 250;       // shorter press = a short blast

const icon = (path, cls = '') => `<svg class="mdi ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;

const STYLE = `
:host { display:block; }
ha-card, .card { overflow:hidden; }
.card {
  --l-surface: var(--secondary-background-color, #26262b);
  --l-line: var(--divider-color, rgba(255,255,255,.12));
  --l-text: var(--primary-text-color, #e8e8ec);
  --l-muted: var(--secondary-text-color, #9a9aa6);
  --l-accent: var(--primary-color, #03a9f4);
  --l-stop: var(--error-color, #db4437);
  --l-ok: var(--success-color, #43a047);
  --l-warn: var(--warning-color, #ffa600);
  --l-brass: #d4a24c;
  padding:16px; color:var(--l-text); font-family:var(--paper-font-body1_-_font-family, inherit);
}
.mdi { width:20px; height:20px; fill:currentColor; flex:none; }
.head { display:flex; align-items:center; gap:10px; min-width:0; }
.head .mdi { color:var(--l-brass); width:24px; height:24px; }
.head h2 { flex:1; margin:0; font-size:18px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.pill { display:flex; align-items:center; gap:6px; font-size:12px; padding:4px 10px; border-radius:999px; white-space:nowrap;
  background:color-mix(in srgb, var(--l-ok) 16%, transparent); color:var(--l-ok); }
.pill i { width:7px; height:7px; border-radius:50%; background:currentColor; }
.pill.warn { background:color-mix(in srgb, var(--l-warn) 16%, transparent); color:var(--l-warn); }
.pill.warn i { animation:pulse 1.2s ease-in-out infinite; }
.pill.off { background:var(--l-surface); color:var(--l-muted); }
@keyframes pulse { 50% { opacity:.25; } }

.hero { position:relative; margin-top:12px; height:var(--lionel-scene-height, 210px); border-radius:12px; overflow:hidden;
  background:linear-gradient(#4f7fb8, #d6e6f2); }
.hero.night { background:linear-gradient(#060b1e, #24365a); }
.hero .scene { position:absolute; inset:0; }
.hero::after { content:""; position:absolute; inset:auto 0 0 0; height:46%; pointer-events:none;
  background:linear-gradient(transparent, rgba(8,14,24,.72)); }
.ov { position:absolute; z-index:1; color:#fff; pointer-events:none; }
.ov.speed { left:14px; bottom:8px; text-shadow:0 1px 8px rgba(0,0,0,.5); }
.ov.speed b { font-size:46px; font-weight:300; font-variant-numeric:tabular-nums; }
.ov.speed span { font-size:16px; margin-left:2px; }
.ov.dir { right:10px; top:10px; font-size:12px; padding:4px 9px; border-radius:7px; background:rgba(0,0,0,.42); display:flex; gap:4px; align-items:center; }
.ov.dir .mdi { width:14px; height:14px; }
.ov.tags { right:10px; bottom:12px; font-size:11px; display:flex; gap:6px; }
.ov.tags span { background:rgba(0,0,0,.38); padding:3px 8px; border-radius:6px; display:flex; gap:4px; align-items:center; }
.ov.tags .mdi { width:13px; height:13px; }
.speedrow { display:flex; align-items:baseline; gap:6px; margin:14px 0 2px; }
.speedrow b { font-size:48px; font-weight:300; line-height:1; font-variant-numeric:tabular-nums; }
.speedrow span { color:var(--l-muted); }
.speedrow em { margin-left:auto; font-style:normal; font-size:13px; color:var(--l-muted); }

.throttle { position:relative; height:56px; margin-top:12px; border-radius:14px; background:var(--l-surface);
  overflow:hidden; touch-action:none; cursor:pointer; user-select:none; outline:none; }
.throttle:focus-visible { box-shadow:0 0 0 2px var(--l-accent); }
.throttle .fill { position:absolute; inset:0 auto 0 0; width:0;
  background:linear-gradient(90deg, color-mix(in srgb, var(--l-accent) 22%, transparent), color-mix(in srgb, var(--l-accent) 60%, transparent)); }
.throttle .ticks { position:absolute; inset:0 10px; display:flex; justify-content:space-between; align-items:flex-end; pointer-events:none; }
.throttle .ticks i { width:1px; height:8px; background:var(--l-line); }
.throttle .ticks i:nth-child(8n+1) { height:14px; background:color-mix(in srgb, var(--l-text) 35%, transparent); }
.throttle .knob { position:absolute; top:6px; bottom:6px; width:14px; margin-left:-7px; left:0; border-radius:7px;
  background:#fff; box-shadow:0 1px 6px rgba(0,0,0,.45); }
.throttle .label { position:absolute; left:28px; top:8px; font-size:11px; letter-spacing:.08em; color:var(--l-muted); pointer-events:none; }

.row { display:grid; grid-template-columns:1fr 84px; gap:10px; margin-top:10px; }
.seg { display:flex; padding:4px; border-radius:12px; background:var(--l-surface); }
.seg button { flex:1; border-radius:9px; color:var(--l-muted); justify-content:center; padding:10px 0; font-size:15px; }
.seg button.on { background:var(--card-background-color, var(--ha-card-background, #1c1c1f)); color:var(--l-text);
  box-shadow:inset 0 0 0 1px var(--l-line); }
button { all:unset; box-sizing:border-box; display:flex; align-items:center; gap:6px; cursor:pointer;
  -webkit-tap-highlight-color:transparent; transition:transform .08s, background .15s, opacity .15s; }
button:active { transform:scale(.97); }
button:focus-visible { outline:2px solid var(--l-accent); outline-offset:2px; }
.stop { background:var(--l-stop); color:#fff; border-radius:12px; flex-direction:column; justify-content:center;
  font-weight:700; letter-spacing:.06em; font-size:13px; gap:4px; }
.stop i { width:16px; height:16px; border-radius:3px; background:#fff; }
.acts { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:10px; }
.act { flex-direction:column; justify-content:center; gap:2px; background:var(--l-surface); border-radius:12px; padding:11px 4px; font-size:14px; text-align:center; }
.act small { font-size:11px; color:var(--l-muted); }
.act.on { background:color-mix(in srgb, var(--l-warn) 18%, transparent); color:color-mix(in srgb, var(--l-warn) 72%, var(--l-text)); }
.act.on small { color:inherit; opacity:.8; }
.act.sounding { background:color-mix(in srgb, var(--l-accent) 22%, transparent); color:var(--l-accent); }
.chips { display:flex; gap:8px; margin-top:12px; overflow-x:auto; scrollbar-width:none; padding-bottom:2px; }
.chips::-webkit-scrollbar { display:none; }
.chip { white-space:nowrap; border:1px solid var(--l-line); border-radius:999px; padding:7px 12px; font-size:13px; flex:none; }
.chip .mdi { width:16px; height:16px; }
.foot { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:12px; padding-top:10px;
  border-top:1px solid var(--l-line); font-size:13px; color:var(--l-muted); }
.foot button { padding:6px 4px; color:var(--l-muted); }
.foot button .mdi { width:18px; height:18px; }
.foot button.primary { color:var(--l-accent); }
.settings { display:none; margin-top:10px; padding:12px; border-radius:12px; background:var(--l-surface); }
.settings.open { display:grid; gap:10px; }
.vol { display:grid; grid-template-columns:62px 1fr 18px; align-items:center; gap:10px; font-size:13px; color:var(--l-muted); }
.vol input { width:100%; accent-color:var(--l-accent); }
.vol output { text-align:right; color:var(--l-text); font-variant-numeric:tabular-nums; }
.toggle { display:flex; justify-content:space-between; align-items:center; font-size:13px; color:var(--l-text); }
.toggle input { accent-color:var(--l-accent); width:18px; height:18px; }
.offline .needs-link { opacity:.4; pointer-events:none; }
.offline .throttle .knob { background:var(--l-muted); }
.missing { padding:16px; color:var(--l-muted); }
`;

class LionelTrainCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._throttleUntil = 0;
    this._sendTimer = null;
    this._lastSent = 0;
    this._pendingSpeed = null;
  }

  static getConfigElement() { return document.createElement('lionel-train-card-editor'); }

  static getStubConfig(hass) {
    const dev = Object.values(hass?.devices || {}).find((d) =>
      Object.values(hass.entities || {}).some((e) => e.device_id === d.id && e.platform === 'lionel_controller'));
    return { device_id: dev?.id || '', show_3d: true };
  }

  setConfig(config) {
    if (!config) throw new Error('Invalid configuration');
    this._config = { show_3d: config.animation !== false, time_of_day: 'auto', ...config };
    if (config.show_3d !== undefined) this._config.show_3d = config.show_3d;
    this._built = false;
    if (this._hass) this._update();
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  getCardSize() { return this._config?.show_3d === false ? 7 : 9; }

  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }

  connectedCallback() {
    if (this._built && this._config.show_3d) this._mountScene();
  }

  disconnectedCallback() {
    this._io?.disconnect();
    document.removeEventListener('visibilitychange', this._onVis);
    this._scene?.dispose();
    this._scene = null;
    clearTimeout(this._sendTimer);
  }

  // ------------------------------------------------------------ entities

  _deviceId() {
    const c = this._config;
    if (c.device_id) return c.device_id;
    if (c.device) {  // 2.x configs named the device
      const want = String(c.device).toLowerCase();
      const dev = Object.values(this._hass.devices || {}).find((d) =>
        (d.name_by_user || d.name || '').toLowerCase() === want);
      return dev?.id;
    }
    return undefined;
  }

  _resolveEntities() {
    const devId = this._deviceId();
    const map = {};
    const announce = {};
    if (!devId) return { map, announce };
    for (const e of Object.values(this._hass.entities || {})) {
      if (e.device_id !== devId) continue;
      const [domain, objectId] = e.entity_id.split('.');
      const a = objectId.match(/_announcement_(.+)$/);
      if (domain === 'button' && a) { announce[a[1]] = e.entity_id; continue; }
      let role = e.translation_key;
      if (!role) {
        const known = ['throttle', 'master_volume', 'horn_volume', 'bell_volume', 'speech_volume', 'engine_volume',
          'auto_reconnect', 'horn_sound', 'bell_ringing', 'lights', 'connect', 'disconnect', 'stop', 'forward', 'reverse',
          'horn', 'bell', 'connection', 'status', 'train_model', 'direction', 'diagnostics'];
        role = known.find((k) => objectId.endsWith(`_${k}`));
      }
      if (role) map[`${domain}.${role}`] = e.entity_id;
    }
    return { map, announce };
  }

  _st(key) {
    const id = this._ents?.map[key];
    return id ? this._hass.states[id] : undefined;
  }

  _call(domain, service, key, data = {}) {
    const entity_id = this._ents.map[key];
    if (!entity_id) return Promise.resolve();
    return this._hass.callService(domain, service, { entity_id, ...data }).catch((err) => {
      this.dispatchEvent(new CustomEvent('hass-notification', {
        bubbles: true, composed: true, detail: { message: err?.message || String(err) },
      }));
    });
  }

  // ------------------------------------------------------------ rendering

  _update() {
    if (!this._config || !this._hass) return;
    this._ents = this._resolveEntities();
    if (!this._ents.map['number.throttle']) {
      this._built = false;
      this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card><div class="missing">
        Pick a Lionel train in the card settings.${this._deviceId() ? ' (No throttle found on that device.)' : ''}</div></ha-card>`;
      return;
    }
    if (!this._built) this._build();
    this._refresh();
  }

  _build() {
    const c = this._config;
    const ticks = Array.from({ length: 32 }, () => '<i></i>').join('');
    this.shadowRoot.innerHTML = `<style>${STYLE}</style>
<ha-card><div class="card">
  <div class="head">${icon(mdiTrain)}<h2 id="name"></h2><span class="pill" id="pill"><i></i><span></span></span></div>
  ${c.show_3d ? `
  <div class="hero" id="hero"><div class="scene" id="scene"></div>
    <div class="ov speed"><b id="spd">0</b><span>%</span></div>
    <div class="ov dir" id="dirtag"></div>
    <div class="ov tags" id="tags"></div>
  </div>` : `
  <div class="speedrow"><b id="spd">0</b><span>%</span><em id="dirtag"></em></div>`}
  <div class="throttle needs-link" id="throttle" role="slider" tabindex="0" aria-label="Throttle" aria-valuemin="0" aria-valuemax="100">
    <div class="fill" id="fill"></div><div class="ticks">${ticks}</div><span class="label">THROTTLE</span><div class="knob" id="knob"></div>
  </div>
  <div class="row needs-link">
    <div class="seg"><button id="rev">${icon(mdiArrowLeft)}Reverse</button><button id="fwd">Forward${icon(mdiArrowRight)}</button></div>
    <button class="stop" id="stop" aria-label="Stop"><i></i>STOP</button>
  </div>
  <div class="acts needs-link">
    <button class="act" id="horn">${icon(mdiBullhorn)}<span>Horn</span><small>hold</small></button>
    <button class="act" id="bell">${icon(mdiBell)}<span>Bell</span><small>tap</small></button>
    <button class="act" id="lights">${icon(mdiLightbulbOn)}<span>Lights</span><small></small></button>
  </div>
  <div class="chips needs-link" id="chips"></div>
  <div class="settings" id="settings">
    ${VOLUMES.map(([k, label]) => `<label class="vol needs-link"><span>${label}</span>
      <input type="range" min="0" max="7" step="1" data-vol="${k}"><output data-out="${k}"></output></label>`).join('')}
    <label class="toggle"><span>Reconnect automatically</span><input type="checkbox" id="auto"></label>
  </div>
  <div class="foot">
    <button id="link"></button>
    <button id="gear">${icon(mdiCog)}Settings</button>
  </div>
</div></ha-card>`;
    this._built = true;
    this._wire();
    if (c.show_3d) this._mountScene();
  }

  _refresh() {
    const $ = (id) => this.shadowRoot.getElementById(id);
    const connected = this._st('binary_sensor.connection')?.state === 'on';
    const auto = this._st('switch.auto_reconnect')?.state !== 'off';
    const dev = this._hass.devices?.[this._deviceId()];
    $('name').textContent = this._config.name || dev?.name_by_user || dev?.name || 'Lionel Train';

    const pill = $('pill');
    pill.className = 'pill' + (connected ? '' : auto ? ' warn' : ' off');
    pill.lastElementChild.textContent = connected ? 'Connected' : auto ? 'Reconnecting…' : 'Disconnected';
    this.shadowRoot.querySelector('.card').classList.toggle('offline', !connected);

    // Throttle (don't fight the user's finger with state echoes)
    if (!this._dragging && Date.now() > this._throttleUntil) {
      const v = Number(this._st('number.throttle')?.state);
      this._showSpeed(Number.isFinite(v) ? v : 0);
    }

    const forward = this._st('sensor.direction')?.state !== 'reverse';
    $('fwd').classList.toggle('on', forward);
    $('rev').classList.toggle('on', !forward);
    $('dirtag').innerHTML = `${icon(forward ? mdiArrowRight : mdiArrowLeft)}${forward ? 'Forward' : 'Reverse'}`;

    const lightsOn = this._st('switch.lights')?.state === 'on';
    const lb = $('lights');
    lb.classList.toggle('on', lightsOn);
    lb.querySelector('svg path').setAttribute('d', lightsOn ? mdiLightbulbOn : mdiLightbulbOff);
    lb.querySelector('small').textContent = lightsOn ? 'on' : 'off';

    const ringing = this._st('switch.bell_ringing')?.state === 'on';
    const bell = $('bell');
    bell.classList.toggle('sounding', ringing);
    bell.querySelector('svg path').setAttribute('d', ringing ? mdiBellRing : mdiBell);
    bell.querySelector('small').textContent = this._ents.map['switch.bell_ringing'] ? (ringing ? 'ringing' : 'tap') : 'tap';
    $('horn').classList.toggle('sounding', this._st('switch.horn_sound')?.state === 'on');

    // Announcements, labelled for this model
    const model = TRAIN_MODELS[this._st('sensor.train_model')?.state] || TRAIN_MODELS.Generic;
    const keys = ANNOUNCEMENT_ORDER.filter((k) => this._ents.announce[k]);
    const sig = model.ready_to_roll + keys.join();
    if (this._chipSig !== sig) {
      this._chipSig = sig;
      $('chips').innerHTML = keys.map((k) =>
        `<button class="chip" data-ann="${k}">${k === 'random' ? icon(mdiDiceMultiple) : ''}${model[k]}</button>`).join('');
    }

    for (const [k] of VOLUMES) {
      const s = this._st(`number.${k}`);
      const input = this.shadowRoot.querySelector(`[data-vol="${k}"]`);
      if (s && input && document.activeElement !== this && this._activeVol !== k) input.value = s.state;
      const out = this.shadowRoot.querySelector(`[data-out="${k}"]`);
      if (out) out.textContent = s ? s.state : '–';
    }
    $('auto').checked = auto;

    const link = $('link');
    link.innerHTML = connected ? `${icon(mdiBluetoothOff)}Disconnect` : `${icon(mdiBluetoothConnect)}Connect`;
    link.classList.toggle('primary', !connected);

    // 3D scene
    const night = this._isNight();
    const tags = $('tags');
    if (tags) {
      tags.innerHTML = `${lightsOn ? `<span>${icon(mdiLightbulbOn)}Lights</span>` : ''}<span>${icon(night ? mdiWeatherNight : mdiWeatherSunny)}${night ? 'Night' : 'Day'}</span>`;
      $('hero').classList.toggle('night', night);
    }
    this._sceneState = {
      speed: this._shownSpeed || 0, forward, lights: lightsOn, night,
    };
    this._scene?.setState(this._sceneState);
  }

  _isNight() {
    const mode = this._config.time_of_day;
    if (mode === 'day') return false;
    if (mode === 'night') return true;
    return this._hass.states['sun.sun']?.state === 'below_horizon';
  }

  _showSpeed(v) {
    v = Math.max(0, Math.min(100, Math.round(v)));
    this._shownSpeed = v;
    const $ = (id) => this.shadowRoot.getElementById(id);
    $('spd').textContent = v;
    $('fill').style.width = `${v}%`;
    $('knob').style.left = `calc(10px + (100% - 20px) * ${v / 100})`;
    $('throttle').setAttribute('aria-valuenow', v);
    if (this._scene && this._sceneState) this._scene.setState({ ...this._sceneState, speed: v });
  }

  // ------------------------------------------------------------ input

  _wire() {
    const $ = (id) => this.shadowRoot.getElementById(id);
    const th = $('throttle');
    const toValue = (ev) => {
      const r = th.getBoundingClientRect();
      return ((ev.clientX - r.left - 10) / (r.width - 20)) * 100;
    };
    th.addEventListener('pointerdown', (ev) => {
      this._dragging = true;
      th.setPointerCapture(ev.pointerId);
      this._setSpeed(toValue(ev));
    });
    th.addEventListener('pointermove', (ev) => { if (this._dragging) this._setSpeed(toValue(ev)); });
    const end = () => {
      if (!this._dragging) return;
      this._dragging = false;
      this._flushSpeed();
    };
    th.addEventListener('pointerup', end);
    th.addEventListener('pointercancel', end);
    th.addEventListener('keydown', (ev) => {
      const step = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5, PageUp: 20, PageDown: -20 }[ev.key];
      if (step === undefined && ev.key !== 'Home') return;
      ev.preventDefault();
      this._setSpeed(ev.key === 'Home' ? 0 : (this._shownSpeed || 0) + step);
      this._flushSpeed();
    });

    $('stop').addEventListener('click', () => {
      clearTimeout(this._sendTimer);
      this._pendingSpeed = null;
      this._throttleUntil = Date.now() + THROTTLE_HOLD_MS;
      this._showSpeed(0);
      this._call('button', 'press', 'button.stop');
    });
    $('fwd').addEventListener('click', () => this._call('button', 'press', 'button.forward'));
    $('rev').addEventListener('click', () => this._call('button', 'press', 'button.reverse'));
    $('lights').addEventListener('click', () => this._call('switch', 'toggle', 'switch.lights'));
    $('bell').addEventListener('click', () => {
      if (this._ents.map['switch.bell_ringing']) this._call('switch', 'toggle', 'switch.bell_ringing');
      else this._call('button', 'press', 'button.bell');
    });

    // Horn: tap = short blast, hold = sound until released.
    const horn = $('horn');
    let holdTimer = null, holding = false;
    horn.addEventListener('pointerdown', (ev) => {
      horn.setPointerCapture(ev.pointerId);
      holding = false;
      holdTimer = setTimeout(() => {
        if (!this._ents.map['switch.horn_sound']) return;
        holding = true;
        horn.classList.add('sounding');
        this._call('switch', 'turn_on', 'switch.horn_sound');
      }, HORN_HOLD_MS);
    });
    const hornUp = () => {
      clearTimeout(holdTimer);
      if (holding) {
        holding = false;
        horn.classList.remove('sounding');
        this._call('switch', 'turn_off', 'switch.horn_sound');
      } else if (holdTimer) {
        this._call('button', 'press', 'button.horn');
      }
      holdTimer = null;
    };
    horn.addEventListener('pointerup', hornUp);
    horn.addEventListener('pointercancel', hornUp);
    horn.addEventListener('contextmenu', (ev) => ev.preventDefault());

    $('chips').addEventListener('click', (ev) => {
      const k = ev.target.closest('[data-ann]')?.dataset.ann;
      if (k) this._hass.callService('button', 'press', { entity_id: this._ents.announce[k] });
    });
    $('gear').addEventListener('click', () => $('settings').classList.toggle('open'));
    $('link').addEventListener('click', () => {
      const connected = this._st('binary_sensor.connection')?.state === 'on';
      this._call('button', 'press', connected ? 'button.disconnect' : 'button.connect');
    });
    $('auto').addEventListener('change', (ev) =>
      this._call('switch', ev.target.checked ? 'turn_on' : 'turn_off', 'switch.auto_reconnect'));
    this.shadowRoot.querySelectorAll('[data-vol]').forEach((input) => {
      const k = input.dataset.vol;
      input.addEventListener('input', () => {
        this._activeVol = k;
        this.shadowRoot.querySelector(`[data-out="${k}"]`).textContent = input.value;
      });
      input.addEventListener('change', () => {
        this._activeVol = null;
        this._call('number', 'set_value', `number.${k}`, { value: Number(input.value) });
      });
    });
  }

  /** Show immediately; send at most every THROTTLE_SEND_MS while dragging. */
  _setSpeed(v) {
    v = Math.max(0, Math.min(100, Math.round(v)));
    this._showSpeed(v);
    this._pendingSpeed = v;
    this._throttleUntil = Date.now() + THROTTLE_HOLD_MS;
    const wait = THROTTLE_SEND_MS - (Date.now() - this._lastSent);
    if (wait <= 0) this._flushSpeed();
    else if (!this._sendTimer) this._sendTimer = setTimeout(() => this._flushSpeed(), wait);
  }

  _flushSpeed() {
    clearTimeout(this._sendTimer);
    this._sendTimer = null;
    if (this._pendingSpeed === null) return;
    const v = this._pendingSpeed;
    this._pendingSpeed = null;
    if (v === this._lastValue && Date.now() - this._lastSent < 2000) return;
    this._lastSent = Date.now();
    this._lastValue = v;
    this._throttleUntil = Date.now() + THROTTLE_HOLD_MS;
    this._call('number', 'set_value', 'number.throttle', { value: v });
  }

  // ------------------------------------------------------------ 3D scene

  async _mountScene() {
    const host = this.shadowRoot.getElementById('scene');
    if (!host || this._scene || this._sceneLoading) return;
    this._sceneLoading = true;
    try {
      // Sits next to this file (HACS serves the whole dist folder).
      const sceneUrl = new URL(`lionel-train-3d.js?v=${VERSION}`, import.meta.url).href;
      const { TrainScene } = await import(sceneUrl);
      if (!this.isConnected || this._scene) return;
      this._scene = new TrainScene(host, { trainModel: this._st('sensor.train_model')?.state });
      if (this._sceneState) this._scene.setState({ ...this._sceneState, speed: this._shownSpeed || 0 });
      this._io = new IntersectionObserver((entries) => {
        this._onScreen = entries.some((e) => e.isIntersecting);
        this._scene?.setVisible(this._onScreen && document.visibilityState === 'visible');
      });
      this._io.observe(host);
      this._onVis = () => this._scene?.setVisible(this._onScreen !== false && document.visibilityState === 'visible');
      document.addEventListener('visibilitychange', this._onVis);
    } catch (err) {
      console.warn('Lionel Train Card: 3D view unavailable', err);
      host.parentElement.style.display = 'none';
    } finally {
      this._sceneLoading = false;
    }
  }
}

class LionelTrainCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = (s) => ({
        device_id: 'Train', name: 'Name (optional)', show_3d: 'Show 3D layout',
        time_of_day: 'Scene lighting',
      }[s.name] || s.name);
      this._form.addEventListener('value-changed', (ev) => {
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: ev.detail.value } }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = { show_3d: true, time_of_day: 'auto', ...this._config };
    this._form.schema = [
      { name: 'device_id', required: true, selector: { device: { integration: 'lionel_controller' } } },
      { name: 'name', selector: { text: {} } },
      { name: 'show_3d', selector: { boolean: {} } },
      { name: 'time_of_day', selector: { select: { mode: 'dropdown', options: [
        { value: 'auto', label: 'Follow the sun' }, { value: 'day', label: 'Always day' },
        { value: 'night', label: 'Always night' },
      ] } } },
    ];
  }
}

customElements.define('lionel-train-card', LionelTrainCard);
customElements.define('lionel-train-card-editor', LionelTrainCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'lionel-train-card',
  name: 'Lionel Train Card',
  description: 'Drive a Lionel LionChief locomotive, with a 3D layout view.',
  preview: true,
  documentationURL: 'https://github.com/BlackandBlue1908/ha_lionel_card',
});
console.info(`%c LIONEL-TRAIN-CARD %c ${VERSION} `, 'color:#fff;background:#7b2d26;font-weight:600', 'color:#7b2d26;background:#fff');
