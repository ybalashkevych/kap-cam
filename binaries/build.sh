#!/usr/bin/env bash
# Build universal (arm64 + x86_64) Swift helpers for Kap on macOS.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "binaries/build.sh: skip (not macOS)" >&2
  exit 0
fi

export MACOSX_DEPLOYMENT_TARGET="${MACOSX_DEPLOYMENT_TARGET:-11.0}"

swiftc -O -target "arm64-apple-macosx${MACOSX_DEPLOYMENT_TARGET}" -o devices.arm64 devices.swift
swiftc -O -target "x86_64-apple-macosx${MACOSX_DEPLOYMENT_TARGET}" -o devices.x86_64 devices.swift
lipo -create devices.arm64 devices.x86_64 -output devices
rm -f devices.arm64 devices.x86_64
chmod +x devices

swiftc -O -target "arm64-apple-macosx${MACOSX_DEPLOYMENT_TARGET}" -o permissions.arm64 permissions.swift
swiftc -O -target "x86_64-apple-macosx${MACOSX_DEPLOYMENT_TARGET}" -o permissions.x86_64 permissions.swift
lipo -create permissions.arm64 permissions.x86_64 -output permissions
rm -f permissions.arm64 permissions.x86_64
chmod +x permissions

echo "Built universal binaries: devices, permissions"
