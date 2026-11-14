import type { DetailMap } from './types.ts';

// Batch d3 part c (text overrides, keyed by pattern slug); merged by d3.ts.
export const d3c: DetailMap = {
  'greedy-intervals': {
    tags: ['Sort first', 'Merge / insert', 'Earliest end wins'],
    examples: [
      { slug: '56-merge-intervals', why: 'Sort by start and keep extending one running interval: the greedy choice is to absorb every interval that begins at or before the current end.' },
      { slug: '435-non-overlapping-intervals', why: 'The sort key flips to the end time: finishing earliest leaves the most room, so you count how many intervals must be thrown away to keep a conflict-free set.' },
      { slug: '57-insert-interval', why: 'The list is already sorted, so no sorting is needed: a three-phase linear scan (before, overlapping, after) shows the same merge rule without a sort.' },
    ],
    content: {
      whenToUse: [
        'The input is a list of **ranges [start, end]** and the task is to **merge overlapping ranges**, insert one more range into a sorted list, or report what remains. Calendars, bookings, number-line segments and ranges that touch at an endpoint are the usual disguises.',
        'You must find the **fewest ranges to remove** so that the rest do not overlap, or the most ranges you can keep. This is interval scheduling: sort by **end time** and always keep the one that finishes earliest, because it leaves the most room for the others.',
        'You need the **minimum number of resources** to cover everything: arrows through balloons, platforms for trains, rooms for meetings. Sort by start (or by end), then keep one running boundary or a heap of end times instead of comparing every pair.',
        'Sorting turns **"does anything overlap?"** into a comparison with only the previous block, because after sorting by start a new range can only overlap the block built just before it. Without the sort you would test all n² pairs; with it one linear pass is enough.',
        'The statement lets you pick the **earliest finishing** (or earliest starting) option, and a short exchange argument shows that choice never hurts. Decide first whether **touching endpoints** such as [1, 4] and [4, 5] count as overlap, since that flips a ≤ into a <.',
      ],
      tip: 'Pick the sort key from the question: sort by start to merge or insert, sort by end to keep the maximum number of non-overlapping intervals. Decide up front whether touching endpoints count as overlap.',
      practice: [
        { slug: '56-merge-intervals', note: 'sort by start, extend the running end' },
        { slug: '57-insert-interval', note: 'already sorted: before, overlapping, after' },
        { slug: '435-non-overlapping-intervals', note: 'sort by end, count the removals' },
        { slug: '452-minimum-arrows-to-burst-balloons', note: 'sort by end, one arrow per group' },
        { slug: 'gfg-minimum-platforms', note: 'sorted arrivals and departures' },
        { id: '986', title: 'Interval List Intersections', difficulty: 'Medium', note: 'two pointers over two sorted lists', href: 'https://leetcode.com/problems/interval-list-intersections/' },
        { id: '1288', title: 'Remove Covered Intervals', difficulty: 'Medium', note: 'sort by start, longer first on ties', href: 'https://leetcode.com/problems/remove-covered-intervals/' },
        { id: '455', title: 'Assign Cookies', difficulty: 'Easy', note: 'sort both sides, match greedily', href: 'https://leetcode.com/problems/assign-cookies/' },
      ],
    },
    meta: {
      useNote: 'Sort by start to merge, by end to keep the most non-overlapping ranges. After sorting, only the previous block needs to be checked.',
      complexityNote: 'Sorting the n intervals costs O(n log n) and dominates; the sweep after it touches each interval once, so it is O(n). Extra space is O(1) beyond the output list, or O(n) when the merged result is stored separately.',
      highlight: ['ranges [start, end]', 'merge overlapping ranges', 'fewest ranges to remove', 'end time', 'minimum number of resources', '"does anything overlap?"', 'earliest finishing', 'touching endpoints'],
    },
  },

  'greedy-jump': {
    tags: ['Max reach', 'One pass', 'Jump window'],
    content: {
      whenToUse: [
        'Each position stores **how far you can jump** and the question is whether the last index is reachable (Jump Game). The reachable cells always form a prefix, so one integer, **reach**, replaces any search over paths.',
        'You need the **minimum number of jumps** to reach the end (Jump Game II). Treat every jump as one breadth-first level: scan the current window, remember the **farthest landing spot**, and spend a jump only when you step past the end of the window.',
        'The route is **circular** and you must find a start that completes a lap, as in Gas Station. When the running tank first goes negative, **every start inside the failed stretch fails too**, so you restart right after it instead of retrying each station.',
        'A **dynamic programme over positions** would work but costs O(n²) time, or more with jump limits. If a local best choice, such as the farthest reach, provably never hurts later decisions, the greedy scan replaces the whole table with one pass.',
        'You want **O(n) time and O(1) extra memory**. Phrases like "maximum jump length", "can reach" or "running total must stay non-negative" point to a frontier or a running balance that you update at every index and never roll back.',
      ],
      tip: 'Update reach = max(reach, i + nums[i]) at every index and fail when i > reach. For the fewest jumps, count one each time the scan crosses the end of the current window.',
      practice: [
        { slug: '55-jump-game', note: 'is the end reachable' },
        { slug: '45-jump-game-ii', note: 'fewest jumps, window by window' },
        { slug: '134-gas-station', note: 'restart after the tank goes negative' },
        { slug: '135-candy', note: 'two greedy passes' },
        { slug: '1696-jump-game-vi', note: 'DP over positions, window max via a monotonic deque' },
        { id: '1306', title: 'Jump Game III', difficulty: 'Medium', note: 'jump by plus or minus nums[i], search', href: 'https://leetcode.com/problems/jump-game-iii/' },
        { id: '860', title: 'Lemonade Change', difficulty: 'Easy', note: 'which bills to give back', href: 'https://leetcode.com/problems/lemonade-change/' },
        { slug: '763-partition-labels', note: 'extend the window to the last occurrence' },
      ],
    },
    meta: {
      useNote: 'reach = max(reach, i + nums[i]); you are stuck when i > reach. For the fewest jumps, add one each time you cross the end of the current window.',
      complexityNote: 'One left-to-right pass visits every index once, so time is O(n). Only a few integers are kept (reach, window end, jump count or tank), so extra space is O(1) and a table over all positions is never built.',
      highlight: ['how far you can jump', 'reach', 'minimum number of jumps', 'farthest landing spot', 'circular', 'every start inside the failed stretch fails too', 'dynamic programme over positions', 'O(n) time and O(1) extra memory'],
    },
  },

  'line-sweep': {
    tags: ['Events +1 / −1', 'Sorted sweep', 'Running count', 'Tie-break'],
    content: {
      whenToUse: [
        'The question asks for the **maximum overlap** at any moment: rooms needed, simultaneous meetings, peak load, the busiest hour. Each item is a start and an end on one axis, and only the **number active** matters, not which items overlap which.',
        'You must decide whether a **capacity limit is ever exceeded**, as in Car Pooling or a booking system that allows at most k overlaps. Turn each trip into +passengers and −passengers events, sort them, and stop at the first position where the running load passes the limit.',
        'The output is an **outline or a list of key points** that changes only at interval ends, such as the Skyline Problem. Keep a count or a multiset of what is active, and emit a point only when the tallest value or the total actually changes.',
        'Brute force would **compare every pair of intervals** (O(n²)) or walk every coordinate in a huge range such as 10⁹. Events shrink the work to the 2n coordinates where something really changes, so one sorted pass is enough.',
        '**Ties at equal coordinates** decide correctness: if one booking ends exactly where another starts they usually share a room, so process the end first. Sorting by (x, delta) with negative deltas first does this for free, and flipping it handles "touching counts as overlap".',
      ],
      tip: 'Settle the tie-break first: if a booking ending at x and one starting at x may share the resource, process the end first. Sorting (x, delta) with negative deltas first does it for free.',
      practice: [
        { slug: '253-meeting-rooms-ii', note: 'peak number of simultaneous meetings' },
        { slug: '1094-car-pooling', note: 'running load against a capacity' },
        { slug: '218-the-skyline-problem', note: 'multiset of active heights' },
        { slug: 'gfg-minimum-platforms', note: 'sorted arrivals and departures' },
        { id: '729', title: 'My Calendar I', difficulty: 'Medium', note: 'reject any overlap', href: 'https://leetcode.com/problems/my-calendar-i/' },
        { id: '731', title: 'My Calendar II', difficulty: 'Medium', note: 'reject a triple booking', href: 'https://leetcode.com/problems/my-calendar-ii/' },
        { id: '732', title: 'My Calendar III', difficulty: 'Hard', note: 'maximum overlap after every insertion', href: 'https://leetcode.com/problems/my-calendar-iii/' },
        { id: '2406', title: 'Divide Intervals Into Minimum Number of Groups', difficulty: 'Medium', note: 'answer is the maximum overlap', href: 'https://leetcode.com/problems/divide-intervals-into-minimum-number-of-groups/' },
      ],
    },
    meta: {
      useNote: 'Pairing every interval with every other costs O(n²). Events turn the question into one sorted pass with a running count, load or multiset; settle the tie order first.',
      complexityNote: 'Sorting the 2n events costs O(n log n) and dominates; the sweep itself is one linear pass. A heap or multiset of active items adds a log factor per event. Extra memory is the event list, O(n).',
      highlight: ['maximum overlap', 'number active', 'capacity limit is ever exceeded', 'outline or a list of key points', 'compare every pair of intervals', 'Ties at equal coordinates'],
    },
  },
};
