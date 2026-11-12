import { Audio } from 'expo-av';

let soundEnabled = true;

const soundObjects: { [key: string]: Audio.Sound } = {};

const soundFiles = {
  correct: require('../../assets/sounds/correct.wav'),
  tabu: require('../../assets/sounds/tabu.wav'),
  pass: require('../../assets/sounds/pass.wav'),
  tick: require('../../assets/sounds/tick.wav'),
  round_end: require('../../assets/sounds/round_end.wav'),
};

export const initAudio = async () => {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch (e) {
    console.warn('Audio init warning:', e);
  }
};

export const toggleSound = () => {
  soundEnabled = !soundEnabled;
  return soundEnabled;
};

export const isSoundEnabled = () => soundEnabled;

export const playSound = async (
  type: 'correct' | 'tabu' | 'pass' | 'tick' | 'round_end'
) => {
  if (!soundEnabled) return;
  try {
    if (!soundObjects[type]) {
      const { sound } = await Audio.Sound.createAsync(soundFiles[type], {
        shouldPlay: true,
        volume: type === 'tick' ? 0.4 : 0.85,
      });
      soundObjects[type] = sound;
    } else {
      await soundObjects[type].setPositionAsync(0);
      await soundObjects[type].playAsync();
    }
  } catch (err) {
    // If playback fails, try recreating
    try {
      const { sound } = await Audio.Sound.createAsync(soundFiles[type], {
        shouldPlay: true,
        volume: 0.85,
      });
      soundObjects[type] = sound;
    } catch (e) {
      // Graceful fallback
    }
  }
};
