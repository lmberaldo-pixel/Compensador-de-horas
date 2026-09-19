import { BellOff, BellRing, Check, Clock, VolumeX } from 'lucide-react';
import { stopAlarmLoop } from '../utils/audioAlarm';

export interface ActiveAlarmState {
  id: string;
  title: string;
  targetTime: string;
  alarmTime: string;
  message: string;
}

interface AlarmBannerProps {
  activeAlarm: ActiveAlarmState | null;
  advanceMinutes?: number;
  onDismiss: () => void;
  onSnooze: () => void;
  onPunchCurrent: (milestoneId: string) => void;
  onDeactivateAllAlarms?: () => void;
}

export default function AlarmBanner({
  activeAlarm,
  advanceMinutes = 2,
  onDismiss,
  onSnooze,
  onPunchCurrent,
  onDeactivateAllAlarms,
}: AlarmBannerProps) {
  if (!activeAlarm) return null;

  const handleDeactivate = () => {
    stopAlarmLoop();
    onDismiss();
  };

  const handleSnooze = () => {
    stopAlarmLoop();
    onSnooze();
  };

  const handlePunch = () => {
    stopAlarmLoop();
    onPunchCurrent(activeAlarm.id);
    onDismiss();
  };

  return (
    <aside
      id="active-alarm-banner"
      aria-label="Alerta de alarme ativo"
      className="bg-amber-600 text-white rounded-2xl shadow-lg p-4 sm:p-5 mb-6 animate-pulse transition-all border border-amber-500"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
            <BellRing className="w-6 h-6 text-white animate-bounce" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white">
              <Clock className="w-3.5 h-3.5" /> Atenção: Alarme Ativo ({advanceMinutes} min antes)
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight mt-0.5">
              {activeAlarm.title}: marcação às {activeAlarm.targetTime}
            </h2>
            <p className="text-xs sm:text-sm text-amber-100 font-medium">
              {activeAlarm.message || 'Prepare-se para bater o ponto e manter suas horas compensadas.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <button
            id="alarm-punch-now-btn"
            type="button"
            onClick={handlePunch}
            className="px-4 py-2 bg-white text-stone-900 font-bold rounded-xl text-xs hover:bg-amber-50 shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 text-emerald-600" />
            Bater Ponto Agora
          </button>

          <button
            id="alarm-snooze-btn"
            type="button"
            onClick={handleSnooze}
            className="px-3.5 py-2 bg-amber-700/80 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs border border-amber-500/50 transition-colors"
          >
            Adiar {advanceMinutes}m
          </button>

          <button
            id="alarm-dismiss-btn"
            type="button"
            onClick={handleDeactivate}
            className="px-3.5 py-2 bg-stone-900/80 hover:bg-stone-900 text-white font-semibold rounded-xl text-xs border border-stone-700/50 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <BellOff className="w-3.5 h-3.5 text-rose-400" />
            Desativar Alarme
          </button>

          {onDeactivateAllAlarms && (
            <button
              id="alarm-deactivate-all-btn"
              type="button"
              onClick={() => {
                stopAlarmLoop();
                onDeactivateAllAlarms();
              }}
              title="Desativar todos os alarmes de hoje"
              className="text-[11px] text-amber-100 hover:text-white underline px-1 py-1"
            >
              Desativar todos
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
