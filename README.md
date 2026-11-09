# Lionel Train Card

A Home Assistant dashboard card for driving a Lionel LionChief locomotive, with a 3D view of a snowy
layout where your train runs at the speed you set.

Requires the [Lionel Train Controller](https://github.com/BlackandBlue1908/ha_lionel_controller)
integration, version 2.1 or later (for press-and-hold horn and continuous bell).

## What's on the card

- **3D layout** (optional): the train moves with the throttle, runs backward in reverse, and its headlight
  follows the Lights switch. Day or night follows the sun (`sun.sun`), or pick one. The scene only renders while
  it's on screen, and three.js is downloaded only when the 3D view is shown.
- **Throttle**: notched slider. Sends at most one command every 150 ms while you drag, and the final value on release.
- **Reverse / Forward** shows the active direction; **STOP** sits next to the throttle.
- **Horn**: tap for a short blast, hold to sound until you let go. **Bell**: tap to start or stop ringing.
  **Lights** toggle.
- **Announcements**, named for your train model (Polar Express names included).
- **Settings**: volumes and automatic reconnection. Connect / Disconnect.
- Greys out with **Reconnecting…** while the Bluetooth link is down. Uses your theme's colours (light and dark).

## Configuration

Add it from the dashboard editor (search "Lionel") and pick your train. YAML:

```yaml
type: custom:lionel-train-card
device_id: <your train's device id>   # the editor fills this in
name: Polar Express                   # optional
show_3d: true                         # optional, default true
time_of_day: auto                     # auto (follow the sun) | day | night
```

Cards from 2.x that used `device: Polar Express` keep working.

## Installation

HACS → Frontend → ⋮ → Custom repositories → add this repo as **Dashboard**, install, refresh the browser.
Both `lionel-train-card.js` and `lionel-train-3d.js` from `dist/` must be served from the same folder.

## Development

```bash
npm install
npm run build      # dist/lionel-train-card.js + dist/lionel-train-3d.js
npx http-server .  # then open test/dev.html (mock Home Assistant; ?sun=below_horizon, ?state=reconnecting, ?3d=off, ?theme=light)
```

## License

MIT
