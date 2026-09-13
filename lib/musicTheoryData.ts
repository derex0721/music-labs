import { Note } from "@tonaljs/tonal";

export type ChordCategory =
  | "延伸和弦"
  | "變化和弦"
  | "懸留與附加音"
  | "特殊色彩";

export type ScaleCategory =
  | "大／小調系統"
  | "調式"
  | "五聲音階與藍調"
  | "對稱音階";

export interface AdvancedChord {
  id: string;
  category: ChordCategory;
  name: string;
  symbol: string;
  notes: string[];
  intervals: string[];
}

export interface AdvancedScale {
  id: string;
  category: ScaleCategory;
  name: string;
  notes: string[];
  intervals: string[];
}

interface ChordDefinition {
  id: string;
  category: ChordCategory;
  label: string;
  symbol: string;
  intervals: readonly string[];
}

interface ScaleDefinition {
  id: string;
  category: ScaleCategory;
  label: string;
  intervals: readonly string[];
}

const CHORD_DEFINITIONS: readonly ChordDefinition[] = [
  // 基礎延伸：9、11、13
  { id: "maj9", category: "延伸和弦", label: "Major 9", symbol: "maj9", intervals: ["1P", "3M", "5P", "7M", "9M"] },
  { id: "m9", category: "延伸和弦", label: "Minor 9", symbol: "m9", intervals: ["1P", "3m", "5P", "7m", "9M"] },
  { id: "9", category: "延伸和弦", label: "Dominant 9", symbol: "9", intervals: ["1P", "3M", "5P", "7m", "9M"] },
  { id: "maj11", category: "延伸和弦", label: "Major 11", symbol: "maj11", intervals: ["1P", "3M", "5P", "7M", "9M", "11P"] },
  { id: "m11", category: "延伸和弦", label: "Minor 11", symbol: "m11", intervals: ["1P", "3m", "5P", "7m", "9M", "11P"] },
  { id: "11", category: "延伸和弦", label: "Dominant 11", symbol: "11", intervals: ["1P", "3M", "5P", "7m", "9M", "11P"] },
  { id: "13", category: "延伸和弦", label: "Dominant 13", symbol: "13", intervals: ["1P", "3M", "5P", "7m", "9M", "11P", "13M"] },
  { id: "m13", category: "延伸和弦", label: "Minor 13", symbol: "m13", intervals: ["1P", "3m", "5P", "7m", "9M", "11P", "13M"] },

  // 變化屬和弦
  { id: "7b9", category: "變化和弦", label: "Dominant 7 flat 9", symbol: "7b9", intervals: ["1P", "3M", "5P", "7m", "9m"] },
  { id: "7#9", category: "變化和弦", label: "Dominant 7 sharp 9 (Hendrix)", symbol: "7#9", intervals: ["1P", "3M", "5P", "7m", "9A"] },
  { id: "7#11", category: "變化和弦", label: "Dominant 7 sharp 11 (Lydian Dominant)", symbol: "7#11", intervals: ["1P", "3M", "5P", "7m", "9M", "11A"] },
  { id: "7b13", category: "變化和弦", label: "Dominant 7 flat 13", symbol: "7b13", intervals: ["1P", "3M", "5P", "7m", "9M", "13m"] },
  { id: "alt7", category: "變化和弦", label: "Altered Dominant 7", symbol: "alt7", intervals: ["1P", "3M", "5d", "5A", "7m", "9m", "9A"] },

  // 懸留與附加音
  { id: "sus2", category: "懸留與附加音", label: "Suspended 2", symbol: "sus2", intervals: ["1P", "2M", "5P"] },
  { id: "sus4", category: "懸留與附加音", label: "Suspended 4", symbol: "sus4", intervals: ["1P", "4P", "5P"] },
  { id: "7sus4", category: "懸留與附加音", label: "Dominant 7 suspended 4", symbol: "7sus4", intervals: ["1P", "4P", "5P", "7m"] },
  { id: "add9", category: "懸留與附加音", label: "Add 9", symbol: "add9", intervals: ["1P", "3M", "5P", "9M"] },
  { id: "add11", category: "懸留與附加音", label: "Add 11", symbol: "add11", intervals: ["1P", "3M", "5P", "11P"] },
  { id: "madd9", category: "懸留與附加音", label: "Minor add 9", symbol: "madd9", intervals: ["1P", "3m", "5P", "9M"] },

  // 特殊色彩
  { id: "6", category: "特殊色彩", label: "Major 6", symbol: "6", intervals: ["1P", "3M", "5P", "6M"] },
  { id: "m6", category: "特殊色彩", label: "Minor 6", symbol: "m6", intervals: ["1P", "3m", "5P", "6M"] },
  { id: "maj7#11", category: "特殊色彩", label: "Major 7 sharp 11", symbol: "maj7#11", intervals: ["1P", "3M", "5P", "7M", "11A"] },
  { id: "m7b5", category: "特殊色彩", label: "Minor 7 flat 5 (Half-diminished)", symbol: "m7b5", intervals: ["1P", "3m", "5d", "7m"] },
  { id: "dim7", category: "特殊色彩", label: "Diminished 7", symbol: "dim7", intervals: ["1P", "3m", "5d", "7d"] },
  { id: "aug", category: "特殊色彩", label: "Augmented", symbol: "aug", intervals: ["1P", "3M", "5A"] },
  { id: "aug7", category: "特殊色彩", label: "Augmented 7", symbol: "aug7", intervals: ["1P", "3M", "5A", "7m"] },
];

const SCALE_DEFINITIONS: readonly ScaleDefinition[] = [
  // 大／小調系統與旋律小調衍生調式
  { id: "ionian", category: "大／小調系統", label: "Ionian (Major)", intervals: ["1P", "2M", "3M", "4P", "5P", "6M", "7M"] },
  { id: "aeolian", category: "大／小調系統", label: "Aeolian (Natural Minor)", intervals: ["1P", "2M", "3m", "4P", "5P", "6m", "7m"] },
  { id: "harmonic-minor", category: "大／小調系統", label: "Harmonic Minor", intervals: ["1P", "2M", "3m", "4P", "5P", "6m", "7M"] },
  { id: "melodic-minor", category: "大／小調系統", label: "Melodic Minor", intervals: ["1P", "2M", "3m", "4P", "5P", "6M", "7M"] },
  { id: "lydian-dominant", category: "大／小調系統", label: "Lydian Dominant", intervals: ["1P", "2M", "3M", "4A", "5P", "6M", "7m"] },
  { id: "altered", category: "大／小調系統", label: "Altered Scale / Super Locrian", intervals: ["1P", "2m", "3m", "4d", "5d", "6m", "7m"] },

  // 七種教會調式
  { id: "dorian", category: "調式", label: "Dorian", intervals: ["1P", "2M", "3m", "4P", "5P", "6M", "7m"] },
  { id: "phrygian", category: "調式", label: "Phrygian", intervals: ["1P", "2m", "3m", "4P", "5P", "6m", "7m"] },
  { id: "lydian", category: "調式", label: "Lydian", intervals: ["1P", "2M", "3M", "4A", "5P", "6M", "7M"] },
  { id: "mixolydian", category: "調式", label: "Mixolydian", intervals: ["1P", "2M", "3M", "4P", "5P", "6M", "7m"] },
  { id: "locrian", category: "調式", label: "Locrian", intervals: ["1P", "2m", "3m", "4P", "5d", "6m", "7m"] },

  // 五聲與藍調
  { id: "major-pentatonic", category: "五聲音階與藍調", label: "Major Pentatonic", intervals: ["1P", "2M", "3M", "5P", "6M"] },
  { id: "minor-pentatonic", category: "五聲音階與藍調", label: "Minor Pentatonic", intervals: ["1P", "3m", "4P", "5P", "7m"] },
  { id: "blues", category: "五聲音階與藍調", label: "Blues Scale", intervals: ["1P", "3m", "4P", "5d", "5P", "7m"] },
  { id: "hirajoshi", category: "五聲音階與藍調", label: "Hirajoshi", intervals: ["1P", "2M", "3m", "5P", "6m"] },

  // 對稱音階
  { id: "whole-tone", category: "對稱音階", label: "Whole Tone", intervals: ["1P", "2M", "3M", "4A", "5A", "7m"] },
  { id: "diminished-hw", category: "對稱音階", label: "Diminished HW (Half-Whole)", intervals: ["1P", "2m", "3m", "3M", "4A", "5P", "6M", "7m"] },
  { id: "diminished-wh", category: "對稱音階", label: "Diminished WH (Whole-Half)", intervals: ["1P", "2M", "3m", "4P", "5d", "6m", "6M", "7M"] },
];

/**
 * 接受 C、F#、Bb、C4 等 Tonal 可辨識的音名，回傳不含八度的根音。
 */
function normalizeRoot(rootNote: string): string {
  const root = Note.get(rootNote.trim()).pc;

  if (!root) {
    throw new Error(`Invalid root note: "${rootNote}"`);
  }

  return root;
}

function notesFromIntervals(root: string, intervals: readonly string[]): string[] {
  return intervals.map((interval) => Note.transpose(root, interval));
}

/**
 * 依指定根音建立完整的進階和弦資料。
 *
 * @example getAdvancedChords("C")[0]
 * // { name: "Cmaj9", notes: ["C", "E", "G", "B", "D"], ... }
 */
export function getAdvancedChords(rootNote: string): AdvancedChord[] {
  const root = normalizeRoot(rootNote);

  return CHORD_DEFINITIONS.map((definition) => ({
    id: definition.id,
    category: definition.category,
    name: `${root}${definition.symbol}`,
    symbol: definition.symbol,
    notes: notesFromIntervals(root, definition.intervals),
    intervals: [...definition.intervals],
  }));
}

/**
 * 依指定根音建立完整的進階音階資料。
 *
 * @example getAdvancedScales("D").find((scale) => scale.id === "dorian")
 * // { name: "D Dorian", notes: ["D", "E", "F", "G", "A", "B", "C"], ... }
 */
export function getAdvancedScales(rootNote: string): AdvancedScale[] {
  const root = normalizeRoot(rootNote);

  return SCALE_DEFINITIONS.map((definition) => ({
    id: definition.id,
    category: definition.category,
    name: `${root} ${definition.label}`,
    notes: notesFromIntervals(root, definition.intervals),
    intervals: [...definition.intervals],
  }));
}

export const advancedChordCategories: readonly ChordCategory[] = [
  "延伸和弦",
  "變化和弦",
  "懸留與附加音",
  "特殊色彩",
];

export const advancedScaleCategories: readonly ScaleCategory[] = [
  "大／小調系統",
  "調式",
  "五聲音階與藍調",
  "對稱音階",
];
