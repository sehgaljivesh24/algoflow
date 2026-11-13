import type { AnyProblem } from '../../engine/types.ts';
import { containsDuplicate } from '../containsDuplicate.ts';
import { firstMissingPositive } from '../firstMissingPositive.ts';
import { productOfArrayExceptSelf } from '../productOfArrayExceptSelf.ts';
import { ransomNote } from '../ransomNote.ts';
import { subarraySumEqualsK } from '../subarraySumEqualsK.ts';
import { majorityElement } from '../majorityElement.ts';
import { longestConsecutiveSequence } from '../longestConsecutiveSequence.ts';
import { romanToInteger } from '../romanToInteger.ts';
import { longestCommonPrefix } from '../longestCommonPrefix.ts';
import { encodeAndDecodeStrings } from '../encodeAndDecodeStrings.ts';
import { isomorphicStrings } from '../isomorphicStrings.ts';
import { reverseString } from '../reverseString.ts';
import { longestSubstringWithoutRepeating } from '../longestSubstringWithoutRepeating.ts';
import { longestRepeatingCharacterReplacement } from '../longestRepeatingCharacterReplacement.ts';
import { minimumWindowSubstring } from '../minimumWindowSubstring.ts';
import { permutationInString } from '../permutationInString.ts';
import { findAllAnagrams } from '../findAllAnagrams.ts';
import { validAnagram } from '../validAnagram.ts';
import { groupAnagrams } from '../groupAnagrams.ts';
import { maximumNumberOfBalloons } from '../maximumNumberOfBalloons.ts';
import { validPalindrome } from '../validPalindrome.ts';
import { validPalindromeII } from '../validPalindromeII.ts';
import { longestPalindromicSubstring } from '../longestPalindromicSubstring.ts';
import { palindromicSubstrings } from '../palindromicSubstrings.ts';

// Problems owned by one agent. Import each problem file with an explicit .ts extension and add it below.
export const arrays2strings: AnyProblem[] = [
  containsDuplicate,
  firstMissingPositive,
  productOfArrayExceptSelf,
  ransomNote,
  subarraySumEqualsK,
  majorityElement,
  longestConsecutiveSequence,
  romanToInteger,
  longestCommonPrefix,
  encodeAndDecodeStrings,
  isomorphicStrings,
  reverseString,
  longestSubstringWithoutRepeating,
  longestRepeatingCharacterReplacement,
  minimumWindowSubstring,
  permutationInString,
  findAllAnagrams,
  validAnagram,
  groupAnagrams,
  maximumNumberOfBalloons,
  validPalindrome,
  validPalindromeII,
  longestPalindromicSubstring,
  palindromicSubstrings,
];
