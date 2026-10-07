/* Five-second intro with synthesized click sounds. Runs once per session,
   only after the visitor taps Begin (browsers won't play audio before a tap). */
(function () {
  var html = document.documentElement;
  if (!html.classList.contains('intro-pending')) return;

  var intro = document.getElementById('intro');
  var gate = document.getElementById('intro-gate');
  var begin = document.getElementById('intro-begin');
  var skip = document.getElementById('intro-skip');
  var beats = Array.prototype.slice.call(document.querySelectorAll('.intro-beat'));
  var timers = [];
  var done = false;
  var audio = null;

  function markSeen() { try { sessionStorage.setItem('afb_intro', '1'); } catch (e) {} }

  function finish() {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    markSeen();
    intro.classList.add('out');
    html.classList.remove('intro-pending');
    setTimeout(function () { if (intro.parentNode) intro.parentNode.removeChild(intro); }, 1200);
  }

  /* ---- sound ---- */
  function getAudio() {
    if (audio) return audio;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audio = new Ctx();
    return audio;
  }

  // A short, dry click: a tiny burst of noise through a bandpass, plus a
  // quick sine tick so it reads on small speakers.
  function click(at, pitch, loud) {
    var ctx = getAudio();
    if (!ctx) return;
    var t = ctx.currentTime + at;
    var master = ctx.createGain();
    master.gain.value = loud || 0.22;
    master.connect(ctx.destination);

    var len = Math.floor(ctx.sampleRate * 0.035);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    var noise = ctx.createBufferSource();
    noise.buffer = buf;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = pitch || 2400;
    bp.Q.value = 1.2;
    noise.connect(bp).connect(master);
    noise.start(t);

    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime((pitch || 2400) * 0.5, t);
    osc.frequency.exponentialRampToValueAtTime((pitch || 2400) * 0.2, t + 0.05);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // A low, soft thud for the final reveal.
  function thud(at) {
    var ctx = getAudio();
    if (!ctx) return;
    var t = ctx.currentTime + at;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.6);
  }

  /* ---- sequence (about five seconds) ---- */
  function show(i) {
    beats.forEach(function (b, j) {
      b.classList.toggle('on', j === i);
      b.classList.toggle('off', j < i);
    });
  }

  function run() {
    var ctx = getAudio();
    if (ctx && ctx.state === 'suspended') ctx.resume();

    gate.classList.add('hide');
    click(0, 1800, 0.18);

    var schedule = [
      { at: 350,  beat: 0, sound: function () { click(0, 2600, 0.24); } },
      { at: 1650, beat: 1, sound: function () { click(0, 2600, 0.24); click(0.09, 3200, 0.16); } },
      { at: 2950, beat: 2, sound: function () { click(0, 2000, 0.22); } },
      { at: 4250, beat: 3, sound: function () { click(0, 2600, 0.2); thud(0.12); } },
      { at: 5300, beat: -1, sound: function () { click(0, 1400, 0.14); } }
    ];

    schedule.forEach(function (step) {
      timers.push(setTimeout(function () {
        if (done) return;
        if (step.beat >= 0) show(step.beat);
        step.sound();
        if (step.beat === -1) finish();
      }, step.at));
    });
  }

  begin.addEventListener('click', function () { if (!gate.classList.contains('hide')) run(); });
  skip.addEventListener('click', finish);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') finish(); });
})();
