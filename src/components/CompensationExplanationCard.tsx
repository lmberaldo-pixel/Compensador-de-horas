import { Calculator, Clock, HelpCircle, Info, ShieldCheck } from 'lucide-react';
import { CompensationResult, WorkConfig } from '../types';

interface CompensationExplanationProps {
  config: WorkConfig;
  result: CompensationResult;
}

export default function CompensationExplanationCard({
  config,
  result,
}: CompensationExplanationProps) {
  return (
    <div className="bg-stone-50/70 rounded-2xl border border-stone-200/80 p-5 sm:p-6 mb-8 text-stone-700">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-stone-200/80 flex items-center justify-center text-stone-700">
          <Calculator className="w-4 h-4" />
        </div>
        <h3 className="font-bold text-stone-900 text-sm">
          Como funciona o cálculo de compensação automática?
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-stone-200/70 space-y-1">
          <div className="font-bold text-stone-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            1. Atraso na Entrada
          </div>
          <p className="text-stone-500 leading-relaxed">
            Se a entrada contratual era às <strong className="text-stone-700 font-mono">{config.standardStartTime}</strong> e o ponto for batido após esse horário, a diferença em minutos é somada diretamente à hora de saída final.
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-stone-200/70 space-y-1">
          <div className="font-bold text-stone-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            2. Atraso no Almoço
          </div>
          <p className="text-stone-500 leading-relaxed">
            Se o intervalo de refeição ultrapassar os <strong className="text-stone-700 font-mono">{config.standardLunchMinutes} minutos</strong> contratados, cada minuto excedente também é compensado automaticamente no encerramento.
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-stone-200/70 space-y-1">
          <div className="font-bold text-stone-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            3. Alarme {config.alarmAdvanceMinutes || 2}min Antecipado
          </div>
          <p className="text-stone-500 leading-relaxed">
            Para que você não esqueça nenhuma marcação, o aplicativo dispara um aviso visual e sonoro exatamente {config.alarmAdvanceMinutes || 2} {config.alarmAdvanceMinutes === 1 ? 'minuto' : 'minutos'} antes de cada marcação prevista ou compensada.
          </p>
        </div>
      </div>
    </div>
  );
}
