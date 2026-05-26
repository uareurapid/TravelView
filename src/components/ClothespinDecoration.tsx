import React from 'react';
import Svg, { Path, Ellipse, Line, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props {
  /** Scale multiplier — default 1 renders at 28×52 pts */
  scale?: number;
}

/**
 * Wooden spring clothes peg — front view.
 * Each arm is a single continuous tapered wooden piece.
 * The spring coil sits in the gap between the two arms.
 *
 * Anatomy (top → bottom of the 28×52 viewBox):
 *   0–22  handle / push portion (wider, ~13 pt)
 *  22–30  spring waist (narrows slightly on each arm)
 *  30–52  jaw / gripping portion (narrower, ~9 pt)
 */
export default function ClothespinDecoration({ scale = 1 }: Props) {
  return (
    <Svg width={28 * scale} height={52 * scale} viewBox="0 0 28 52">
      <Defs>
        {/* Light-left gradient — makes each arm look like a 3-D cylinder */}
        <LinearGradient id="wdL" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0"   stopColor="#E0A050" />
          <Stop offset="0.5" stopColor="#C07828" />
          <Stop offset="1"   stopColor="#7A4818" />
        </LinearGradient>
        <LinearGradient id="wdR" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0"   stopColor="#7A4818" />
          <Stop offset="0.5" stopColor="#C07828" />
          <Stop offset="1"   stopColor="#E0A050" />
        </LinearGradient>
      </Defs>

      {/* ── LEFT arm: one continuous tapered wooden piece ─────────── */}
      {/* Handle (top): x 0–13, 13 pt wide                           */}
      {/* Spring waist:  narrows to x 2–11 = 9 pt wide               */}
      {/* Jaw (bottom):  x 2–11, 9 pt wide, rounded tip              */}
      <Path
        d="M2,0 Q0,0 0,2 L0,22 Q0,26 2,28 L2,46 Q2,50 5,50 L9,50 Q11,50 11,46 L11,28 Q13,26 13,22 L13,2 Q13,0 11,0 Z"
        fill="url(#wdL)"
      />
      {/* grain lines */}
      <Line x1="6.5" y1="2"  x2="6.5" y2="49" stroke="#5C3210" strokeWidth="0.6" strokeOpacity="0.28" />
      <Line x1="9"   y1="2"  x2="9"   y2="49" stroke="#5C3210" strokeWidth="0.4" strokeOpacity="0.16" />

      {/* ── RIGHT arm: mirror of left ─────────────────────────────── */}
      {/* Handle: x 15–28 · Spring waist: x 17–26 · Jaw: x 17–26    */}
      <Path
        d="M26,0 Q28,0 28,2 L28,22 Q28,26 26,28 L26,46 Q26,50 23,50 L19,50 Q17,50 17,46 L17,28 Q15,26 15,22 L15,2 Q15,0 17,0 Z"
        fill="url(#wdR)"
      />
      {/* grain lines */}
      <Line x1="21.5" y1="2" x2="21.5" y2="49" stroke="#5C3210" strokeWidth="0.6" strokeOpacity="0.28" />
      <Line x1="19"   y1="2" x2="19"   y2="49" stroke="#5C3210" strokeWidth="0.4" strokeOpacity="0.16" />

      {/* ── Metal spring coil in the gap (x 11–17, centered at x=14) */}
      <Ellipse cx="14" cy="23"   rx="3.2" ry="1.8" stroke="#A0ADB8" strokeWidth="1.4" fill="none" />
      <Ellipse cx="14" cy="26.5" rx="3.2" ry="1.8" stroke="#A0ADB8" strokeWidth="1.4" fill="none" />
      <Ellipse cx="14" cy="30"   rx="3.2" ry="1.8" stroke="#A0ADB8" strokeWidth="1.4" fill="none" />
    </Svg>
  );
}
