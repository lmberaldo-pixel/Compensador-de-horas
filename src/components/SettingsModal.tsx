import { useState, useRef } from 'react';
import { Bell, BellOff, Check, Clock, Save, X, Monitor, Music, Play, Trash2 } from 'lucide-react';
import { WorkConfig } from '../types';
import {
  saveCustomAlarmSound,
  saveCustomAlarmSoundName,
  getCustomAlarmSoundName,
  hasCustomAlarmSound,
  clearCustomAlarmSound,
  previewCustomAlarmSound,
  requestNotificationPermission,
} from '../utils/audioAlarm';

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

  // Custom ringtone state
  const [customSoundName, setCustomSoundName] = useState<string | null>(
    () => getCustomAlarmSoundName()
  );
  const [hasCustom, setHasCustom] = useState(() => hasCustomAlarmSound());
  const [soundUploadError, setSoundUploadError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const stopPreviewRef = useRef<(() => void) | null>(null);
  const soundInputRef = useRef<HTMLInputElement | null>(null);

  const handleSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSoundUploadError(null);

    // 4 MB soft limit to stay within localStorage budget
    if (file.size > 4 * 1024 * 1024) {
      setSoundUploadError('Arquivo muito grande. Use um toque com menos de 4 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      try {
        saveCustomAlarmSound(dataUrl);
        saveCustomAlarmSoundName(file.name);
        setCustomSoundName(file.name);
        setHasCustom(true);
        setFormData((prev) => ({ ...prev, useCustomSound: true }));
      } catch {
        setSoundUploadError('Não foi possível salvar o arquivo. Tente um arquivo menor.');
      }
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleRemoveCustomSound = () => {
    clearCustomAlarmSound();
    setHasCustom(false);
    setCustomSoundName(null);
    setFormData((prev) => ({ ...prev, useCustomSound: false }));
  };

  const handlePreviewSound = () => {
    if (isPreviewing && stopPreviewRef.current) {
      stopPreviewRef.current();
      stopPreviewRef.current = null;
      setIsPreviewing(false);
      return;
    }
    const stop = previewCustomAlarmSound();
    stopPreviewRef.current = stop;
    setIsPreviewing(true);
    // Auto-stop after 10 seconds
    setTimeout(() => {
      stop();
      stopPreviewRef.current = null;
      setIsPreviewing(false);
    }, 10000);
  };

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

  const handleExportBackup = () => {
    const configStr = localStorage.getItem('compensador_config') || '{}';
    const marksStr = localStorage.getItem('compensador_marks_today') || '{}';
    const historyStr = localStorage.getItem('compensador_history') || '[]';

    const backupData = {
      version: 1,
      config: JSON.parse(configStr),
      marks: JSON.parse(marksStr),
      history: JSON.parse(historyStr),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData));
    const link = document.createElement('a');
    link.href = dataStr;
    link.download = `backup_compensador_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const backupData = JSON.parse(result);

        if (backupData.config && backupData.history) {
          localStorage.setItem('compensador_config', JSON.stringify(backupData.config));
          localStorage.setItem('compensador_marks_today', JSON.stringify(backupData.marks || {}));
          localStorage.setItem('compensador_history', JSON.stringify(backupData.history));
          alert('Backup restaurado com sucesso! O aplicativo será recarregado.');
          window.location.reload();
        } else {
          alert('Arquivo de backup inválido.');
        }
      } catch (err) {
        console.error(err);
        alert('Erro ao ler o arquivo de backup.');
      }
    };
    reader.readAsText(file);
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

              {/* Notificações do Navegador */}
              <div className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                <div>
                  <div className="text-xs font-bold text-stone-900">
                    Notificações do Sistema & Navegador
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Alerta na tela e vibração no celular
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
                    Permitir Notificações
                  </button>
                )}
              </div>

              {/* Toque Customizado do Celular */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 space-y-2.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Music className="w-3.5 h-3.5 text-violet-600" />
                  <div className="text-xs font-bold text-stone-900">Som do Alarme</div>
                </div>
                <div className="text-[11px] text-stone-500">
                  Use o <strong>toque do seu celular</strong> ou qualquer arquivo de áudio (MP3, M4A, OGG…) no lugar do beep padrão.
                </div>

                {hasCustom && customSoundName ? (
                  <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-lg px-2.5 py-2">
                    <Music className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                    <span className="text-[11px] font-semibold text-violet-900 flex-1 truncate" title={customSoundName}>
                      {customSoundName}
                    </span>
                    <button
                      type="button"
                      onClick={handlePreviewSound}
                      title={isPreviewing ? 'Parar preview' : 'Ouvir preview'}
                      className={`p-1 rounded-md transition-colors ${
                        isPreviewing
                          ? 'bg-violet-600 text-white'
                          : 'text-violet-700 hover:bg-violet-100'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveCustomSound}
                      title="Remover toque customizado"
                      className="p-1 rounded-md text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 cursor-pointer px-3 py-2 bg-white border border-dashed border-stone-300 text-stone-600 rounded-lg text-xs font-semibold hover:border-violet-400 hover:text-violet-700 hover:bg-violet-50 transition-colors">
                    <Music className="w-3.5 h-3.5" />
                    Escolher arquivo de áudio
                    <input
                      ref={soundInputRef}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={handleSoundUpload}
                    />
                  </label>
                )}

                {hasCustom && (
                  <div className="flex items-center gap-2">
                    <input
                      id="use-custom-sound-checkbox"
                      type="checkbox"
                      checked={formData.useCustomSound || false}
                      onChange={(e) =>
                        setFormData({ ...formData, useCustomSound: e.target.checked })
                      }
                      className="w-3.5 h-3.5 rounded accent-violet-600 cursor-pointer"
                    />
                    <label htmlFor="use-custom-sound-checkbox" className="text-[11px] text-stone-700 font-semibold cursor-pointer">
                      Usar este toque como alarme
                    </label>
                  </div>
                )}

                {soundUploadError && (
                  <p className="text-[11px] text-rose-600 font-medium">{soundUploadError}</p>
                )}
              </div>

              {/* Manter Tela Ligada */}
              <div className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-200/80 gap-3">
                <div className="flex-1">
                  <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-blue-600" />
                    Manter Tela Ligada (Wake Lock)
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Impede o celular ou PC de bloquear a tela sozinho. <span className="font-semibold text-blue-700">Recomendado para o alarme tocar 100% das vezes sem erro no navegador.</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="wake-lock-enabled-checkbox"
                    type="checkbox"
                    checked={formData.keepScreenOn || false}
                    onChange={(e) =>
                      setFormData({ ...formData, keepScreenOn: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-stone-900 focus:ring-stone-900 accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Backup de Dados */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 space-y-3 mt-4">
                <div className="text-xs font-bold text-stone-900 mb-1">
                  Backup de Dados (Segurança)
                </div>
                <div className="text-[11px] text-stone-500 mb-2">
                  Salve suas configurações e banco de horas no celular para evitar perdas caso o cache do navegador seja limpo.
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="flex-1 px-3 py-2 bg-white border border-stone-300 text-stone-700 rounded-lg text-xs font-semibold hover:bg-stone-100 transition-colors"
                  >
                    Exportar Backup
                  </button>
                  <label className="flex-1 text-center cursor-pointer px-3 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors">
                    Importar Backup
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleImportBackup}
                    />
                  </label>
                </div>
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
