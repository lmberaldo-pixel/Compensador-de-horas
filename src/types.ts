export interface WorkConfig {
  workHours: number; // e.g., 8
  workMinutes: number; // e.g., 0
  standardLunchMinutes: number; // e.g., 60
  standardStartTime: string; // e.g., "08:00"
  standardLunchStart: string; // e.g., "12:00"
  standardLunchEnd: string; // e.g., "13:00"
  standardEndTime: string; // e.g., "17:00"
  alarmAdvanceMinutes: number; // 2 minutes as requested
  alarmsEnabled: boolean; // Master switch to activate/deactivate alarms
  disabledMilestones?: string[]; // Specific milestone alarm IDs that are deactivated (e.g., 'entry', 'lunchStart')
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface DayMarks {
  startTime: string; // "08:15"
  lunchStartTime: string; // "12:00"
  lunchEndTime: string; // "13:20"
  actualEndTime: string; // "17:35" (if already punched)
}

export interface CalculatedAlarm {
  id: 'entry' | 'lunchStart' | 'lunchEnd' | 'finalExit' | string;
  title: string;
  scheduledTargetTime: string;
  alarmTriggerTime: string; // 2 min before scheduledTargetTime
  status: 'upcoming' | 'passed' | 'active';
  enabled: boolean;
}

export interface CompensationResult {
  // Delays and differences
  entryDelayMinutes: number; // positive = delayed entry, negative = arrived early
  lunchDurationMinutes: number; // actual time spent on lunch
  lunchDelayMinutes: number; // positive = exceeded lunch time, negative = shorter lunch
  totalExtraCompensationMinutes: number; // total extra minutes added to end of day

  // End time calculations
  standardContractEndTime: string; // "17:00"
  calculatedEndTime: string; // "17:35" (automatically calculated required end time)
  isEstimated: boolean; // true if based on projected lunch return

  // Status and progress
  morningMinutesWorked: number;
  afternoonMinutesWorked: number;
  totalMinutesWorked: number;
  remainingMinutesToWork: number;
  progressPercent: number;
  statusText: string;
  statusCode: 'pending_entry' | 'morning_work' | 'in_lunch' | 'afternoon_work' | 'completed' | 'overtime';
  dailyBalanceMinutes: number; // time bank balance for the day respecting the 5 min exit tolerance rule

  // Alarms
  alarms: CalculatedAlarm[];
}

export interface HistoryRecord {
  id: string;
  date: string; // "YYYY-MM-DD"
  type?: 'workday' | 'manual'; // 'workday' (from day punch marks) or 'manual' (manually added hours)
  startTime?: string;
  lunchStartTime?: string;
  lunchEndTime?: string;
  actualEndTime?: string;
  calculatedEndTime?: string;
  totalDelayMinutes?: number;
  balanceMinutes: number; // actual worked - required (positive for surplus/extra, negative for deficit/debt)
  notes?: string;
}
