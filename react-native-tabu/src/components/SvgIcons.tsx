import React from 'react';
import Svg, {
  Path,
  Circle,
  Rect,
  Defs,
  LinearGradient,
  Stop,
  G,
  Polygon,
} from 'react-native-svg';

// 1. Logo Flame / 3D Sparkle
export const Flame3D: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Defs>
      <LinearGradient id="flameGrad" x1="0%" y1="100%" x2="50%" y2="0%">
        <Stop offset="0%" stopColor="#FF3838" />
        <Stop offset="50%" stopColor="#FF9F1A" />
        <Stop offset="100%" stopColor="#FFF200" />
      </LinearGradient>
      <LinearGradient id="flameInner" x1="0%" y1="100%" x2="0%" y2="0%">
        <Stop offset="0%" stopColor="#FF9F1A" />
        <Stop offset="100%" stopColor="#FFFFFF" />
      </LinearGradient>
    </Defs>
    {/* Outer Flame */}
    <Path
      d="M16 2C15 6 11 9 10 14C9 18 11 23 15 27C16 28 17 28 18 27C22 23 24 18 23 13C22 9 18 6 18 2C17 2 17 2 16 2Z"
      fill="url(#flameGrad)"
    />
    {/* Inner Core Flame */}
    <Path
      d="M16 12C15 15 13 17 13 20C13 23 14.5 25 16 26C17.5 25 19 23 19 20C19 17 17 15 16 12Z"
      fill="url(#flameInner)"
    />
  </Svg>
);

// 2. 3D Correct Checkmark
export const Correct3D: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Defs>
      <LinearGradient id="correctBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#2ED573" />
        <Stop offset="100%" stopColor="#10AC84" />
      </LinearGradient>
      <LinearGradient id="correctShine" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
        <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </LinearGradient>
    </Defs>
    {/* 3D Bottom Shadow */}
    <Circle cx="24" cy="27" r="19" fill="#0A7E5F" />
    {/* Main Face */}
    <Circle cx="24" cy="24" r="19" fill="url(#correctBg)" />
    {/* Inner Gloss */}
    <Circle cx="24" cy="16" r="13" fill="url(#correctShine)" />
    {/* Checkmark with drop shadow */}
    <Path
      d="M15 25.5L21 31.5L34 18.5"
      stroke="#0A7E5F"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(0, 1.5)"
    />
    <Path
      d="M15 25.5L21 31.5L34 18.5"
      stroke="#FFFFFF"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 3. 3D Tabu Forbidden / Cross
export const Tabu3D: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Defs>
      <LinearGradient id="tabuBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FF4757" />
        <Stop offset="100%" stopColor="#EE5253" />
      </LinearGradient>
      <LinearGradient id="tabuShine" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
        <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </LinearGradient>
    </Defs>
    {/* 3D Bottom Shadow */}
    <Circle cx="24" cy="27" r="19" fill="#A81829" />
    {/* Main Face */}
    <Circle cx="24" cy="24" r="19" fill="url(#tabuBg)" />
    {/* Gloss */}
    <Circle cx="24" cy="16" r="13" fill="url(#tabuShine)" />
    {/* X mark */}
    <Path
      d="M17 17L31 31M31 17L17 31"
      stroke="#7E0E1B"
      strokeWidth="5"
      strokeLinecap="round"
      transform="translate(0, 1.5)"
    />
    <Path
      d="M17 17L31 31M31 17L17 31"
      stroke="#FFFFFF"
      strokeWidth="5"
      strokeLinecap="round"
    />
  </Svg>
);

// 4. 3D Pass Fast-Forward
export const Pass3D: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Defs>
      <LinearGradient id="passBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFA502" />
        <Stop offset="100%" stopColor="#E67E22" />
      </LinearGradient>
      <LinearGradient id="passShine" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
        <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </LinearGradient>
    </Defs>
    {/* 3D Bottom Shadow */}
    <Circle cx="24" cy="27" r="19" fill="#B35400" />
    {/* Main Face */}
    <Circle cx="24" cy="24" r="19" fill="url(#passBg)" />
    {/* Gloss */}
    <Circle cx="24" cy="16" r="13" fill="url(#passShine)" />
    {/* Double Arrow Right */}
    <G transform="translate(0, 1.5)" fill="#B35400">
      <Polygon points="14,16 23,24 14,32" />
      <Polygon points="24,16 33,24 24,32" />
    </G>
    <G fill="#FFFFFF">
      <Polygon points="14,16 23,24 14,32" />
      <Polygon points="24,16 33,24 24,32" />
    </G>
  </Svg>
);

// 5. 3D Stopwatch / Timer Icon
export const Clock3D: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#00DFD8',
}) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Defs>
      <LinearGradient id="clockRing" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor={color} />
        <Stop offset="100%" stopColor="#6C5CE7" />
      </LinearGradient>
    </Defs>
    {/* Top crown button */}
    <Rect x="14" y="2" width="4" height="4" rx="1.5" fill={color} />
    {/* Outer Bezel */}
    <Circle cx="16" cy="18" r="12" fill="#13172E" stroke="url(#clockRing)" strokeWidth="3" />
    {/* Hands */}
    <Path d="M16 11V18L21 21" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    {/* Center dot */}
    <Circle cx="16" cy="18" r="2" fill={color} />
  </Svg>
);

// 6. 3D Shield Badge (Team A)
export const ShieldTeamA: React.FC<{ size?: number }> = ({ size = 38 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40">
    <Defs>
      <LinearGradient id="shieldAGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#00DFD8" />
        <Stop offset="100%" stopColor="#2ED573" />
      </LinearGradient>
    </Defs>
    {/* 3D Rim */}
    <Path
      d="M20 3L6 8V19C6 28 12 35 20 38C28 35 34 28 34 19V8L20 3Z"
      fill="#0B6B56"
      transform="translate(0, 2)"
    />
    <Path
      d="M20 3L6 8V19C6 28 12 35 20 38C28 35 34 28 34 19V8L20 3Z"
      fill="url(#shieldAGrad)"
    />
    {/* Inner Shield */}
    <Path
      d="M20 7L10 11V19C10 25.5 14.5 31 20 33.5C25.5 31 30 25.5 30 19V11L20 7Z"
      fill="#0E1626"
    />
    {/* Letter A */}
    <Path
      d="M17.5 25L19.5 15H20.5L22.5 25H20.9L20.4 22.3H19.6L19.1 25H17.5ZM19.8 17.5L19.7 21.1H20.3L20.2 17.5H19.8Z"
      fill="#00DFD8"
    />
  </Svg>
);

// 7. 3D Shield Badge (Team B)
export const ShieldTeamB: React.FC<{ size?: number }> = ({ size = 38 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40">
    <Defs>
      <LinearGradient id="shieldBGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FF7675" />
        <Stop offset="100%" stopColor="#FD79A8" />
      </LinearGradient>
    </Defs>
    {/* 3D Rim */}
    <Path
      d="M20 3L6 8V19C6 28 12 35 20 38C28 35 34 28 34 19V8L20 3Z"
      fill="#8C1D40"
      transform="translate(0, 2)"
    />
    <Path
      d="M20 3L6 8V19C6 28 12 35 20 38C28 35 34 28 34 19V8L20 3Z"
      fill="url(#shieldBGrad)"
    />
    {/* Inner Shield */}
    <Path
      d="M20 7L10 11V19C10 25.5 14.5 31 20 33.5C25.5 31 30 25.5 30 19V11L20 7Z"
      fill="#1A0E18"
    />
    {/* Letter B */}
    <Path
      d="M17.5 15H20.5C21.6 15 22.5 15.6 22.5 16.7C22.5 17.4 22.1 18 21.4 18.3C22.2 18.6 22.7 19.3 22.7 20.2C22.7 21.4 21.7 22.2 20.4 22.2H17.5V15ZM19 18.1H20.3C20.8 18.1 21.2 17.7 21.2 17.1C21.2 16.5 20.8 16.2 20.3 16.2H19V18.1ZM19 21.1H20.4C21 21.1 21.4 20.7 21.4 20.1C21.4 19.4 21 19.1 20.4 19.1H19V21.1Z"
      fill="#FF7675"
    />
  </Svg>
);

// 8. 3D Trophy Illustration
export const Trophy3D: React.FC<{ size?: number }> = ({ size = 96 }) => (
  <Svg width={size} height={size} viewBox="0 0 96 96">
    <Defs>
      <LinearGradient id="goldLight" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFF200" />
        <Stop offset="40%" stopColor="#FFC312" />
        <Stop offset="100%" stopColor="#EE5A24" />
      </LinearGradient>
      <LinearGradient id="pedestalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#2F3640" />
        <Stop offset="100%" stopColor="#181B24" />
      </LinearGradient>
    </Defs>
    {/* Aura Sparkles */}
    <Circle cx="16" cy="20" r="3" fill="#FFF200" opacity="0.8" />
    <Circle cx="80" cy="24" r="2.5" fill="#FFF200" opacity="0.8" />
    <Circle cx="76" cy="56" r="2" fill="#00DFD8" opacity="0.8" />
    <Circle cx="20" cy="52" r="2" fill="#00DFD8" opacity="0.8" />

    {/* Trophy Handles */}
    <Path
      d="M26 24C16 24 16 42 28 44M70 24C80 24 80 42 68 44"
      stroke="#FFC312"
      strokeWidth="6"
      strokeLinecap="round"
      fill="none"
    />
    {/* Main Cup Body */}
    <Path
      d="M26 18H70V36C70 48 60 58 48 58C36 58 26 48 26 36V18Z"
      fill="url(#goldLight)"
    />
    {/* Cup Rim */}
    <Rect x="23" y="14" width="50" height="7" rx="3.5" fill="#FFEAA7" />

    {/* Stem */}
    <Rect x="44" y="58" width="8" height="12" fill="#EE5A24" />
    {/* Pedestal Base */}
    <Path d="M36 70H60L64 82H32L36 70Z" fill="url(#pedestalGrad)" stroke="#FFC312" strokeWidth="2" />
    <Rect x="28" y="82" width="40" height="7" rx="2" fill="#181B24" />

    {/* Star on Cup */}
    <Polygon
      points="48,27 50.5,33 57,33.5 52,38 53.5,44.5 48,41 42.5,44.5 44,38 39,33.5 45.5,33"
      fill="#FFFFFF"
    />
  </Svg>
);

// 9. Sound Speaker Icon (3D)
export const SoundIcon3D: React.FC<{ enabled: boolean; size?: number }> = ({
  enabled,
  size = 22,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Defs>
      <LinearGradient id="soundGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#00DFD8" />
        <Stop offset="100%" stopColor="#6C5CE7" />
      </LinearGradient>
    </Defs>
    {/* Speaker Horn */}
    <Path
      d="M11 5L6 9H2V15H6L11 19V5Z"
      fill="url(#soundGrad)"
      stroke="#6C5CE7"
      strokeWidth="1"
    />
    {enabled ? (
      <>
        <Path
          d="M15 9C16.3 10.3 16.3 13.7 15 15"
          stroke="#00DFD8"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Path
          d="M18 6C20.5 8.5 20.5 15.5 18 18"
          stroke="#00DFD8"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </>
    ) : (
      <Path
        d="M16 9L21 14M21 9L16 14"
        stroke="#FF4757"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    )}
  </Svg>
);

// 10. Rules / Book Icon (3D)
export const BookIcon3D: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Defs>
      <LinearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#A29BFE" />
        <Stop offset="100%" stopColor="#6C5CE7" />
      </LinearGradient>
    </Defs>
    <Path
      d="M4 19.5C4 18.1 5.1 17 6.5 17H20V3H6.5C5.1 3 4 4.1 4 5.5V19.5Z"
      fill="url(#bookGrad)"
    />
    <Path
      d="M4 19.5C4 18.1 5.1 17 6.5 17H20V20.5C20 20.5 19 21 17.5 21H6.5C5.1 21 4 19.9 4 19.5Z"
      fill="#4834D4"
    />
    <Path d="M8 7H16M8 11H14" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

// 11. 3D Warning Tag for forbidden words
export const ForbiddenChipIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20">
    <Circle cx="10" cy="10" r="8" fill="#FF475722" stroke="#FF4757" strokeWidth="1.5" />
    <Path d="M5 15L15 5" stroke="#FF4757" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// 12. 3D Anlatıcı (Mic) Simgesi
export const MicIcon3D: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#00DFD8' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Defs>
      <LinearGradient id="micGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#FFFFFF" />
        <Stop offset="100%" stopColor={color} />
      </LinearGradient>
    </Defs>
    <Rect x="9" y="2" width="6" height="12" rx="3" fill="url(#micGrad)" />
    <Path d="M5 10V11C5 14.87 8.13 18 12 18C15.87 18 19 14.87 19 11V10" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M12 18V22M8 22H16" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// 13. 3D Denetçi / Gözlemci (Eye) Simgesi
export const EyeIcon3D: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#FF7675' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Defs>
      <LinearGradient id="eyeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFFFFF" />
        <Stop offset="100%" stopColor={color} />
      </LinearGradient>
    </Defs>
    <Path
      d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"
      stroke={color}
      strokeWidth="2"
      fill="none"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="12" r="4" fill="url(#eyeGrad)" />
    <Circle cx="13" cy="11" r="1.5" fill="#13172E" />
  </Svg>
);

// 14. 3D Duraklatma (Pause) / Devam Et (Play) Simgesi
export const PausePlayIcon3D: React.FC<{ isPaused: boolean; size?: number }> = ({ isPaused, size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    {isPaused ? (
      <Polygon points="7,4 20,12 7,20" fill="#00DFD8" />
    ) : (
      <>
        <Rect x="6" y="4" width="4" height="16" rx="2" fill="#FFA502" />
        <Rect x="14" y="4" width="4" height="16" rx="2" fill="#FFA502" />
      </>
    )}
  </Svg>
);

// 15. 3D Sıra Değişimi (Handover / Swap) Simgesi
export const HandoverIcon3D: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Defs>
      <LinearGradient id="swapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#00DFD8" />
        <Stop offset="100%" stopColor="#FD79A8" />
      </LinearGradient>
    </Defs>
    <Path d="M4 11H24M24 11L18 5M24 11L18 17" stroke="url(#swapGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M28 21H8M8 21L14 15M8 21L14 27" stroke="url(#swapGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
