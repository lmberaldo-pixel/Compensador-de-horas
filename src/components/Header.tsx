import { useState, useEffect } from 'react';
import { Clock, Bell, BellOff, History, Settings, Volume2 } from 'lucide-react';
import { WorkConfig } from '../types';
import { playBeepBeep } from '../utils/audioAlarm';
import { formatHoursAndMinutes } from '../utils/timeCalculations';

interface HeaderProps {
  config: WorkConfig;
  timeBankMinutes?: number;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onToggleSound: () => void;
  onToggleAlarms?: () => void;
}

export default function Header({
  config,
  timeBankMinutes = 0,
  onOpenSettings,
  onOpenHistory,
  onToggleSound,
  onToggleAlarms,
}: HeaderProps) {
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  const [testedSound, setTestedSound] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDateStr(
        now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTestSound = () => {
    playBeepBeep(0.85, true);
    setTestedSound(true);
    setTimeout(() => setTestedSound(false), 1800);
  };

  const isAlarmSystemActive = config.alarmsEnabled !== false;

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand and live status */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center font-semibold shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-stone-900">
                  Compensador de Horas
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Auto-cálculo
                </span>
              </div>
              <p className="text-xs text-stone-500 capitalize">{currentDateStr || 'Hoje'}</p>
            </div>
          </div>

          {/* Clock pill for mobile */}
          <div className="sm:hidden text-right font-mono font-bold text-stone-900 bg-stone-100 px-2.5 py-1 rounded-lg text-sm border border-stone-200">
            {currentTimeStr}
          </div>
        </div>

        {/* Live Clock & Action Tools */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {/* Desktop live clock */}
          <div className="hidden sm:flex items-center gap-2 bg-stone-100 border border-stone-200/80 px-3 py-1.5 rounded-lg text-stone-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-stone-500">Hora atual:</span>
            <span className="font-mono font-bold text-sm tracking-wide text-stone-900">
              {currentTimeStr}
            </span>
          </div>

          {/* Test Sound Button */}
          <button
            id="test-sound-btn"
            type="button"
            onClick={handleTestSound}
            title="Testar alarme sonoro (Bip Bip)"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              testedSound
                ? 'bg-amber-100 text-amber-900 border-amber-300 scale-105 shadow-2xs'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Volume2 className={`w-3.5 h-3.5 ${testedSound ? 'text-amber-700 animate-bounce' : 'text-stone-500'}`} />
            <span>{testedSound ? 'Bip Bip!' : 'Testar Bip Bip'}</span>
          </button>

          {/* Alarms Master Toggle */}
          {onToggleAlarms && (
            <button
              id="toggle-alarms-header-btn"
              type="button"
              onClick={onToggleAlarms}
              title={
                isAlarmSystemActive
                  ? 'Alarmes ativos no momento (clique para desativar)'
                  : 'Alarmes desativados (clique para ativar)'
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isAlarmSystemActive
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-stone-100 hover:text-stone-800'
                  : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300'
              }`}
            >
              {isAlarmSystemActive ? (
                <>
                  <Bell className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden lg:inline">Alarme:</span>
                  <span>Ativo</span>
                </>
              ) : (
                <>
                  <BellOff className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden lg:inline">Alarme:</span>
                  <span className="font-bold">Desativado</span>
                </>
              )}
            </button>
          )}

          {/* Sound Toggle */}
          <button
            id="toggle-sound-btn"
            type="button"
            onClick={onToggleSound}
            title={config.soundEnabled ? 'Silenciar som do alarme' : 'Ativar som do alarme (Bip Bip)'}
            className={`p-2 rounded-lg text-xs font-medium border transition-colors ${
              config.soundEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-stone-100 text-stone-400 border-stone-200 hover:bg-stone-200'
            }`}
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* History & Bank of Hours */}
          <button
            id="open-history-btn"
            type="button"
            onClick={onOpenHistory}
            title="Banco de Horas: clique para ver histórico, editar e acrescentar horas manualmente"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 transition-colors shadow-2xs"
          >
            <History className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden md:inline">Banco:</span>
            <span
              className={`font-mono font-bold ${
                timeBankMinutes > 0
                  ? 'text-emerald-700'
                  : timeBankMinutes < 0
                  ? 'text-rose-700'
                  : 'text-stone-700'
              }`}
            >
              {formatHoursAndMinutes(timeBankMinutes)}
            </span>
          </button>

          {/* Settings */}
          <button
            id="open-settings-btn"
            type="button"
            onClick={onOpenSettings}
            title="Configurar jornada e horários padrão"
            className="p-2 rounded-lg text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
