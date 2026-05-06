import AVFoundation

// Deprecated AVCaptureDevice.devices(for:) can omit external cameras (e.g. Studio Display).
func videoDeviceTypes() -> [AVCaptureDevice.DeviceType] {
    var types: [AVCaptureDevice.DeviceType] = [.builtInWideAngleCamera]
    if #available(macOS 14.0, *) {
        types.append(.external)
    } else {
        types.append(.externalUnknown)
    }
    if #available(macOS 13.0, *) {
        types.append(.deskViewCamera)
    }
    return types
}

let session = AVCaptureDevice.DiscoverySession(
    deviceTypes: videoDeviceTypes(),
    mediaType: .video,
    position: .unspecified
)

print(session.devices.map { $0.localizedName }.joined(separator: "\n"))
