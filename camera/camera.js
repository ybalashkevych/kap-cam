const electron = require('electron');
const { ipcRenderer } = electron;

const video = document.querySelector('#preview');

/** Chromium labels often differ from AVFoundation localizedName used in Kap settings. */
function deviceMatchesLabel(deviceLabel, configuredName) {
	const label = (deviceLabel || '').trim();
	const name = (configuredName || '').trim();
	if (!label || !name || name === 'Default') {
		return false;
	}
	const a = label.toLowerCase();
	const b = name.toLowerCase();
	return a.includes(b) || b.includes(a);
}

function normalizeZoomScale(raw) {
	if (raw == null || raw === '') {
		return 1;
	}
	const n = typeof raw === 'number' ? raw : Number(raw);
	return Number.isFinite(n) && n > 0 ? n : 1;
}

ipcRenderer.on('data', (_, {
	videoDeviceName,
	borderRadius,
	zoomScale: rawZoom,
	mirror: mirrorEnabled
}) => {
	const scale = normalizeZoomScale(rawZoom);
	const mirror = mirrorEnabled !== false;

	const flip = mirror ? 'scaleX(-1)' : '';

	/* Transform on #kap-zoom-inner: Chromium often ignores transform on <video> (GPU layer).
	   Vertical origin ~46%: centers on face (eyes/nose); 18% was too high and favored forehead/hair.
	   scaleX(-1) after scale: horizontal mirror (selfie) after zoom. */
	const css = `
      #kap-zoom-inner {
        transform: scale(${scale}) ${flip} !important;
        transform-origin: 50% 46% !important;
      }
      video {
        border-radius: ${borderRadius};
      }
    `;

	const style = document.createElement('style');
	style.appendChild(document.createTextNode(css));
	document.querySelector('head').appendChild(style);

	navigator.mediaDevices.enumerateDevices().then(devices => {
		const videoDevices = devices.filter(d => d.kind === 'videoinput');
		const [defaultDevice] = videoDevices;

		const device = (
			videoDeviceName && videoDeviceName !== 'Default'
				? videoDevices.find(d => deviceMatchesLabel(d.label, videoDeviceName))
				: null
		) || defaultDevice;

		if (!device) {
			ipcRenderer.send('kap-camera-mount');
			return;
		}

		const { deviceId } = device;

		const errorCallback = (error) => {
			console.log(
				'There was an error connecting to the video stream:',
				error
			);
			ipcRenderer.send('kap-camera-mount');
		};

		navigator.mediaDevices.getUserMedia({
			video: deviceId ? { deviceId: { ideal: deviceId } } : true,
			audio: false
		}).then(stream => {
			video.srcObject = stream;
			ipcRenderer.send('kap-camera-mount');
		}).catch(errorCallback);
	}).catch(() => ipcRenderer.send('kap-camera-mount'));
});
