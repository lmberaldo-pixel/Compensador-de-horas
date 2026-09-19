import { useState } from 'react';
import {
  Bell,
  Check,
  Clock,
  LogIn,
  LogOut,
  RotateCcw,
  Utensils,
  X,
  BookmarkCheck,
  Save,
} from 'lucide-react';
import { CompensationResult, DayMarks, WorkConfig } from '../types';
import { formatMinutesDiff, getCurrentTime } from '../utils/timeCalculations';

interface TimeEntryInputsProps {
  marks: DayMarks;
  config: WorkConfig;
  result: CompensationResult;
  onChangeMark: (field: keyof DayMarks, value: string) => void;
  onClearMarks: () => void;
  onSaveCurrentDay?: () => void;
}

export default function TimeEntryInputs({
  marks,
  config,
  result,
  onChangeMark,
  onClearMarks,
  onSaveCurrentDay,
}: TimeEntryInputsProps) {
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const advanceMins = config.alarmAdvanceMinutes || 2;
  const hasAnyMark = Boolean(
    marks.startTime || marks.lunchStartTime || marks.lunchEndTime || marks.actualEndTime
  );

  const handlePunchNow = (field: keyof DayMarks) => {
    const nowTime = getCurrentTime();
    onChangeMark(field, nowTime);
  };

  const clearField = (field: keyof DayMarks) => {
    onChangeMark(field, '');
  };

  const steps = [
    {
      id: 'startTime' as keyof DayMarks,
      number: '01',
      title: 'Entrada',
      icon: LogIn,
      iconColor: 'text-emerald-600',
      value: marks.startTime,
      placeholder: config.standardStartTime,
      isNext: !marks.startTime,
      isDone: Boolean(marks.startTime),
      alarmId: 'entry',
    },
    {
      id: 'lunchStartTime' as keyof DayMarks,
      number: '02',
      title: 'Saída Almoço',
      icon: Utensils,
      iconColor: 'text-amber-600',
      value: marks.lunchStartTime,
      placeholder: config.standardLunchStart,
      isNext: Boolean(marks.startTime && !marks.lunchStartTime),
      isDone: Boolean(marks.lunchStartTime),
      alarmId: 'lunchStart',
    },
    {
      id: 'lunchEndTime' as keyof DayMarks,
      number: '03',
      title: 'Retorno Almoço',
      icon: Utensils,
      iconColor: 'text-blue-600',
      value: marks.lunchEndTime,
      placeholder: 'Após pausa',
      isNext: Boolean(marks.lunchStartTime && !marks.lunchEndTime),
      isDone: Boolean(marks.lunchEndTime),
      alarmId: 'lunchEnd',
    },
    {
      id: 'actualEndTime' as keyof DayMarks,
      number: '04',
      title: 'Saída Final',
      icon: LogOut,
      iconColor: 'text-stone-900',
      value: marks.actualEndTime,
      placeholder: result.calculatedEndTime,
      isNext: Boolean(marks.lunchEndTime && !marks.actualEndTime),
      isDone: Boolean(marks.actualEndTime),
      alarmId: 'finalExit',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] p-6 mb-6">
      {/* Header bar with title and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-5 border-b border-stone-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-stone-900 tracking-tight">
              Marcações de Ponto
            </h2>
            <span className="text-[11px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
              4 Etapas da Jornada
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Registre os horários ou clique em <strong className="text-stone-800">"Agora"</strong> ao bater o ponto. O horário final compensa automaticamente.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSaveCurrentDay && (
            <button
              id="save-day-to-bank-btn"
              type="button"
              onClick={onSaveCurrentDay}
              title="Salvar a jornada de hoje no Banco de Horas"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Dia no Banco</span>
            </button>
          )}

          {showConfirmClear ? (
            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl shadow-2xs animate-in fade-in duration-150">
              <span className="text-xs text-rose-800 font-bold">Limpar tudo?</span>
              <button
                id="confirm-clear-marks-btn"
                type="button"
                onClick={() => {
                  onClearMarks();
                  setShowConfirmClear(false);
                }}
                className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-2 py-0.5 rounded-lg transition-colors"
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                className="text-xs font-medium text-stone-600 hover:text-stone-900 px-1.5 py-0.5 rounded transition-colors"
              >
                Não
              </button>
            </div>
          ) : (
            <button
              id="clear-marks-btn"
              type="button"
              onClick={() => {
                if (hasAnyMark) {
                  setShowConfirmClear(true);
                } else {
                  onClearMarks();
                }
              }}
              className="text-xs font-semibold text-stone-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-colors border border-stone-200 hover:border-rose-200 flex items-center gap-1.5"
              title="Limpar todos os horários batidos hoje"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Dia</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Checkpoints Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Entrada */}
        <div
          id="entry-card"
          className={`rounded-xl p-4 border transition-all flex flex-col justify-between ${
            marks.startTime
              ? 'bg-emerald-50/25 border-emerald-200/90 shadow-2xs'
              : 'bg-white border-amber-300 ring-2 ring-amber-100/60 shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-900 text-amber-300 font-mono text-[10px] font-bold flex items-center justify-center">
                  01
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1">
                  <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                  Entrada
                </span>
              </div>

              {marks.startTime ? (
                <div className="flex items-center gap-1">
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    <Check className="w-3 h-3 text-emerald-600" /> Bateu
                  </span>
                  <button
                    type="button"
                    onClick={() => clearField('startTime')}
                    title="Limpar este horário"
                    className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Aguardando
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <input
                id="start-time-input"
                type="time"
                value={marks.startTime}
                onChange={(e) => onChangeMark('startTime', e.target.value)}
                className="w-full font-mono text-xl font-bold bg-white text-stone-900 px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900"
              />
              <button
                type="button"
                onClick={() => handlePunchNow('startTime')}
                title="Bater entrada com o horário de agora"
                className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold whitespace-nowrap transition-colors shadow-2xs"
              >
                Agora
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100 space-y-1 text-xs">
            <div className="flex justify-between text-stone-500">
              <span>Previsto:</span>
              <span className="font-mono text-stone-800 font-semibold">{config.standardStartTime}</span>
            </div>

            {marks.startTime ? (
              <div className="flex justify-between font-medium">
                <span className="text-stone-500">Atraso / Delta:</span>
                <span
                  className={`font-mono font-bold ${
                    result.entryDelayMinutes > 0
                      ? 'text-amber-700'
                      : result.entryDelayMinutes < 0
                      ? 'text-emerald-700'
                      : 'text-stone-700'
                  }`}
                >
                  {formatMinutesDiff(result.entryDelayMinutes)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[11px] text-amber-800/90 bg-amber-50/80 px-2 py-1 rounded-lg">
                <Bell className="w-3 h-3 text-amber-600 shrink-0" />
                <span>Alerta {advanceMins}m às: {result.alarms.find(a => a.id === 'entry')?.alarmTriggerTime}</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Saída Almoço */}
        <div
          id="lunch-start-card"
          className={`rounded-xl p-4 border transition-all flex flex-col justify-between ${
            marks.lunchStartTime
              ? 'bg-emerald-50/25 border-emerald-200/90 shadow-2xs'
              : marks.startTime
              ? 'bg-white border-amber-300 ring-2 ring-amber-100/60 shadow-xs'
              : 'bg-stone-50/40 border-stone-200 opacity-80'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-900 text-amber-300 font-mono text-[10px] font-bold flex items-center justify-center">
                  02
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1">
                  <Utensils className="w-3.5 h-3.5 text-amber-600" />
                  Saída Almoço
                </span>
              </div>

              {marks.lunchStartTime ? (
                <div className="flex items-center gap-1">
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    <Check className="w-3 h-3 text-emerald-600" /> Bateu
                  </span>
                  <button
                    type="button"
                    onClick={() => clearField('lunchStartTime')}
                    title="Limpar este horário"
                    className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                  Pausa
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <input
                id="lunch-start-input"
                type="time"
                value={marks.lunchStartTime}
                onChange={(e) => onChangeMark('lunchStartTime', e.target.value)}
                className="w-full font-mono text-xl font-bold bg-white text-stone-900 px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900"
              />
              <button
                type="button"
                onClick={() => handlePunchNow('lunchStartTime')}
                title="Bater saída para almoço agora"
                className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold whitespace-nowrap transition-colors shadow-2xs"
              >
                Agora
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100 space-y-1 text-xs">
            <div className="flex justify-between text-stone-500">
              <span>Previsto:</span>
              <span className="font-mono text-stone-800 font-semibold">
                {result.alarms.find(a => a.id === 'lunchStart')?.scheduledTargetTime || config.standardLunchStart}
              </span>
            </div>

            {marks.lunchStartTime ? (
              <div className="flex justify-between text-stone-500">
                <span>Manhã trabalhada:</span>
                <span className="font-mono text-stone-800 font-bold">
                  {Math.floor(result.morningMinutesWorked / 60)}h{' '}
                  {String(result.morningMinutesWorked % 60).padStart(2, '0')}m
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[11px] text-amber-800/90 bg-amber-50/80 px-2 py-1 rounded-lg">
                <Bell className="w-3 h-3 text-amber-600 shrink-0" />
                <span>Alerta {advanceMins}m às: {result.alarms.find(a => a.id === 'lunchStart')?.alarmTriggerTime}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Retorno Almoço */}
        <div
          id="lunch-end-card"
          className={`rounded-xl p-4 border transition-all flex flex-col justify-between ${
            marks.lunchEndTime
              ? 'bg-emerald-50/25 border-emerald-200/90 shadow-2xs'
              : marks.lunchStartTime
              ? 'bg-white border-amber-300 ring-2 ring-amber-100/60 shadow-xs'
              : 'bg-stone-50/40 border-stone-200 opacity-80'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-900 text-amber-300 font-mono text-[10px] font-bold flex items-center justify-center">
                  03
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1">
                  <Utensils className="w-3.5 h-3.5 text-blue-600" />
                  Volta Almoço
                </span>
              </div>

              {marks.lunchEndTime ? (
                <div className="flex items-center gap-1">
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    <Check className="w-3 h-3 text-emerald-600" /> Bateu
                  </span>
                  <button
                    type="button"
                    onClick={() => clearField('lunchEndTime')}
                    title="Limpar este horário"
                    className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                  Retorno
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <input
                id="lunch-end-input"
                type="time"
                value={marks.lunchEndTime}
                onChange={(e) => onChangeMark('lunchEndTime', e.target.value)}
                className="w-full font-mono text-xl font-bold bg-white text-stone-900 px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900"
              />
              <button
                type="button"
                onClick={() => handlePunchNow('lunchEndTime')}
                title="Bater retorno de almoço agora"
                className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold whitespace-nowrap transition-colors shadow-2xs"
              >
                Agora
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100 space-y-1 text-xs">
            <div className="flex justify-between text-stone-500">
              <span>Intervalo padrão:</span>
              <span className="font-mono text-stone-800 font-semibold">{config.standardLunchMinutes} min</span>
            </div>

            {marks.lunchEndTime ? (
              <div className="flex justify-between font-medium">
                <span className="text-stone-500">Excesso / Delta:</span>
                <span
                  className={`font-mono font-bold ${
                    result.lunchDelayMinutes > 0
                      ? 'text-amber-700'
                      : result.lunchDelayMinutes < 0
                      ? 'text-emerald-700'
                      : 'text-stone-700'
                  }`}
                >
                  {formatMinutesDiff(result.lunchDelayMinutes)}
                </span>
              </div>
            ) : marks.lunchStartTime ? (
              <div className="flex items-center gap-1 text-[11px] text-amber-800/90 bg-amber-50/80 px-2 py-1 rounded-lg">
                <Bell className="w-3 h-3 text-amber-600 shrink-0" />
                <span>Alerta {advanceMins}m às: {result.alarms.find(a => a.id === 'lunchEnd')?.alarmTriggerTime}</span>
              </div>
            ) : (
              <div className="text-[11px] text-stone-400">Aguardando almoço</div>
            )}
          </div>
        </div>

        {/* 4. Saída Final */}
        <div
          id="final-exit-card"
          className={`rounded-xl p-4 border transition-all flex flex-col justify-between ${
            marks.actualEndTime
              ? 'bg-emerald-50/25 border-emerald-200/90 shadow-2xs'
              : marks.lunchEndTime
              ? 'bg-white border-amber-300 ring-2 ring-amber-100/60 shadow-xs'
              : 'bg-stone-50/40 border-stone-200 opacity-80'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-900 text-amber-300 font-mono text-[10px] font-bold flex items-center justify-center">
                  04
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1">
                  <LogOut className="w-3.5 h-3.5 text-stone-900" />
                  Saída Final
                </span>
              </div>

              {marks.actualEndTime ? (
                <div className="flex items-center gap-1">
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    <Check className="w-3 h-3 text-emerald-600" /> Bateu
                  </span>
                  <button
                    type="button"
                    onClick={() => clearField('actualEndTime')}
                    title="Limpar este horário"
                    className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                  Meta: {result.calculatedEndTime}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <input
                id="actual-end-input"
                type="time"
                value={marks.actualEndTime}
                onChange={(e) => onChangeMark('actualEndTime', e.target.value)}
                className="w-full font-mono text-xl font-bold bg-white text-stone-900 px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900"
              />
              <button
                type="button"
                onClick={() => handlePunchNow('actualEndTime')}
                title="Bater saída final agora"
                className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold whitespace-nowrap transition-colors shadow-2xs"
              >
                Agora
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100 space-y-1 text-xs">
            <div className="flex justify-between text-stone-500">
              <span>Compensada p/:</span>
              <span className="font-mono text-stone-900 font-bold">{result.calculatedEndTime}</span>
            </div>

            {!marks.actualEndTime ? (
              <div className="flex items-center gap-1 text-[11px] text-amber-800/90 bg-amber-50/80 px-2 py-1 rounded-lg">
                <Bell className="w-3 h-3 text-amber-600 shrink-0" />
                <span>Alerta {advanceMins}m às: {result.alarms.find(a => a.id === 'finalExit')?.alarmTriggerTime}</span>
              </div>
            ) : (
              <div className="flex justify-between text-stone-500">
                <span>Total trabalhado:</span>
                <span className="font-mono text-stone-800 font-bold">
                  {Math.floor(result.totalMinutesWorked / 60)}h{' '}
                  {String(result.totalMinutesWorked % 60).padStart(2, '0')}m
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
