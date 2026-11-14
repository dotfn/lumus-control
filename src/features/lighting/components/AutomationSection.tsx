import React, { useState } from 'react';
import { Moon, Sunrise, Timer } from 'lucide-react';
import { useLightingStore } from '../store/lightingStore';
import { useTimerStore } from '../../timer/store/timerStore';
import { IconTile, Row, Section, Switch } from '../../shell/components/primitives';
import { useTranslation } from '../../../i18n';

const DURATION_MINUTES = [5, 15, 30, 45, 60, 90, 120];

function formatRemaining(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = (seconds % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s}` : `${m}:${s}`;
}

interface AutomationSectionProps {
  /** Lámparas del destino actual. */
  targetMacs: string[];
  currentDimming: number;
  disabled: boolean;
}

export const AutomationSection: React.FC<AutomationSectionProps> = ({
  targetMacs,
  currentDimming,
  disabled,
}) => {
  const { t } = useTranslation();
  const circadianActive = useLightingStore((s) => s.circadianActive);
  const circadianMacs = useLightingStore((s) => s.circadianMacs);
  const circadianTarget = useLightingStore((s) => s.circadianTarget);
  const isSyncingLocation = useLightingStore((s) => s.isSyncingLocation);
  const applyCircadianRhythm = useLightingStore((s) => s.applyCircadianRhythm);
  const stopCircadian = useLightingStore((s) => s.stopCircadian);

  const timerActive = useTimerStore((s) => s.timerActive);
  const timerSeconds = useTimerStore((s) => s.timerSeconds);
  const totalTimerSeconds = useTimerStore((s) => s.totalTimerSeconds);
  const timerFadeOut = useTimerStore((s) => s.timerFadeOut);
  const endTime = useTimerStore((s) => s.endTime);
  const timerMacs = useTimerStore((s) => s.targetMacs);
  const startTimer = useTimerStore((s) => s.startTimer);
  const cancelTimer = useTimerStore((s) => s.cancelTimer);

  const [minutes, setMinutes] = useState(30);
  const [fadeOut, setFadeOut] = useState(true);

  // Ambas automatizaciones quedan ligadas a las lámparas con las que se
  // iniciaron; aquí se distingue si son las que se están viendo u otras.
  const circadianHere = circadianActive && targetMacs.some((mac) => circadianMacs.includes(mac));
  const timerHere = timerActive && targetMacs.some((mac) => timerMacs.includes(mac));

  const circadianHint = isSyncingLocation
    ? t.app.automation.locating
    : circadianHere && circadianTarget
      ? t.app.automation.circadianNow(circadianTarget.temp, circadianTarget.dimming)
      : circadianActive
        ? t.app.automation.activeElsewhere
        : t.app.automation.circadianHint;

  const endLabel = endTime
    ? new Date(endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
  const timerHint = !timerActive
    ? t.app.automation.timerOffHint
    : timerHere
      ? t.app.automation.timerHereHint(endLabel, formatRemaining(timerSeconds))
      : t.app.automation.timerElsewhereHint(formatRemaining(timerSeconds));

  return (
    <Section title={t.app.automation.title} disabled={disabled}>
      <Row
        icon={
          <IconTile color="#ff9500">
            <Sunrise size={16} />
          </IconTile>
        }
        label={t.app.automation.circadian}
        hint={circadianHint}
      >
        <Switch
          checked={circadianHere}
          disabled={isSyncingLocation}
          label={t.app.automation.circadian}
          onChange={(checked) => (checked ? applyCircadianRhythm() : stopCircadian())}
        />
      </Row>

      <div className="mac-row mac-row--stack">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="mac-row__icon">
            <IconTile color="#5e5ce6">
              <Timer size={16} />
            </IconTile>
          </span>
          <div className="mac-row__text">
            <div className="mac-row__label">{t.app.automation.sleepTimer}</div>
            <div className="mac-row__hint tabular">{timerHint}</div>
          </div>
          <div className="mac-row__trailing">
            {timerActive ? (
              <button type="button" className="mac-btn" onClick={cancelTimer}>
                {t.app.automation.cancel}
              </button>
            ) : (
              <>
                <select
                  className="mac-select"
                  aria-label={t.app.automation.durationAria}
                  value={minutes}
                  onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
                >
                  {DURATION_MINUTES.map((m) => (
                    <option key={m} value={m}>
                      {t.app.automation.durations[m]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="mac-btn mac-btn--primary"
                  onClick={() => startTimer(minutes, fadeOut, currentDimming)}
                >
                  {t.app.automation.start}
                </button>
              </>
            )}
          </div>
        </div>
        {timerActive && totalTimerSeconds > 0 && (
          <div
            className="mac-progress"
            role="progressbar"
            aria-label={t.app.automation.progressAria}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((1 - timerSeconds / totalTimerSeconds) * 100)}
          >
            <div
              className="mac-progress__bar"
              style={{ width: `${(1 - timerSeconds / totalTimerSeconds) * 100}%` }}
            />
          </div>
        )}
      </div>

      <Row
        icon={
          <IconTile color="#8e8e93">
            <Moon size={15} />
          </IconTile>
        }
        label={t.app.automation.fadeOut}
        hint={t.app.automation.fadeOutHint}
      >
        <Switch
          checked={timerActive ? timerFadeOut : fadeOut}
          disabled={timerActive}
          label={t.app.automation.fadeOut}
          onChange={setFadeOut}
        />
      </Row>
    </Section>
  );
};
