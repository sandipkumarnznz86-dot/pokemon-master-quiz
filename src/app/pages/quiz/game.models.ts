export type GameMode = 'knowledge' | 'guess' | 'type' | 'who-am-i' | 'speed';

export function normalizeGameMode(value: unknown): GameMode {
  if (typeof value !== 'string') {
    return 'type';
  }

  switch (value.trim().toLowerCase()) {
    case 'knowledge':
    case 'knowledge-quiz':
    case 'knowledgequiz':
    case '知識クイズ':
      return 'knowledge';
    case 'guess':
    case 'guess-pokemon':
    case 'guesspokemon':
    case 'ポケモン当て':
      return 'guess';
    case 'type':
    case 'type-challenge':
    case 'typechallenge':
    case 'タイプチャレンジ':
      return 'type';
    case 'who-am-i':
    case 'whoami':
    case 'who-am-i-quiz':
    case '私は誰？':
      return 'who-am-i';
    case 'speed':
    case 'speed-battle':
    case 'speedbattle':
    case 'スピードバトル':
      return 'speed';
    default:
      return 'type';
  }
}

export interface GameResult {
  gameMode: GameMode;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalQuestions: number;
  accuracy: number;
  bestStreak: number;
  bestCombo?: number;
  timeLimit?: number;
  questionsAnswered?: number;
}
