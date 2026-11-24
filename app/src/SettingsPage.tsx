import { canSpeak, speak, VOICES } from "./speak";
import { update, useStore, type Settings } from "./store";

export function SettingsPage() {
  const { settings } = useStore();
  const set = (patch: Partial<Settings>) => update(s => ({ settings: { ...s.settings, ...patch } }));
  return (
    <div className="grid">
      <div className="panel">
        <h3>Appearance</h3>
        <div className="bar">
          {([["light", "Light"], ["dark", "Dark"]] as const).map(([t, name]) => (
            <button key={t} className={`chip ${settings.theme === t ? "on" : ""}`} onClick={() => set({ theme: t })}>{name}</button>
          ))}
        </div>
      </div>
      <div className="panel">
        <h3>Direction</h3>
        <div className="bar">
          {([["es-en", "Spanish to English"], ["en-es", "English to Spanish"], ["both", "Both"]] as const).map(([d, name]) => (
            <button key={d} className={`chip ${settings.direction === d ? "on" : ""}`} onClick={() => set({ direction: d })}>{name}</button>
          ))}
        </div>
        <p className="muted">With both, quizzes and games mix the two directions.</p>
      </div>
      <div className="panel">
        <h3>Typed answers</h3>
        <div className="bar"><label><input type="checkbox" checked={settings.strictArticles} onChange={e => set({ strictArticles: e.target.checked })} /> Require the right article (el / la)</label></div>
        <div className="bar"><label><input type="checkbox" checked={settings.strictAccents} onChange={e => set({ strictAccents: e.target.checked })} /> Require accents (á, é, ñ)</label></div>
      </div>
      <div className="panel">
        <h3>Audio</h3>
        {canSpeak ? (
          <>
            <div className="bar"><label><input type="checkbox" checked={settings.autoSpeak} onChange={e => set({ autoSpeak: e.target.checked })} /> Say Spanish words automatically</label></div>
            <div className="bar">
              <label>Voice
                <select value={settings.voice} onChange={e => set({ voice: e.target.value as Settings["voice"] })}>
                  {VOICES.map(([v, name]) => <option key={v} value={v}>{name}</option>)}
                </select>
              </label>
              <button onClick={() => speak("el vocabulario")}>Test voice</button>
            </div>
          </>
        ) : <p className="muted">This browser has no speech support.</p>}
      </div>
    </div>
  );
}
