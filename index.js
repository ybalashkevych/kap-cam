'use-strict';

const path = require('path');
const execa = require('execa');
const util = require('electron-util');
const { BrowserWindow, screen, ipcMain, dialog, shell, app } = require('electron');

const fixPath = (p) => path.join(util.fixPathForAsarUnpack(__dirname), p)

const contentPath = fixPath('camera/index.html')
const devicesBinary = fixPath('binaries/devices');
const permissionsBinary = fixPath('binaries/permissions');

const PADDING = 20;

const devices = ['Default'];

try {
  devices.push(...execa.sync(devicesBinary).stdout.trim().split('\n'));
} catch { }

const config = {
  device: {
    title: 'Device',
    description: 'Select a camera to display (names come from the system; Chromium may shorten labels).',
    enum: devices,
    required: true,
    default: 'Default'
  },
  rounded: {
    title: 'Corners',
    description: 'Corners of your camera overlay.',
    enum: ['Circle', 'Rounded', 'Square'],
    required: true,
    default: 'Circle'
  },
  size: {
    title: 'Size',
    description: 'How large should the preview be?',
    enum: ['Small', 'Medium', 'Large'],
    required: true,
    default: 'Medium'
  },
  zoom: {
    title: 'Zoom (crop)',
    description: 'Digital zoom: crops edges so you appear closer (e.g. head and shoulders). Applied in the overlay window.',
    enum: ['None', 'Slight', 'Medium', 'Strong', 'Maximum'],
    required: true,
    default: 'Medium'
  },
  mirror: {
    title: 'Mirror (selfie)',
    description: 'Flip the preview horizontally (like FaceTime). Turn off if text or logos must read correctly.',
    enum: ['Yes', 'No'],
    required: true,
    default: 'Yes'
  },
};

const zoomScales = {
  None: 1,
  Slight: 1.45,
  Medium: 1.85,
  Strong: 2.35,
  Maximum: 2.9
};

function resolveZoomScale(raw) {
  if (raw == null || raw === '') {
    return zoomScales.None;
  }
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  const s = String(raw).trim();
  const hit = Object.keys(zoomScales).find(k => k.toLowerCase() === s.toLowerCase());
  if (hit) {
    return zoomScales[hit];
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : zoomScales.Medium;
}

function resolveMirror(raw) {
  if (raw == null || raw === '') {
    return true;
  }
  const s = String(raw).trim().toLowerCase();
  return s !== 'no' && s !== 'false' && s !== '0';
}

const getBounds = (cropArea, screenBounds, { width, height }) => {
  return {
    x: cropArea.x + screenBounds.x + cropArea.width - width - PADDING,
    y: screenBounds.height - (cropArea.y + cropArea.height) + screenBounds.y + cropArea.height - height - PADDING,
    width,
    height
  };
}

const willStartRecording = async ({ state, config, apertureOptions: { screenId, cropArea } }) => {
  const hasPermissions = await ensureCameraPermission();

  if (!hasPermissions) {
    return;
  }

  const screens = screen.getAllDisplays();
  const { bounds } = screens.find(s => s.id === screenId) || {};

  const size = config.get('size') === "Small" ? 180 : config.get('size') === "Medium" ? 300 : 500

  const position = getBounds(cropArea, bounds, {
    width: size,
    height: size
  });

  state.window = new BrowserWindow({
    ...position,
    closable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    visualEffectState: 'inactive',
    titleBarStyle: 'customButtonsOnHover',
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  state.window.loadFile(contentPath);

  state.window.webContents.on('did-finish-load', () => {
    state.window.webContents.send('data', {
      videoDeviceName: config.get('device'),
      borderRadius: config.get('rounded') === "Circle" ? "50%" : config.get("rounded") === "Rounded" ? "16px" : "0px",
      zoomScale: resolveZoomScale(config.get('zoom')),
      mirror: resolveMirror(config.get('mirror'))
    });
  });

  return new Promise(resolve => {
    ipcMain.once('kap-camera-mount', resolve);
    setTimeout(resolve, 5000);
  });
};

const didStopRecording = ({ state }) => {
  if (state.window) {
    state.window.destroy();
  }
};

const configDescription = `Webcam overlay on recordings (device selection, digital zoom, external displays).`;

const openSystemPreferences = path => shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${path}`);

const hasCameraPermission = async () => {
  try {
    return (await execa(permissionsBinary)).stdout === 'true';
  } catch {
    return false;
  }
}

const ensureCameraPermission = async () => {
  const hasPermission = await hasCameraPermission();

  if (hasPermission) {
    return true;
  }

  const { response } = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['Open System Preferences', 'Cancel'],
    defaultId: 0,
    message: 'kap-cam cannot access the camera.',
    detail: 'kap-cam needs camera access to work correctly. You can grant this in the System Preferences. Relaunch Kap for the changes to take effect.',
    cancelId: 1
  });

  if (response === 0) {
    await openSystemPreferences('Privacy_Camera');
    app.quit();
  }

  return false;
}

exports.recordServices = [{
  title: 'Show Camera',
  config,
  configDescription,
  willStartRecording,
  didStopRecording,
  willEnable: ensureCameraPermission
}];
