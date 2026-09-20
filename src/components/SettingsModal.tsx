import { useState } from 'react';
import { Bell, BellOff, Check, Clock, Play, Save, Volume2, X } from 'lucide-react';
import { WorkConfig } from '../types';
import { playBeepBeep, requestNotificationPermission } from '../utils/audioAlarm';
import { timeToMinutes, minutesToTime } from '../utils/timeCalculations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WorkConfig;
  onSaveConfig: (newConfig: WorkConfig) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}: SettingsModalProps) {
  const [formData, setFormData] = useState<WorkConfig>(config);
  const [notificationStatus, setNotificationStatus] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'denied'
  );

  if (!isOpen) return null;

  const updateWorkConfigTimes = (newStart: string, newEnd: string, newLunch: number) => {
    const startM = timeToMinutes(newStart);
    const endM = timeToMinutes(newEnd);
    let h = formData.workHours;
    let m = formData.workMinutes;
    if (!isNaN(startM) && !isNaN(endM) && endM > startM + newLunch) {
      const totalWorkM = endM - startM - newLunch;
      h = Math.floor(totalWorkM / 60);
      m = totalWorkM % 60;
    }
    setFormData((prev) => ({
      ...prev,
      standardStartTime: newStart,
      standardEndTime: newEnd,
      standardLunchMinutes: newLunch,
      workHours: h,
      workMinutes: m,
    }));
  };

  const handleRequestNotification = async () => {
    const perm = await requestNotificationPermission();
    setNotificationStatus(perm);
    setFormData((prev) => ({
      ...prev,
      notificationsEnabled: perm === 'granted',
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-800">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-stone-900 text-base">
              Configurações de Jornada & Alarmes
            </h3>
          </div>
          <button
            id="close-settings-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">
          {/* Horários Padrão da Empresa */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                Horários Previstos de Contrato
              </label>
              <span className="text-xs font-mono font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md">
                Jornada: {formData.workHours}h {String(formData.workMinutes).padStart(2, '0')}m
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-stone-500 font-medium block mb-1">
                  Entrada Padrão
                </span>
                <input
                  type="time"
                  value={formData.standardStartTime}
                  onChange={(e) =>
                    updateWorkConfigTimes(
                      e.target.value,
                      formData.standardEndTime,
                      formData.standardLunchMinutes
                    )
                  }
                  className="w-full font-mono text-base font-semibold bg-white text-stone-900 px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <span className="text-[11px] text-stone-500 font-medium block mb-1">
                  Saída (Hora Final)
                </span>
                <input
                  type="time"
                  value={formData.standardEndTime}
                  onChange={(e) =>
                    updateWorkConfigTimes(
                      formData.standardStartTime,
                      e.target.value,
                      formData.standardLunchMinutes
                    )
                  }
                  className="w-full font-mono text-base font-semibold bg-white text-stone-900 px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <span className="text-[11px] text-stone-500 font-medium block mb-1">
                  Almoço (min)
                </span>
                <input
                  type="number"
                  min="15"
                  max="180"
                  step="5"
                  value={formData.standardLunchMinutes}
                  onChange={(e) =>
                    updateWorkConfigTimes(
                      formData.standardStartTime,
                      formData.standardEndTime,
                      parseInt(e.target.value, 10) || 60
                    )
                  }
                  className="w-full font-mono text-base font-semibold bg-white text-stone-900 px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>
          </div>

          {/* Configuração dos Alarmes */}
          <div className="pt-2 border-t border-stone-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-3">
              Configurações de Alarme & Alertas
            </label>

            <div className="space-y-3">
              {/* Ativar/Desativar Sistema Geral de Alarmes */}
              <div className="flex items-center justify-between bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 gap-3">
                <div className="flex-1">
                  <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    {formData.alarmsEnabled !== false ? (
                      <Bell className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <BellOff className="w-3.5 h-3.5 text-rose-500" />
                    )}
                    Sistema de Alarmes Automáticos
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Disparar alertas sonoros (bip bip) e visuais com antecedência
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold ${
                      formData.alarmsEnabled !== false ? 'text-emerald-700' : 'text-stone-400'
                    }`}
                  >
                    {formData.alarmsEnabled !== false ? 'Ativado' : 'Desativado'}
                  </span>
                  <input
                    id="alarms-enabled-checkbox"
                    type="checkbox"
                    checked={formData.alarmsEnabled !== false}
                    onChange={(e) =>
                      setFormData({ ...formData, alarmsEnabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-stone-900 focus:ring-stone-900 accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Antecedência do alarme */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-amber-600" />
                      Antecedência do Alarme
                    </div>
                    <div className="text-[11px] text-stone-500">
                      Tocar quantos minutos antes de cada marcação prevista
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                    {formData.alarmAdvanceMinutes} min antes
                  </span>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5, 10].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, alarmAdvanceMinutes: mins })
                      }
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${
                        formData.alarmAdvanceMinutes === mins
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Etapas com Alarme Ativo */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 space-y-2">
                <div className="text-xs font-bold text-stone-900 mb-1">
                  Etapas da Jornada com Alarme Ativado
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'entry', label: '1. Entrada no Trabalho' },
                    { id: 'lunchStart', label: '2. Saída para Almoço' },
                    { id: 'lunchEnd', label: '3. Retorno do Almoço' },
                    { id: 'finalExit', label: '4. Saída Final (Compensada)' },
                  ].map((milestone) => {
                    const isDisabled = (formData.disabledMilestones || []).includes(milestone.id);
                    const isMasterActive = formData.alarmsEnabled !== false;
                    return (
                      <label
                        key={milestone.id}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          !isDisabled && isMasterActive
                            ? 'bg-white border-amber-200/90 text-stone-800 shadow-2xs'
                            : 'bg-stone-100/60 border-stone-200 text-stone-400'
                        }`}
                      >
                        <span className="font-semibold text-[11px] truncate">{milestone.label}</span>
                        <input
                          type="checkbox"
                          checked={!isDisabled}
                          onChange={() => {
                            const currentDisabled = formData.disabledMilestones || [];
                            const updated = isDisabled
                              ? currentDisabled.filter((id) => id !== milestone.id)
                              : [...currentDisabled, milestone.id];
                            setFormData({ ...formData, disabledMilestones: updated });
                          }}
                          disabled={!isMasterActive}
                          className="w-3.5 h-3.5 rounded text-stone-900 focus:ring-stone-900 accent-amber-600 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Som do Alarme */}
              <div className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-200/80 gap-3">
                <div className="flex-1">
                  <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                    Som do Alarme: Bip Bip Digital
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Alarme clássico "bip bip" eletrônico, nítido e persistente
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => playBeepBeep(0.85, true)}
                    title="Ouvir som Bip Bip"
                    className="px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 text-amber-800" />
                    Ouvir Bip Bip
                  </button>

                  <input
                    id="sound-enabled-checkbox"
                    type="checkbox"
                    checked={formData.soundEnabled}
                    onChange={(e) =>
                      setFormData({ ...formData, soundEnabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-stone-900 focus:ring-stone-900 accent-amber-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Notificações do Navegador */}
              <div className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                <div>
                  <div className="text-xs font-bold text-stone-900">
                    Notificações de Área de Trabalho
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Alerta na tela mesmo com a aba em segundo plano
                  </div>
                </div>

                {notificationStatus === 'granted' ? (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Ativadas
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestNotification}
                    className="text-xs font-semibold px-2.5 py-1 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
                  >
                    Permitir
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              id="save-settings-btn"
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" /> Salvar Configurações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
