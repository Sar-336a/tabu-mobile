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
} from 'react-native';
import { TABU_DECK, TabuCard } from './src/data/words';

// Titreşim (Haptics) Yardımcısı
const triggerHaptic = (type: 'correct' | 'tabu' | 'pass') => {
  if (Platform.OS === 'web') return;
  try {
    if (type === 'tabu') {
      Vibration.vibrate([0, 100, 50, 100]);
    } else if (type === 'correct') {
      Vibration.vibrate(60);
    } else {
      Vibration.vibrate(30);
    }
  } catch (e) {}
};

type Screen = 'setup' | 'game' | 'summary' | 'winner';

interface RoundWordHistory {
  word: string;
  status: 'correct' | 'tabu' | 'pass';
}

export default function App() {
  // Ayarlar State
  const [teamAName, setTeamAName] = useState('Takım Alfa');
  const [teamBName, setTeamBName] = useState('Takım Beta');
  const [roundDuration, setRoundDuration] = useState(60);
  const [passLimit, setPassLimit] = useState(3);
  const [targetScore, setTargetScore] = useState(25);

  // Oyun Akışı State
  const [currentScreen, setCurrentScreen] = useState<Screen>('setup');
  const [currentTeam, setCurrentTeam] = useState<'A' | 'B'>('A');
  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);

  // Tur İçi State
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

  // Animasyon
  const cardScale = useRef(new Animated.Value(1)).current;
  const timerProgress = useRef(new Animated.Value(1)).current;

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

    timerProgress.setValue(1);
    Animated.timing(timerProgress, {
      toValue: 0,
      duration: roundDuration * 1000,
      useNativeDriver: false,
    }).start();
  };

  // Geri Sayım Sayacı
  useEffect(() => {
    let interval: any = null;
    if (currentScreen === 'game') {
      interval = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            finishRound();
            return 0;
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

  // Kart Efekti Animasyonu
  const triggerCardAnimation = () => {
    Animated.sequence([
      Animated.timing(cardScale, { toValue: 1.04, duration: 100, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  // Kart Değiştirme
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

  // Aksiyon: DOĞRU (+1)
  const handleCorrect = () => {
    if (remainingTime <= 0) return;
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

  // Aksiyon: TABU (-1)
  const handleTabu = () => {
    if (remainingTime <= 0) return;
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

  // Aksiyon: PAS (0)
  const handlePass = () => {
    if (remainingTime <= 0 || remainingPasses <= 0) return;
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
      <StatusBar barStyle="light-content" backgroundColor="#0B0D1B" />

      {/* Üst Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleBox}>
          <Text style={styles.logoFlame}>🔥</Text>
          <Text style={styles.logoText}>
            TABU <Text style={styles.logoPro}>PRO</Text>
          </Text>
        </View>
        <TouchableOpacity style={styles.rulesBtn} onPress={() => setRulesVisible(true)}>
          <Text style={styles.rulesBtnText}>📖 Kurallar</Text>
        </TouchableOpacity>
      </View>

      {/* 1. AYARLAR EKRANI */}
      {currentScreen === 'setup' && (
        <ScrollView contentContainerStyle={styles.contentCentered}>
          <Text style={styles.setupEmoji}>🤫</Text>
          <Text style={styles.mainTitle}>Takımları Belirle</Text>
          <Text style={styles.subTitle}>Yasaklı kelimeleri kullanmadan takımına anlat!</Text>

          <View style={styles.teamInputGroup}>
            <View style={styles.inputWrapper}>
              <Text style={[styles.teamBadge, { color: '#38EF7D' }]}>A</Text>
              <TextInput
                style={styles.textInput}
                value={teamAName}
                onChangeText={setTeamAName}
                placeholder="Takım A"
                placeholderTextColor="#666"
                maxLength={15}
              />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={[styles.teamBadge, { color: '#FF7675' }]}>B</Text>
              <TextInput
                style={styles.textInput}
                value={teamBName}
                onChangeText={setTeamBName}
                placeholder="Takım B"
                placeholderTextColor="#666"
                maxLength={15}
              />
            </View>
          </View>

          {/* Ayar Kutuları */}
          <View style={styles.settingsRow}>
            <View style={styles.settingBox}>
              <Text style={styles.settingLabel}>SÜRE</Text>
              <View style={styles.adjustRow}>
                <TouchableOpacity onPress={() => setRoundDuration((v) => Math.max(30, v - 15))}>
                  <Text style={styles.adjustBtn}>-</Text>
                </TouchableOpacity>
                <Text style={styles.settingValue}>{roundDuration}s</Text>
                <TouchableOpacity onPress={() => setRoundDuration((v) => Math.min(180, v + 15))}>
                  <Text style={styles.adjustBtn}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingBox}>
              <Text style={styles.settingLabel}>PAS</Text>
              <View style={styles.adjustRow}>
                <TouchableOpacity onPress={() => setPassLimit((v) => Math.max(1, v - 1))}>
                  <Text style={styles.adjustBtn}>-</Text>
                </TouchableOpacity>
                <Text style={[styles.settingValue, { color: '#FDCB6E' }]}>{passLimit}</Text>
                <TouchableOpacity onPress={() => setPassLimit((v) => Math.min(10, v + 1))}>
                  <Text style={styles.adjustBtn}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingBox}>
              <Text style={styles.settingLabel}>HEDEF</Text>
              <View style={styles.adjustRow}>
                <TouchableOpacity onPress={() => setTargetScore((v) => Math.max(10, v - 5))}>
                  <Text style={styles.adjustBtn}>-</Text>
                </TouchableOpacity>
                <Text style={[styles.settingValue, { color: '#00D2D3' }]}>{targetScore}</Text>
                <TouchableOpacity onPress={() => setTargetScore((v) => Math.min(100, v + 5))}>
                  <Text style={styles.adjustBtn}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={startNewGame}>
            <Text style={styles.primaryBtnText}>OYUNU BAŞLAT ▶</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 2. OYUN EKRANI */}
      {currentScreen === 'game' && (
        <View style={styles.gameContainer}>
          {/* Bilgi Şeridi */}
          <View style={styles.topInfoBar}>
            <View style={styles.activeTeamBadge}>
              <View
                style={[
                  styles.teamDot,
                  { backgroundColor: currentTeam === 'A' ? '#38EF7D' : '#FF7675' },
                ]}
              />
              <Text style={styles.activeTeamName}>{activeTeamName}</Text>
            </View>
            <Text style={styles.roundScoreBadge}>Tur: {roundScore}</Text>
          </View>

          {/* Sayaç ve Pas Durumu */}
          <View style={styles.timerRow}>
            <View style={styles.timerBox}>
              <Text
                style={[
                  styles.timerText,
                  remainingTime <= 10 ? { color: '#FF7675' } : { color: '#FFF' },
                ]}
              >
                {remainingTime}
              </Text>
            </View>
            <View style={styles.passBox}>
              <Text style={styles.passLabel}>PAS</Text>
              <Text style={styles.passCount}>
                {remainingPasses}/{passLimit}
              </Text>
            </View>
          </View>

          {/* Tabu Kartı */}
          <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>HEDEF KELİME</Text>
              <Text style={styles.targetWord}>{currentCard.word}</Text>
            </View>

            <View style={styles.forbiddenContainer}>
              <Text style={styles.forbiddenLabel}>🚫 YASAKLI KELİMELER</Text>
              {currentCard.forbidden.map((word, i) => (
                <View key={i} style={styles.forbiddenItem}>
                  <Text style={styles.forbiddenWord}>{word}</Text>
                </View>
              ))}
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.categoryBadge}>🏷️ {currentCard.category}</Text>
              <Text style={styles.cardIndexText}>Kart #{cardIndex + 1}</Text>
            </View>
          </Animated.View>

          {/* Aksiyon Butonları */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.passBtn,
                remainingPasses <= 0 && { opacity: 0.4 },
              ]}
              onPress={handlePass}
              disabled={remainingPasses <= 0}
            >
              <Text style={styles.btnIcon}>⏩</Text>
              <Text style={[styles.btnLabel, { color: '#FDCB6E' }]}>PAS</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.tabuBtn]} onPress={handleTabu}>
              <Text style={styles.btnIcon}>💀</Text>
              <Text style={[styles.btnLabel, { color: '#FFF' }]}>TABU (-1)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.correctBtn]} onPress={handleCorrect}>
              <Text style={styles.btnIcon}>✓</Text>
              <Text style={[styles.btnLabel, { color: '#FFF' }]}>DOĞRU (+1)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 3. TUR ÖZETİ EKRANI */}
      {currentScreen === 'summary' && (
        <ScrollView contentContainerStyle={styles.contentCentered}>
          <Text style={styles.summaryEmoji}>⏱️</Text>
          <Text style={styles.mainTitle}>Süre Doldu!</Text>
          <Text style={styles.subTitle}>{activeTeamName} Turu Tamamladı</Text>

          {/* Skorlar */}
          <View style={styles.scoreBoard}>
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreTeamName, { color: '#38EF7D' }]}>● {teamAName}</Text>
              <Text style={styles.scorePoints}>{teamAScore} Puan</Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreTeamName, { color: '#FF7675' }]}>● {teamBName}</Text>
              <Text style={styles.scorePoints}>{teamBScore} Puan</Text>
            </View>
          </View>

          {/* Tur İstatistikleri */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { borderColor: '#38EF7D' }]}>
              <Text style={[styles.statNum, { color: '#38EF7D' }]}>{roundStats.correct}</Text>
              <Text style={styles.statLabel}>DOĞRU</Text>
            </View>
            <View style={[styles.statBox, { borderColor: '#FF7675' }]}>
              <Text style={[styles.statNum, { color: '#FF7675' }]}>{roundStats.tabu}</Text>
              <Text style={styles.statLabel}>TABU</Text>
            </View>
            <View style={[styles.statBox, { borderColor: '#FDCB6E' }]}>
              <Text style={[styles.statNum, { color: '#FDCB6E' }]}>{roundStats.pass}</Text>
              <Text style={styles.statLabel}>PAS</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#00B894', marginTop: 24 }]}
            onPress={() => startTurn(nextTeam)}
          >
            <Text style={styles.primaryBtnText}>{nextTeamName} Başlasın ▶</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 4. ŞAMPİYON EKRANI */}
      {currentScreen === 'winner' && (
        <View style={styles.contentCentered}>
          <Text style={{ fontSize: 60, marginBottom: 10 }}>🏆</Text>
          <Text style={styles.winnerSubtitle}>ŞAMPİYON</Text>
          <Text style={styles.winnerTitle}>{activeTeamName}</Text>
          <Text style={styles.subTitle}>Hedef skora ilk onlar ulaştı!</Text>

          <View style={[styles.scoreBoard, { width: '100%', marginVertical: 20 }]}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreTeamName}>{teamAName}</Text>
              <Text style={[styles.scorePoints, { color: '#38EF7D' }]}>{teamAScore} Puan</Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreTeamName}>{teamBName}</Text>
              <Text style={[styles.scorePoints, { color: '#FF7675' }]}>{teamBScore} Puan</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => setCurrentScreen('setup')}>
            <Text style={styles.primaryBtnText}>YENİDEN OYNA ↺</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* KURALLAR MODALI */}
      <Modal visible={rulesVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Resmi Tabu Kuralları</Text>
              <TouchableOpacity onPress={() => setRulesVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              <Text style={styles.ruleTitle}>1. Oyunun Amacı</Text>
              <Text style={styles.ruleDesc}>
                Hedef kelimeyi, altında sıralanan 5 yasaklı kelimeyi ağzınıza almadan takımınıza anlatın.
              </Text>

              <Text style={[styles.ruleTitle, { color: '#FF7675', marginTop: 12 }]}>
                2. Kesinlikle Yasak Olanlar (-1 Puan)
              </Text>
              <Text style={styles.ruleDesc}>
                • Kelimenin kök ve türemiş halleri ("Futbol" için "Futbolcu").{"\n"}
                • Baş harf veya kısaltma ("T ile başlıyor").{"\n"}
                • Yabancı dil karşılığı ("Araba" için "Car").{"\n"}
                • El, kol hareketleriyle havada çizim yapmak.{"\n"}
                • Ses benzetmesi veya hayvan taklidi ("Miyav").
              </Text>

              <Text style={[styles.ruleTitle, { color: '#38EF7D', marginTop: 12 }]}>
                3. Puanlama
              </Text>
              <Text style={styles.ruleDesc}>
                • Doğru: +1 Puan{"\n"}
                • Tabu: -1 Puan{"\n"}
                • Pas: 0 Puan
              </Text>
            </ScrollView>

            <TouchableOpacity style={styles.modalBtn} onPress={() => setRulesVisible(false)}>
              <Text style={styles.modalBtnText}>Anladım, Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D1B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1D36',
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoFlame: {
    fontSize: 20,
    marginRight: 6,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  logoPro: {
    fontSize: 11,
    color: '#FD79A8',
    backgroundColor: '#6C5CE733',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  rulesBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#16192E',
    borderWidth: 1,
    borderColor: '#2D3142',
  },
  rulesBtnText: {
    color: '#DDD',
    fontSize: 12,
    fontWeight: '700',
  },
  contentCentered: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  setupEmoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 12,
    color: '#8E94A5',
    textAlign: 'center',
    marginBottom: 20,
  },
  teamInputGroup: {
    width: '100%',
    gap: 10,
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16192E',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2D3142',
    paddingHorizontal: 12,
  },
  teamBadge: {
    fontSize: 16,
    fontWeight: '900',
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 12,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
    gap: 8,
  },
  settingBox: {
    flex: 1,
    backgroundColor: '#16192E',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D3142',
  },
  settingLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8E94A5',
    marginBottom: 6,
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adjustBtn: {
    fontSize: 16,
    fontWeight: '900',
    color: '#AAA',
    backgroundColor: '#0B0D1B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  settingValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#6C5CE7',
    minWidth: 26,
    textAlign: 'center',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#6C5CE7',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  // Oyun Ekranı
  gameContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  topInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#16192E',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D3142',
  },
  activeTeamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  activeTeamName: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  roundScoreBadge: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 13,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 10,
  },
  timerBox: {
    flex: 1,
    backgroundColor: '#16192E',
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D3142',
  },
  timerText: {
    fontSize: 24,
    fontWeight: '900',
  },
  passBox: {
    backgroundColor: '#16192E',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D3142',
  },
  passLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8E94A5',
  },
  passCount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FDCB6E',
  },
  card: {
    flex: 1,
    backgroundColor: '#16192E',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#2D3142',
    padding: 16,
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  cardHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2D3142',
    borderStyle: 'dashed',
    paddingBottom: 10,
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FD79A8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  targetWord: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  forbiddenContainer: {
    gap: 8,
    marginVertical: 10,
  },
  forbiddenLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FF7675',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 4,
  },
  forbiddenItem: {
    backgroundColor: '#0B0D1B99',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D314280',
    alignItems: 'center',
  },
  forbiddenWord: {
    color: '#E0E0E0',
    fontSize: 13,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#2D3142',
    paddingTop: 8,
  },
  categoryBadge: {
    fontSize: 10,
    color: '#8E94A5',
    fontWeight: '600',
  },
  cardIndexText: {
    fontSize: 10,
    color: '#8E94A5',
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passBtn: {
    backgroundColor: '#16192E',
    borderWidth: 1.5,
    borderColor: '#FDCB6E66',
  },
  tabuBtn: {
    backgroundColor: '#D63031',
  },
  correctBtn: {
    backgroundColor: '#00B894',
  },
  btnIcon: {
    fontSize: 16,
    color: '#FFF',
  },
  btnLabel: {
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  },
  // Skor & Özet
  scoreBoard: {
    width: '100%',
    backgroundColor: '#16192E',
    borderRadius: 18,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2D3142',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreTeamName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  scorePoints: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginTop: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#16192E',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#8E94A5',
    marginTop: 2,
  },
  winnerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 4,
  },
  winnerSubtitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FD79A8',
    letterSpacing: 2,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#16192E',
    borderRadius: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#2D3142',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3142',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFF',
  },
  modalClose: {
    fontSize: 16,
    color: '#8E94A5',
    fontWeight: 'bold',
  },
  ruleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6C5CE7',
    marginBottom: 4,
  },
  ruleDesc: {
    fontSize: 11,
    color: '#B0B4C3',
    lineHeight: 16,
  },
  modalBtn: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 14,
    alignItems: 'center',
    margin: 16,
    borderRadius: 14,
  },
  modalBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
