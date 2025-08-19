/**
 * @class Vietnamese lip-sync processor with full phoneme rules
 */
export class LipsyncVi {
  constructor() {
    this.durationScale = 1.5;

    // Handle consonant clusters and vowel diphthongs
    this.rules = [
      // Consonant clusters
      { seq: 'ngh', vis: 'nn kk' },
      { seq: 'ng', vis: 'nn kk' },
      { seq: 'ch', vis: 'kk' },
      { seq: 'tr', vis: 'kk' },
      { seq: 'nh', vis: 'nn' },
      { seq: 'ph', vis: 'FF' },
      { seq: 'th', vis: 'DD' },
      { seq: 'gi', vis: 'ii' },
      { seq: 'kh', vis: 'kk' },
      { seq: 'qu', vis: 'kk U' },

      // Vowel clusters
      { seq: 'oa', vis: 'O aa' },
      { seq: 'oe', vis: 'O E' },
      { seq: 'uy', vis: 'U I' },
      { seq: 'uê', vis: 'U E' },
      { seq: 'ươ', vis: 'U O' },
      { seq: 'iê', vis: 'I E' },
      { seq: 'yê', vis: 'U E' },
      { seq: 'ia', vis: 'I aa' },
      { seq: 'ua', vis: 'U aa' },
      { seq: 'ưa', vis: 'U aa' },
    ];

    this.charMap = {
      'a': 'aa', 'ă': 'aa', 'â': 'aa', 'á': 'aa', 'à': 'aa', 'ả': 'aa', 'ã': 'aa', 'ạ': 'aa',
      'e': 'E', 'ê': 'E', 'é': 'E', 'è': 'E', 'ẻ': 'E', 'ẽ': 'E', 'ẹ': 'E',
      'i': 'I', 'í': 'I', 'ì': 'I', 'ỉ': 'I', 'ĩ': 'I', 'ị': 'I',
      'o': 'O', 'ô': 'O', 'ơ': 'O', 'ó': 'O', 'ò': 'O', 'ỏ': 'O', 'õ': 'O', 'ọ': 'O',
      'u': 'U', 'ư': 'U', 'ú': 'U', 'ù': 'U', 'ủ': 'U', 'ũ': 'U', 'ụ': 'U',
      'y': 'U', 'ý': 'U', 'ỳ': 'U', 'ỷ': 'U', 'ỹ': 'U', 'ỵ': 'U',

      'b': 'PP', 'm': 'PP', 'p': 'PP',
      'c': 'kk', 'k': 'kk', 'g': 'kk', 'h': 'kk',
      'd': 'DD', 'đ': 'DD', 't': 'DD',
      'l': 'nn', 'n': 'nn',
      's': 'SS', 'x': 'SS', 'z': 'SS',
      'r': 'RR',
      'v': 'FF', 'w': 'FF', 'f': 'FF',
      ' ': 'sil', ',': 'sil', '.': 'sil', '?': 'sil', '!': 'sil'
    };

    this.visemeDurations = {
      'aa': 0.95, 'E': 0.90, 'I': 0.92, 'O': 0.96, 'U': 0.95,
      'PP': 1.08, 'kk': 1.21, 'DD': 1.05, 'nn': 0.88,
      'SS': 1.23, 'RR': 0.88, 'FF': 1.00, 'ii': 0.92,
      'sil': 1.00
    };

    this.symbols = {
      '%': 'phần trăm',
      '₫': 'đồng',
      '&': 'và',
      '+': 'cộng'
    };
    this.symbolsReg = /[%₫&\+]/g;

    this.ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    this.teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];
    this.tens = ['', '', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
  }

  numberToWords (num) {
    num = parseInt(num, 10);
    if (num < 10) return this.ones[num];
    if (num < 20) return this.teens[num - 10];
    if (num < 100) {
      const ten = Math.floor(num / 10), rem = num % 10;
      return this.tens[ten] + (rem ? ' ' + (rem === 5 ? 'lăm' : this.ones[rem]) : '');
    }
    if (num < 1000) {
      const hun = Math.floor(num / 100), rem = num % 100;
      return this.ones[hun] + ' trăm' + (rem ? ' ' + this.numberToWords(rem) : '');
    }
    return num.toString();
  }

  preProcessText (text) {
    return text
      .replace(this.symbolsReg, match => ' ' + this.symbols[match] + ' ')
      .replace(/\d+/g, num => this.numberToWords(num))
      .toLowerCase()
      .normalize('NFC')
      .replace(/\s+/g, ' ')
      .trim();
  }

  wordsToVisemes (text) {
    const output = { words: text, visemes: [], times: [], durations: [] };
    const chars = Array.from(text);
    const len = chars.length;
    let t = 0, i = 0;

    while (i < len) {
      let matched = false;

      // Try cluster rules first
      for (const rule of this.rules) {
        const { seq, vis } = rule;
        if (text.substr(i, seq.length) === seq) {
          const visemes = vis.split(' ');
          for (const v of visemes) {
            const dur = (this.visemeDurations[v] || 1) * this.durationScale;
            const last = output.visemes.at(-1);
            if (last === v) {
              output.durations[output.durations.length - 1] += 0.7 * dur;
              t += 0.7 * dur;
            } else {
              output.visemes.push(v);
              output.times.push(t);
              output.durations.push(dur);
              t += dur;
            }
          }
          i += seq.length;
          matched = true;
          break;
        }
      }

      if (matched) continue;

      const ch = chars[i];
      const v = this.charMap[ch] || 'sil';
      const dur = (this.visemeDurations[v] || 1) * this.durationScale;
      const last = output.visemes.at(-1);

      if (v === last) {
        output.durations[output.durations.length - 1] += 0.7 * dur;
        t += 0.7 * dur;
      } else {
        output.visemes.push(v);
        output.times.push(t);
        output.durations.push(dur);
        t += dur;
      }

      i++;
    }

    return output;
  }
}
