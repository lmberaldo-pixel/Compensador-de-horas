import { Bell, BellOff, CheckCircle2, Clock, Play } from 'lucide-react';
import { CompensationResult } from '../types';

interface AlarmScheduleCardProps {
  result: CompensationResult;
  advanceMinutes: number;
  alarmsEnabled?: boolean;
  onToggleMasterAlarms?: () => void;
  onToggleMilestoneAlarm?: (milestoneId: string) => void;
  onChangeAdvanceMinutes: (mins: number) => void;
  onTriggerAlarmNow: (alarmId: string, title: string, targetTime: string) => void;
}

export default function AlarmScheduleCard({
  result,
  advanceMinutes,
  alarmsEnabled = true,
  onToggleMasterAlarms,
  onToggleMilestoneAlarm,
  onChangeAdvanceMinutes,
  onTriggerAlarmNow,
}: AlarmScheduleCardProps) {
  const milestoneDescriptions: Record<string, string> = {
    entry: 'Lembrete de início da jornada para evitar atrasos na entrada.',
    lunchStart: 'Aviso para sair no horário e planejar sua pausa de refeição.',
    lunchEnd: 'Aviso para retornar ao trabalho sem ultrapassar o tempo de almoço.',
    finalExit: 'Aviso de conclusão exata das horas de trabalho com compensação.',
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 mb-5 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
              {alarmsEnabled ? (
                <Bell className="w-4 h-4 text-amber-600" />
              ) : (
                <BellOff className="w-4 h-4 text-rose-500" />
              )}
              Programação dos Alarmes
            </h2>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                alarmsEnabled
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {alarmsEnabled ? `${advanceMinutes}m Antes` : 'Desativado'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {alarmsEnabled
              ? `O alarme dispara automaticamente ${advanceMinutes} ${
                  advanceMinutes === 1 ? 'minuto' : 'minutos'
                } antes de cada marcação para você não esquecer de registrar o ponto.`
              : 'Os alarmes automáticos estão desativados no momento. Clique no botão ao lado para reativar.'}
          </p>
        </div>

        {/* Action Controls: Master Toggle + Antecedência */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Selector 1, 2, 3, 5, 10 min */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200/80">
            <span className="text-[11px] font-bold text-stone-600 px-2 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" /> Antecedência:
            </span>
            {[1, 2, 3, 5, 10].map((mins) => (
              <button
                key={mins}
                id={`alarm-advance-${mins}m-btn`}
                type="button"
                onClick={() => onChangeAdvanceMinutes(mins)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  advanceMinutes === mins
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>

          {/* Master Toggle Button */}
          {onToggleMasterAlarms && (
            <button
              id="master-alarm-toggle-btn"
              type="button"
              onClick={onToggleMasterAlarms}
              title={
                alarmsEnabled
                  ? 'Clique para desativar todos os alarmes automáticos'
                  : 'Clique para ativar os alarmes automáticos'
              }
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-2xs ${
                alarmsEnabled
                  ? 'bg-white text-stone-700 border-stone-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
                  : 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
              }`}
            >
              {alarmsEnabled ? (
                <>
                  <BellOff className="w-3.5 h-3.5 text-stone-500" />
                  <span>Desativar Alarmes</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5 text-white" />
                  <span>Ativar Alarmes</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Warning banner when alarms are completely turned off */}
      {!alarmsEnabled && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <BellOff className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Atenção:</strong> O alarme sonoro (bip bip) e as notificações estão desativados.
            </span>
          </div>
          {onToggleMasterAlarms && (
            <button
              type="button"
              onClick={onToggleMasterAlarms}
              className="px-2.5 py-1 bg-rose-600 text-white font-bold rounded-lg text-[11px] hover:bg-rose-700 shrink-0 transition-colors"
            >
              Reativar Agora
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {result.alarms.map((alarm) => {
          const isPassed = alarm.status === 'passed';
          const isAlarmActive = alarmsEnabled && alarm.enabled !== false;

          return (
            <div
              key={alarm.id}
              className={`rounded-xl p-3.5 border transition-all flex flex-col justify-between ${
                !isAlarmActive
                  ? 'bg-stone-50/80 border-dashed border-stone-300 text-stone-500'
                  : isPassed
                  ? 'bg-stone-50/70 border-stone-200 text-stone-400'
                  : 'bg-white border-amber-200/90 shadow-2xs hover:border-amber-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-bold ${
                      !isAlarmActive
                        ? 'text-stone-500 line-through'
                        : isPassed
                        ? 'text-stone-500'
                        : 'text-stone-800'
                    }`}
                  >
                    {alarm.title}
                  </span>

                  {!isAlarmActive ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-300">
                      <BellOff className="w-2.5 h-2.5" /> Desativado
                    </span>
                  ) : isPassed ? (
                    <span className="flex items-center gap-1 text-[10px] text-stone-400">
                      <CheckCircle2 className="w-3 h-3 text-stone-400" /> Feito
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Programado
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-stone-500 mb-3 leading-relaxed">
                  {milestoneDescriptions[alarm.id]}
                </p>
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase font-medium">
                    Toca às:
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`font-mono text-sm font-bold ${
                        !isAlarmActive || isPassed ? 'text-stone-400' : 'text-amber-800'
                      }`}
                    >
                      {alarm.alarmTriggerTime}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      (ponto: {alarm.scheduledTargetTime})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Milestone Deactivate/Activate Toggle */}
                  {onToggleMilestoneAlarm && alarmsEnabled && (
                    <button
                      type="button"
                      onClick={() => onToggleMilestoneAlarm(alarm.id)}
                      title={
                        alarm.enabled !== false
                          ? `Desativar alarme de ${alarm.title}`
                          : `Ativar alarme de ${alarm.title}`
                      }
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        alarm.enabled !== false
                          ? 'text-stone-400 hover:text-rose-600 hover:bg-rose-50'
                          : 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                      }`}
                    >
                      {alarm.enabled !== false ? (
                        <BellOff className="w-3.5 h-3.5" />
                      ) : (
                        <Bell className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </button>
                  )}

                  {/* Test Alarm Sound */}
                  <button
                    type="button"
                    onClick={() => {
                      onTriggerAlarmNow(alarm.id, alarm.title, alarm.scheduledTargetTime);
                    }}
                    title="Testar este alarme agora (tocar bip bip)"
                    className="p-1.5 text-stone-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
