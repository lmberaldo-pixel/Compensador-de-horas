import { useState, useEffect } from 'react';
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  FileText,
  MinusCircle,
  Plus,
  PlusCircle,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { CompensationResult, DayMarks, HistoryRecord } from '../types';
import { formatHoursAndMinutes, formatMinutesDiff } from '../utils/timeCalculations';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryRecord[];
  currentMarks: DayMarks;
  currentResult: CompensationResult;
  onSaveCurrentDay: () => void;
  onAddManualRecord: (record: Omit<HistoryRecord, 'id'>) => void;
  onUpdateRecord: (id: string, updated: Partial<HistoryRecord>) => void;
  onDeleteRecord: (id: string) => void;
  onClearHistory: () => void;
  initialShowAddForm?: boolean;
}

export default function HistoryModal({
  isOpen,
  onClose,
  history,
  onSaveCurrentDay,
  onAddManualRecord,
  onUpdateRecord,
  onDeleteRecord,
  onClearHistory,
  initialShowAddForm = false,
}: HistoryModalProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [showAddForm, setShowAddForm] = useState(initialShowAddForm);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // New Manual Record Form State
  const todayStr = new Date().toISOString().slice(0, 10);
  const [manualDate, setManualDate] = useState(todayStr);
  const [manualType, setManualType] = useState<'credit' | 'debit'>('credit'); // credit = +, debit = -
  const [manualHours, setManualHours] = useState<number>(1);
  const [manualMinutes, setManualMinutes] = useState<number>(0);
  const [manualNotes, setManualNotes] = useState('');

  // Editing State
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<'credit' | 'debit'>('credit');
  const [editHours, setEditHours] = useState<number>(0);
  const [editMinutes, setEditMinutes] = useState<number>(0);
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setShowAddForm(initialShowAddForm);
    }
  }, [isOpen, initialShowAddForm]);

  if (!isOpen) return null;

  // Calculate totals automatically
  const totalAccumulatedBalance = history.reduce(
    (acc, item) => acc + (item.balanceMinutes || 0),
    0
  );

  const totalCredits = history.reduce((acc, item) => {
    return item.balanceMinutes > 0 ? acc + item.balanceMinutes : acc;
  }, 0);

  const totalDebits = history.reduce((acc, item) => {
    return item.balanceMinutes < 0 ? acc + Math.abs(item.balanceMinutes) : acc;
  }, 0);

  // Handle adding manual hours
  const handleSaveManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const safeHours = Math.max(0, isNaN(manualHours) ? 0 : manualHours);
    const safeMinutes = Math.max(0, Math.min(59, isNaN(manualMinutes) ? 0 : manualMinutes));
    const totalMinutes = safeHours * 60 + safeMinutes;

    if (totalMinutes === 0) {
      alert('Informe ao menos 1 minuto para lançar no banco de horas.');
      return;
    }

    const finalBalance = manualType === 'credit' ? totalMinutes : -totalMinutes;

    onAddManualRecord({
      date: manualDate || todayStr,
      type: 'manual',
      balanceMinutes: finalBalance,
      notes: manualNotes.trim() || (manualType === 'credit' ? 'Horas extras manuais' : 'Débito manual de horas'),
    });

    // Reset form
    setManualHours(1);
    setManualMinutes(0);
    setManualNotes('');
    setShowAddForm(false);
  };

  // Start editing a record
  const handleStartEdit = (record: HistoryRecord) => {
    setEditingRecordId(record.id);
    setEditDate(record.date);
    const absMin = Math.abs(record.balanceMinutes || 0);
    setEditType(record.balanceMinutes >= 0 ? 'credit' : 'debit');
    setEditHours(Math.floor(absMin / 60));
    setEditMinutes(absMin % 60);
    setEditNotes(record.notes || '');
  };

  // Save edited record
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecordId) return;

    const safeHours = Math.max(0, isNaN(editHours) ? 0 : editHours);
    const safeMinutes = Math.max(0, Math.min(59, isNaN(editMinutes) ? 0 : editMinutes));
    const totalMinutes = safeHours * 60 + safeMinutes;
    const finalBalance = editType === 'credit' ? totalMinutes : -totalMinutes;

    onUpdateRecord(editingRecordId, {
      date: editDate,
      balanceMinutes: finalBalance,
      notes: editNotes.trim(),
    });

    setEditingRecordId(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = [
      'Data',
      'Tipo',
      'Entrada',
      'Saida_Almoco',
      'Retorno_Almoco',
      'Saida_Final',
      'Saida_Calculada',
      'Atraso_Compensado_Min',
      'Saldo_Minutos',
      'Saldo_Formatado',
      'Observacao',
    ];
    const rows = history.map((h) => [
      h.date,
      h.type === 'manual' ? 'Lançamento Manual' : 'Jornada Diária',
      h.startTime || '-',
      h.lunchStartTime || '-',
      h.lunchEndTime || '-',
      h.actualEndTime || '-',
      h.calculatedEndTime || '-',
      h.totalDelayMinutes || 0,
      h.balanceMinutes || 0,
      formatHoursAndMinutes(h.balanceMinutes || 0),
      `"${(h.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `banco_de_horas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100/70 border border-amber-200 flex items-center justify-center text-amber-800">
              <Clock className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                Banco de Horas & Compensação
              </h3>
              <p className="text-xs text-stone-500">
                Lançamentos manuais e jornadas diárias somados automaticamente
              </p>
            </div>
          </div>

          <button
            id="close-history-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Automatic Balance Summary Bar */}
        <div className="bg-stone-50 px-6 py-4 border-b border-stone-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Balance */}
            <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Saldo Líquido Acumulado
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span
                  className={`font-mono text-xl font-black ${
                    totalAccumulatedBalance > 0
                      ? 'text-emerald-700'
                      : totalAccumulatedBalance < 0
                      ? 'text-rose-700'
                      : 'text-stone-800'
                  }`}
                >
                  {formatHoursAndMinutes(totalAccumulatedBalance)}
                </span>
              </div>
              <span className="text-[10px] text-stone-400 block mt-0.5">
                {history.length} {history.length === 1 ? 'registro somado' : 'registros somados'}
              </span>
            </div>

            {/* Total Credits */}
            <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Total Créditos (+)
              </span>
              <div className="font-mono text-lg font-bold text-emerald-700 mt-0.5">
                +{formatMinutesDiff(totalCredits, false)}
              </div>
              <span className="text-[10px] text-emerald-600/80 block mt-0.5">
                Horas a favor
              </span>
            </div>

            {/* Total Debits */}
            <div className="bg-white p-3.5 rounded-xl border border-rose-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                Total Débitos (-)
              </span>
              <div className="font-mono text-lg font-bold text-rose-700 mt-0.5">
                -{formatMinutesDiff(totalDebits, false)}
              </div>
              <span className="text-[10px] text-rose-600/80 block mt-0.5">
                Horas a compensar
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-stone-200/70">
            <div className="flex items-center gap-2">
              <button
                id="toggle-add-hours-btn"
                type="button"
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setEditingRecordId(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                  showAddForm
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-stone-900 text-white hover:bg-stone-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                {showAddForm ? 'Cancelar Lançamento' : 'Acrescentar Horas Manualmente'}
              </button>

              <button
                id="save-today-btn"
                type="button"
                onClick={onSaveCurrentDay}
                title="Salvar apuração da jornada de hoje"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 text-stone-700 rounded-lg text-xs font-semibold hover:bg-stone-50 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Salvar Ponto de Hoje
              </button>
            </div>

            {history.length > 0 && (
              <button
                id="export-csv-btn"
                type="button"
                onClick={handleExportCSV}
                title="Exportar planilha completa CSV"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-stone-200 text-stone-700 rounded-lg text-xs font-semibold hover:bg-stone-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-stone-500" /> Exportar CSV
              </button>
            )}
          </div>
        </div>

        {/* Form to Add Manual Hours */}
        {showAddForm && (
          <form
            onSubmit={handleSaveManualEntry}
            className="bg-amber-50/70 border-b border-amber-200/80 p-5 space-y-4 animate-in slide-in-from-top-3 duration-200"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-amber-600" />
                Acrescentar Horas ao Banco de Horas
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-amber-800 hover:text-amber-950 text-xs font-semibold"
              >
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Date */}
              <div className="sm:col-span-4">
                <label className="text-[11px] font-bold text-stone-700 block mb-1">
                  Data do Lançamento
                </label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-stone-300 rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-stone-800"
                  required
                />
              </div>

              {/* Type: Credit (+) or Debit (-) */}
              <div className="sm:col-span-4">
                <label className="text-[11px] font-bold text-stone-700 block mb-1">
                  Tipo de Operação
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setManualType('credit')}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 transition-all ${
                      manualType === 'credit'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    (+) Crédito
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualType('debit')}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 transition-all ${
                      manualType === 'debit'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                        : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    <MinusCircle className="w-3.5 h-3.5" />
                    (-) Débito
                  </button>
                </div>
              </div>

              {/* Hours & Minutes */}
              <div className="sm:col-span-4">
                <label className="text-[11px] font-bold text-stone-700 block mb-1">
                  Quantidade de Horas
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 flex items-center bg-white border border-stone-300 rounded-lg px-2 py-1">
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={manualHours}
                      onChange={(e) => setManualHours(parseInt(e.target.value, 10) || 0)}
                      className="w-full text-xs font-mono font-bold text-stone-800 text-right focus:outline-hidden"
                    />
                    <span className="text-[11px] font-bold text-stone-400 ml-1">h</span>
                  </div>
                  <span className="text-stone-400 font-bold">:</span>
                  <div className="flex-1 flex items-center bg-white border border-stone-300 rounded-lg px-2 py-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={manualMinutes}
                      onChange={(e) => setManualMinutes(parseInt(e.target.value, 10) || 0)}
                      className="w-full text-xs font-mono font-bold text-stone-800 text-right focus:outline-hidden"
                    />
                    <span className="text-[11px] font-bold text-stone-400 ml-1">m</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-stone-500 font-semibold">Atalhos rápidos:</span>
              {[
                { label: '30m', h: 0, m: 30 },
                { label: '1h', h: 1, m: 0 },
                { label: '1h 30m', h: 1, m: 30 },
                { label: '2h', h: 2, m: 0 },
                { label: '4h', h: 4, m: 0 },
                { label: '8h', h: 8, m: 0 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setManualHours(p.h);
                    setManualMinutes(p.m);
                  }}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white text-stone-700 border border-stone-300 hover:bg-amber-100 hover:border-amber-300 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Motivo / Descrição */}
            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Motivo / Descrição (Opcional)
              </label>
              <input
                type="text"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Ex: Hora extra no fechamento, Saldo inicial anterior, Compensação..."
                className="w-full text-xs bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-800 placeholder-stone-400 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs font-bold font-mono">
                Lançamento:{' '}
                <span className={manualType === 'credit' ? 'text-emerald-700' : 'text-rose-700'}>
                  {manualType === 'credit' ? '+' : '-'} {manualHours}h {String(manualMinutes).padStart(2, '0')}m ({manualType === 'credit' ? 'Crédito' : 'Débito'})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-200/60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Salvar e Somar ao Banco
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Content List of Records */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {history.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <Clock className="w-10 h-10 mx-auto stroke-1 text-stone-300 mb-2" />
              <p className="text-sm font-medium text-stone-600">Nenhum registro no banco de horas</p>
              <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
                Acrescente horas manualmente pelo botão acima ou salve a apuração do dia após o expediente. Todas as horas serão somadas automaticamente.
              </p>
            </div>
          ) : (
            history.map((record) => {
              const isEditing = editingRecordId === record.id;
              const isManual = record.type === 'manual';

              if (isEditing) {
                return (
                  <form
                    key={record.id}
                    onSubmit={handleSaveEdit}
                    className="bg-amber-50/60 rounded-xl p-4 border border-amber-300 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800 flex items-center gap-1">
                        <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                        Editando Registro
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingRecordId(null)}
                        className="text-stone-400 hover:text-stone-700 text-xs"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      {/* Date */}
                      <div className="sm:col-span-4">
                        <label className="text-[10px] font-bold text-stone-600 block mb-1">
                          Data
                        </label>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full text-xs font-semibold bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-800"
                          required
                        />
                      </div>

                      {/* Type */}
                      <div className="sm:col-span-4">
                        <label className="text-[10px] font-bold text-stone-600 block mb-1">
                          Tipo
                        </label>
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => setEditType('credit')}
                            className={`py-1 px-2 rounded-lg text-xs font-bold border transition-all ${
                              editType === 'credit'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-stone-600 border-stone-300'
                            }`}
                          >
                            (+) Crédito
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditType('debit')}
                            className={`py-1 px-2 rounded-lg text-xs font-bold border transition-all ${
                              editType === 'debit'
                                ? 'bg-rose-600 text-white border-rose-600'
                                : 'bg-white text-stone-600 border-stone-300'
                            }`}
                          >
                            (-) Débito
                          </button>
                        </div>
                      </div>

                      {/* Hours & Minutes */}
                      <div className="sm:col-span-4">
                        <label className="text-[10px] font-bold text-stone-600 block mb-1">
                          Horas e Minutos
                        </label>
                        <div className="flex items-center gap-1">
                          <div className="flex-1 flex items-center bg-white border border-stone-300 rounded-lg px-2 py-1">
                            <input
                              type="number"
                              min="0"
                              max="99"
                              value={editHours}
                              onChange={(e) => setEditHours(parseInt(e.target.value, 10) || 0)}
                              className="w-full text-xs font-mono font-bold text-stone-800 text-right focus:outline-hidden"
                            />
                            <span className="text-[10px] text-stone-400 ml-1">h</span>
                          </div>
                          <span className="text-stone-400 font-bold">:</span>
                          <div className="flex-1 flex items-center bg-white border border-stone-300 rounded-lg px-2 py-1">
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={editMinutes}
                              onChange={(e) => setEditMinutes(parseInt(e.target.value, 10) || 0)}
                              className="w-full text-xs font-mono font-bold text-stone-800 text-right focus:outline-hidden"
                            />
                            <span className="text-[10px] text-stone-400 ml-1">m</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-[10px] font-bold text-stone-600 block mb-1">
                        Observações / Descrição
                      </label>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Motivo da alteração..."
                        className="w-full text-xs bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-800"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingRecordId(null)}
                        className="px-2.5 py-1 rounded-lg text-xs text-stone-600 hover:bg-stone-200"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Atualizar Registro
                      </button>
                    </div>
                  </form>
                );
              }

              return (
                <div
                  key={record.id}
                  className={`rounded-xl p-4 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-stone-300 ${
                    isManual
                      ? 'bg-amber-50/30 border-amber-200/80'
                      : 'bg-white border-stone-200/80'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-stone-900 font-mono">
                        {record.date}
                      </span>

                      {isManual ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <Edit2 className="w-2.5 h-2.5" />
                          Lançamento Manual
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                          Jornada de Trabalho
                        </span>
                      )}

                      {record.totalDelayMinutes && record.totalDelayMinutes > 0 ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200">
                          Compensou {record.totalDelayMinutes} min
                        </span>
                      ) : null}
                    </div>

                    {isManual ? (
                      <div className="text-xs text-stone-600 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="font-medium italic">
                          {record.notes || 'Horas extras manuais adicionadas'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 font-mono">
                        <span>
                          Entrada: <strong className="text-stone-800">{record.startTime || '--:--'}</strong>
                        </span>
                        <span>
                          Almoço: <strong className="text-stone-800">{record.lunchStartTime || '--:--'}</strong> → <strong className="text-stone-800">{record.lunchEndTime || '--:--'}</strong>
                        </span>
                        <span>
                          Saída: <strong className="text-stone-800">{record.actualEndTime || record.calculatedEndTime || '--:--'}</strong>
                        </span>
                        {record.notes && (
                          <span className="text-stone-400 font-sans text-[11px] block w-full mt-0.5">
                            {record.notes}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 block uppercase">
                        {isManual ? 'Ajuste' : 'Saldo do dia'}
                      </span>
                      <span
                        className={`font-mono text-base font-extrabold ${
                          record.balanceMinutes > 0
                            ? 'text-emerald-700'
                            : record.balanceMinutes < 0
                            ? 'text-rose-700'
                            : 'text-stone-700'
                        }`}
                      >
                        {formatHoursAndMinutes(record.balanceMinutes)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(record)}
                        title="Editar lançamento de horas"
                        className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg transition-colors hover:bg-stone-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => onDeleteRecord(record.id)}
                        title="Excluir este lançamento"
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition-colors hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="px-6 py-3 border-t border-stone-100 flex items-center justify-between bg-stone-50">
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-800 font-medium">Apagar todo histórico?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClearHistory();
                    setConfirmClear(false);
                  }}
                  className="px-2.5 py-1 bg-rose-600 text-white rounded-md text-xs font-bold hover:bg-rose-700"
                >
                  Sim, apagar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1 text-xs text-stone-600 hover:text-stone-900"
                >
                  Não
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium"
              >
                Limpar banco de horas
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
