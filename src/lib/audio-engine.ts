import { director } from "./director";

/**
 * A small generative soundscape built with the Web Audio API, so the sound
 * toggle works without shipping audio files: a low drone that opens up as the
 * ki builds, wind tied to the dust, a shimmering pad for Ultra Instinct, a
 * rushing layer for the final surge, and thunder on every lightning strike.
 *
 * It is created only after the visitor turns sound on (a user gesture), which
 * satisfies browser autoplay policies. The audio is purely atmospheric. No
 * information is carried by sound alone.
 */
export class AmbientAudio {
  private ctx: AudioContext;
  private master: GainNode;
  private droneFilter: BiquadFilterNode;
  private droneGain: GainNode;
  private wind: BiquadFilterNode;
  private windGain: GainNode;
  private hum: OscillatorNode;
  private humGain: GainNode;
  private padGain: GainNode;
  private rush: GainNode;
  private noise: AudioBuffer;
  private sources: AudioScheduledSourceNode[] = [];

  constructor() {
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = (this.ctx = new Ctx());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // Drone: two detuned saws through a lowpass that opens with the energy.
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = "lowpass";
    this.droneFilter.Q.value = 6;
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.2;
    this.droneFilter.connect(this.droneGain).connect(this.master);
    for (const detune of [-7, 6]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = 41.2;
      osc.detune.value = detune;
      osc.connect(this.droneFilter);
      this.sources.push(osc);
    }

    // Wind: looping noise through a wandering bandpass.
    this.wind = ctx.createBiquadFilter();
    this.wind.type = "bandpass";
    this.wind.Q.value = 0.7;
    this.windGain = ctx.createGain();
    this.wind.connect(this.windGain).connect(this.master);
    this.sources.push(this.loopNoise(this.wind));

    // Ki hum: a sine whose pitch rises with the transformation.
    this.hum = ctx.createOscillator();
    this.hum.type = "sine";
    this.humGain = ctx.createGain();
    this.humGain.gain.value = 0;
    this.hum.connect(this.humGain).connect(this.master);
    this.sources.push(this.hum);

    // Ultra Instinct pad: an open fifth, very quiet.
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0;
    this.padGain.connect(this.master);
    for (const f of [220, 329.6, 440.4]) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = f;
      osc.connect(this.padGain);
      this.sources.push(osc);
    }

    // Rush: bright noise for the tunnel of light.
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    this.rush = ctx.createGain();
    this.rush.gain.value = 0;
    hp.connect(this.rush).connect(this.master);
    this.sources.push(this.loopNoise(hp));

    this.sources.forEach((s) => s.start());
  }

  private loopNoise(dest: AudioNode) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.connect(dest);
    return src;
  }

  async setEnabled(on: boolean) {
    const t = this.ctx.currentTime;
    if (on && this.ctx.state === "suspended") await this.ctx.resume();
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(on ? 0.55 : 0, t, on ? 0.6 : 0.15);
  }

  /** Map the current shot onto the mix. Call once per frame while enabled. */
  update() {
    const s = director.shot;
    const t = this.ctx.currentTime;
    const energy = Math.max(s.aura, s.gather, s.speed * 0.8);
    const k = 0.12;
    this.droneFilter.frequency.setTargetAtTime(70 + energy * 900 + s.gold * 400, t, k);
    this.droneGain.gain.setTargetAtTime(0.16 + energy * 0.22 - s.ultra * 0.12, t, k);
    this.wind.frequency.setTargetAtTime(260 + s.dust * 900, t, k);
    this.windGain.gain.setTargetAtTime((0.04 + s.dust * 0.22) * (1 - s.cosmic * 0.8), t, k);
    this.hum.frequency.setTargetAtTime(98 + s.gold * 98 + s.speed * 120, t, k);
    this.humGain.gain.setTargetAtTime(s.aura * 0.09 * (1 - s.ultra * 0.6), t, k);
    this.padGain.gain.setTargetAtTime(s.ultra * 0.035, t, 0.4);
    this.rush.gain.setTargetAtTime(s.speed * 0.12 + s.wave * 0.1, t, k);
  }

  /** Low rumble for a lightning strike. */
  thunder(intensity: number) {
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.05 + Math.random() * 0.25;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 180 + Math.random() * 120;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5 * intensity, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
    src.connect(lp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 2.8);
  }

  dispose() {
    this.sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    });
    void this.ctx.close();
  }
}
