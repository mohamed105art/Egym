import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
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
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SCIENTIFIC_STUDIES } from '../data/studies';
import { generateCoachInsights } from '../engine/coach';
import { tr, trText } from '../engine/i18n';
import {
  buildLast30DaysAnalytics,
  createBackupExportPayload,
  validateAndImportBackup,
} from '../engine/storage';
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
  const [chartMetricMode, setChartMetricMode] = useState<'combined' | 'volume' | 'e1rm'>('combined');
  const [timelineScope, setTimelineScope] = useState<'sessions' | 'daily'>('sessions');

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
  const analytics30d = useMemo(
    () => buildLast30DaysAnalytics(state, selectedExId),
    [state, selectedExId]
  );

  const chartData = timelineScope === 'sessions' ? analytics30d.sessionPoints : analytics30d.dailyPoints;
  const selectedExObj = exercises.find((e) => e.id === selectedExId) || exercises[0];

  const subTabs: { id: ProgSubTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'metrics',
      label: tr(lang, 'مخطط 30 يوماً (الحجم والقوة) والقياسات', 'Graphique 30j (Volume & e1RM)', '30-Day Volume & e1RM Chart'),
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

  const volumeLabel = tr(lang, 'حجم التمرين (كغ)', 'Volume Séance (kg)', 'Workout Volume (kg)');
  const e1rmLabel = tr(lang, 'قوة الرفع التقديرية e1RM (كغ)', 'Force Estimée e1RM (kg)', 'Estimated 1RM (kg)');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white dark:bg-[#13182b] p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {subTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSetProgSubTab(t.id)}
            className={`flex items-center justify-center gap-2 h-10 px-3 rounded-xl text-xs font-extrabold transition whitespace-nowrap cursor-pointer ${
              progSubTab === t.id
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0f1423]'
            }`}
          >
            {t.icon}
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {/* 1. 30-DAY INTERACTIVE RECHARTS (VOLUME + e1RM) & BODY METRICS */}
      {progSubTab === 'metrics' && (
        <div className="space-y-4">
          {/* 30-Day KPI Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 border-s-4 border-s-orange-500 bg-white dark:bg-[#13182b] p-3.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                {tr(lang, 'إجمالي الحجم (آخر 30 يوماً)', 'Volume Total (30 jours)', '30-Day Total Volume')}
              </span>
              <div className="text-lg sm:text-xl font-extrabold mono-num text-slate-900 dark:text-white mt-0.5">
                {analytics30d.totalVolume30dKg.toLocaleString()} kg
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mono-num block truncate">
                {analytics30d.sessionsIn30d} {tr(lang, 'حصص مكتملة في 30 يوماً', 'séances sur 30j', 'sessions in 30d')}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 border-s-4 border-s-sky-500 bg-white dark:bg-[#13182b] p-3.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                {tr(lang, 'متوسط الحجم لكل حصة', 'Volume Moyen / Séance', 'Avg Session Volume')}
              </span>
              <div className="text-lg sm:text-xl font-extrabold mono-num text-sky-400 mt-0.5">
                {analytics30d.avgVolumePerSessionKg.toLocaleString()} kg
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                {tr(lang, 'الحمل الميكانيكي الصافي', 'Tonnage effectif par séance', 'Effective session tonnage')}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 border-s-4 border-s-orange-500 bg-white dark:bg-[#13182b] p-3.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                {tr(lang, 'أعلى قوة رفع تقديرية (e1RM)', 'Meilleur e1RM Estimé', 'Peak Estimated 1RM')}
              </span>
              <div className="text-lg sm:text-xl font-extrabold mono-num text-orange-500 mt-0.5">
                {analytics30d.latestE1rmKg} kg
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                {selectedExObj ? trText(lang, selectedExObj.name) : selectedExId}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 border-s-4 border-s-emerald-500 bg-white dark:bg-[#13182b] p-3.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                {tr(lang, 'تطور القوة خلال 30 يوماً', 'Gain de Force (30j)', '30-Day e1RM Progression')}
              </span>
              <div className="text-lg sm:text-xl font-extrabold mono-num text-emerald-400 mt-0.5">
                {analytics30d.e1rmGainKg >= 0 ? `+${analytics30d.e1rmGainKg}` : analytics30d.e1rmGainKg} kg
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mono-num block truncate">
                {analytics30d.startE1rmKg}kg → {analytics30d.latestE1rmKg}kg
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Interactive 30-Day Recharts Volume & e1RM Card — Pure Solid Dark Background */}
            <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#13182b] p-4 space-y-3.5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-orange-500 shrink-0" />
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                      {tr(
                        lang,
                        'مخطط تطور حجم التمرين (Volume) وقوة الرفع (e1RM) — آخر 30 يوماً',
                        'Évolution Volume & Force (e1RM) sur les 30 derniers jours',
                        'Interactive 30-Day Workout Volume & Strength (e1RM) Chart'
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {tr(
                        lang,
                        'مرّر المؤشر فوق النقاط لعرض تفاصيل كل حصة تدريبية، مجموعات العمل، وتطور القوة.',
                        'Survolez le graphique pour inspecter le tonnage et la force estimée.',
                        'Hover or tap any point to inspect session volume, working sets, and e1RM.'
                      )}
                    </p>
                  </div>
                </div>

                {/* Exercise Selector for e1RM */}
                <select
                  aria-label={tr(lang, 'اختر التمرين لمنحنى القوة e1RM', 'Choisir exercice e1RM', 'Select Exercise for e1RM')}
                  value={selectedExId}
                  onChange={(e) => setSelectedExId(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f1423] text-xs font-bold text-slate-900 dark:text-white"
                >
                  {exercises
                    .filter((ex) => trackedIds.includes(ex.id) || ['EX01', 'EX03', 'EX04', 'EX07'].includes(ex.id))
                    .map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.id} — {trText(lang, ex.name)}
                      </option>
                    ))}
                </select>
              </div>

              {/* Chart Mode & Scope Toggles */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-[#0f1423] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                  {(
                    [
                      { id: 'combined', label: tr(lang, 'مدمج (الحجم + القوة)', 'Combiné', 'Combined') },
                      { id: 'volume', label: tr(lang, 'الحجم فقط (Volume)', 'Volume seul', 'Volume Only') },
                      { id: 'e1rm', label: tr(lang, 'القوة فقط (e1RM)', 'Force e1RM', 'e1RM Only') },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setChartMetricMode(m.id)}
                      className={`h-8 px-2.5 rounded-lg font-extrabold whitespace-nowrap transition cursor-pointer ${
                        chartMetricMode === m.id
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-[#0f1423] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTimelineScope('sessions')}
                    className={`h-8 px-2.5 rounded-lg font-bold whitespace-nowrap transition cursor-pointer ${
                      timelineScope === 'sessions'
                        ? 'bg-orange-500 text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tr(lang, 'أيام الحصص (30د)', 'Séances (30j)', 'Session Dates')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineScope('daily')}
                    className={`h-8 px-2.5 rounded-lg font-bold whitespace-nowrap transition cursor-pointer ${
                      timelineScope === 'daily'
                        ? 'bg-orange-500 text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tr(lang, '30 يوماً متصلة', '30 jours continus', 'Full 30 Days')}
                  </button>
                </div>
              </div>

              {/* Interactive Recharts Container — Solid Dark #0f1423 Canvas with Zero Gradients */}
              <div
                className="h-72 w-full rounded-xl bg-slate-100 dark:bg-[#0f1423] border border-slate-200 dark:border-slate-800 p-2 sm:p-3"
                dir="ltr"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.45} />
                    <XAxis
                      dataKey="shortDate"
                      tick={{ fontSize: 11, fill: '#cbd5e1', fontWeight: 700 }}
                      axisLine={{ stroke: '#475569' }}
                    />
                    {(chartMetricMode === 'combined' || chartMetricMode === 'volume') && (
                      <YAxis
                        yAxisId="volume"
                        orientation="left"
                        tick={{ fontSize: 11, fill: '#38bdf8', fontWeight: 700 }}
                        axisLine={{ stroke: '#38bdf8' }}
                        tickFormatter={(v) => `${v}`}
                      />
                    )}
                    {(chartMetricMode === 'combined' || chartMetricMode === 'e1rm') && (
                      <YAxis
                        yAxisId="e1rm"
                        orientation="right"
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 11, fill: '#f97316', fontWeight: 700 }}
                        axisLine={{ stroke: '#f97316' }}
                        tickFormatter={(v) => `${v}kg`}
                      />
                    )}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f1423',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                      labelFormatter={(label, payload) => {
                        const pt = payload?.[0]?.payload;
                        if (pt?.dayTag && pt.dayTag !== '-') {
                          return `${pt.date} · Session ${pt.dayTag} (${pt.workingSets} sets)`;
                        }
                        return `${pt?.date || label}`;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700, paddingTop: '6px' }} />
                    {(chartMetricMode === 'combined' || chartMetricMode === 'volume') && (
                      <Bar
                        yAxisId="volume"
                        dataKey="volumeKg"
                        name={volumeLabel}
                        fill="#38bdf8"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={34}
                      />
                    )}
                    {chartMetricMode === 'e1rm' && (
                      <Area
                        yAxisId="e1rm"
                        type="monotone"
                        dataKey="e1rmKg"
                        name={e1rmLabel}
                        stroke="#f97316"
                        strokeWidth={3}
                        fill="#f97316"
                        fillOpacity={0.18}
                        dot={{ r: 4, fill: '#f97316', stroke: '#ffffff', strokeWidth: 1.5 }}
                        connectNulls
                      />
                    )}
                    {chartMetricMode === 'combined' && (
                      <Line
                        yAxisId="e1rm"
                        type="monotone"
                        dataKey="e1rmKg"
                        name={e1rmLabel}
                        stroke="#f97316"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#f97316', stroke: '#ffffff', strokeWidth: 1.5 }}
                        activeDot={{ r: 6, fill: '#f97316' }}
                        connectNulls
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Body Measurement Logger — Solid Dark #13182b Card */}
            <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#13182b] p-4 space-y-3 text-xs shadow-xs">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {tr(lang, 'تسجيل القياسات الجسدية', 'Journal des Mensurations', 'Body Measurements Logger')}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">{tr(lang, 'الوزن (كغ)', 'Poids (kg)', 'Weight (kg)')}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightIn}
                    onChange={(e) => setWeightIn(Number(e.target.value) || 0)}
                    className="w-full h-9 px-2 text-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f1423] text-slate-900 dark:text-white font-bold mono-num"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">{tr(lang, 'الخصر (سم)', 'Taille (cm)', 'Waist (cm)')}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={waistIn}
                    onChange={(e) => setWaistIn(Number(e.target.value) || 0)}
                    className="w-full h-9 px-2 text-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f1423] text-slate-900 dark:text-white font-bold mono-num"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">{tr(lang, 'الذراع (سم)', 'Bras (cm)', 'Arm (cm)')}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={armIn}
                    onChange={(e) => setArmIn(Number(e.target.value) || 0)}
                    className="w-full h-9 px-2 text-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f1423] text-slate-900 dark:text-white font-bold mono-num"
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
                className="w-full h-10 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>{tr(lang, 'حفظ قياس اليوم', 'Ajouter Mesure', 'Log Measurement')}</span>
              </button>

              <div className="space-y-1.5 max-h-44 overflow-y-auto pt-1 custom-scroll">
                {[...state.measurements].reverse().map((m, idx) => (
                  <div
                    key={`M_${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#0f1423] border border-slate-200 dark:border-slate-800 border-s-4 border-s-orange-500 mono-num"
                  >
                    <span className="text-slate-500 dark:text-slate-400">{m.date}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{m.weight} kg · {m.waist} cm · {m.arm} cm</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Completed Sessions History */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#13182b] p-4 space-y-2.5 text-xs shadow-xs">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {tr(lang, 'سجل الحصص التدريبية المكتملة', 'Historique des Séances', 'Completed Workout Sessions')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[...state.sessionHistory].reverse().map((ses) => (
                <div
                  key={ses.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0f1423] border border-slate-200 dark:border-slate-800 border-s-4 border-s-orange-500 space-y-1"
                >
                  <div className="flex justify-between font-extrabold">
                    <span className="text-orange-500">
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
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#13182b] p-4 space-y-3 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-500" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {tr(lang, 'متابعة راحة واستجابة المفاصل (قبل / بعد / اليوم التالي)', 'Suivi Articulaire (Avant / Après / Lendemain)', 'Joint Comfort & Response Tracker')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {tr(lang, 'قبل التمرين:', 'Avant :', 'Pre-Session:')} <span className="mono-num text-orange-500 font-extrabold">{jPre}/10</span>
                </label>
                <input type="range" min={0} max={10} value={jPre} onChange={(e) => setJPre(Number(e.target.value))} className="w-full accent-orange-500" />
              </div>
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {tr(lang, 'بعد التمرين:', 'Après :', 'Post-Session:')} <span className="mono-num text-orange-500 font-extrabold">{jPost}/10</span>
                </label>
                <input type="range" min={0} max={10} value={jPost} onChange={(e) => setJPost(Number(e.target.value))} className="w-full accent-orange-500" />
              </div>
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {tr(lang, 'اليوم التالي (24h):', 'Lendemain :', 'Next-Day (24h):')} <span className="mono-num text-orange-500 font-extrabold">{jNextDay}/10</span>
                </label>
                <input type="range" min={0} max={10} value={jNextDay} onChange={(e) => setJNextDay(Number(e.target.value))} className="w-full accent-orange-500" />
              </div>
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {tr(lang, 'جودة الأداء (1–5):', 'Qualité (1–5) :', 'Performance (1–5):')} <span className="mono-num text-orange-500 font-extrabold">{jPerf}/5</span>
                </label>
                <input type="range" min={1} max={5} value={jPerf} onChange={(e) => setJPerf(Number(e.target.value))} className="w-full accent-orange-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <input
                type="text"
                value={jNote}
                onChange={(e) => setJNote(e.target.value)}
                placeholder={tr(lang, 'ملاحظة سريعة (مثال: راحة ممتازة في تمارين الأرجل)...', 'Note fonctionnelle...', 'Functional note (e.g. comfortable leg press)...')}
                className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
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
                className="h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold whitespace-nowrap transition shadow-xs cursor-pointer"
              >
                {tr(lang, 'حفظ التقييم', 'Enregistrer', 'Save Check-In')}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
              <Bot className="w-5 h-5 text-orange-500" />
              <span>{tr(lang, 'توصيات المدرب الذكي القابلة للتفسير', 'Recommandations Explicables du Coach', 'Explainable Smart Coach Insights')}</span>
            </div>

            {coachRecs.map((rec) => (
              <div
                key={rec.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 border-s-4 border-s-orange-500 bg-white dark:bg-[#13182b] p-4 space-y-2.5 text-xs shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {trText(lang, rec.title)}
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-orange-500 font-bold uppercase text-[10px]">
                    {tr(lang, 'درجة الثقة:', 'Confiance :', 'Confidence:')} {rec.confidence}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                    <strong className="text-orange-500 block mb-0.5">{tr(lang, 'ما رُصد:', 'Observé :', 'Observed:')}</strong>
                    <p className="text-slate-700 dark:text-slate-300">{trText(lang, rec.observed)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                    <strong className="text-sky-500 block mb-0.5">{tr(lang, 'أساس البيانات:', 'Base de données :', 'Data Basis:')}</strong>
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
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold whitespace-nowrap transition shadow-xs cursor-pointer"
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
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#13182b] p-4 space-y-3 text-xs shadow-xs">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {tr(lang, 'حفظ واستعادة بياناتك وتثبيت التطبيق (PWA)', 'Sauvegarde JSON & Installation PWA', 'Data Backup (Validated JSON) & App Install')}
            </h3>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold whitespace-nowrap transition shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{tr(lang, 'تصدير نسخة احتياطية JSON', 'Exporter JSON', 'Export Backup JSON')}</span>
              </button>

              <label className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 font-extrabold whitespace-nowrap cursor-pointer hover:border-orange-500 transition">
                <Upload className="w-4 h-4" />
                <span>{tr(lang, 'استيراد نسخة احتياطية JSON', 'Importer JSON', 'Import Backup JSON')}</span>
                <input type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" />
              </label>

              {isInstallable && !isInstalled && (
                <button
                  type="button"
                  onClick={() => void install()}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-extrabold whitespace-nowrap hover:bg-orange-500 transition shadow-xs cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{tr(lang, 'تثبيت التطبيق على الجهاز', 'Installer l’application', 'Install App (Offline)')}</span>
                </button>
              )}
              {isInstalled && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-500 font-bold">
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

          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-orange-500" />
              <span>{tr(lang, `المراجع العلمية المعتمدة (${SCIENTIFIC_STUDIES.length})`, `Registre Scientifique (${SCIENTIFIC_STUDIES.length})`, `Audited Scientific Registry (${SCIENTIFIC_STUDIES.length})`)}</span>
            </h3>
            {SCIENTIFIC_STUDIES.map((st) => (
              <div
                key={`REF_${st.id}`}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#13182b] p-4 space-y-2 text-xs shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-extrabold text-orange-500">
                    {st.authors} ({st.year}) · {st.journal}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
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
                    className="inline-flex items-center gap-1 text-orange-500 font-bold hover:underline"
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
