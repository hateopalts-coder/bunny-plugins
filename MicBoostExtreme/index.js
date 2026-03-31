const storage = vendetta.plugin.storage;
const React = vendetta.metro.common.React;
if (storage.enabled === void 0)
  storage.enabled = false;
if (storage.gain === void 0)
  storage.gain = 10;
if (storage.bass === void 0)
  storage.bass = 0;
if (storage.distortion === void 0)
  storage.distortion = 0;
if (storage.overdrive === void 0)
  storage.overdrive = false;
if (storage.preset === void 0)
  storage.preset = "Normal";
const PRESETS = {
  Normal: { gain: 5, bass: 0, distortion: 0, overdrive: false },
  Loud: { gain: 30, bass: 20, distortion: 15, overdrive: false },
  Earrape: { gain: 80, bass: 50, distortion: 80, overdrive: true },
  "Bass+": { gain: 20, bass: 80, distortion: 10, overdrive: false },
  EXTREME: { gain: 100, bass: 100, distortion: 100, overdrive: true }
};
const COLORS = {
  Normal: "#5865F2",
  Loud: "#3BA55C",
  Earrape: "#ED4245",
  "Bass+": "#FAA81A",
  EXTREME: "#111111"
};
let _ctx = null;
function makeDistortionCurve(amount) {
  const n = 256, curve = new Float32Array(n);
  const k = amount < 1 ? 1e-3 : amount * 4;
  for (let i = 0; i < n; i++) {
    const x = i * 2 / n - 1;
    curve[i] = (Math.PI + k) * x / (Math.PI + k * Math.abs(x));
  }
  return curve;
}
function buildChain(stream) {
  if (_ctx)
    _ctx.close().catch(() => {
    });
  _ctx = new (window.AudioContext || window.webkitAudioContext)();
  const src = _ctx.createMediaStreamSource(stream);
  const gain = _ctx.createGain();
  gain.gain.value = 1 + storage.gain / 100 * 49;
  const bass = _ctx.createBiquadFilter();
  bass.type = "lowshelf";
  bass.frequency.value = 200;
  bass.gain.value = storage.bass / 100 * 30;
  const dist = _ctx.createWaveShaper();
  dist.curve = makeDistortionCurve(storage.distortion);
  dist.oversample = "4x";
  const od = _ctx.createGain();
  od.gain.value = storage.overdrive ? 8 : 1;
  const comp = _ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 0;
  comp.ratio.value = 20;
  comp.attack.value = 0;
  comp.release.value = 0.1;
  const dest = _ctx.createMediaStreamDestination();
  src.connect(gain).connect(bass).connect(dist).connect(od).connect(comp).connect(dest);
  return dest.stream;
}
const _orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
function Settings() {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  function set(key, val) {
    storage[key] = val;
    storage.preset = "Custom";
    forceUpdate();
  }
  function applyPreset(name) {
    Object.assign(storage, PRESETS[name], { preset: name });
    forceUpdate();
  }
  const { Forms, General } = vendetta.ui.components;
  const { FormSection, FormRow, FormSwitch, FormSlider, FormText } = Forms;
  const { View, Text, TouchableOpacity } = General;
  return React.createElement(
    React.Fragment,
    null,
    // Enable toggle
    React.createElement(
      FormSection,
      { title: "MicBoost Extreme" },
      React.createElement(FormRow, {
        label: "Enable",
        subLabel: "Patches mic through audio chain on next VC join",
        trailing: React.createElement(FormSwitch, {
          value: storage.enabled,
          onValueChange: (v) => {
            storage.enabled = v;
            forceUpdate();
          }
        })
      })
    ),
    // Presets
    React.createElement(
      FormSection,
      { title: "Presets" },
      React.createElement(
        View,
        { style: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 12 } },
        ...Object.keys(PRESETS).map(
          (name) => React.createElement(
            TouchableOpacity,
            {
              key: name,
              onPress: () => applyPreset(name),
              style: {
                backgroundColor: COLORS[name],
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: storage.preset === name ? 2 : 0,
                borderColor: "#fff"
              }
            },
            React.createElement(
              Text,
              { style: { color: "#fff", fontWeight: "700", fontSize: 13 } },
              name === "EXTREME" ? "\u{1F480} EXTREME" : name
            )
          )
        )
      )
    ),
    // Sliders
    React.createElement(
      FormSection,
      { title: `Controls \u2014 ${storage.preset}` },
      React.createElement(FormText, null, `Gain: ${Math.round(storage.gain)}`),
      React.createElement(FormSlider, {
        value: storage.gain,
        minimumValue: 1,
        maximumValue: 100,
        onValueChange: (v) => set("gain", v)
      }),
      React.createElement(FormText, null, `Bass: ${Math.round(storage.bass)}`),
      React.createElement(FormSlider, {
        value: storage.bass,
        minimumValue: 0,
        maximumValue: 100,
        onValueChange: (v) => set("bass", v)
      }),
      React.createElement(FormText, null, `Distortion: ${Math.round(storage.distortion)}`),
      React.createElement(FormSlider, {
        value: storage.distortion,
        minimumValue: 0,
        maximumValue: 100,
        onValueChange: (v) => set("distortion", v)
      }),
      React.createElement(FormRow, {
        label: "Overdrive",
        subLabel: "8\xD7 extra gain multiplier on top of chain",
        trailing: React.createElement(FormSwitch, {
          value: storage.overdrive,
          onValueChange: (v) => set("overdrive", v)
        })
      })
    )
  );
}
module.exports = {
  onLoad() {
    navigator.mediaDevices.getUserMedia = (constraints) => {
      if (!storage.enabled || !(constraints == null ? void 0 : constraints.audio))
        return _orig(constraints);
      return _orig(constraints).then(buildChain);
    };
  },
  onUnload() {
    navigator.mediaDevices.getUserMedia = _orig;
    if (_ctx) {
      _ctx.close().catch(() => {
      });
      _ctx = null;
    }
  },
  settings: Settings
};
