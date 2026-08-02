// frontend/js/layout/overrideState.js
// Override-State — verwaltet per-Instanz-Overrides fuer Spacing, Bildgroesse und Schriftgroesse.
// Key: stabiler liedblatt-item-Key (wird in Plan 02 durch updateLiedblatt() gesetzt).
// Alle Werte in pt (kanonische Einheit der Layout-Engine).
// Clamping aller Eingaben verhindert DoS durch extreme Werte (T-03-01-01, T-03-01-02).

const _state = {
    spacingOverrides: {},    // { 'key': { after: 20 } } — pt nach Block
    imageSizeOverrides: {},  // { 'key': { widthFraction: 0.7 } } — 0.1–1.0
    fontSizeOverrides: {}    // { 'key': { fontSize: 10 } } — pt
};

export function getOverrides() {
    return {
        spacingOverrides: { ..._state.spacingOverrides },
        imageSizeOverrides: { ..._state.imageSizeOverrides },
        fontSizeOverrides: { ..._state.fontSizeOverrides }
    };
}

export function setSpacingOverride(key, afterPt) {
    const clamped = Math.max(0, Math.min(100, parseFloat(afterPt) || 0));
    _state.spacingOverrides[key] = { after: clamped };
}

export function setImageSizeOverride(key, widthFraction) {
    const clamped = Math.max(0.1, Math.min(1.0, parseFloat(widthFraction) || 1.0));
    _state.imageSizeOverrides[key] = { widthFraction: clamped };
}

export function setFontSizeOverride(key, fontSizePt) {
    // Guard gegen NaN/Infinity (T-03-01-02)
    const parsed = parseFloat(fontSizePt);
    const clamped = Math.max(6, Math.min(36, isFinite(parsed) ? parsed : 12));
    _state.fontSizeOverrides[key] = { fontSize: clamped };
}

export function clearOverride(key) {
    delete _state.spacingOverrides[key];
    delete _state.imageSizeOverrides[key];
    delete _state.fontSizeOverrides[key];
}

export function clearOverrides() {
    _state.spacingOverrides = {};
    _state.imageSizeOverrides = {};
    _state.fontSizeOverrides = {};
}

export function serializeOverrides() {
    return JSON.stringify(_state);
}

export function deserializeOverrides(json) {
    try {
        const parsed = JSON.parse(json);
        if (parsed && typeof parsed === 'object') {
            _state.spacingOverrides  = parsed.spacingOverrides  || {};
            _state.imageSizeOverrides = parsed.imageSizeOverrides || {};
            _state.fontSizeOverrides = parsed.fontSizeOverrides  || {};
        }
    } catch (e) {
        console.error('overrideState: Fehler beim Deserialisieren:', e);
    }
}
