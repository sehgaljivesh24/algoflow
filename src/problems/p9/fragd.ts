import type { AnyProblem } from '../../engine/types.ts';
import { suffixArrayAndLcpProblem } from './suffixArrayAndLcp.ts';
import { countDistinctSubstrings } from './countDistinctSubstrings.ts';
import { patternSearchSuffixArray } from './patternSearchSuffixArray.ts';
import { ahoCorasickBuild } from './ahoCorasickBuild.ts';
import { multiKeywordSearch } from './multiKeywordSearch.ts';
import { streamOfCharacters } from './streamOfCharacters.ts';

/** Problems of fragment d of pack p9: suffix structures + Aho-Corasick. */
export const problems: AnyProblem[] = [
  suffixArrayAndLcpProblem,
  countDistinctSubstrings,
  patternSearchSuffixArray,
  ahoCorasickBuild,
  multiKeywordSearch,
  streamOfCharacters,
];
