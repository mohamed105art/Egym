import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Bot,
  CheckCircle2,
  Download,
  ExternalLink,
  PlusCircle,
  Smartphone,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { SCIENTIFIC_STUDIES } from '../data/studies';
import { generateCoachInsights } from '../engine/coach';
import { tr, trText } from '../engine/i18n';
import { createBackupExportPayload, validateAndImportBackup } from '../engine/storage';
import { MuscleVolumeSummary } from '../engine/volume';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  AppState,
  BodyMeasurement,
  CoachRecommendation,
  Exercise,
  JointResponseLog,
  MuscleZoneKey,
  ProgSubTab,
} from '../types/app';

interface ProgressViewProps {
  state: AppState;
  exercises: Exercise[];
  volumeMap: Record<MuscleZoneKey, MuscleVolumeSummary>;
  onSetProgSubTab: (tab: ProgSubTab) => void;
  onAddMeasurement: (m: BodyMeasurement) => void;
  onAddJointLog: (j: JointResponseLog) => void;
  onApplyCoachAction: (actionType: NonNullable<CoachRecommendation['actionType']>) => void;
  onImportState: (nextState: AppState) => void;
  onNotify: (msg: string) => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  state,
  exercises,
  volumeMap,
  onSetProgSubTab,
  onAddMeasurement,
  onAddJointLog,
  onApplyCoachAction,
  onImportState,
  onNotify,
}) => {
  const { lang, progSubTab } = state;
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const trackedIds = Object.keys(state.e1rmHistory);
  const [selectedExId, setSelectedExId] = useState(trackedIds[0] || 'EX01');
  const [weightIn, setWeightIn] = useState(state.profile.weightKg);
  const [waistIn, setWaistIn] = useState(state.measurements[state.measurements.length - 1]?.waist || 90);
  const [armIn, setArmIn] = useState(state.measurements[state.measurements.length - 1]?.arm || 38.5);

  const [jPre, setJPre] = useState(1);
  const [jPost, setJPost] = useState(1);
  const [jNextDay, setJNextDay] = useState(1);
  const [jPerf, setJPerf] = useState(4);
  const [jNote, setJNote] = useState('');

  const [importError, setImportError] = useState<string | null>(null);

  const coachRecs = generateCoachInsights(state, exercises, volumeMap);
  const chartPoints = state.e1rmHistory[selectedExId] || [];

  const subTabs: { id: ProgSubTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'metrics',
      label: tr(lang, 'القياسات وتطور القوة', 'Mesures & Force e1RM', 'Metrics & e1RM PRs'),
      icon: <TrendingUp className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'coach',
      label: tr(lang, 'المدرب الذكي والمفاصل', 'Coach IA & Articulations', 'Smart Coach & Joints'),
      icon: <Bot className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'refs',
      label: tr(lang, 'النسخ الاحتياطي والمراجع', 'Sauvegarde & Science', 'Backup & Science'),
      icon: <BookOpen className="w-4 h-4 shrink-0" />,
    },
  ];

  const handleExportJson = () => {
    const payload = createBackupExportPayload(state);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hypertrophy_os_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify(tr(lang, 'تم تصدير النسخة الاحتياطية بنجاح.', 'Sauvegarde JSON exportée.', 'Backup JSON exported cleanly.'));
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      const text = await file.text();
      const res = validateAndImportBackup(text);
      if (!res.ok) {
        setImportError(res.error);
        return;
      }
      onImportState(res.state);
      onNotify(tr(lang, 'تم التحقق من النسخة واستعادتها بنجاح.', 'Sauvegarde validée et restaurée.', 'Backup validated and restored cleanly.'));
    } catch {
      setImportError('Unable to read selected file.');
    } finally {
      e.target.value = '';
    }
  };

  // SVG e1RM Sparkline Geometry
  const renderE1RMChart = () => {
    if (chartPoints.length === 0) {
      return (
        <div className="h-44 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
          {tr(lang, 'سجّل مجموعات عمل لإظهار منحنى تطور القوة التقديري e1RM.', 'Enregistrez des séries pour afficher la courbe e1RM.', 'Log working sets to plot your dynamic e1RM curve.')}
        </div>
      );
    }
    const vals = chartPoints.map((p) => p.value);
    const minV = Math.min(...vals) * 0.92;
    const maxV = Math.max(...vals) * 1.05 || 10;
    const span = Math.max(1, maxV - minV);
    const w = 440;
    const h = 150;
    const padX = 32;
    const padY = 20;

    const coords = chartPoints.map((pt, i) => {
      const x =
        chartPoints.length === 1
          ? w / 2
          : padX + (i / (chartPoints.length - 1)) * (w - padX * 2);
      const y = h - padY - ((pt.value - minV) / span) * (h - padY * 2);
      return { x, y, pt };
    });

    const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ');

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44" role="img" aria-label="e1RM Strength Progression Chart">
        <defs>
          <linearGradient id="e1rmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
        </defs>
        <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke="currentColor" strokeOpacity="0.2" />
        <line x1={padX} y1={padY} x2={w - padX} y2={padY} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4" />
        {coords.length > 1 && (
          <polyline
            fill="none"
            stroke="url(#e1rmGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polyline}
          />
        )}
        {coords.map((c, idx) => (
          <g key={`PT_${idx}`}>
            <circle cx={c.x} cy={c.y} r="5" fill="#f97316" stroke="#ffffff" strokeWidth="2" />
            <text x={c.x} y={c.y - 9} textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="bold">
              {c.pt.value}kg
            </text>
            <text x={c.x} y={h - 4} textAnchor="middle" fill="currentColor" fillOpacity="0.6" fontSize="9">
              {c.pt.date.slice(5)}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {subTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSetProgSubTab(t.id)}
            className={`flex items-center justify-center gap-2 h-10 px-3 rounded-xl text-xs font-extrabold transition whitespace-nowrap cursor-pointer ${
              progSubTab === t.id
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t.icon}
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {/* 1. METRICS & DYNAMIC E1RM */}
      {progSubTab === 'metrics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Dynamic e1RM Chart */}
            <div className="lg:col-span-7 rounded-3xl border border-sky-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                    {tr(lang, 'منحنى تطور القوة التقديرية (e1RM)', 'Évolution de la Force (e1RM)', 'Strength Progression Curve (e1RM)')}
                  </h3>
                </div>
                <select
                  aria-label="Select Exercise for e1RM chart"
                  value={selectedExId}
                  onChange={(e) => setSelectedExId(e.target.value)}
                  className="p-2 rounded-xl border border-indigo-200 dark:border-slate-700 bg-indigo-50/40 dark:bg-slate-950 text-xs font-bold"
                >
                  {exercises.filter((ex) => trackedIds.includes(ex.id)).map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.id} — {trText(lang, ex.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-sky-50/50 via-white to-indigo-50/50 dark:from-slate-950 dark:to-slate-950 border border-slate-200 dark:border-slate-800 p-2">
                {renderE1RMChart()}
              </div>
            </div>

            {/* Body Measurement Logger */}
            <div className="lg:col-span-5 rounded-3xl border border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 text-xs shadow-sm">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                {tr(lang, 'تسجيل القياسات الجسدية', 'Journal des Mensurations', 'Body Measurements Logger')}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">{tr(lang, 'الوزن (كغ)', 'Poids (kg)', 'Weight (kg)')}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightIn}
                    onChange={(e) => setWeightIn(Number(e.target.value) || 0)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold mono-num"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">{tr(lang, 'الخصر (سم)', 'Taille (cm)', 'Waist (cm)')}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={waistIn}
                    onChange={(e) => setWaistIn(Number(e.target.value) || 0)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold mono-num"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">{tr(lang, 'الذراع (سم)', 'Bras (cm)', 'Arm (cm)')}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={armIn}
                    onChange={(e) => setArmIn(Number(e.target.value) || 0)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold mono-num"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onAddMeasurement({
                    date: new Date().toISOString().slice(0, 10),
                    weight: weightIn,
                    waist: waistIn,
                    arm: armIn,
                  });
                  onNotify(tr(lang, 'تم تسجيل القياس الجديد.', 'Mesure enregistrée.', 'Measurement logged.'));
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-extrabold hover:from-indigo-500 hover:to-violet-500 transition shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{tr(lang, 'حفظ قياس اليوم', 'Ajouter Mesure', 'Log Measurement')}</span>
              </button>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                {[...state.measurements].reverse().map((m, idx) => (
                  <div
                    key={`M_${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 mono-num"
                  >
                    <span className="text-slate-500 dark:text-slate-400">{m.date}</span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">{m.weight} kg · {m.waist} cm · {m.arm} cm</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Completed Sessions History */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2.5 text-xs shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {tr(lang, 'سجل الحصص التدريبية المكتملة', 'Historique des Séances', 'Completed Workout Sessions')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[...state.sessionHistory].reverse().map((ses) => (
                <div
                  key={ses.id}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-orange-50/50 via-white to-indigo-50/40 dark:from-slate-950 dark:to-slate-950 border border-slate-200 dark:border-slate-800 space-y-1"
                >
                  <div className="flex justify-between font-extrabold">
                    <span className="text-orange-600 dark:text-orange-400">
                      {tr(lang, `الحصة ${ses.day}`, `Séance ${ses.day}`, `Day ${ses.day}`)}
                    </span>
                    <span className="mono-num text-slate-500 dark:text-slate-400">{ses.date}</span>
                  </div>
                  <div className="mono-num font-bold text-slate-900 dark:text-slate-100">
                    {ses.totalWorkingSets} {tr(lang, 'مجموعات عمل', 'séries effectives', 'working sets')} · {ses.totalVolumeKg} kg
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mono-num">
                    {tr(lang, 'انزعاج المفصل:', 'Inconfort :', 'Discomfort:')} {ses.preJointDiscomfort} → {ses.postJointDiscomfort}/10
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. EXPLAINABLE AI COACH & JOINT RESPONSE TRACKER */}
      {progSubTab === 'coach' && (
        <div className="space-y-4">
          {/* Joint Response Logger */}
          <div className="rounded-3xl border border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 text-xs shadow-sm">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-500" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {tr(lang, 'متابعة راحة واستجابة المفاصل (قبل / بعد / اليوم التالي)', 'Suivi Articulaire (Avant / Après / Lendemain)', 'Joint Comfort & Response Tracker')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {tr(lang, 'قبل التمرين:', 'Avant :', 'Pre-Session:')} <span className="mono-num text-indigo-600 font-extrabold">{jPre}/10</span>
                </label>
                <input type="range" min={0} max={10} value={jPre} onChange={(e) => setJPre(Number(e.target.value))} className="w-full accent-indigo-600" />
              </div>
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {tr(lang, 'بعد التمرين:', 'Après :', 'Post-Session:')} <span className="mono-num text-sky-600 font-extrabold">{jPost}/10</span>
                </label>
                <input type="range" min={0} max={10} value={jPost} onChange={(e) => setJPost(Number(e.target.value))} className="w-full accent-sky-600" />
              </div>
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {tr(lang, 'اليوم التالي (24h):', 'Lendemain :', 'Next-Day (24h):')} <span className="mono-num text-orange-600 font-extrabold">{jNextDay}/10</span>
                </label>
                <input type="range" min={0} max={10} value={jNextDay} onChange={(e) => setJNextDay(Number(e.target.value))} className="w-full accent-orange-500" />
              </div>
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {tr(lang, 'جودة الأداء (1–5):', 'Qualité (1–5) :', 'Performance (1–5):')} <span className="mono-num text-violet-600 font-extrabold">{jPerf}/5</span>
                </label>
                <input type="range" min={1} max={5} value={jPerf} onChange={(e) => setJPerf(Number(e.target.value))} className="w-full accent-violet-600" />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={jNote}
                onChange={(e) => setJNote(e.target.value)}
                placeholder={tr(lang, 'ملاحظة سريعة (مثال: راحة ممتازة في تمارين الأرجل)...', 'Note fonctionnelle...', 'Functional note (e.g. comfortable leg press)...')}
                className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
              <button
                type="button"
                onClick={() => {
                  onAddJointLog({
                    date: new Date().toISOString().slice(0, 10),
                    preDiscomfort: jPre,
                    postDiscomfort: jPost,
                    nextDayDiscomfort: jNextDay,
                    performanceQuality: jPerf,
                    functionalNote: jNote || 'Routine joint check-in',
                  });
                  setJNote('');
                  onNotify(tr(lang, 'تم تسجيل استجابة المفصل.', 'Suivi articulaire enregistré.', 'Joint response logged.'));
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-extrabold hover:from-sky-600 hover:to-indigo-700 transition shadow-sm"
              >
                {tr(lang, 'حفظ التقييم', 'Enregistrer', 'Save Check-In')}
              </button>
            </div>
          </div>

          {/* Explainable AI Coach Cards */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
              <Bot className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <span>{tr(lang, 'توصيات المدرب الذكي القابلة للتفسير', 'Recommandations Explicables du Coach', 'Explainable Smart Coach Insights')}</span>
            </div>

            {coachRecs.map((rec) => (
              <div
                key={rec.id}
                className="rounded-3xl border border-violet-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2.5 text-xs shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {trText(lang, rec.title)}
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 font-bold uppercase text-[10px]">
                    {tr(lang, 'درجة الثقة:', 'Confiance :', 'Confidence:')} {rec.confidence}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="rounded-2xl bg-indigo-50/60 dark:bg-slate-950 border border-indigo-100 dark:border-slate-800 p-3">
                    <strong className="text-indigo-700 dark:text-indigo-400 block mb-0.5">{tr(lang, 'ما رُصد:', 'Observé :', 'Observed:')}</strong>
                    <p className="text-slate-700 dark:text-slate-300">{trText(lang, rec.observed)}</p>
                  </div>
                  <div className="rounded-2xl bg-sky-50/60 dark:bg-slate-950 border border-sky-100 dark:border-slate-800 p-3">
                    <strong className="text-sky-700 dark:text-sky-400 block mb-0.5">{tr(lang, 'أساس البيانات:', 'Base de données :', 'Data Basis:')}</strong>
                    <p className="text-slate-700 dark:text-slate-300">{trText(lang, rec.dataBasis)}</p>
                  </div>
                </div>

                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  <strong>{tr(lang, 'التفسير العلمي:', 'Justification :', 'Rationale:')}</strong> {trText(lang, rec.rationale)}
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  <strong>{tr(lang, 'التغير المتوقع:', 'Impact attendu :', 'Expected Change:')}</strong> {trText(lang, rec.expectedChange)}
                </p>

                {rec.actionType && rec.actionLabel && (
                  <button
                    type="button"
                    onClick={() => onApplyCoachAction(rec.actionType!)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold hover:from-orange-600 hover:to-rose-600 transition shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{trText(lang, rec.actionLabel)}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. SCIENTIFIC STUDIES + JSON BACKUP + PWA INSTALL */}
      {progSubTab === 'refs' && (
        <div className="space-y-4">
          {/* Backup & PWA Controls */}
          <div className="rounded-3xl border border-orange-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 text-xs shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {tr(lang, 'حفظ واستعادة بياناتك وتثبيت التطبيق (PWA)', 'Sauvegarde JSON & Installation PWA', 'Data Backup (Validated JSON) & App Install')}
            </h3>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold hover:from-orange-600 hover:to-rose-600 transition shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>{tr(lang, 'تصدير نسخة احتياطية JSON', 'Exporter JSON', 'Export Backup JSON')}</span>
              </button>

              <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-800 dark:text-slate-100 border border-indigo-200 dark:border-slate-700 font-extrabold cursor-pointer hover:border-indigo-500 transition">
                <Upload className="w-4 h-4" />
                <span>{tr(lang, 'استيراد نسخة احتياطية JSON', 'Importer JSON', 'Import Backup JSON')}</span>
                <input type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" />
              </label>

              {isInstallable && !isInstalled && (
                <button
                  type="button"
                  onClick={() => void install()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 text-white font-extrabold hover:bg-sky-500 transition shadow-sm"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{tr(lang, 'تثبيت التطبيق على الجهاز', 'Installer l’application', 'Install App (Offline)')}</span>
                </button>
              )}
              {isInstalled && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {tr(lang, 'التطبيق مثبت للعمل دون إنترنت', 'Application installée', 'Installed as Offline App')}
                </span>
              )}
            </div>

            {isIOS && !isInstalled && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {tr(
                  lang,
                  'على أجهزة iOS/Safari: اضغط أيقونة المشاركة (Share) ثم "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).',
                  'Sur iOS/Safari : touchez Partager puis « Sur l’écran d’accueil ».',
                  'On iOS Safari: tap Share -> "Add to Home Screen" for offline installation.'
                )}
              </p>
            )}

            {importError && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-2.5 text-rose-800 dark:text-rose-200 flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}
          </div>

          {/* Evidence-Graded Study Registry */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{tr(lang, `المراجع العلمية المعتمدة (${SCIENTIFIC_STUDIES.length})`, `Registre Scientifique (${SCIENTIFIC_STUDIES.length})`, `Audited Scientific Registry (${SCIENTIFIC_STUDIES.length})`)}</span>
            </h3>
            {SCIENTIFIC_STUDIES.map((st) => (
              <div
                key={`REF_${st.id}`}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2 text-xs shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    {st.authors} ({st.year}) · {st.journal}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-orange-50 dark:bg-slate-800 text-orange-700 dark:text-orange-300 font-bold uppercase text-[10px]">
                    {st.evidenceGrade}
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{st.title}</h4>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{trText(lang, st.summary)}</p>
                <p className="text-slate-500 dark:text-slate-400">
                  <strong>{tr(lang, 'القيود:', 'Limites :', 'Limitations:')}</strong> {trText(lang, st.limitations)}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">
                    {tr(lang, 'تاريخ المراجعة:', 'Vérifié le :', 'Reviewed:')} {st.lastReviewedAt}
                  </span>
                  <a
                    href={st.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-bold hover:underline"
                  >
                    <span>DOI: {st.doi}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
