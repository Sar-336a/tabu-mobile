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
} from './src/components/SvgIcons';
import { initAudio, playSound, toggleSound, isSoundEnabled } from './src/utils/sound';

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

type Screen = 'setup' | 'game' | 'summary' | 'winner';

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

  // Oyun Durumu
  const [currentScreen, setCurrentScreen] = useState<Screen>('setup');
  const [currentTeam, setCurrentTeam] = useState<'A' | 'B'>('A');
  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);

  // Tur İçi Değerler
  const [remainingTime, setRemainingTime] = useState(60);
  const [remainingPasses, setRemainingPasses] = useState(3);
  const [roundScore, setRoundScore] = useState(0);
  const [deck, setDeck] = useState<TabuCard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [roundStats, setRoundStats] = useState<{
    correct: number;
    tabu: number;
    pass: number;
    history: RoundWordHistory[];
  }>({ correct: 0, tabu: 0, pass: 0, history: [] });

  // Modal State
  const [rulesVisible, setRulesVisible] = useState(false);

  // Animasyon Değerleri
  const cardScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Deste karıştırma
  const shuffleDeck = () => {
    return [...TABU_DECK].sort(() => Math.random() - 0.5);
  };

  // Yeni Oyun Başlatma
  const startNewGame = () => {
    setTeamAScore(0);
    setTeamBScore(0);
    setCurrentTeam('A');
    setDeck(shuffleDeck());
    setCardIndex(0);
    startTurn('A');
  };

  // Tur Başlatma
  const startTurn = (team: 'A' | 'B') => {
    setCurrentTeam(team);
    setRemainingTime(roundDuration);
    setRemainingPasses(passLimit);
    setRoundScore(0);
    setRoundStats({ correct: 0, tabu: 0, pass: 0, history: [] });
    setCurrentScreen('game');
  };

  // Geri Sayım ve Sesli Sayaç
  useEffect(() => {
    let interval: any = null;
    if (currentScreen === 'game') {
      interval = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            playSound('round_end');
            finishRound();
            return 0;
          }
          if (prev <= 6) {
            playSound('tick');
            // Son 5 saniyede kartta nabız efekti
            Animated.sequence([
              Animated.timing(pulseAnim, { toValue: 1.03, duration: 150, useNativeDriver: true }),
              Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
            ]).start();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentScreen, roundScore, currentTeam, teamAScore, teamBScore]);

  // Tur Bitişi
  const finishRound = () => {
    const isTeamA = currentTeam === 'A';
    const currentScore = isTeamA ? teamAScore : teamBScore;
    const newScore = Math.max(0, currentScore + roundScore);

    if (isTeamA) setTeamAScore(newScore);
    else setTeamBScore(newScore);

    if (newScore >= targetScore) {
      setCurrentScreen('winner');
    } else {
      setCurrentScreen('summary');
    }
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

  // Doğru Butonu (+1)
  const handleCorrect = () => {
    if (remainingTime <= 0) return;
    playSound('correct');
    triggerHaptic('correct');
    const currentCard = deck[cardIndex] || TABU_DECK[0];

    setRoundScore((s) => s + 1);
    setRoundStats((prev) => ({
      ...prev,
      correct: prev.correct + 1,
      history: [{ word: currentCard.word, status: 'correct' }, ...prev.history],
    }));
    nextCard();
  };

  // Tabu Butonu (-1)
  const handleTabu = () => {
    if (remainingTime <= 0) return;
    playSound('tabu');
    triggerHaptic('tabu');
    const currentCard = deck[cardIndex] || TABU_DECK[0];

    setRoundScore((s) => s - 1);
    setRoundStats((prev) => ({
      ...prev,
      tabu: prev.tabu + 1,
      history: [{ word: currentCard.word, status: 'tabu' }, ...prev.history],
    }));
    nextCard();
  };

  // Pas Butonu (0)
  const handlePass = () => {
    if (remainingTime <= 0 || remainingPasses <= 0) return;
    playSound('pass');
    triggerHaptic('pass');
    const currentCard = deck[cardIndex] || TABU_DECK[0];

    setRemainingPasses((p) => p - 1);
    setRoundStats((prev) => ({
      ...prev,
      pass: prev.pass + 1,
      history: [{ word: currentCard.word, status: 'pass' }, ...prev.history],
    }));
    nextCard();
  };

  const currentCard = deck[cardIndex] || TABU_DECK[0];
  const activeTeamName = currentTeam === 'A' ? teamAName : teamBName;
  const nextTeam = currentTeam === 'A' ? 'B' : 'A';
  const nextTeamName = nextTeam === 'A' ? teamAName : teamBName;

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

      {/* 1. AYARLAR EKRANI */}
      {currentScreen === 'setup' && (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Hero Banner */}
          <View style={styles.heroBanner}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>TURNUVA MODU</Text>
            </View>
            <Text style={styles.heroTitle}>Takımını Kur & Başla</Text>
            <Text style={styles.heroSub}>
              Yasaklı kelimelere takılmadan hedef kelimeyi anlat, şampiyonluğu kazan!
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

          {/* Ayar Kutuları */}
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

          {/* 3D Başlat Butonu */}
          <TouchableOpacity
            style={styles.button3DWrapper}
            onPress={startNewGame}
            activeOpacity={0.85}
          >
            <View style={styles.button3DBase} />
            <View style={styles.button3DFace}>
              <Text style={styles.button3DText}>OYUNU BAŞLAT</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 2. OYUN EKRANI */}
      {currentScreen === 'game' && (
        <View style={styles.gameContainer}>
          {/* Üst Durum Şeridi */}
          <View style={styles.statusBarRow}>
            {/* Takım Rozeti */}
            <View style={styles.activeTeamPill}>
              {currentTeam === 'A' ? <ShieldTeamA size={24} /> : <ShieldTeamB size={24} />}
              <Text style={styles.activeTeamPillText} numberOfLines={1}>
                {activeTeamName}
              </Text>
            </View>

            {/* Sayaç Kapsülü */}
            <View
              style={[
                styles.timerCapsule,
                remainingTime <= 10 && styles.timerCapsuleAlert,
              ]}
            >
              <Clock3D size={20} color={remainingTime <= 10 ? '#FF4757' : '#00DFD8'} />
              <Text
                style={[
                  styles.timerTextValue,
                  remainingTime <= 10 && styles.timerTextAlert,
                ]}
              >
                {remainingTime}s
              </Text>
            </View>

            {/* Tur Skoru & Pas */}
            <View style={styles.scorePill}>
              <Text style={styles.scorePillLabel}>SKOR</Text>
              <Text
                style={[
                  styles.scorePillValue,
                  roundScore > 0 ? { color: '#2ED573' } : roundScore < 0 ? { color: '#FF4757' } : {},
                ]}
              >
                {roundScore > 0 ? `+${roundScore}` : roundScore}
              </Text>
            </View>
          </View>

          {/* 3D Tabu Kartı */}
          <Animated.View
            style={[
              styles.card3D,
              {
                transform: [{ scale: Animated.multiply(cardScale, pulseAnim) }],
              },
            ]}
          >
            {/* Kart Üst Başlık (Kategori & Pas) */}
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

            {/* Hedef Kelime Vitrini */}
            <View style={styles.targetWordBox}>
              <Text style={styles.targetWordLabel}>ANLATILACAK KELİME</Text>
              <Text style={styles.targetWordText} numberOfLines={2} adjustsFontSizeToFit>
                {currentCard.word}
              </Text>
            </View>

            <View style={styles.cardDivider} />

            {/* Yasaklı Kelimeler Listesi */}
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
              <Text style={styles.cardIndexTracker}>Kart #{cardIndex + 1} / {deck.length}</Text>
            </View>
          </Animated.View>

          {/* 3D Dokunsal Aksiyon Butonları */}
          <View style={styles.gameControlsRow}>
            {/* PAS Butonu */}
            <TouchableOpacity
              style={[
                styles.actionBtn3D,
                remainingPasses <= 0 && { opacity: 0.4 },
              ]}
              onPress={handlePass}
              disabled={remainingPasses <= 0}
              activeOpacity={0.8}
            >
              <View style={[styles.btn3DBase, { backgroundColor: '#B35400' }]} />
              <View style={[styles.btn3DFace, { backgroundColor: '#FFA502' }]}>
                <Pass3D size={28} />
                <Text style={styles.btn3DText}>PAS</Text>
                <Text style={styles.btn3DSub}>0 Puan</Text>
              </View>
            </TouchableOpacity>

            {/* TABU Butonu */}
            <TouchableOpacity
              style={styles.actionBtn3D}
              onPress={handleTabu}
              activeOpacity={0.8}
            >
              <View style={[styles.btn3DBase, { backgroundColor: '#A81829' }]} />
              <View style={[styles.btn3DFace, { backgroundColor: '#FF4757' }]}>
                <Tabu3D size={28} />
                <Text style={styles.btn3DText}>TABU</Text>
                <Text style={styles.btn3DSub}>−1 Puan</Text>
              </View>
            </TouchableOpacity>

            {/* DOĞRU Butonu */}
            <TouchableOpacity
              style={styles.actionBtn3D}
              onPress={handleCorrect}
              activeOpacity={0.8}
            >
              <View style={[styles.btn3DBase, { backgroundColor: '#0A7E5F' }]} />
              <View style={[styles.btn3DFace, { backgroundColor: '#2ED573' }]}>
                <Correct3D size={28} />
                <Text style={styles.btn3DText}>DOĞRU</Text>
                <Text style={styles.btn3DSub}>+1 Puan</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 3. TUR ÖZETİ EKRANI */}
      {currentScreen === 'summary' && (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryHeader}>
            <Clock3D size={48} color="#FF7675" />
            <Text style={styles.summaryTitle}>Süre Tamamlandı!</Text>
            <Text style={styles.summarySubtitle}>{activeTeamName} Turunu Bitirdi</Text>
          </View>

          {/* 3D İstatistik Rozetleri */}
          <View style={styles.statsCardGrid}>
            <View style={[styles.stat3DCard, { borderColor: '#2ED573' }]}>
              <Correct3D size={26} />
              <Text style={[styles.stat3DVal, { color: '#2ED573' }]}>{roundStats.correct}</Text>
              <Text style={styles.stat3DLabel}>DOĞRU</Text>
            </View>

            <View style={[styles.stat3DCard, { borderColor: '#FF4757' }]}>
              <Tabu3D size={26} />
              <Text style={[styles.stat3DVal, { color: '#FF4757' }]}>{roundStats.tabu}</Text>
              <Text style={styles.stat3DLabel}>TABU</Text>
            </View>

            <View style={[styles.stat3DCard, { borderColor: '#FFA502' }]}>
              <Pass3D size={26} />
              <Text style={[styles.stat3DVal, { color: '#FFA502' }]}>{roundStats.pass}</Text>
              <Text style={styles.stat3DLabel}>PAS</Text>
            </View>
          </View>

          {/* Genel Puan Tablosu */}
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

          {/* Bu Turda Oynanan Kelimeler */}
          {roundStats.history.length > 0 && (
            <View style={styles.historyContainer}>
              <Text style={styles.historySectionTitle}>TUR KELİME GEÇMİŞİ</Text>
              {roundStats.history.map((item, idx) => (
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
                      {item.status === 'correct' ? 'DOĞRU (+1)' : item.status === 'tabu' ? 'TABU (−1)' : 'PAS'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Sonraki Takım Butonu */}
          <TouchableOpacity
            style={[styles.button3DWrapper, { marginTop: 24 }]}
            onPress={() => startTurn(nextTeam)}
            activeOpacity={0.85}
          >
            <View style={[styles.button3DBase, { backgroundColor: '#0B6B56' }]} />
            <View style={[styles.button3DFace, { backgroundColor: '#10AC84' }]}>
              <Text style={styles.button3DText}>
                {nextTeamName.toUpperCase()} BAŞLASIN ▶
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 4. ŞAMPİYON EKRANI */}
      {currentScreen === 'winner' && (
        <View style={styles.winnerContainer}>
          <Trophy3D size={110} />
          <View style={styles.winnerBadge}>
            <Text style={styles.winnerBadgeText}>BÜYÜK ŞAMPİYON</Text>
          </View>
          <Text style={styles.winnerTeamName}>{activeTeamName}</Text>
          <Text style={styles.winnerSubText}>
            Hedeflenen {targetScore} puana ilk ulaşarak zaferi ilan etti!
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
              <Text style={styles.button3DText}>YENİ OYUN BAŞLAT ↺</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* KURALLAR MODALI */}
      <Modal visible={rulesVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <BookIcon3D size={22} />
                <Text style={styles.modalTitleText}>Resmi Tabu Kuralları</Text>
              </View>
              <TouchableOpacity onPress={() => setRulesVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
              <View style={styles.ruleCard}>
                <Text style={styles.ruleCardTitle}>1. Temel Amaç</Text>
                <Text style={styles.ruleCardDesc}>
                  Kartın en üstündeki hedef kelimeyi, altında listelenen 5 yasaklı kelimeyi kesinlikle kullanmadan takım arkadaşlarınıza anlatın.
                </Text>
              </View>

              <View style={[styles.ruleCard, { borderLeftColor: '#FF4757' }]}>
                <Text style={[styles.ruleCardTitle, { color: '#FF4757' }]}>
                  2. Kesinlikle Yasak Olanlar (−1 Puan)
                </Text>
                <Text style={styles.ruleCardDesc}>
                  • Kelimenin kökünden türetme yapmak ("Kitap" için "Kitapçı").{"\n"}
                  • Baş harf, hece veya harf sayısı belirtmek.{"\n"}
                  • Başka dillerdeki çevirisini söylemek ("Car", "Book").{"\n"}
                  • El-kol, mimik veya havada şekil çizmek.{"\n"}
                  • Hayvan, ses veya melodi taklidi yapmak.
                </Text>
              </View>

              <View style={[styles.ruleCard, { borderLeftColor: '#2ED573' }]}>
                <Text style={[styles.ruleCardTitle, { color: '#2ED573' }]}>
                  3. Puanlama & Pas
                </Text>
                <Text style={styles.ruleCardDesc}>
                  • Doğru bilinen her kart: <Text style={{ color: '#2ED573', fontWeight: 'bold' }}>+1 Puan</Text>{"\n"}
                  • Tabu yapılan her kart: <Text style={{ color: '#FF4757', fontWeight: 'bold' }}>−1 Puan</Text>{"\n"}
                  • Pas geçilen kartlar: <Text style={{ color: '#FFA502', fontWeight: 'bold' }}>0 Puan (Limitli)</Text>
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
    marginBottom: 24,
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
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  gameContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  statusBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  activeTeamPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1326',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#23294E',
    maxWidth: width * 0.38,
  },
  activeTeamPillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  timerCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1326',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: '#00DFD866',
  },
  timerCapsuleAlert: {
    borderColor: '#FF4757',
    backgroundColor: '#FF475722',
  },
  timerTextValue: {
    color: '#00DFD8',
    fontSize: 17,
    fontWeight: '900',
    marginLeft: 6,
  },
  timerTextAlert: {
    color: '#FF4757',
  },
  scorePill: {
    alignItems: 'flex-end',
    backgroundColor: '#0F1326',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#23294E',
  },
  scorePillLabel: {
    color: '#718096',
    fontSize: 9,
    fontWeight: '800',
  },
  scorePillValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  card3D: {
    flex: 1,
    backgroundColor: '#0F1328',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#28315E',
    padding: 16,
    justifyContent: 'space-between',
    marginVertical: 6,
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
    marginVertical: 8,
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
    paddingVertical: 8,
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
    fontSize: 16,
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
    marginHorizontal: 4,
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
    fontSize: 9,
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
    fontSize: 10,
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
