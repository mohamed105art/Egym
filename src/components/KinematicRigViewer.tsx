import React, { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { tr } from '../engine/i18n';
import { Lang, RigMovementType } from '../types/app';

interface KinematicPose {
  hip: [number, number];
  torsoDeg: number; // angle from horizontal-right (90 = straight up, 0 = horizontal right, 180 = left)
  thighDeg: number;
  shinDeg: number;
  upperArmDeg: number;
  forearmDeg: number;
  implement: 'dumbbell' | 'barbell' | 'cable_handle' | 'rope' | 'machine_pad' | 'none';
  implementOffset?: [number, number];
  bench?: 'incline30' | 'flat' | 'incline60' | 'upright75' | 'leg_press' | 'leg_curl' | 'leg_ext' | 'preacher' | 'calf_block' | 'back_ext45' | 'cable_high' | 'cable_low' | 'floor_kneel';
}

const SEG = {
  torso: 54,
  headNeck: 16,
  thigh: 42,
  shin: 40,
  upperArm: 32,
  forearm: 30,
};

function degToRad(d: number) {
  return (d * Math.PI) / 180;
}

function project(pt: [number, number], deg: number, len: number): [number, number] {
  const r = degToRad(deg);
  return [pt[0] + Math.cos(r) * len, pt[1] - Math.sin(r) * len];
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpPose(p1: KinematicPose, p2: KinematicPose, t: number): KinematicPose {
  return {
    hip: [lerp(p1.hip[0], p2.hip[0], t), lerp(p1.hip[1], p2.hip[1], t)],
    torsoDeg: lerp(p1.torsoDeg, p2.torsoDeg, t),
    thighDeg: lerp(p1.thighDeg, p2.thighDeg, t),
    shinDeg: lerp(p1.shinDeg, p2.shinDeg, t),
    upperArmDeg: lerp(p1.upperArmDeg, p2.upperArmDeg, t),
    forearmDeg: lerp(p1.forearmDeg, p2.forearmDeg, t),
    implement: p1.implement,
    bench: p1.bench,
  };
}

function build5FrameCycle(start: KinematicPose, mid: KinematicPose, peak: KinematicPose): KinematicPose[] {
  return [
    start, // Frame 1: Starting Position
    lerpPose(start, mid, 0.55), // Frame 2: Initial Movement
    mid, // Frame 3: Midpoint
    peak, // Frame 4: Peak Contraction / End
    lerpPose(peak, start, 0.5), // Frame 5: Eccentric Return
  ];
}

const RIG_PRESETS: Record<RigMovementType, KinematicPose[]> = {
  incline_press: build5FrameCycle(
    { hip: [130, 145], torsoDeg: 150, thighDeg: -10, shinDeg: -88, upperArmDeg: 40, forearmDeg: 90, implement: 'dumbbell', bench: 'incline30' },
    { hip: [130, 145], torsoDeg: 150, thighDeg: -10, shinDeg: -88, upperArmDeg: 20, forearmDeg: 88, implement: 'dumbbell', bench: 'incline30' },
    { hip: [130, 145], torsoDeg: 150, thighDeg: -10, shinDeg: -88, upperArmDeg: 85, forearmDeg: 90, implement: 'dumbbell', bench: 'incline30' }
  ),
  flat_press: build5FrameCycle(
    { hip: [135, 138], torsoDeg: 180, thighDeg: -12, shinDeg: -88, upperArmDeg: 25, forearmDeg: 90, implement: 'dumbbell', bench: 'flat' },
    { hip: [135, 138], torsoDeg: 180, thighDeg: -12, shinDeg: -88, upperArmDeg: 55, forearmDeg: 90, implement: 'dumbbell', bench: 'flat' },
    { hip: [135, 138], torsoDeg: 180, thighDeg: -12, shinDeg: -88, upperArmDeg: 92, forearmDeg: 90, implement: 'dumbbell', bench: 'flat' }
  ),
  pec_deck: build5FrameCycle(
    { hip: [120, 142], torsoDeg: 95, thighDeg: 0, shinDeg: -90, upperArmDeg: 145, forearmDeg: 95, implement: 'machine_pad', bench: 'upright75' },
    { hip: [120, 142], torsoDeg: 95, thighDeg: 0, shinDeg: -90, upperArmDeg: 65, forearmDeg: 85, implement: 'machine_pad', bench: 'upright75' },
    { hip: [120, 142], torsoDeg: 95, thighDeg: 0, shinDeg: -90, upperArmDeg: 5, forearmDeg: 50, implement: 'machine_pad', bench: 'upright75' }
  ),
  chest_row: build5FrameCycle(
    { hip: [105, 145], torsoDeg: 62, thighDeg: -10, shinDeg: -90, upperArmDeg: -15, forearmDeg: -10, implement: 'machine_pad', bench: 'incline60' },
    { hip: [105, 145], torsoDeg: 62, thighDeg: -10, shinDeg: -90, upperArmDeg: -110, forearmDeg: -10, implement: 'machine_pad', bench: 'incline60' },
    { hip: [105, 145], torsoDeg: 62, thighDeg: -10, shinDeg: -90, upperArmDeg: -160, forearmDeg: -5, implement: 'machine_pad', bench: 'incline60' }
  ),
  cable_row: build5FrameCycle(
    { hip: [110, 148], torsoDeg: 82, thighDeg: -5, shinDeg: -15, upperArmDeg: -5, forearmDeg: 0, implement: 'cable_handle', bench: 'cable_low' },
    { hip: [110, 148], torsoDeg: 90, thighDeg: -5, shinDeg: -15, upperArmDeg: -95, forearmDeg: 0, implement: 'cable_handle', bench: 'cable_low' },
    { hip: [110, 148], torsoDeg: 95, thighDeg: -5, shinDeg: -15, upperArmDeg: -155, forearmDeg: 5, implement: 'cable_handle', bench: 'cable_low' }
  ),
  lat_pulldown: build5FrameCycle(
    { hip: [130, 148], torsoDeg: 96, thighDeg: 0, shinDeg: -90, upperArmDeg: 82, forearmDeg: 88, implement: 'cable_handle', bench: 'cable_high' },
    { hip: [130, 148], torsoDeg: 102, thighDeg: 0, shinDeg: -90, upperArmDeg: 15, forearmDeg: 85, implement: 'cable_handle', bench: 'cable_high' },
    { hip: [130, 148], torsoDeg: 105, thighDeg: 0, shinDeg: -90, upperArmDeg: -75, forearmDeg: 75, implement: 'cable_handle', bench: 'cable_high' }
  ),
  leg_press: build5FrameCycle(
    { hip: [95, 152], torsoDeg: 140, thighDeg: 80, shinDeg: 5, implement: 'machine_pad', bench: 'leg_press', upperArmDeg: -45, forearmDeg: 25 },
    { hip: [95, 152], torsoDeg: 140, thighDeg: 62, shinDeg: 18, implement: 'machine_pad', bench: 'leg_press', upperArmDeg: -45, forearmDeg: 25 },
    { hip: [95, 152], torsoDeg: 140, thighDeg: 42, shinDeg: 36, implement: 'machine_pad', bench: 'leg_press', upperArmDeg: -45, forearmDeg: 25 }
  ),
  hack_squat: build5FrameCycle(
    { hip: [120, 155], torsoDeg: 112, thighDeg: 15, shinDeg: -68, implement: 'machine_pad', bench: 'leg_press', upperArmDeg: 105, forearmDeg: 90 },
    { hip: [112, 130], torsoDeg: 112, thighDeg: -40, shinDeg: -76, implement: 'machine_pad', bench: 'leg_press', upperArmDeg: 105, forearmDeg: 90 },
    { hip: [105, 108], torsoDeg: 112, thighDeg: -78, shinDeg: -84, implement: 'machine_pad', bench: 'leg_press', upperArmDeg: 105, forearmDeg: 90 }
  ),
  leg_extension: build5FrameCycle(
    { hip: [120, 138], torsoDeg: 98, thighDeg: 0, shinDeg: -90, upperArmDeg: -85, forearmDeg: -10, implement: 'machine_pad', bench: 'leg_ext' },
    { hip: [120, 138], torsoDeg: 98, thighDeg: 0, shinDeg: -48, upperArmDeg: -85, forearmDeg: -10, implement: 'machine_pad', bench: 'leg_ext' },
    { hip: [120, 138], torsoDeg: 98, thighDeg: 0, shinDeg: -18, upperArmDeg: -85, forearmDeg: -10, implement: 'machine_pad', bench: 'leg_ext' }
  ),
  seated_leg_curl: build5FrameCycle(
    { hip: [120, 138], torsoDeg: 85, thighDeg: 2, shinDeg: -5, upperArmDeg: -80, forearmDeg: -5, implement: 'machine_pad', bench: 'leg_curl' },
    { hip: [120, 138], torsoDeg: 85, thighDeg: 2, shinDeg: -52, upperArmDeg: -80, forearmDeg: -5, implement: 'machine_pad', bench: 'leg_curl' },
    { hip: [120, 138], torsoDeg: 85, thighDeg: 2, shinDeg: -102, upperArmDeg: -80, forearmDeg: -5, implement: 'machine_pad', bench: 'leg_curl' }
  ),
  lying_leg_curl: build5FrameCycle(
    { hip: [135, 138], torsoDeg: 176, thighDeg: -2, shinDeg: -4, upperArmDeg: -135, forearmDeg: 165, implement: 'machine_pad', bench: 'flat' },
    { hip: [135, 138], torsoDeg: 176, thighDeg: -2, shinDeg: 50, upperArmDeg: -135, forearmDeg: 165, implement: 'machine_pad', bench: 'flat' },
    { hip: [135, 138], torsoDeg: 176, thighDeg: -2, shinDeg: 105, upperArmDeg: -135, forearmDeg: 165, implement: 'machine_pad', bench: 'flat' }
  ),
  rdl: build5FrameCycle(
    { hip: [135, 110], torsoDeg: 88, thighDeg: -82, shinDeg: -92, upperArmDeg: -85, forearmDeg: -88, implement: 'dumbbell' },
    { hip: [122, 114], torsoDeg: 45, thighDeg: -72, shinDeg: -95, upperArmDeg: -90, forearmDeg: -90, implement: 'dumbbell' },
    { hip: [110, 118], torsoDeg: 12, thighDeg: -65, shinDeg: -96, upperArmDeg: -90, forearmDeg: -90, implement: 'dumbbell' }
  ),
  split_squat: build5FrameCycle(
    { hip: [135, 108], torsoDeg: 82, thighDeg: -65, shinDeg: -92, upperArmDeg: -88, forearmDeg: -90, implement: 'dumbbell' },
    { hip: [130, 128], torsoDeg: 72, thighDeg: -32, shinDeg: -90, upperArmDeg: -88, forearmDeg: -90, implement: 'dumbbell' },
    { hip: [126, 146], torsoDeg: 66, thighDeg: -4, shinDeg: -88, upperArmDeg: -88, forearmDeg: -90, implement: 'dumbbell' }
  ),
  hip_thrust: build5FrameCycle(
    { hip: [140, 162], torsoDeg: 138, thighDeg: 28, shinDeg: -86, upperArmDeg: 145, forearmDeg: 175, implement: 'barbell', bench: 'flat' },
    { hip: [140, 144], torsoDeg: 158, thighDeg: 12, shinDeg: -88, upperArmDeg: 155, forearmDeg: 175, implement: 'barbell', bench: 'flat' },
    { hip: [140, 126], torsoDeg: 178, thighDeg: -2, shinDeg: -90, upperArmDeg: 170, forearmDeg: 180, implement: 'barbell', bench: 'flat' }
  ),
  lateral_raise: build5FrameCycle(
    { hip: [140, 112], torsoDeg: 86, thighDeg: -88, shinDeg: -90, upperArmDeg: -82, forearmDeg: -75, implement: 'dumbbell' },
    { hip: [140, 112], torsoDeg: 86, thighDeg: -88, shinDeg: -90, upperArmDeg: -35, forearmDeg: -25, implement: 'dumbbell' },
    { hip: [140, 112], torsoDeg: 86, thighDeg: -88, shinDeg: -90, upperArmDeg: 4, forearmDeg: 8, implement: 'dumbbell' }
  ),
  shoulder_press: build5FrameCycle(
    { hip: [135, 142], torsoDeg: 104, thighDeg: -5, shinDeg: -90, upperArmDeg: 12, forearmDeg: 88, implement: 'dumbbell', bench: 'upright75' },
    { hip: [135, 142], torsoDeg: 104, thighDeg: -5, shinDeg: -90, upperArmDeg: 52, forearmDeg: 90, implement: 'dumbbell', bench: 'upright75' },
    { hip: [135, 142], torsoDeg: 104, thighDeg: -5, shinDeg: -90, upperArmDeg: 90, forearmDeg: 92, implement: 'dumbbell', bench: 'upright75' }
  ),
  face_pull: build5FrameCycle(
    { hip: [140, 114], torsoDeg: 92, thighDeg: -85, shinDeg: -92, upperArmDeg: 12, forearmDeg: 15, implement: 'rope', bench: 'cable_high' },
    { hip: [140, 114], torsoDeg: 94, thighDeg: -85, shinDeg: -92, upperArmDeg: 8, forearmDeg: 55, implement: 'rope', bench: 'cable_high' },
    { hip: [140, 114], torsoDeg: 95, thighDeg: -85, shinDeg: -92, upperArmDeg: -170, forearmDeg: 98, implement: 'rope', bench: 'cable_high' }
  ),
  reverse_fly: build5FrameCycle(
    { hip: [135, 142], torsoDeg: 88, thighDeg: 0, shinDeg: -90, upperArmDeg: 2, forearmDeg: 5, implement: 'machine_pad', bench: 'upright75' },
    { hip: [135, 142], torsoDeg: 88, thighDeg: 0, shinDeg: -90, upperArmDeg: -95, forearmDeg: -10, implement: 'machine_pad', bench: 'upright75' },
    { hip: [135, 142], torsoDeg: 88, thighDeg: 0, shinDeg: -90, upperArmDeg: -175, forearmDeg: -175, implement: 'machine_pad', bench: 'upright75' }
  ),
  incline_curl: build5FrameCycle(
    { hip: [125, 144], torsoDeg: 125, thighDeg: -10, shinDeg: -88, upperArmDeg: -88, forearmDeg: -85, implement: 'dumbbell', bench: 'incline60' },
    { hip: [125, 144], torsoDeg: 125, thighDeg: -10, shinDeg: -88, upperArmDeg: -85, forearmDeg: -5, implement: 'dumbbell', bench: 'incline60' },
    { hip: [125, 144], torsoDeg: 125, thighDeg: -10, shinDeg: -88, upperArmDeg: -82, forearmDeg: 62, implement: 'dumbbell', bench: 'incline60' }
  ),
  standing_curl: build5FrameCycle(
    { hip: [140, 112], torsoDeg: 90, thighDeg: -88, shinDeg: -90, upperArmDeg: -88, forearmDeg: -82, implement: 'dumbbell' },
    { hip: [140, 112], torsoDeg: 90, thighDeg: -88, shinDeg: -90, upperArmDeg: -84, forearmDeg: 0, implement: 'dumbbell' },
    { hip: [140, 112], torsoDeg: 90, thighDeg: -88, shinDeg: -90, upperArmDeg: -78, forearmDeg: 68, implement: 'dumbbell' }
  ),
  preacher_curl: build5FrameCycle(
    { hip: [115, 145], torsoDeg: 78, thighDeg: -12, shinDeg: -90, upperArmDeg: -45, forearmDeg: -40, implement: 'dumbbell', bench: 'preacher' },
    { hip: [115, 145], torsoDeg: 78, thighDeg: -12, shinDeg: -90, upperArmDeg: -45, forearmDeg: 25, implement: 'dumbbell', bench: 'preacher' },
    { hip: [115, 145], torsoDeg: 78, thighDeg: -12, shinDeg: -90, upperArmDeg: -45, forearmDeg: 88, implement: 'dumbbell', bench: 'preacher' }
  ),
  overhead_triceps: build5FrameCycle(
    { hip: [140, 115], torsoDeg: 68, thighDeg: -80, shinDeg: -95, upperArmDeg: 68, forearmDeg: -120, implement: 'rope', bench: 'cable_low' },
    { hip: [140, 115], torsoDeg: 68, thighDeg: -80, shinDeg: -95, upperArmDeg: 68, forearmDeg: -10, implement: 'rope', bench: 'cable_low' },
    { hip: [140, 115], torsoDeg: 68, thighDeg: -80, shinDeg: -95, upperArmDeg: 68, forearmDeg: 64, implement: 'rope', bench: 'cable_low' }
  ),
  rope_pushdown: build5FrameCycle(
    { hip: [130, 114], torsoDeg: 80, thighDeg: -88, shinDeg: -90, upperArmDeg: -85, forearmDeg: 45, implement: 'rope', bench: 'cable_high' },
    { hip: [130, 114], torsoDeg: 80, thighDeg: -88, shinDeg: -90, upperArmDeg: -85, forearmDeg: -18, implement: 'rope', bench: 'cable_high' },
    { hip: [130, 114], torsoDeg: 80, thighDeg: -88, shinDeg: -90, upperArmDeg: -85, forearmDeg: -85, implement: 'rope', bench: 'cable_high' }
  ),
  standing_calf: build5FrameCycle(
    { hip: [140, 114], torsoDeg: 90, thighDeg: -90, shinDeg: -90, upperArmDeg: -85, forearmDeg: 80, implement: 'none', bench: 'calf_block' },
    { hip: [140, 108], torsoDeg: 90, thighDeg: -90, shinDeg: -88, upperArmDeg: -85, forearmDeg: 80, implement: 'none', bench: 'calf_block' },
    { hip: [140, 100], torsoDeg: 90, thighDeg: -90, shinDeg: -86, upperArmDeg: -85, forearmDeg: 80, implement: 'none', bench: 'calf_block' }
  ),
  seated_calf: build5FrameCycle(
    { hip: [120, 144], torsoDeg: 92, thighDeg: 5, shinDeg: -90, upperArmDeg: -65, forearmDeg: -25, implement: 'machine_pad', bench: 'calf_block' },
    { hip: [120, 144], torsoDeg: 92, thighDeg: 0, shinDeg: -90, upperArmDeg: -65, forearmDeg: -25, implement: 'machine_pad', bench: 'calf_block' },
    { hip: [120, 144], torsoDeg: 92, thighDeg: -8, shinDeg: -90, upperArmDeg: -65, forearmDeg: -25, implement: 'machine_pad', bench: 'calf_block' }
  ),
  cable_crunch: build5FrameCycle(
    { hip: [135, 148], torsoDeg: 88, thighDeg: -90, shinDeg: 180, upperArmDeg: 75, forearmDeg: 135, implement: 'rope', bench: 'floor_kneel' },
    { hip: [135, 148], torsoDeg: 55, thighDeg: -90, shinDeg: 180, upperArmDeg: 45, forearmDeg: 110, implement: 'rope', bench: 'floor_kneel' },
    { hip: [135, 148], torsoDeg: 25, thighDeg: -90, shinDeg: 180, upperArmDeg: 10, forearmDeg: 85, implement: 'rope', bench: 'floor_kneel' }
  ),
  shrug: build5FrameCycle(
    { hip: [140, 114], torsoDeg: 85, thighDeg: -90, shinDeg: -90, upperArmDeg: -90, forearmDeg: -90, implement: 'dumbbell' },
    { hip: [140, 114], torsoDeg: 85, thighDeg: -90, shinDeg: -90, upperArmDeg: -90, forearmDeg: -90, implement: 'dumbbell', implementOffset: [0, -5] },
    { hip: [140, 114], torsoDeg: 85, thighDeg: -90, shinDeg: -90, upperArmDeg: -90, forearmDeg: -90, implement: 'dumbbell', implementOffset: [0, -10] }
  ),
  back_extension: build5FrameCycle(
    { hip: [135, 128], torsoDeg: -25, thighDeg: -135, shinDeg: -135, upperArmDeg: -90, forearmDeg: -45, implement: 'none', bench: 'back_ext45' },
    { hip: [135, 128], torsoDeg: 12, thighDeg: -135, shinDeg: -135, upperArmDeg: -50, forearmDeg: 5, implement: 'none', bench: 'back_ext45' },
    { hip: [135, 128], torsoDeg: 45, thighDeg: -135, shinDeg: -135, upperArmDeg: 5, forearmDeg: 55, implement: 'none', bench: 'back_ext45' }
  ),
};

interface KinematicRigViewerProps {
  rigType: RigMovementType;
  lang: Lang;
  compact?: boolean;
}

const FRAME_LABELS = [
  { ar: '1. وضعية البداية', fr: '1. Position Départ', en: '1. Starting Position' },
  { ar: '2. بدء الحركة', fr: '2. Début Mouvement', en: '2. Initial Movement' },
  { ar: '3. منتصف المسار', fr: '3. Mi-parcours', en: '3. Midpoint' },
  { ar: '4. الذروة / النهاية', fr: '4. Contraction / Fin', en: '4. Peak / End' },
  { ar: '5. العودة المتحكم فيها', fr: '5. Retour Excentrique', en: '5. Eccentric Return' },
];

export const KinematicRigViewer: React.FC<KinematicRigViewerProps> = ({ rigType, lang, compact = false }) => {
  const frames = RIG_PRESETS[rigType] || RIG_PRESETS.incline_press;
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const intervalMs = prefersReduced ? 1400 : 750;
    const id = setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % 5);
    }, intervalMs);
    return () => clearInterval(id);
  }, [playing]);

  const pose = frames[frameIdx] || frames[0];
  const shoulderShiftY = rigType === 'shrug' ? (frameIdx === 2 || frameIdx === 3 ? -7 : frameIdx === 1 || frameIdx === 4 ? -3.5 : 0) : 0;

  const hip = pose.hip;
  const shoulderRaw = project(hip, pose.torsoDeg, SEG.torso);
  const shoulder: [number, number] = [shoulderRaw[0], shoulderRaw[1] + shoulderShiftY];
  const head = project(shoulder, pose.torsoDeg, SEG.headNeck);
  const knee = project(hip, pose.thighDeg, SEG.thigh);
  const ankle = project(knee, pose.shinDeg, SEG.shin);
  const elbow = project(shoulder, pose.upperArmDeg, SEG.upperArm);
  const wrist = project(elbow, pose.forearmDeg, SEG.forearm);

  const elbowAngle = Math.round(Math.abs(((pose.forearmDeg - pose.upperArmDeg + 540) % 360) - 180));
  const kneeAngle = Math.round(Math.abs(((pose.shinDeg - pose.thighDeg + 540) % 360) - 180));
  const hipAngle = Math.round(Math.abs(((pose.torsoDeg - pose.thighDeg + 540) % 360) - 180));

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
          {tr(lang, FRAME_LABELS[frameIdx].ar, FRAME_LABELS[frameIdx].fr, FRAME_LABELS[frameIdx].en)}
        </span>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition"
          aria-label={playing ? 'Pause motion sequence' : 'Play motion sequence'}
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{playing ? tr(lang, 'إيقاف', 'Pause', 'Pause') : tr(lang, 'تشغيل التسلسل', 'Animer', 'Play 5-Frame')}</span>
        </button>
      </div>

      <div className={`relative w-full ${compact ? 'h-40' : 'h-52'} rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden`}>
        <svg viewBox="0 0 280 210" className="w-full h-full" role="img" aria-label={`Biomechanical 5-frame motion diagram for ${rigType}`}>
          {/* Floor & Reference Grid */}
          <line x1="15" y1="192" x2="265" y2="192" stroke="#64748b" strokeWidth="2" strokeOpacity="0.4" />
          <line x1="15" y1="95" x2="265" y2="95" stroke="#64748b" strokeWidth="0.6" strokeDasharray="3 3" strokeOpacity="0.25" />

          {/* Equipment Layer */}
          {pose.bench === 'flat' && (
            <g stroke="#475569" strokeWidth="5" strokeLinecap="round">
              <line x1="85" y1="148" x2="195" y2="148" />
              <line x1="100" y1="148" x2="100" y2="192" strokeWidth="3" />
              <line x1="175" y1="148" x2="175" y2="192" strokeWidth="3" />
            </g>
          )}
          {pose.bench === 'incline30' && (
            <g stroke="#475569" strokeWidth="5" strokeLinecap="round">
              <line x1="80" y1="122" x2="140" y2="152" />
              <line x1="140" y1="152" x2="165" y2="152" />
              <line x1="100" y1="132" x2="100" y2="192" strokeWidth="3" />
              <line x1="155" y1="152" x2="155" y2="192" strokeWidth="3" />
            </g>
          )}
          {(pose.bench === 'incline60' || pose.bench === 'upright75') && (
            <g stroke="#475569" strokeWidth="5" strokeLinecap="round">
              <line x1="110" y1="92" x2="130" y2="150" />
              <line x1="125" y1="150" x2="155" y2="150" />
              <line x1="138" y1="150" x2="138" y2="192" strokeWidth="3" />
            </g>
          )}
          {pose.bench === 'cable_high' && (
            <g>
              <line x1="230" y1="20" x2="230" y2="192" stroke="#475569" strokeWidth="4" />
              <circle cx="226" cy="34" r="5" fill="#0ea5e9" />
              <line x1="226" y1="34" x2={wrist[0]} y2={wrist[1]} stroke="#0ea5e9" strokeWidth="1.8" strokeDasharray="3 2" />
            </g>
          )}
          {pose.bench === 'cable_low' && (
            <g>
              <line x1="230" y1="20" x2="230" y2="192" stroke="#475569" strokeWidth="4" />
              <circle cx="226" cy="176" r="5" fill="#0ea5e9" />
              <line x1="226" y1="176" x2={wrist[0]} y2={wrist[1]} stroke="#0ea5e9" strokeWidth="1.8" strokeDasharray="3 2" />
            </g>
          )}
          {pose.bench === 'leg_press' && (
            <g stroke="#475569" strokeWidth="4" strokeLinecap="round">
              <line x1="52" y1="115" x2="100" y2="160" />
              <line x1={ankle[0] + 6} y1={ankle[1] - 18} x2={ankle[0] + 6} y2={ankle[1] + 18} stroke="#0ea5e9" strokeWidth="5" />
            </g>
          )}
          {(pose.bench === 'leg_ext' || pose.bench === 'leg_curl') && (
            <g stroke="#475569" strokeWidth="4" strokeLinecap="round">
              <line x1="95" y1="146" x2="145" y2="146" />
              <line x1="112" y1="146" x2="112" y2="192" strokeWidth="3" />
              <circle cx={ankle[0]} cy={ankle[1]} r="6" fill="#0ea5e9" stroke="none" />
            </g>
          )}
          {pose.bench === 'preacher' && (
            <g stroke="#475569" strokeWidth="5" strokeLinecap="round">
              <line x1="138" y1="106" x2="164" y2="138" />
              <line x1="148" y1="122" x2="148" y2="192" strokeWidth="3" />
            </g>
          )}
          {pose.bench === 'calf_block' && (
            <rect x="124" y="180" width="32" height="12" rx="2" fill="#475569" />
          )}
          {pose.bench === 'back_ext45' && (
            <g stroke="#475569" strokeWidth="5" strokeLinecap="round">
              <line x1="78" y1="192" x2="132" y2="128" />
              <circle cx="132" cy="128" r="7" fill="#0ea5e9" stroke="none" />
            </g>
          )}

          {/* Far-side subtle limb shadow for depth */}
          <g stroke="#94a3b8" strokeOpacity="0.35" strokeWidth="6" strokeLinecap="round">
            <line x1={hip[0] - 4} y1={hip[1] + 2} x2={knee[0] - 5} y2={knee[1] + 2} />
            <line x1={knee[0] - 5} y1={knee[1] + 2} x2={ankle[0] - 5} y2={ankle[1] + 2} />
          </g>

          {/* Primary Articulated Skeleton (Fixed Bone Lengths) */}
          {/* Spine / Torso */}
          <line x1={hip[0]} y1={hip[1]} x2={shoulder[0]} y2={shoulder[1]} stroke="#10b981" strokeWidth="9" strokeLinecap="round" />
          {/* Neck & Head */}
          <line x1={shoulder[0]} y1={shoulder[1]} x2={head[0]} y2={head[1]} stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
          <circle cx={head[0]} cy={head[1]} r="10" fill="#1e293b" stroke="#10b981" strokeWidth="2.5" />

          {/* Thigh & Shin */}
          <line x1={hip[0]} y1={hip[1]} x2={knee[0]} y2={knee[1]} stroke="#38bdf8" strokeWidth="8" strokeLinecap="round" />
          <line x1={knee[0]} y1={knee[1]} x2={ankle[0]} y2={ankle[1]} stroke="#0284c7" strokeWidth="6.5" strokeLinecap="round" />
          {/* Foot */}
          <line x1={ankle[0]} y1={ankle[1]} x2={ankle[0] + 12} y2={ankle[1]} stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />

          {/* Upper Arm & Forearm */}
          <line x1={shoulder[0]} y1={shoulder[1]} x2={elbow[0]} y2={elbow[1]} stroke="#34d399" strokeWidth="6.5" strokeLinecap="round" />
          <line x1={elbow[0]} y1={elbow[1]} x2={wrist[0]} y2={wrist[1]} stroke="#059669" strokeWidth="5.5" strokeLinecap="round" />

          {/* Joint Articulation Nodes */}
          <circle cx={hip[0]} cy={hip[1]} r="4.5" fill="#f59e0b" />
          <circle cx={shoulder[0]} cy={shoulder[1]} r="4.5" fill="#f59e0b" />
          <circle cx={knee[0]} cy={knee[1]} r="4" fill="#e2e8f0" />
          <circle cx={elbow[0]} cy={elbow[1]} r="3.5" fill="#e2e8f0" />

          {/* Hand & Implement (Dumbbell / Barbell / Rope) */}
          {pose.implement === 'dumbbell' && (
            <g transform={`translate(${wrist[0]}, ${wrist[1]})`}>
              <rect x="-8" y="-3.5" width="16" height="7" rx="2" fill="#f59e0b" />
              <circle cx="0" cy="0" r="3" fill="#0f172a" />
            </g>
          )}
          {pose.implement === 'barbell' && (
            <g transform={`translate(${wrist[0]}, ${wrist[1]})`}>
              <circle cx="0" cy="0" r="9" fill="none" stroke="#f59e0b" strokeWidth="4" />
              <circle cx="0" cy="0" r="3" fill="#e2e8f0" />
            </g>
          )}
          {(pose.implement === 'rope' || pose.implement === 'cable_handle') && (
            <circle cx={wrist[0]} cy={wrist[1]} r="4.5" fill="#f59e0b" />
          )}
        </svg>

        {/* Live Kinematic Joint Angles Overlay */}
        <div className="absolute bottom-1.5 inset-x-2 flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-950/80 px-2 py-0.5 rounded-lg">
          <span>Hip: {hipAngle}°</span>
          <span>Knee: {kneeAngle}°</span>
          <span>Elbow: {elbowAngle}°</span>
        </div>
      </div>

      {/* 5-Frame Scrub Buttons */}
      <div className="grid grid-cols-5 gap-1">
        {[0, 1, 2, 3, 4].map((idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setPlaying(false);
              setFrameIdx(idx);
            }}
            className={`py-1.5 rounded-lg text-[11px] font-bold mono-num transition ${
              frameIdx === idx
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            F{idx + 1}
          </button>
        ))}
      </div>
    </div>
  );
};
