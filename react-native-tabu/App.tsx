import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Animated,
  Vibration,
  Platform,
  Dimensions,
} from 'react-native';
import { TABU_DECK, TabuCard } from './src/data/words';
import {
  Flame3D,
  Correct3D,
  Tabu3D,
  Pass3D,
  Clock3D,
  ShieldTeamA,
  ShieldTeamB,
  Trophy3D,
  SoundIcon3D,
  BookIcon3D,
  ForbiddenChipIcon,
  MicIcon3D,
  EyeIcon3D,
  PausePlayIcon3D,
  HandoverIcon3D,
} from './src/components/SvgIcons';
import { initAudio, playSound, toggleSound } from './src/utils/sound';

const { width } = Dimensions.get('window');

// Titreşim (Haptics)
const triggerHaptic = (type: 'correct' | 'tabu' | 'pass') => {
  if (Platform.OS === 'web') return;
  try {
    if (type === 'tabu') {
      Vibration.vibrate([0, 80, 40, 80]);
    } else if (type === 'correct') {
      Vibration.vibrate(50);
    } else {
      Vibration.vibrate(25);
    }
  } catch (e) {}
};

type Screen = 'setup' | 'ready' | 'game' | 'summary' | 'winner';

interface RoundWordHistory {
  word: string;
  status: 'correct' | 'tabu' | 'pass';
}

export default function App() {
  // Ses Başlatma
  const [soundActive, setSoundActive] = useState(true);

  useEffect(() => {
    initAudio();
  }, []);

  const handleToggleSound = () => {
    const nextState = toggleSound();
    setSoundActive(nextState);
  };

  // Ayarlar
  const [teamAName, setTeamAName] = useState('Takım Alfa');
  const [teamBName, setTeamBName] = useState('Takım Beta');
  const [roundDuration, setRoundDuration] = useState(60);
  const [passLimit, setPassLimit] = useState(3);
  const [targetScore, setTargetScore] = useState(25);
  // 'official' = Tabu yapılınca puan Rakip Takıma (+1), 'classic' = Anlatan takımdan (-1)
  const [tabuScoringRule, setTabuScoringRule] = useState<'official' | 'classic'>('official');

  // Oyun Durumu & Raund Takibi
  const [currentScreen, setCurrentScreen] = useState<Screen>('setup');
  const [currentTeam, setCurrentTeam] = useState<'A' | 'B'>('A'); // Anlatan takım
  const [roundNumber, setRoundNumber] = useState(1); // 1. Raund, 2. Raund...
  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);
  const [winnerTeam, setWinnerTeam] = useState<'A' | 'B' | null>(null);

  // Tur İçi Değerler
  const [remainingTime, setRemainingTime] = useState(60);
  const [isPaused, setIsPaused] = useState(false);
  const [remainingPasses, setRemainingPasses] = useState(3);
  const [roundCorrectCount, setRoundCorrectCount] = useState(0);
  const [roundTabuCount, setRoundTabuCount] = useState(0);
  const [roundPassCount, setRoundPassCount] = useState(0);
  const [deck, setDeck] = useState<TabuCard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [roundHistory, setRoundHistory] = useState<RoundWordHistory[]>([]);

  // Modal State
  const [rulesVisible, setRulesVisible] = useState(false);

  // Animasyon Değerleri
  const cardScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Deste karıştırma
  const shuffleDeck = () => {
    return [...TABU_DECK].sort(() => Math.random() - 0.5);
  };

  // 1. Yeni Oyun Başlatma (Setup -> Ready)
  const startNewGame = () => {
    setTeamAScore(0);
    setTeamBScore(0);
    setRoundNumber(1);
    setCurrentTeam('A');
    setDeck(shuffleDeck());
    setCardIndex(0);
    setWinnerTeam(null);
    prepareTurn('A', 1);
  };

  // 2. Tur Hazırlığı (Ready ekranına geçiş, cihazı diğer takıma devretme)
  const prepareTurn = (team: 'A' | 'B', rNum?: number) => {
    setCurrentTeam(team);
    if (rNum) setRoundNumber(rNum);
    setRemainingTime(roundDuration);
    setIsPaused(false);
    setRemainingPasses(passLimit);
    setRoundCorrectCount(0);
    setRoundTabuCount(0);
    setRoundPassCount(0);
    setRoundHistory([]);
    setCurrentScreen('ready');
  };

  // 3. Gerçek Turu Başlatma (Ready -> Game)
  const launchActiveRound = () => {
    setCurrentScreen('game');
    setIsPaused(false);
  };

  // 4. Zamanlayıcı (Timer) - Drift ve closure sorunları çözülmüş temiz sayaç
  useEffect(() => {
    let interval: any = null;
    if (currentScreen === 'game' && !isPaused) {
      interval = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            playSound('round_end');
            return 0;
          }
          if (prev <= 6) {
            playSound('tick');
            Animated.sequence([
              Animated.timing(pulseAnim, { toValue: 1.03, duration: 150, useNativeDriver: true }),
              Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
            ]).start();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentScreen, isPaused]);

  // Süre sıfırlandığında turu sonlandır
  useEffect(() => {
    if (currentScreen === 'game' && remainingTime === 0) {
      finishRound();
    }
  }, [remainingTime, currentScreen]);

  // 5. Tur Bitişi & Skor Hesaplama (Official Tabu Rules & Eşit Tur Prensibi)
  const finishRound = () => {
    const isTeamA = currentTeam === 'A';

    let netTeamAGain = 0;
    let netTeamBGain = 0;

    if (tabuScoringRule === 'official') {
      // Resmi Kural: Doğrular anlatan takıma (+1), Tabular rakip denetçiye (+1)
      if (isTeamA) {
        netTeamAGain = roundCorrectCount;
        netTeamBGain = roundTabuCount;
      } else {
        netTeamBGain = roundCorrectCount;
        netTeamAGain = roundTabuCount;
      }
    } else {
      // Klasik Kural: Anlatan takım (Doğru - Tabu) puan alır, rakip puan almaz
      const netScore = roundCorrectCount - roundTabuCount;
      if (isTeamA) {
        netTeamAGain = Math.max(0, netScore);
      } else {
        netTeamBGain = Math.max(0, netScore);
      }
    }

    const updatedScoreA = teamAScore + netTeamAGain;
    const updatedScoreB = teamBScore + netTeamBGain;
    setTeamAScore(updatedScoreA);
    setTeamBScore(updatedScoreB);

    // Eşit Tur Prensibi:
    // Eğer 1. Devrede (Takım A) oynandıysa, sıra Takım B'dedir (Raund tamamlanmadı).
    // Takım B oynadığında 1 Raund tamamlanmış olur. O zaman hedef skor kontrol edilir!
    if (!isTeamA) {
      // Takım B turunu bitirdi -> Raund tamamlandı!
      if (updatedScoreA >= targetScore || updatedScoreB >= targetScore) {
        if (updatedScoreA > updatedScoreB) {
          setWinnerTeam('A');
          setCurrentScreen('winner');
          return;
        } else if (updatedScoreB > updatedScoreA) {
          setWinnerTeam('B');
          setCurrentScreen('winner');
          return;
        }
        // Beraberlik durumunda sonraki raunda uzar
      }
    }

    setCurrentScreen('summary');
  };

  // 3D Kart Animasyonu
  const triggerCardAnimation = () => {
    Animated.sequence([
      Animated.timing(cardScale, { toValue: 0.95, duration: 70, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
    ]).start();
  };

  const nextCard = () => {
    setCardIndex((prev) => {
      if (prev + 1 >= deck.length) {
        setDeck(shuffleDeck());
        return 0;
      }
      return prev + 1;
    });
    triggerCardAnimation();
  };

  // Doğru Butonu
  const handleCorrect = () => {
    if (remainingTime <= 0 || isPaused) return;
    playSound('correct');
    triggerHaptic('correct');
    const currentWord = (deck[cardIndex] || TABU_DECK[0]).word;

    setRoundCorrectCount((c) => c + 1);
    setRoundHistory((prev) => [{ word: currentWord, status: 'correct' }, ...prev]);
    nextCard();
  };

  // Tabu Butonu (Rakip Denetçi basar)
  const handleTabu = () => {
    if (remainingTime <= 0 || isPaused) return;
    playSound('tabu');
    triggerHaptic('tabu');
    const currentWord = (deck[cardIndex] || TABU_DECK[0]).word;

    setRoundTabuCount((t) => t + 1);
    setRoundHistory((prev) => [{ word: currentWord, status: 'tabu' }, ...prev]);
    nextCard();
  };

  // Pas Butonu
  const handlePass = () => {
    if (remainingTime <= 0 || remainingPasses <= 0 || isPaused) return;
    playSound('pass');
    triggerHaptic('pass');
    const currentWord = (deck[cardIndex] || TABU_DECK[0]).word;

    setRemainingPasses((p) => p - 1);
    setRoundPassCount((p) => p + 1);
    setRoundHistory((prev) => [{ word: currentWord, status: 'pass' }, ...prev]);
    nextCard();
  };

  // Rol tanımları
  const explainingTeamName = currentTeam === 'A' ? teamAName : teamBName;
  const monitoringTeamName = currentTeam === 'A' ? teamBName : teamAName;
  const nextTeam = currentTeam === 'A' ? 'B' : 'A';
  const nextTeamName = nextTeam === 'A' ? teamAName : teamBName;

  const currentCard = deck[cardIndex] || TABU_DECK[0];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#070913" />

      {/* Modern Üst Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleBox}>
          <Flame3D size={26} />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.logoTitle}>
              TABU <Text style={styles.logoProText}>PRO 3D</Text>
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleToggleSound}
            activeOpacity={0.7}
          >
            <SoundIcon3D enabled={soundActive} size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerIconBtn, { marginLeft: 8 }]}
            onPress={() => setRulesVisible(true)}
            activeOpacity={0.7}
          >
            <BookIcon3D size={18} />
            <Text style={styles.rulesBtnLabel}>Kurallar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 1. AYARLAR EKRANI (SETUP) */}
      {currentScreen === 'setup' && (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Hero Banner */}
          <View style={styles.heroBanner}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>2 TAKIMLI RESMİ TURNUVA</Text>
            </View>
            <Text style={styles.heroTitle}>Takımlarını Kur & Başla</Text>
            <Text style={styles.heroSub}>
              Sırayla bir takım anlatırken, rakip takım kartı denetler. Yasaklı kelimelere dikkat!
            </Text>
          </View>

          {/* Takım Kartları */}
          <View style={styles.teamSection}>
            <View style={[styles.teamCard, styles.teamCardA]}>
              <ShieldTeamA size={38} />
              <View style={styles.teamInputWrapper}>
                <Text style={styles.teamLabelA}>1. TAKIM (ALFA)</Text>
                <TextInput
                  style={styles.teamInput}
                  value={teamAName}
                  onChangeText={setTeamAName}
                  placeholder="Takım A"
                  placeholderTextColor="#4E5D78"
                  maxLength={16}
                />
              </View>
            </View>

            <View style={[styles.teamCard, styles.teamCardB]}>
              <ShieldTeamB size={38} />
              <View style={styles.teamInputWrapper}>
                <Text style={styles.teamLabelB}>2. TAKIM (BETA)</Text>
                <TextInput
                  style={styles.teamInput}
                  value={teamBName}
                  onChangeText={setTeamBName}
                  placeholder="Takım B"
                  placeholderTextColor="#4E5D78"
                  maxLength={16}
                />
              </View>
            </View>
          </View>

          {/* Parametre Grid */}
          <View style={styles.settingsGrid}>
            {/* Süre */}
            <View style={styles.paramBox}>
              <View style={styles.paramHeader}>
                <Clock3D size={18} color="#00DFD8" />
                <Text style={styles.paramLabel}>TUR SÜRESİ</Text>
              </View>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setRoundDuration((v) => Math.max(30, v - 15))}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={[styles.stepValue, { color: '#00DFD8' }]}>{roundDuration}s</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setRoundDuration((v) => Math.min(180, v + 15))}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Pas Limiti */}
            <View style={styles.paramBox}>
              <View style={styles.paramHeader}>
                <Pass3D size={18} />
                <Text style={styles.paramLabel}>PAS HAKKI</Text>
              </View>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setPassLimit((v) => Math.max(1, v - 1))}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={[styles.stepValue, { color: '#FFA502' }]}>{passLimit}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setPassLimit((v) => Math.min(10, v + 1))}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Hedef Skor */}
            <View style={styles.paramBox}>
              <View style={styles.paramHeader}>
                <Trophy3D size={18} />
                <Text style={styles.paramLabel}>HEDEF SKOR</Text>
              </View>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setTargetScore((v) => Math.max(10, v - 5))}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={[styles.stepValue, { color: '#FF7675' }]}>{targetScore}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setTargetScore((v) => Math.min(100, v + 5))}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Tabu Kuralı Seçici */}
          <View style={styles.ruleSelectorCard}>
            <View style={styles.ruleSelectorHeader}>
              <Tabu3D size={22} />
              <Text style={styles.ruleSelectorTitle}>TABU CEZASI PUANLAMA KURALI</Text>
            </View>
            <View style={styles.ruleToggleRow}>
              <TouchableOpacity
                style={[
                  styles.ruleToggleBtn,
                  tabuScoringRule === 'official' && styles.ruleToggleBtnActive,
                ]}
                onPress={() => setTabuScoringRule('official')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.ruleToggleText,
                    tabuScoringRule === 'official' && styles.ruleToggleTextActive,
                  ]}
                >
                  🏆 Resmi Hasbro Kuralı
                </Text>
                <Text style={styles.ruleToggleSub}>Tabu olunca rakip takım +1 Puan kazanır</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.ruleToggleBtn,
                  tabuScoringRule === 'classic' && styles.ruleToggleBtnActive,
                ]}
                onPress={() => setTabuScoringRule('classic')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.ruleToggleText,
                    tabuScoringRule === 'classic' && styles.ruleToggleTextActive,
                  ]}
                >
                  ⚡ Klasik Kural
                </Text>
                <Text style={styles.ruleToggleSub}>Tabu olunca anlatan takımdan -1 Puan düşer</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3D Başlat Butonu */}
          <TouchableOpacity
            style={styles.button3DWrapper}
            onPress={startNewGame}
            activeOpacity={0.85}
          >
            <View style={styles.button3DBase} />
            <View style={styles.button3DFace}>
              <Text style={styles.button3DText}>TURNUVAYI BAŞLAT ➔</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 2. HAZIR MISINIZ? / CİHAZI DEVRET EKRANI (READY SCREEN) */}
      {currentScreen === 'ready' && (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.readyHeader}>
            <HandoverIcon3D size={42} />
            <View style={styles.readyRoundBadge}>
              <Text style={styles.readyRoundBadgeText}>
                {roundNumber}. RAUND • {currentTeam === 'A' ? '1. DEVRE' : '2. DEVRE'}
              </Text>
            </View>
            <Text style={styles.readyTitle}>Cihazı Devredin!</Text>
            <Text style={styles.readySubtitle}>
              Sıra {explainingTeamName} takımında. Hazır olunca süreyi başlatın.
            </Text>
          </View>

          {/* Rol Kartları */}
          <View style={styles.rolesContainer}>
            {/* Anlatan Takım */}
            <View style={[styles.roleCard, { borderColor: '#00DFD866' }]}>
              <View style={styles.roleIconRow}>
                <MicIcon3D size={24} color="#00DFD8" />
                <Text style={[styles.roleTag, { color: '#00DFD8' }]}>ANLATAN TAKIM (TAHMİN EDEN)</Text>
              </View>
              <View style={styles.roleTeamRow}>
                {currentTeam === 'A' ? <ShieldTeamA size={32} /> : <ShieldTeamB size={32} />}
                <Text style={styles.roleTeamName}>{explainingTeamName}</Text>
              </View>
              <Text style={styles.roleDescText}>
                Karttaki hedef kelimeyi yasaklı 5 kelimeyi kullanmadan takımına anlatacak.
              </Text>
            </View>

            {/* Denetleyen Takım */}
            <View style={[styles.roleCard, { borderColor: '#FF767566' }]}>
              <View style={styles.roleIconRow}>
                <EyeIcon3D size={24} color="#FF7675" />
                <Text style={[styles.roleTag, { color: '#FF7675' }]}>DENETLEYEN TAKIM (GÖZLEMCİ)</Text>
              </View>
              <View style={styles.roleTeamRow}>
                {currentTeam === 'A' ? <ShieldTeamB size={32} /> : <ShieldTeamA size={32} />}
                <Text style={styles.roleTeamName}>{monitoringTeamName}</Text>
              </View>
              <Text style={styles.roleDescText}>
                Anlatıcının yanına geçip karttaki yasaklı kelimeleri denetleyecek ve kural ihlalinde TABU butonuna basacak!
              </Text>
            </View>
          </View>

          {/* Anlık Skor Tablosu */}
          <View style={styles.scoreboardCard}>
            <Text style={styles.scoreboardTitle}>GÜNCEL SKOR DURUMU</Text>
            <View style={styles.scoreRowItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ShieldTeamA size={26} />
                <Text style={styles.scoreTeamNameText}>{teamAName}</Text>
              </View>
              <Text style={[styles.scoreNumberText, { color: '#00DFD8' }]}>{teamAScore} Puan</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreRowItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ShieldTeamB size={26} />
                <Text style={styles.scoreTeamNameText}>{teamBName}</Text>
              </View>
              <Text style={[styles.scoreNumberText, { color: '#FF7675' }]}>{teamBScore} Puan</Text>
            </View>
          </View>

          {/* Tur Parametre Özeti */}
          <View style={styles.readyMetaRow}>
            <View style={styles.readyMetaItem}>
              <Clock3D size={18} color="#00DFD8" />
              <Text style={styles.readyMetaText}>{roundDuration} Saniye</Text>
            </View>
            <View style={styles.readyMetaItem}>
              <Pass3D size={18} />
              <Text style={styles.readyMetaText}>{passLimit} Pas Hakkı</Text>
            </View>
            <View style={styles.readyMetaItem}>
              <Trophy3D size={18} />
              <Text style={styles.readyMetaText}>Hedef: {targetScore}</Text>
            </View>
          </View>

          {/* 3D Başlat Butonu (Süre buradan başlatılır!) */}
          <TouchableOpacity
            style={[styles.button3DWrapper, { marginTop: 16 }]}
            onPress={launchActiveRound}
            activeOpacity={0.85}
          >
            <View style={[styles.button3DBase, { backgroundColor: '#0B6B56' }]} />
            <View style={[styles.button3DFace, { backgroundColor: '#10AC84' }]}>
              <Text style={styles.button3DText}>
                {explainingTeamName.toUpperCase()} HAZIR, BAŞLAT! ▶
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 3. AKTİF OYUN EKRANI (GAME SCREEN) */}
      {currentScreen === 'game' && (
        <View style={styles.gameContainer}>
          {/* Üst Çift Takım & Sayaç Paneli */}
          <View style={styles.liveGameHeader}>
            {/* Anlatan Takım */}
            <View style={[styles.liveTeamPill, styles.liveTeamActive]}>
              <View style={styles.liveTeamHeaderRow}>
                <MicIcon3D size={14} color="#00DFD8" />
                <Text style={styles.liveTeamRoleLabel}>ANLATIYOR</Text>
              </View>
              <Text style={styles.liveTeamNameText} numberOfLines={1}>
                {explainingTeamName}
              </Text>
              <Text style={styles.liveTeamRoundScore}>
                +{roundCorrectCount} Doğru
              </Text>
            </View>

            {/* Merkez Sayaç & Duraklat */}
            <View style={styles.liveCenterCluster}>
              <View
                style={[
                  styles.timerCapsule,
                  remainingTime <= 10 && styles.timerCapsuleAlert,
                ]}
              >
                <Clock3D size={18} color={remainingTime <= 10 ? '#FF4757' : '#00DFD8'} />
                <Text
                  style={[
                    styles.timerTextValue,
                    remainingTime <= 10 && styles.timerTextAlert,
                  ]}
                >
                  {remainingTime}s
                </Text>
              </View>

              <TouchableOpacity
                style={styles.pauseBtn}
                onPress={() => setIsPaused((p) => !p)}
                activeOpacity={0.7}
              >
                <PausePlayIcon3D isPaused={isPaused} size={16} />
                <Text style={styles.pauseBtnText}>
                  {isPaused ? 'DEVAM' : 'DURAKLAT'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Denetleyen Takım */}
            <View style={[styles.liveTeamPill, styles.liveTeamMonitor]}>
              <View style={styles.liveTeamHeaderRow}>
                <EyeIcon3D size={14} color="#FF7675" />
                <Text style={[styles.liveTeamRoleLabel, { color: '#FF7675' }]}>DENETÇİ</Text>
              </View>
              <Text style={styles.liveTeamNameText} numberOfLines={1}>
                {monitoringTeamName}
              </Text>
              <Text style={[styles.liveTeamRoundScore, { color: '#FF7675' }]}>
                {roundTabuCount} Tabu
              </Text>
            </View>
          </View>

          {/* Duraklatma Banner'ı */}
          {isPaused && (
            <View style={styles.pausedOverlayBanner}>
              <Text style={styles.pausedBannerTitle}>⏸️ OYUN DURAKLATILDI</Text>
              <Text style={styles.pausedBannerSub}>
                Süre durduruldu. Devam etmek için 'DEVAM' butonuna dokunun.
              </Text>
            </View>
          )}

          {/* 3D Tabu Kartı */}
          <Animated.View
            style={[
              styles.card3D,
              {
                transform: [{ scale: Animated.multiply(cardScale, pulseAnim) }],
                opacity: isPaused ? 0.4 : 1,
              },
            ]}
          >
            {/* Kart Üst Bilgisi */}
            <View style={styles.cardTopMeta}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{currentCard.category.toUpperCase()}</Text>
              </View>
              <View style={styles.cardPassBadge}>
                <Text style={styles.cardPassText}>
                  PAS: <Text style={{ color: '#FFA502', fontWeight: '900' }}>{remainingPasses}</Text>/{passLimit}
                </Text>
              </View>
            </View>

            {/* Hedef Kelime */}
            <View style={styles.targetWordBox}>
              <Text style={styles.targetWordLabel}>ANLATILACAK KELİME</Text>
              <Text style={styles.targetWordText} numberOfLines={2} adjustsFontSizeToFit>
                {currentCard.word}
              </Text>
            </View>

            <View style={styles.cardDivider} />

            {/* Yasaklı Kelimeler */}
            <View style={styles.forbiddenSection}>
              <View style={styles.forbiddenHeaderRow}>
                <ForbiddenChipIcon size={16} />
                <Text style={styles.forbiddenSectionTitle}>YASAKLI KELİMELER</Text>
              </View>

              <View style={styles.forbiddenChipsContainer}>
                {currentCard.forbidden.map((word, index) => (
                  <View key={index} style={styles.forbiddenChip}>
                    <Text style={styles.forbiddenChipNum}>{index + 1}</Text>
                    <Text style={styles.forbiddenChipText}>{word}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Kart Alt Gösterge */}
            <View style={styles.cardFooterBar}>
              <Text style={styles.cardIndexTracker}>
                {roundNumber}. Raund • Kart #{cardIndex + 1}
              </Text>
            </View>
          </Animated.View>

          {/* 3D Dokunsal Aksiyon Butonları (Rolleri Net Belirten Butonlar) */}
          <View style={styles.gameControlsRow}>
            {/* PAS Butonu */}
            <TouchableOpacity
              style={[
                styles.actionBtn3D,
                (remainingPasses <= 0 || isPaused) && { opacity: 0.4 },
              ]}
              onPress={handlePass}
              disabled={remainingPasses <= 0 || isPaused}
              activeOpacity={0.8}
            >
              <View style={[styles.btn3DBase, { backgroundColor: '#B35400' }]} />
              <View style={[styles.btn3DFace, { backgroundColor: '#FFA502' }]}>
                <Pass3D size={26} />
                <Text style={styles.btn3DText}>PAS GEÇ</Text>
                <Text style={styles.btn3DSub}>0 Puan ({remainingPasses} kaldı)</Text>
              </View>
            </TouchableOpacity>

            {/* TABU Butonu (🛡️ Rakip Takım Denetçi Butonu) */}
            <TouchableOpacity
              style={[styles.actionBtn3D, isPaused && { opacity: 0.4 }]}
              onPress={handleTabu}
              disabled={isPaused}
              activeOpacity={0.8}
            >
              <View style={[styles.btn3DBase, { backgroundColor: '#A81829' }]} />
              <View style={[styles.btn3DFace, { backgroundColor: '#FF4757' }]}>
                <Tabu3D size={26} />
                <Text style={styles.btn3DText}>TABU!</Text>
                <Text style={styles.btn3DSub}>
                  {tabuScoringRule === 'official' ? '🛡️ Rakibe +1 Puan' : '−1 Puan Ceza'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* DOĞRU Butonu (✅ Anlatan Takım) */}
            <TouchableOpacity
              style={[styles.actionBtn3D, isPaused && { opacity: 0.4 }]}
              onPress={handleCorrect}
              disabled={isPaused}
              activeOpacity={0.8}
            >
              <View style={[styles.btn3DBase, { backgroundColor: '#0A7E5F' }]} />
              <View style={[styles.btn3DFace, { backgroundColor: '#2ED573' }]}>
                <Correct3D size={26} />
                <Text style={styles.btn3DText}>DOĞRU</Text>
                <Text style={styles.btn3DSub}>+1 Takım Puanı</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 4. TUR ÖZETİ EKRANI (SUMMARY) */}
      {currentScreen === 'summary' && (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryHeader}>
            <Clock3D size={48} color="#FF7675" />
            <Text style={styles.summaryTitle}>Süre Tamamlandı!</Text>
            <Text style={styles.summarySubtitle}>
              {roundNumber}. Raund • {explainingTeamName} Turunu Bitirdi
            </Text>
          </View>

          {/* 3D İstatistik Rozetleri */}
          <View style={styles.statsCardGrid}>
            <View style={[styles.stat3DCard, { borderColor: '#2ED573' }]}>
              <Correct3D size={26} />
              <Text style={[styles.stat3DVal, { color: '#2ED573' }]}>{roundCorrectCount}</Text>
              <Text style={styles.stat3DLabel}>DOĞRU (+1)</Text>
            </View>

            <View style={[styles.stat3DCard, { borderColor: '#FF4757' }]}>
              <Tabu3D size={26} />
              <Text style={[styles.stat3DVal, { color: '#FF4757' }]}>{roundTabuCount}</Text>
              <Text style={styles.stat3DLabel}>
                {tabuScoringRule === 'official' ? 'TABU (Rakibe +1)' : 'TABU (−1)'}
              </Text>
            </View>

            <View style={[styles.stat3DCard, { borderColor: '#FFA502' }]}>
              <Pass3D size={26} />
              <Text style={[styles.stat3DVal, { color: '#FFA502' }]}>{roundPassCount}</Text>
              <Text style={styles.stat3DLabel}>PAS (0)</Text>
            </View>
          </View>

          {/* Güncel Skor Tablosu */}
          <View style={styles.scoreboardCard}>
            <Text style={styles.scoreboardTitle}>GENEL SKOR TABLOSU</Text>

            <View style={styles.scoreRowItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ShieldTeamA size={28} />
                <Text style={styles.scoreTeamNameText}>{teamAName}</Text>
              </View>
              <Text style={[styles.scoreNumberText, { color: '#00DFD8' }]}>{teamAScore} Puan</Text>
            </View>

            <View style={styles.scoreDivider} />

            <View style={styles.scoreRowItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ShieldTeamB size={28} />
                <Text style={styles.scoreTeamNameText}>{teamBName}</Text>
              </View>
              <Text style={[styles.scoreNumberText, { color: '#FF7675' }]}>{teamBScore} Puan</Text>
            </View>
          </View>

          {/* Bu Tur Oynanan Kelimeler */}
          {roundHistory.length > 0 && (
            <View style={styles.historyContainer}>
              <Text style={styles.historySectionTitle}>BU TURDA OYNANAN KELİMELER</Text>
              {roundHistory.map((item, idx) => (
                <View key={idx} style={styles.historyRow}>
                  <Text style={styles.historyWordText}>{item.word}</Text>
                  <View
                    style={[
                      styles.historyBadge,
                      item.status === 'correct' && { backgroundColor: '#2ED57322' },
                      item.status === 'tabu' && { backgroundColor: '#FF475722' },
                      item.status === 'pass' && { backgroundColor: '#FFA50222' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.historyBadgeText,
                        item.status === 'correct' && { color: '#2ED573' },
                        item.status === 'tabu' && { color: '#FF4757' },
                        item.status === 'pass' && { color: '#FFA502' },
                      ]}
                    >
                      {item.status === 'correct'
                        ? 'DOĞRU (+1)'
                        : item.status === 'tabu'
                        ? tabuScoringRule === 'official'
                          ? 'TABU (Rakibe +1)'
                          : 'TABU (−1)'
                        : 'PAS (0)'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Sıradaki Takıma Devret Butonu */}
          <TouchableOpacity
            style={[styles.button3DWrapper, { marginTop: 24 }]}
            onPress={() => {
              // Eğer Takım A turunu bitirdiyse sıra aynı raundun 2. devresinde Takım B'dedir.
              // Eğer Takım B turunu bitirdiyse yeni raunda (raundNumber + 1) geçilir ve sıra Takım A'ya döner!
              const nextRNum = currentTeam === 'B' ? roundNumber + 1 : roundNumber;
              prepareTurn(nextTeam, nextRNum);
            }}
            activeOpacity={0.85}
          >
            <View style={[styles.button3DBase, { backgroundColor: '#0B6B56' }]} />
            <View style={[styles.button3DFace, { backgroundColor: '#10AC84' }]}>
              <Text style={styles.button3DText}>
                👉 CİHAZI {nextTeamName.toUpperCase()}'A DEVRET ▶
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 5. ŞAMPİYON EKRANI (WINNER SCREEN) */}
      {currentScreen === 'winner' && (
        <View style={styles.winnerContainer}>
          <Trophy3D size={110} />
          <View style={styles.winnerBadge}>
            <Text style={styles.winnerBadgeText}>BÜYÜK ŞAMPİYON</Text>
          </View>
          <Text style={styles.winnerTeamName}>
            {winnerTeam === 'A' ? teamAName : teamBName}
          </Text>
          <Text style={styles.winnerSubText}>
            Eşit turlar sonucunda hedeflenen {targetScore} puana ilk ulaşarak zaferi kazandı!
          </Text>

          {/* Sonuç Tablosu */}
          <View style={[styles.scoreboardCard, { width: '100%', marginVertical: 24 }]}>
            <View style={styles.scoreRowItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ShieldTeamA size={28} />
                <Text style={styles.scoreTeamNameText}>{teamAName}</Text>
              </View>
              <Text style={[styles.scoreNumberText, { color: '#00DFD8' }]}>{teamAScore} Puan</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreRowItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ShieldTeamB size={28} />
                <Text style={styles.scoreTeamNameText}>{teamBName}</Text>
              </View>
              <Text style={[styles.scoreNumberText, { color: '#FF7675' }]}>{teamBScore} Puan</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.button3DWrapper}
            onPress={() => setCurrentScreen('setup')}
            activeOpacity={0.85}
          >
            <View style={styles.button3DBase} />
            <View style={styles.button3DFace}>
              <Text style={styles.button3DText}>YENİ TURNUVA BAŞLAT ↺</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* RESMİ TABU KURALLARI MODALI */}
      <Modal visible={rulesVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <BookIcon3D size={22} />
                <Text style={styles.modalTitleText}>Resmi Tabu Oyun Kuralları</Text>
              </View>
              <TouchableOpacity onPress={() => setRulesVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
              <View style={styles.ruleCard}>
                <Text style={styles.ruleCardTitle}>1. İki Takım ve Roller</Text>
                <Text style={styles.ruleCardDesc}>
                  Tabu iki takım arasında sırayla oynanır. Her turda bir takım <Text style={{ color: '#00DFD8', fontWeight: 'bold' }}>ANLATICI</Text> olurken, rakip takım oyuncusu anlatıcının yanına geçerek <Text style={{ color: '#FF7675', fontWeight: 'bold' }}>DENETÇİ</Text> olur ve karttaki yasaklı kelimeleri kontrol eder.
                </Text>
              </View>

              <View style={[styles.ruleCard, { borderLeftColor: '#FF7675' }]}>
                <Text style={[styles.ruleCardTitle, { color: '#FF7675' }]}>
                  2. Kesinlikle Yasak Olanlar (TABU!)
                </Text>
                <Text style={styles.ruleCardDesc}>
                  • Karttaki 5 yasaklı kelimeden birini telaffuz etmek.{"\n"}
                  • Kelimenin kökünden türetme yapmak ("Kitap" için "Kitapçı").{"\n"}
                  • Baş harf, hece veya harf sayısı söylemek ("3 heceli", "K ile başlar").{"\n"}
                  • Başka dillerdeki karşılığını söylemek ("Car", "Book").{"\n"}
                  • El-kol, beden dili veya havada şekil çizmek.{"\n"}
                  • Hayvan, ses veya melodi taklidi yapmak.
                </Text>
              </View>

              <View style={[styles.ruleCard, { borderLeftColor: '#FFA502' }]}>
                <Text style={[styles.ruleCardTitle, { color: '#FFA502' }]}>
                  3. Rakip Denetçinin Rolü
                </Text>
                <Text style={styles.ruleCardDesc}>
                  Anlatıcı yukarıdaki kural ihlallerinden birini yaparsa, rakip denetçi hemen <Text style={{ color: '#FF4757', fontWeight: 'bold' }}>TABU!</Text> butonuna basar. Resmi kurallara göre o kart rakip takımın hanesine +1 puan olarak yazılır!
                </Text>
              </View>

              <View style={[styles.ruleCard, { borderLeftColor: '#2ED573' }]}>
                <Text style={[styles.ruleCardTitle, { color: '#2ED573' }]}>
                  4. Eşit Tur ve Puanlama
                </Text>
                <Text style={styles.ruleCardDesc}>
                  • Doğru bilinen kart: <Text style={{ color: '#2ED573', fontWeight: 'bold' }}>Anlatan Takıma +1 Puan</Text>{"\n"}
                  • Tabu yapılan kart: <Text style={{ color: '#FF4757', fontWeight: 'bold' }}>Rakip Takıma +1 Puan</Text> (veya ayarlara göre -1 puan){"\n"}
                  • Pas geçilen kart: <Text style={{ color: '#FFA502', fontWeight: 'bold' }}>0 Puan</Text> (Pas hakkı kadar kullanılabilir){"\n"}
                  • Bir takım hedef skora ulaşsa bile, diğer takımın da o raunttaki eşit turunu tamamlama hakkı vardır.
                </Text>
              </View>
            </ScrollView>

            <View style={{ padding: 16 }}>
              <TouchableOpacity
                style={[styles.button3DWrapper, { height: 48 }]}
                onPress={() => setRulesVisible(false)}
              >
                <View style={[styles.button3DBase, { backgroundColor: '#4834D4' }]} />
                <View style={[styles.button3DFace, { backgroundColor: '#6C5CE7' }]}>
                  <Text style={styles.button3DText}>ANLADIM, KAPAT</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070913',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#151930',
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  logoProText: {
    fontSize: 12,
    color: '#FD79A8',
    backgroundColor: '#6C5CE733',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    fontWeight: '900',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#12162B',
    borderWidth: 1,
    borderColor: '#23294E',
  },
  rulesBtnLabel: {
    color: '#A29BFE',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  scrollContainer: {
    padding: 16,
    alignItems: 'center',
  },
  heroBanner: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  heroBadge: {
    backgroundColor: '#6C5CE733',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6C5CE788',
    marginBottom: 8,
  },
  heroBadgeText: {
    color: '#A29BFE',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  heroSub: {
    color: '#718096',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
  },
  teamSection: {
    width: '100%',
    marginBottom: 16,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1326',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  teamCardA: {
    borderColor: '#00DFD844',
  },
  teamCardB: {
    borderColor: '#FF767544',
  },
  teamInputWrapper: {
    flex: 1,
    marginLeft: 14,
  },
  teamLabelA: {
    color: '#00DFD8',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  teamLabelB: {
    color: '#FF7675',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  teamInput: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    padding: 0,
  },
  settingsGrid: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  paramBox: {
    flex: 1,
    backgroundColor: '#0F1326',
    borderRadius: 16,
    padding: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#1D2447',
    alignItems: 'center',
  },
  paramHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paramLabel: {
    color: '#A0AEC0',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 2,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#1C2344',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  ruleSelectorCard: {
    width: '100%',
    backgroundColor: '#0F1326',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F264C',
    marginBottom: 20,
  },
  ruleSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ruleSelectorTitle: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginLeft: 8,
  },
  ruleToggleRow: {
    flexDirection: 'column',
    gap: 8,
  },
  ruleToggleBtn: {
    backgroundColor: '#14182E',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#222950',
  },
  ruleToggleBtnActive: {
    borderColor: '#00DFD8',
    backgroundColor: '#00DFD815',
  },
  ruleToggleText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  ruleToggleTextActive: {
    color: '#FFFFFF',
  },
  ruleToggleSub: {
    color: '#64748B',
    fontSize: 11,
  },
  button3DWrapper: {
    width: '100%',
    height: 58,
    position: 'relative',
    marginTop: 8,
  },
  button3DBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 5,
    bottom: 0,
    backgroundColor: '#4834D4',
    borderRadius: 18,
  },
  button3DFace: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 5,
    backgroundColor: '#6C5CE7',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1.5,
    borderTopColor: '#A29BFE',
  },
  button3DText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  readyHeader: {
    alignItems: 'center',
    marginVertical: 12,
  },
  readyRoundBadge: {
    backgroundColor: '#6C5CE733',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#6C5CE788',
    marginTop: 10,
    marginBottom: 6,
  },
  readyRoundBadgeText: {
    color: '#A29BFE',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  readyTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  readySubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 290,
  },
  rolesContainer: {
    width: '100%',
    marginVertical: 12,
  },
  roleCard: {
    backgroundColor: '#0F1326',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
  },
  roleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  roleTag: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginLeft: 6,
  },
  roleTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  roleTeamName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 10,
  },
  roleDescText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  readyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#0F1326',
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#1D2448',
    marginVertical: 10,
  },
  readyMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readyMetaText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  gameContainer: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  liveGameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  liveTeamPill: {
    flex: 1,
    backgroundColor: '#0F1326',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1.5,
    marginHorizontal: 2,
  },
  liveTeamActive: {
    borderColor: '#00DFD888',
  },
  liveTeamMonitor: {
    borderColor: '#FF767566',
  },
  liveTeamHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveTeamRoleLabel: {
    color: '#00DFD8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  liveTeamNameText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  liveTeamRoundScore: {
    color: '#2ED573',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 1,
  },
  liveCenterCluster: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  timerCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1326',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: '#00DFD866',
  },
  timerCapsuleAlert: {
    borderColor: '#FF4757',
    backgroundColor: '#FF475722',
  },
  timerTextValue: {
    color: '#00DFD8',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 6,
  },
  timerTextAlert: {
    color: '#FF4757',
  },
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#161D3A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#263260',
  },
  pauseBtnText: {
    color: '#A0AEC0',
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 4,
  },
  pausedOverlayBanner: {
    backgroundColor: '#FFA50222',
    borderWidth: 1,
    borderColor: '#FFA502',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    marginVertical: 4,
  },
  pausedBannerTitle: {
    color: '#FFA502',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  pausedBannerSub: {
    color: '#E2E8F0',
    fontSize: 11,
    textAlign: 'center',
  },
  card3D: {
    flex: 1,
    backgroundColor: '#0F1328',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#28315E',
    padding: 16,
    justifyContent: 'space-between',
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  cardTopMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: '#6C5CE722',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6C5CE766',
  },
  categoryBadgeText: {
    color: '#A29BFE',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  cardPassBadge: {
    backgroundColor: '#FFA50218',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFA50244',
  },
  cardPassText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  targetWordBox: {
    alignItems: 'center',
    marginVertical: 6,
  },
  targetWordLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  targetWordText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#1E2548',
    marginVertical: 4,
  },
  forbiddenSection: {
    flex: 1,
    justifyContent: 'center',
  },
  forbiddenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  forbiddenSectionTitle: {
    color: '#FF7675',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginLeft: 6,
  },
  forbiddenChipsContainer: {
    gap: 6,
  },
  forbiddenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161C38',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262F5E',
  },
  forbiddenChipNum: {
    color: '#FF4757',
    fontSize: 11,
    fontWeight: '900',
    width: 20,
  },
  forbiddenChipText: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardFooterBar: {
    alignItems: 'center',
    paddingTop: 4,
  },
  cardIndexTracker: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  gameControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 74,
    marginTop: 8,
  },
  actionBtn3D: {
    flex: 1,
    height: 74,
    position: 'relative',
    marginHorizontal: 3,
  },
  btn3DBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 6,
    bottom: 0,
    borderRadius: 18,
  },
  btn3DFace: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 6,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1.5,
    borderTopColor: '#FFFFFF44',
  },
  btn3DText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  btn3DSub: {
    color: '#FFFFFFBB',
    fontSize: 8.5,
    fontWeight: '700',
  },
  summaryHeader: {
    alignItems: 'center',
    marginVertical: 14,
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 10,
  },
  summarySubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 2,
  },
  statsCardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 14,
  },
  stat3DCard: {
    flex: 1,
    backgroundColor: '#0F1326',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  stat3DVal: {
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 4,
  },
  stat3DLabel: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '800',
  },
  scoreboardCard: {
    width: '100%',
    backgroundColor: '#0F1326',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E2548',
    marginVertical: 10,
  },
  scoreboardTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  scoreRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  scoreTeamNameText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10,
  },
  scoreNumberText: {
    fontSize: 17,
    fontWeight: '900',
  },
  scoreDivider: {
    height: 1,
    backgroundColor: '#1E2548',
    marginVertical: 8,
  },
  historyContainer: {
    width: '100%',
    backgroundColor: '#0F1326',
    borderRadius: 18,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#1E2548',
  },
  historySectionTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#171B33',
  },
  historyWordText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  winnerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  winnerBadge: {
    backgroundColor: '#FFF20022',
    borderWidth: 1,
    borderColor: '#FFF20066',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 14,
    marginBottom: 6,
  },
  winnerBadgeText: {
    color: '#FFC312',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  winnerTeamName: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  winnerSubText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#000000AA',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0F1328',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#262F5E',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1B2144',
  },
  modalTitleText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 8,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E2548',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  ruleCard: {
    backgroundColor: '#141A35',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6C5CE7',
  },
  ruleCardTitle: {
    color: '#A29BFE',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  ruleCardDesc: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 19,
  },
});
