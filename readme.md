# kap-cam

> A [Kap](https://github.com/wulkano/Kap) plugin that adds a Loom-like webcam overlay to recordings.

**This fork** ([ybalashkevych/kap-cam](https://github.com/ybalashkevych/kap-cam)) extends the original plugin with:

- **Studio Display / external cameras** — device list uses `AVCaptureDevice.DiscoverySession` (not the deprecated API that could omit external cameras).
- **Reliable device selection** — matches Chromium `enumerateDevices()` labels to system names (bidirectional, case-insensitive).
- **Digital zoom** — configurable crop/zoom in the overlay; transform is applied on a **wrapper** so Electron/Chromium actually applies it (not on `<video>`, which often ignores `transform`).
- **Universal macOS binaries** — `devices` and `permissions` are built **arm64 + x86_64** (`lipo`) via `binaries/build.sh` (macOS 11+).

Upstream lineage: [@karaggeorge/kap-camera](https://github.com/karaggeorge/kap-camera) → [@clearlysid/kap-cam](https://github.com/clearlysid/kap-cam) → this fork.

## Install in Kap (from your GitHub)

1. Quit Kap.
2. Edit `~/Library/Application Support/Kap/plugins/package.json` and set the dependency to your branch or tag, for example:

   ```json
   "dependencies": {
     "kap-cam": "github:ybalashkevych/kap-cam#main"
   }
   ```

   To pin a release:

   ```json
   "kap-cam": "github:ybalashkevych/kap-cam#v1.1.0"
   ```

3. In a terminal:

   ```bash
   cd ~/Library/Application\ Support/Kap/plugins && npm install
   ```

4. Open Kap → **Preferences → Plugins** — enable **Show Camera**.

## Develop / rebuild Swift helpers (macOS only)

From the repo root:

```bash
chmod +x binaries/build.sh   # once
npm run build
```

Commit the updated `binaries/devices` and `binaries/permissions` before tagging a release (or use the GitHub Action below).

## Usage

1. Right-click the Kap menu bar icon (or use `…` in the cropper) → **Plugins** → enable **Show Camera**.
2. Configure **Device**, **Zoom (crop)**, **Size**, etc. in plugin settings.
3. The overlay appears when **recording starts** (not before).

## Releasing (maintainer)

Publishing is easiest from **macOS** so `npm run build` can refresh universal binaries, then `npm publish` if you use the public npm name (only if you own the package name) **or** rely on `github:` installs only.

The included workflow publishes on **release** from **macOS** and runs `npm run build` before `npm publish` (set the `NPM_TOKEN` repo secret if you use npm).

## Demo (original)

![demo](https://user-images.githubusercontent.com/30227512/193472451-810ad0e7-a90f-4b06-b819-28347f1cb771.gif)
