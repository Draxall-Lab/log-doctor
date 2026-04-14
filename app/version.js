let _installedVersion = null;
let _latestVersion = null;
let _updateAvailable = false;

export function getInstalledVersion() {
  return _installedVersion;
}

export function setInstalledVersion(version) {
  if (typeof version === "string" && version.trim()) {
    _installedVersion = version.trim().replace(/^v/i, "");
    return;
  }

  _installedVersion = null;
}

export function getLatestVersion() {
  return _latestVersion;
}

export function setLatestVersion(version, isAvailable = null) {
  if (typeof version === "string" && version.trim()) {
    _latestVersion = version.trim().replace(/^v/i, "");

    _updateAvailable =
      isAvailable !== null
        ? isAvailable
        : (!!_installedVersion && _latestVersion !== _installedVersion);

    return;
  }

  _latestVersion = null;
  _updateAvailable = false;
}

export function isUpdateAvailable() {
  return _updateAvailable;
}

export function pluginVersionLabel() {
  return _installedVersion ? `v${_installedVersion}` : "—";
}

export function resetVersionState() {
  _installedVersion = null;
  _latestVersion = null;
  _updateAvailable = false;
}