import {
  AlertCircle,
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  Hourglass,
  Plus,
  History,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { CompensationResult, WorkConfig } from '../types';
import { formatHoursAndMinutes, formatMinutesDiff } from '../utils/timeCalculations';

interface CurrentStatusCardProps {
  result: CompensationResult;
  config: WorkConfig;
  nextAlarmInfo: {
    title: string;
    targetTime: string;
    alarmTime: string;
    countdownStr: string;
  } | null;
  timeBankMinutes?: number;
  historyCount?: number;
  onOpenHistory?: () => void;
  onOpenAddHours?: () => void;
  onToggleAlarms?: () => void;
}

export default function CurrentStatusCard({
  result,
  config,
  nextAlarmInfo,
  timeBankMinutes = 0,
  historyCount = 0,
  onOpenHistory,
  onOpenAddHours,
  onToggleAlarms,
}: CurrentStatusCardProps) {
  const hasExtraCompensation = result.totalExtraCompensationMinutes > 0;
  const isCompleted = result.statusCode === 'completed' || result.statusCode === 'overtime';
  const alarmsEnabled = config.alarmsEnabled !== false;

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] p-6 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Big Calculated End Time & Progress */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-stone-900 text-stone-100">
                  Horário de Encerramento
                </span>
                {result.isEstimated ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    <Hourglass className="w-3 h-3 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
                    Previsão em tempo real
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Saída calculada e fixada
                  </span>
                )}
              </div>
            </div>

            {/* Display time */}
            <div className="flex items-baseline gap-4 mt-2">
              <span
                id="calculated-end-time-display"
                className="text-5xl sm:text-6xl font-extrabold tracking-tight font-mono text-stone-900 select-all"
              >
                {result.calculatedEndTime}
              </span>

              {result.standardContractEndTime && (
                <div className="text-xs">
                  <div className="text-stone-400 font-medium">Contratual padrão:</div>
                  <div className="font-mono text-stone-500 font-semibold text-base line-through">
                    {result.standardContractEndTime}
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic Status Pill */}
            <div className="mt-3">
              {hasExtraCompensation ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Compensando atrasos acumulados:{' '}
                    <strong className="font-bold text-amber-950 font-mono">
                      {formatMinutesDiff(result.totalExtraCompensationMinutes)}
                    </strong>{' '}
                    acrescentados ao horário de saída.
                  </span>
                </div>
              ) : result.totalExtraCompensationMinutes < 0 ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-900 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Adiantado:{' '}
                    <strong className="font-bold text-emerald-950 font-mono">
                      {formatMinutesDiff(result.totalExtraCompensationMinutes)}
                    </strong>{' '}
                    (liberação antecipada sem prejuízo da jornada).
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-medium border border-stone-200/60">
                  <CheckCircle2 className="w-4 h-4 text-stone-500" />
                  <span>Jornada em perfeito alinhamento com o contrato de {config.workHours}h.</span>
                </div>
              )}
            </div>
          </div>

          {/* Integrated Real-time Progress Bar */}
          <div className="pt-3 border-t border-stone-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-800">Progresso Trabalhado:</span>
                <span className="font-mono text-stone-600 font-semibold">
                  {Math.floor(result.totalMinutesWorked / 60)}h{' '}
                  {String(result.totalMinutesWorked % 60).padStart(2, '0')}m de{' '}
                  {config.workHours}h {String(config.workMinutes).padStart(2, '0')}m
                </span>
              </div>

              <div className="font-medium text-stone-600">
                {isCompleted ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% Concluído
                  </span>
                ) : (
                  <span>
                    Restam:{' '}
                    <strong className="font-mono text-stone-900 font-bold">
                      {Math.floor(result.remainingMinutesToWork / 60)}h{' '}
                      {String(result.remainingMinutesToWork % 60).padStart(2, '0')}m
                    </strong>
                  </span>
                )}
              </div>
            </div>

            <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isCompleted
                    ? 'bg-emerald-500'
                    : hasExtraCompensation
                    ? 'bg-amber-500'
                    : 'bg-stone-800'
                }`}
                style={{ width: `${result.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Integrated Bento Grid (Banco de Horas + Checkpoints) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3 pt-4 lg:pt-0 lg:border-l lg:border-stone-100 lg:pl-6">
          {/* Bento Tile 1: Banco de Horas Acumulado */}
          <div className="bg-stone-50/80 rounded-xl p-4 border border-stone-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-stone-700" />
                <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                  Banco de Horas
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                Soma Automática
              </span>
            </div>

            <div className="flex items-baseline justify-between my-1">
              <div>
                <span
                  className={`font-mono text-3xl font-black ${
                    timeBankMinutes > 0
                      ? 'text-emerald-700'
                      : timeBankMinutes < 0
                      ? 'text-rose-700'
                      : 'text-stone-800'
                  }`}
                >
                  {formatHoursAndMinutes(timeBankMinutes)}
                </span>
                <span className="text-[11px] text-stone-500 block mt-0.5">
                  Saldo líquido ({historyCount} {historyCount === 1 ? 'registro' : 'registros'})
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5">
                {onOpenAddHours && (
                  <button
                    id="bento-add-hours-btn"
                    type="button"
                    onClick={onOpenAddHours}
                    title="Adicionar crédito ou débito manual no banco"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Acrescentar</span>
                  </button>
                )}
                {onOpenHistory && (
                  <button
                    id="bento-history-btn"
                    type="button"
                    onClick={onOpenHistory}
                    title="Ver extrato completo e editar lançamentos"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <span>Extrato</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bento Tile 2: Row of Checkpoint Diagnostics */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Atraso Entrada */}
            <div className="bg-stone-50/70 rounded-xl p-3 border border-stone-200/60 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider truncate">
                Entrada
              </span>
              <div className="mt-1">
                <span
                  className={`font-mono text-base font-bold block ${
                    result.entryDelayMinutes > 0
                      ? 'text-amber-700'
                      : result.entryDelayMinutes < 0
                      ? 'text-emerald-700'
                      : 'text-stone-700'
                  }`}
                >
                  {formatMinutesDiff(result.entryDelayMinutes)}
                </span>
                <span className="text-[9px] text-stone-400 block truncate">
                  Ref: {config.standardStartTime}
                </span>
              </div>
            </div>

            {/* Intervalo Almoço */}
            <div className="bg-stone-50/70 rounded-xl p-3 border border-stone-200/60 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider truncate">
                Almoço
              </span>
              <div className="mt-1">
                <span
                  className={`font-mono text-base font-bold block ${
                    result.lunchDelayMinutes > 0
                      ? 'text-amber-700'
                      : result.lunchDelayMinutes < 0
                      ? 'text-emerald-700'
                      : 'text-stone-700'
                  }`}
                >
                  {formatMinutesDiff(result.lunchDelayMinutes)}
                </span>
                <span className="text-[9px] text-stone-400 block truncate">
                  {result.lunchDurationMinutes ? `${result.lunchDurationMinutes}m feitos` : `${config.standardLunchMinutes}m ref`}
                </span>
              </div>
            </div>

            {/* Próximo Alarme */}
            <div
              className={`rounded-xl p-3 border flex flex-col justify-between transition-colors ${
                !alarmsEnabled
                  ? 'bg-stone-50/70 border-stone-200/60'
                  : 'bg-amber-50/80 border-amber-200/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider truncate flex items-center gap-1 ${
                    !alarmsEnabled ? 'text-stone-500' : 'text-amber-900'
                  }`}
                >
                  {!alarmsEnabled ? (
                    <BellOff className="w-2.5 h-2.5 text-rose-500" />
                  ) : (
                    <Bell className="w-2.5 h-2.5 text-amber-600" />
                  )}
                  Alarme
                </span>
              </div>

              <div className="mt-1">
                {!alarmsEnabled ? (
                  <div>
                    <span className="text-[11px] font-bold text-rose-600 block">Off</span>
                    {onToggleAlarms && (
                      <button
                        type="button"
                        onClick={onToggleAlarms}
                        className="text-[9px] text-amber-800 font-bold underline block"
                      >
                        Ativar
                      </button>
                    )}
                  </div>
                ) : nextAlarmInfo ? (
                  <div>
                    <span className="font-mono text-base font-bold text-amber-950 block">
                      {nextAlarmInfo.alarmTime}
                    </span>
                    <span className="text-[9px] text-amber-800 font-medium block truncate">
                      {nextAlarmInfo.countdownStr}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-bold text-emerald-700 block">Feito</span>
                    <span className="text-[9px] text-stone-400 block">Fim do dia</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
