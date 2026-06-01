window.gameStorage = window.gameStorage || {};

export function getStorage(key, defaultValue = null) {
  try {
    const val = localStorage.getItem(key);
    if (val !== null) return val;
  } catch (e) {
    // ignore quota error or disabled localStorage
  }
  return window.gameStorage[key] !== undefined ? window.gameStorage[key] : defaultValue;
}

export function setStorage(key, value) {
  window.gameStorage[key] = value;
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // ignore
  }
}
