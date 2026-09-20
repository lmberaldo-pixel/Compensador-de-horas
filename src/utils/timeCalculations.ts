import { WorkConfig, DayMarks, CompensationResult } from '../types';

/**
 * Converts "HH:MM" string to minutes from midnight (0 - 1439).
 * Returns NaN if string is invalid.
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return NaN;
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return NaN;
  return h * 60 + m;
}

/**
 * Converts minutes from midnight to "HH:MM" string.
 * Handles overflow to next day if necessary.
 */
export function minutesToTime(totalMinutes: number): string {
  if (isNaN(totalMinutes)) return '--:--';
  // Normalize to positive minutes in a 24-hour cycle
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Formats a duration in minutes into a readable string (e.g. "+15 min", "-5 min", "8h 00m")
 */
export function formatMinutesDiff(diffMinutes: number, showSign = true): string {
  if (isNaN(diffMinutes) || diffMinutes === 0) return '0 min';
  const sign = diffMinutes > 0 ? '+' : '-';
  const abs = Math.abs(diffMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;

  if (h > 0) {
    const formatted = `${h}h ${String(m).padStart(2, '0')}m`;
    return showSign ? `${sign}${formatted}` : formatted;
  }
  return showSign ? `${sign}${m} min` : `${m} min`;
}

/**
 * Formats a duration in minutes into a readable time bank string (e.g. "+ 02h 30m", "- 01h 15m", "00h 00m")
 */
export function formatHoursAndMinutes(diffMinutes: number): string {
  if (isNaN(diffMinutes) || diffMinutes === 0) return '00h 00m';
  const sign = diffMinutes > 0 ? '+' : '-';
  const abs = Math.abs(diffMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign} ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

/**
 * Returns current local time as "HH:MM"
 */
export function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Computes the full compensation logic, delays, predicted end time, and upcoming alarms.
 */
export function calculateCompensation(
  marks: DayMarks,
  config: WorkConfig,
  currentMinutesNow: number = timeToMinutes(getCurrentTime())
): CompensationResult {
  const requiredWorkMinutes = config.workHours * 60 + config.workMinutes;
  const stdStartMins = timeToMinutes(config.standardStartTime);
  const stdLunchMins = config.standardLunchMinutes;

  const startMins = timeToMinutes(marks.startTime);
  const lunchStartMins = timeToMinutes(marks.lunchStartTime);
  const lunchEndMins = timeToMinutes(marks.lunchEndTime);
  const actualEndMins = timeToMinutes(marks.actualEndTime);

  // 1. Effective start time and entry delay calculation
  // Hours worked before standardStartTime are ignored (never counted towards time bank or early exit).
  let entryDelayMinutes = 0;
  let effectiveStartMins = NaN;

  if (!isNaN(startMins) && !isNaN(stdStartMins)) {
    entryDelayMinutes = Math.max(0, startMins - stdStartMins);
    effectiveStartMins = Math.max(startMins, stdStartMins);
  } else if (!isNaN(startMins)) {
    effectiveStartMins = startMins;
  }

  // 2. Lunch calculation
  let lunchDurationMinutes = 0;
  let lunchDelayMinutes = 0;
  if (!isNaN(lunchStartMins) && !isNaN(lunchEndMins)) {
    lunchDurationMinutes = Math.max(0, lunchEndMins - lunchStartMins);
    lunchDelayMinutes = lunchDurationMinutes - stdLunchMins;
  }

  // 3. Morning work (starting from effectiveStartMins)
  let morningMinutesWorked = 0;
  if (!isNaN(effectiveStartMins)) {
    if (!isNaN(lunchStartMins)) {
      morningMinutesWorked = Math.max(0, lunchStartMins - effectiveStartMins);
    } else {
      // Still in morning shift
      if (!isNaN(currentMinutesNow) && currentMinutesNow > effectiveStartMins) {
        morningMinutesWorked = Math.max(0, currentMinutesNow - effectiveStartMins);
      }
    }
  }

  // 4. End time calculation
  let calculatedEndMins = NaN;
  let isEstimated = false;

  const stdEndMins = timeToMinutes(config.standardEndTime);
  const effectiveStdEndMins = !isNaN(stdEndMins)
    ? stdEndMins
    : (!isNaN(stdStartMins) ? stdStartMins + stdLunchMins + requiredWorkMinutes : 17 * 60);

  if (!isNaN(effectiveStartMins)) {
    if (!isNaN(lunchStartMins) && !isNaN(lunchEndMins)) {
      // User entered real return from lunch!
      const morningShift = Math.max(0, lunchStartMins - effectiveStartMins);
      const remainingWork = Math.max(0, requiredWorkMinutes - morningShift);
      calculatedEndMins = lunchEndMins + remainingWork;
    } else if (!isNaN(lunchStartMins)) {
      // User is on lunch, but hasn't returned yet.
      // Assume standard lunch duration from lunch departure:
      const morningShift = Math.max(0, lunchStartMins - effectiveStartMins);
      const remainingWork = Math.max(0, requiredWorkMinutes - morningShift);
      const estimatedLunchReturn = lunchStartMins + stdLunchMins;
      calculatedEndMins = estimatedLunchReturn + remainingWork;
      isEstimated = true;
    } else {
      // User hasn't started lunch yet.
      // Expected end = effectiveStart + standard lunch + total work
      calculatedEndMins = effectiveStartMins + stdLunchMins + requiredWorkMinutes;
      isEstimated = true;
    }
  } else {
    // If start is not yet punched, use standard contract schedule
    calculatedEndMins = effectiveStdEndMins;
    isEstimated = true;
  }

  // 5. Total delay compensation in minutes
  const standardContractEndMins = effectiveStdEndMins;

  const totalExtraCompensationMinutes = !isNaN(calculatedEndMins)
    ? calculatedEndMins - standardContractEndMins
    : 0;

  // 6. Afternoon and total worked minutes
  let afternoonMinutesWorked = 0;
  if (!isNaN(lunchEndMins)) {
    if (!isNaN(actualEndMins)) {
      afternoonMinutesWorked = Math.max(0, actualEndMins - lunchEndMins);
    } else if (!isNaN(currentMinutesNow) && currentMinutesNow > lunchEndMins) {
      afternoonMinutesWorked = Math.max(0, currentMinutesNow - lunchEndMins);
    }
  }

  const totalMinutesWorked = !isNaN(actualEndMins) && !isNaN(effectiveStartMins) && !isNaN(lunchStartMins) && !isNaN(lunchEndMins)
    ? (lunchStartMins - effectiveStartMins) + (actualEndMins - lunchEndMins)
    : morningMinutesWorked + afternoonMinutesWorked;

  const remainingMinutesToWork = Math.max(0, requiredWorkMinutes - totalMinutesWorked);
  const progressPercent = Math.min(100, Math.round((totalMinutesWorked / requiredWorkMinutes) * 100));

  // 7. Status text and code
  let statusCode: CompensationResult['statusCode'] = 'pending_entry';
  let statusText = 'Aguardando marcação de entrada';

  if (isNaN(startMins)) {
    statusCode = 'pending_entry';
    statusText = 'Aguardando marcação de entrada';
  } else if (isNaN(lunchStartMins)) {
    statusCode = 'morning_work';
    statusText = 'Em jornada de trabalho (1º Turno)';
  } else if (isNaN(lunchEndMins)) {
    statusCode = 'in_lunch';
    statusText = 'Em horário de almoço / intervalo';
  } else if (isNaN(actualEndMins)) {
    if (totalMinutesWorked >= requiredWorkMinutes) {
      statusCode = 'overtime';
      statusText = 'Jornada diária cumprida! Pronto para encerrar.';
    } else {
      statusCode = 'afternoon_work';
      statusText = 'Em jornada de trabalho (2º Turno)';
    }
  } else {
    statusCode = 'completed';
    statusText = 'Expediente encerrado';
  }

  // 8. Alarms for each milestone (advance minutes prior to scheduled mark)
  const advance = config.alarmAdvanceMinutes || 2;
  const masterAlarmsEnabled = config.alarmsEnabled !== false;
  const disabledList = config.disabledMilestones || [];
  const alarms: CompensationResult['alarms'] = [];

  const isMilestoneEnabled = (id: 'entry' | 'lunchStart' | 'lunchEnd' | 'finalExit') => {
    return masterAlarmsEnabled && !disabledList.includes(id);
  };

  // Milestone 1: Entrada
  const entryTargetMins = !isNaN(startMins) ? startMins : stdStartMins;
  alarms.push({
    id: 'entry',
    title: 'Entrada no Trabalho',
    scheduledTargetTime: minutesToTime(entryTargetMins),
    alarmTriggerTime: minutesToTime(entryTargetMins - advance),
    status: !isNaN(startMins) ? 'passed' : currentMinutesNow >= entryTargetMins ? 'passed' : 'upcoming',
    enabled: isMilestoneEnabled('entry'),
  });

  // Milestone 2: Saída para Almoço
  let lunchStartTargetMins = stdStartMins + (4 * 60); // default 4 hours after start
  if (!isNaN(startMins)) {
    lunchStartTargetMins = startMins + (4 * 60);
  }
  alarms.push({
    id: 'lunchStart',
    title: 'Saída para Almoço',
    scheduledTargetTime: !isNaN(lunchStartMins) ? marks.lunchStartTime : minutesToTime(lunchStartTargetMins),
    alarmTriggerTime: minutesToTime((!isNaN(lunchStartMins) ? lunchStartMins : lunchStartTargetMins) - advance),
    status: !isNaN(lunchStartMins) ? 'passed' : currentMinutesNow >= lunchStartTargetMins ? 'passed' : 'upcoming',
    enabled: isMilestoneEnabled('lunchStart'),
  });

  // Milestone 3: Retorno do Almoço
  let lunchEndExpectedMins = NaN;
  if (!isNaN(lunchStartMins)) {
    lunchEndExpectedMins = lunchStartMins + stdLunchMins;
  }
  alarms.push({
    id: 'lunchEnd',
    title: 'Retorno do Almoço',
    scheduledTargetTime: !isNaN(lunchEndMins)
      ? marks.lunchEndTime
      : !isNaN(lunchEndExpectedMins)
        ? minutesToTime(lunchEndExpectedMins)
        : '--:--',
    alarmTriggerTime: !isNaN(lunchEndExpectedMins) ? minutesToTime(lunchEndExpectedMins - advance) : '--:--',
    status: !isNaN(lunchEndMins)
      ? 'passed'
      : isNaN(lunchEndExpectedMins)
        ? 'upcoming'
        : currentMinutesNow >= lunchEndExpectedMins
          ? 'passed'
          : 'upcoming',
    enabled: isMilestoneEnabled('lunchEnd'),
  });

  // Milestone 4: Saída Final Compensada
  alarms.push({
    id: 'finalExit',
    title: 'Saída Final (Compensada)',
    scheduledTargetTime: minutesToTime(calculatedEndMins),
    alarmTriggerTime: minutesToTime(calculatedEndMins - advance),
    status: !isNaN(actualEndMins)
      ? 'passed'
      : currentMinutesNow >= calculatedEndMins
        ? 'passed'
        : 'upcoming',
    enabled: isMilestoneEnabled('finalExit'),
  });

  return {
    entryDelayMinutes,
    lunchDurationMinutes,
    lunchDelayMinutes,
    totalExtraCompensationMinutes,
    standardContractEndTime: minutesToTime(standardContractEndMins),
    calculatedEndTime: minutesToTime(calculatedEndMins),
    isEstimated,
    morningMinutesWorked,
    afternoonMinutesWorked,
    totalMinutesWorked,
    remainingMinutesToWork,
    progressPercent,
    statusText,
    statusCode,
    alarms
  };
}
