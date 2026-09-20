import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { WorkConfig, DayMarks, HistoryRecord, CompensationResult } from './types';
import {
  calculateCompensation,
  getCurrentTime,
  timeToMinutes,
  formatHoursAndMinutes,
} from './utils/timeCalculations';
import {
  startAlarmLoop,
  stopAlarmLoop,
  sendDesktopNotification,
  requestNotificationPermission,
} from './utils/audioAlarm';
import {
  registerServiceWorker,
  syncUpcomingAlarmsWithSW,
} from './utils/backgroundAlarmManager';

import Header from './components/Header';
import CurrentStatusCard from './components/CurrentStatusCard';
import TimeEntryInputs from './components/TimeEntryInputs';
import AlarmBanner, { ActiveAlarmState } from './components/AlarmBanner';
import SettingsModal from './components/SettingsModal';
import HistoryModal from './components/HistoryModal';

const DEFAULT_CONFIG: WorkConfig = {
  workHours: 8,
  workMinutes: 0,
  standardLunchMinutes: 60,
  standardStartTime: '08:00',
  standardLunchStart: '12:00',
  standardLunchEnd: '13:00',
  standardEndTime: '17:00',
  alarmAdvanceMinutes: 2,
  alarmsEnabled: true,
  disabledMilestones: [],
  soundEnabled: true,
  notificationsEnabled: true,
};

const DEFAULT_MARKS: DayMarks = {
  startTime: '08:15', // Seeded with an informative realistic delay to demonstrate compensation immediately!
  lunchStartTime: '12:00',
  lunchEndTime: '13:20',
  actualEndTime: '',
};

export default function App() {
  // 1. Config state
  const [config, setConfig] = useState<WorkConfig>(() => {
    const saved = localStorage.getItem('compensador_config');
    if (saved) {
      try {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse saved config', e);
      }
    }
    return DEFAULT_CONFIG;
  });

  // 2. Day Marks state
  const [marks, setMarks] = useState<DayMarks>(() => {
    const saved = localStorage.getItem('compensador_marks_today');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved marks', e);
      }
    }
    return DEFAULT_MARKS;
  });

  // 3. History state
  const [history, setHistory] = useState<HistoryRecord[]>(() => {
    const saved = localStorage.getItem('compensador_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
    return [];
  });

  // Modals & UI States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyInitialAdd, setHistoryInitialAdd] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarmState | null>(null);
  const [firedAlarms, setFiredAlarms] = useState<Record<string, string>>({}); // alarmKey -> timeTriggered

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Live time ticker in minutes from midnight
  const [currentMinutesNow, setCurrentMinutesNow] = useState<number>(() =>
    timeToMinutes(getCurrentTime())
  );
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() => getCurrentTime());

  // Save config changes
  useEffect(() => {
    localStorage.setItem('compensador_config', JSON.stringify(config));
  }, [config]);

  // Save marks changes
  useEffect(() => {
    localStorage.setItem('compensador_marks_today', JSON.stringify(marks));
  }, [marks]);

  // Save history changes
  useEffect(() => {
    localStorage.setItem('compensador_history', JSON.stringify(history));
  }, [history]);

  // Live clock ticker every 1 second
  useEffect(() => {
    const interval = setInterval(() => {
      const time = getCurrentTime();
      setCurrentTimeStr(time);
      setCurrentMinutesNow(timeToMinutes(time));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Register Service Worker on startup and listen to SW messages
  useEffect(() => {
    registerServiceWorker();

    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'NOTIFICATION_PUNCH_CLICKED') {
          showToast('Notificação recebida! Verifique suas marcações.');
        }
      };
      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
    }
  }, []);

  // Compute compensation result
  const result: CompensationResult = useMemo(() => {
    return calculateCompensation(marks, config, currentMinutesNow);
  }, [marks, config, currentMinutesNow]);

  // Sync alarms with Service Worker whenever calculated alarms or config changes
  useEffect(() => {
    if (config.alarmsEnabled !== false && config.notificationsEnabled) {
      syncUpcomingAlarmsWithSW(result.alarms, config.alarmAdvanceMinutes || 2);
    }
  }, [result.alarms, config.alarmsEnabled, config.notificationsEnabled, config.alarmAdvanceMinutes]);


  // Determine next upcoming 2-minute alarm
  const nextAlarmInfo = useMemo(() => {
    const upcoming = result.alarms.find((a) => a.status === 'upcoming');
    if (!upcoming || upcoming.alarmTriggerTime === '--:--') return null;

    const alarmMins = timeToMinutes(upcoming.alarmTriggerTime);
    const diffMins = alarmMins - currentMinutesNow;

    let countdownStr = '';
    if (diffMins > 0) {
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      countdownStr = h > 0 ? `em ${h}h ${m}m` : `em ${m} min`;
    } else if (diffMins === 0) {
      countdownStr = 'Agora!';
    } else {
      countdownStr = 'Passou';
    }

    return {
      title: upcoming.title,
      targetTime: upcoming.scheduledTargetTime,
      alarmTime: upcoming.alarmTriggerTime,
      countdownStr,
    };
  }, [result.alarms, currentMinutesNow]);

  // Automatically sum all history items (daily workdays + manual additions)
  const totalTimeBankMinutes = useMemo(() => {
    return history.reduce((acc, item) => acc + (item.balanceMinutes || 0), 0);
  }, [history]);

  // Alarm monitoring routine: checks if current time matches any alarm trigger
  useEffect(() => {
    if (config.alarmsEnabled === false) return;
    if (!config.soundEnabled && !config.notificationsEnabled) return;

    result.alarms.forEach((alarm) => {
      if (alarm.enabled === false) return;
      if (!alarm.alarmTriggerTime || alarm.alarmTriggerTime === '--:--') return;

      const triggerKey = `${alarm.id}_${alarm.alarmTriggerTime}`;
      // Check if current minute exactly equals the alarm trigger time
      if (currentTimeStr === alarm.alarmTriggerTime) {
        if (!firedAlarms[triggerKey]) {
          // Record as fired to prevent multi-triggering within the same minute
          setFiredAlarms((prev) => ({ ...prev, [triggerKey]: currentTimeStr }));

          const advanceMins = config.alarmAdvanceMinutes || 2;
          const alarmPayload: ActiveAlarmState = {
            id: alarm.id,
            title: alarm.title,
            targetTime: alarm.scheduledTargetTime,
            alarmTime: alarm.alarmTriggerTime,
            message: `Faltam ${advanceMins} minuto${advanceMins > 1 ? 's' : ''} para sua marcação de ${alarm.title} às ${alarm.scheduledTargetTime}!`,
          };

          setActiveAlarm(alarmPayload);

          if (config.soundEnabled) {
            startAlarmLoop(getSavedVolume());
          }

          if (config.notificationsEnabled) {
            sendDesktopNotification(
              `🔔 Alarme: ${alarm.title}`,
              `Faltam ${advanceMins} minuto${advanceMins > 1 ? 's' : ''} para bater o ponto às ${alarm.scheduledTargetTime}.`
            );
          }
        }
      }
    });
  }, [currentTimeStr, result.alarms, config, firedAlarms]);

  // Handlers
  const handleMarkChange = (field: keyof DayMarks, value: string) => {
    setMarks((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearMarks = () => {
    setMarks({
      startTime: '',
      lunchStartTime: '',
      lunchEndTime: '',
      actualEndTime: '',
    });
    showToast('Marcações do dia limpas com sucesso.');
  };

  const handleChangeAdvanceMinutes = (mins: number) => {
    setConfig((prev) => ({ ...prev, alarmAdvanceMinutes: mins }));
    showToast(`Alarme configurado para ${mins} min antes de cada marcação.`);
  };

  const handleTriggerManualAlarm = (alarmId: string, title: string, targetTime: string) => {
    const advanceMins = config.alarmAdvanceMinutes || 2;
    const payload: ActiveAlarmState = {
      id: alarmId,
      title,
      targetTime,
      alarmTime: getCurrentTime(),
      message: `Teste de alarme para ${title} (alerta ${advanceMins} min antes)!`,
    };
    setActiveAlarm(payload);
    if (config.soundEnabled) {
      startAlarmLoop(getSavedVolume());
    }
  };

  const handleDismissAlarm = () => {
    stopAlarmLoop();
    setActiveAlarm(null);
  };

  const handleSnoozeAlarm = () => {
    stopAlarmLoop();
    setActiveAlarm(null);
    const snoozeMinutes = config.alarmAdvanceMinutes || 2;
    // Snooze for N minutes
    setTimeout(() => {
      if (config.soundEnabled) {
        startAlarmLoop(getSavedVolume());
      }
      setActiveAlarm({
        id: 'snooze',
        title: 'Lembrete Adiado',
        targetTime: getCurrentTime(),
        alarmTime: getCurrentTime(),
        message: `Aviso adiado: ${snoozeMinutes} minuto${snoozeMinutes > 1 ? 's' : ''} se passaram!`,
      });
    }, snoozeMinutes * 60 * 1000);
  };

  const handlePunchMilestone = (milestoneId: string) => {
    const nowTime = getCurrentTime();
    if (milestoneId === 'entry') {
      handleMarkChange('startTime', nowTime);
    } else if (milestoneId === 'lunchStart') {
      handleMarkChange('lunchStartTime', nowTime);
    } else if (milestoneId === 'lunchEnd') {
      handleMarkChange('lunchEndTime', nowTime);
    } else if (milestoneId === 'finalExit') {
      handleMarkChange('actualEndTime', nowTime);
    }
  };

  const handleSaveCurrentDay = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const balance = result.dailyBalanceMinutes;

    const newRecord: HistoryRecord = {
      id: `record_${Date.now()}`,
      date: todayStr,
      type: 'workday',
      startTime: marks.startTime,
      lunchStartTime: marks.lunchStartTime,
      lunchEndTime: marks.lunchEndTime,
      actualEndTime: marks.actualEndTime,
      calculatedEndTime: result.calculatedEndTime,
      totalDelayMinutes: result.totalExtraCompensationMinutes,
      balanceMinutes: balance,
      notes:
        balance > 0
          ? `Saldo positivo (+${balance} min)`
          : balance < 0
          ? `Saldo devedor (${balance} min)`
          : marks.actualEndTime && result.totalMinutesWorked > (config.workHours * 60 + config.workMinutes)
          ? `Tolerância de 5 min na saída (0 min para o banco)`
          : 'Jornada cumprida exatamente',
    };

    setHistory((prev) => [newRecord, ...prev]);
    showToast('Marcação de hoje salva no histórico com sucesso!');
  };

  const handleAddManualRecord = (record: Omit<HistoryRecord, 'id'>) => {
    const newRecord: HistoryRecord = {
      ...record,
      id: `manual_${Date.now()}`,
    };
    setHistory((prev) => [newRecord, ...prev]);
    showToast('Lançamento manual adicionado e somado ao banco de horas!');
  };

  const handleUpdateRecord = (id: string, updated: Partial<HistoryRecord>) => {
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updated } : item))
    );
    showToast('Registro atualizado e banco de horas recalculado!');
  };

  const handleDeleteRecord = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    showToast('Registro removido do banco de horas.');
  };

  const handleClearHistory = () => {
    setHistory([]);
    showToast('Histórico do banco de horas apagado.');
  };

  const handleToggleSound = () => {
    setConfig((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  const handleChangeVolume = (v: number) => {
    // Volume is persisted in localStorage by Header; expose for alarm usage
    localStorage.setItem('compensador_volume', String(v));
  };

  const getSavedVolume = () => {
    const saved = localStorage.getItem('compensador_volume');
    return saved ? parseFloat(saved) : 0.85;
  };

  const handleToggleMasterAlarms = () => {
    setConfig((prev) => {
      const next = !(prev.alarmsEnabled !== false);
      if (!next) {
        stopAlarmLoop();
        setActiveAlarm(null);
      }
      showToast(next ? 'Sistema de alarmes ativado.' : 'Sistema de alarmes desativado.');
      return { ...prev, alarmsEnabled: next };
    });
  };

  const handleToggleMilestoneAlarm = (milestoneId: string) => {
    setConfig((prev) => {
      const currentDisabled = prev.disabledMilestones || [];
      const isCurrentlyDisabled = currentDisabled.includes(milestoneId);
      const updated = isCurrentlyDisabled
        ? currentDisabled.filter((id) => id !== milestoneId)
        : [...currentDisabled, milestoneId];

      showToast(
        isCurrentlyDisabled
          ? 'Alarme desta etapa ativado.'
          : 'Alarme desta etapa desativado.'
      );
      return { ...prev, disabledMilestones: updated };
    });
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-800 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Header */}
      <Header
        config={config}
        timeBankMinutes={totalTimeBankMinutes}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onToggleSound={handleToggleSound}
        onChangeVolume={handleChangeVolume}
        onToggleAlarms={handleToggleMasterAlarms}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Active Alarm Banner */}
        <AlarmBanner
          activeAlarm={activeAlarm}
          advanceMinutes={config.alarmAdvanceMinutes || 2}
          onDismiss={handleDismissAlarm}
          onSnooze={handleSnoozeAlarm}
          onPunchCurrent={handlePunchMilestone}
          onDeactivateAllAlarms={handleToggleMasterAlarms}
        />

        {/* Primary Calculated Outcome Card with Integrated Bento Bank */}
        <CurrentStatusCard
          result={result}
          config={config}
          nextAlarmInfo={nextAlarmInfo}
          timeBankMinutes={totalTimeBankMinutes}
          historyCount={history.length}
          onOpenHistory={() => {
            setHistoryInitialAdd(false);
            setIsHistoryOpen(true);
          }}
          onOpenAddHours={() => {
            setHistoryInitialAdd(true);
            setIsHistoryOpen(true);
          }}
          onToggleAlarms={handleToggleMasterAlarms}
        />

        {/* 4 Interactive Mark Inputs */}
        <TimeEntryInputs
          marks={marks}
          config={config}
          result={result}
          onChangeMark={handleMarkChange}
          onClearMarks={handleClearMarks}
          onSaveCurrentDay={handleSaveCurrentDay}
        />
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-stone-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border border-stone-800 animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-5 text-center text-xs text-stone-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Compensador de Horas &bull; Cálculo em tempo real com compensação automática</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="text-stone-600 hover:text-stone-900 underline underline-offset-2"
            >
              Ajustar Jornada
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="text-stone-600 hover:text-stone-900 underline underline-offset-2"
            >
              Banco de Horas
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={setConfig}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        currentMarks={marks}
        currentResult={result}
        onSaveCurrentDay={handleSaveCurrentDay}
        onAddManualRecord={handleAddManualRecord}
        onUpdateRecord={handleUpdateRecord}
        onDeleteRecord={handleDeleteRecord}
        onClearHistory={handleClearHistory}
        initialShowAddForm={historyInitialAdd}
      />
    </div>
  );
}
