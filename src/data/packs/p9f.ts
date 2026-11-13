import type { PatternPack } from './types.ts';

/** Fragment f of pack p9: convex hull (family "Computational Geometry"). Merged by p9.ts. */

const lc = (id: string, title: string, difficulty: 'Easy' | 'Medium' | 'Hard', slug: string, note?: string) => ({
  id, title, difficulty, note, href: `https://leetcode.com/problems/${slug}/`,
});

export const frag: Pick<PatternPack, 'groups' | 'content' | 'meta' | 'examples' | 'problems'> = {
  groups: [
    {
      name: 'Computational Geometry',
      cards: [
        { slug: 'convex-hull', group: 'Computational Geometry', title: 'Convex Hull', tags: ['Geometry', 'Cross product', 'Sweep'], complexity: 'O(n log n) / O(n)' },
      ],
    },
  ],
  content: {
    'convex-hull': {
      animation: '587-erect-the-fence',
      summary: 'Find the smallest convex polygon that contains every point. Every algorithm rests on one test, the sign of a cross product, which says whether three points turn left, right or go straight.',
      whenToUse: [
        'You need the outer boundary of a set of points (fence, perimeter, enclosing region)',
        'A problem asks for the farthest pair, the minimum bounding shape or the largest triangle: they all live on the hull',
        'You must decide whether a point is inside the extreme layer of a set',
        'Points are given as coordinates and the answer depends on turns or orientation, not on distances',
      ],
      tip: 'Everything is cross(o, a, b) = (a - o) x (b - o). Positive: left turn, negative: right turn, zero: collinear. Decide up front whether collinear boundary points must be kept (pop on "< 0") or dropped (pop on "<= 0").',
      template: `// Andrew's monotone chain: sort, then build the lower and upper chain with one rule
static long cross(int[] o, int[] a, int[] b) {
    return (long) (a[0] - o[0]) * (b[1] - o[1]) - (long) (a[1] - o[1]) * (b[0] - o[0]);
}

static List<int[]> convexHull(int[][] pts) {
    Arrays.sort(pts, (p, q) -> p[0] != q[0] ? p[0] - q[0] : p[1] - q[1]);
    List<int[]> hull = new ArrayList<>();
    for (int pass = 0; pass < 2; pass++) {              // 0: lower chain, 1: upper chain
        int start = hull.size();
        for (int i = 0; i < pts.length; i++) {
            int[] p = pts[pass == 0 ? i : pts.length - 1 - i];
            while (hull.size() - start >= 2
                    && cross(hull.get(hull.size() - 2), hull.get(hull.size() - 1), p) <= 0)
                hull.remove(hull.size() - 1);           // not a left turn: the last point is inside
            hull.add(p);
        }
        hull.remove(hull.size() - 1);                   // the chain end starts the next chain
    }
    return hull;                                        // counter-clockwise corners, O(n log n)
}`,
      practice: [
        '587-erect-the-fence',
        'cp-graham-scan-convex-hull',
        { slug: 'cp-jarvis-march-gift-wrapping', note: 'output-sensitive: O(n·h)' },
        { slug: 'cp-rotating-calipers-polygon-diameter', note: 'farthest pair from the hull' },
        lc('149', 'Max Points on a Line', 'Hard', 'max-points-on-a-line', 'cross product = 0 means collinear'),
        lc('812', 'Largest Triangle Area', 'Easy', 'largest-triangle-area', 'the best triangle uses hull corners'),
      ],
    },
  },
  meta: {
    'convex-hull': {
      icon: '📐', label: 'Hull',
      desc: 'Wrap a rubber band around the points. A cross product tells at every corner whether the band turns the right way.',
      useNote: 'Sorting once makes the hull a single sweep. Pop whenever the last three points do not turn left, and decide how to treat straight points before coding.',
      complexityNote: 'Sorting costs O(n log n); each point is pushed and popped at most once per sweep. Jarvis march trades that for O(n·h) when the hull has few corners.',
      highlight: ['Convex Hull', 'outer boundary', 'farthest pair', 'cross product', 'turns'],
    },
  },
  examples: {
    'convex-hull': [
      { slug: '587-erect-the-fence', why: 'The flagship: Andrew’s monotone chain with two sweeps over sorted points, keeping points that lie exactly on the fence.' },
      { slug: 'cp-graham-scan-convex-hull', why: 'Same left-turn stack, but the points are ordered by angle around a pivot instead of by x, and collinear points are dropped.' },
      { slug: 'cp-jarvis-march-gift-wrapping', why: 'No sorting at all: wrap from corner to corner by testing every point, which costs O(n·h) and shines when the hull is small.' },
      { slug: 'cp-rotating-calipers-polygon-diameter', why: 'Uses the hull rather than building it: a pair of calipers rotates once around it to find the farthest pair in linear time.' },
    ],
  },
  problems: [
    { id: '587', title: 'Erect the Fence', difficulty: 'Hard', tag: 'convex hull (monotone chain)', category: 'Computational Geometry' },
    { id: 'CP', title: 'Graham Scan Convex Hull', difficulty: 'Medium', tag: 'convex hull (angular sort)', category: 'Computational Geometry' },
    { id: 'CP', title: 'Jarvis March (Gift Wrapping)', difficulty: 'Medium', tag: 'convex hull (gift wrapping)', category: 'Computational Geometry' },
    { id: 'CP', title: 'Rotating Calipers: Polygon Diameter', difficulty: 'Hard', tag: 'rotating calipers', category: 'Computational Geometry' },
  ],
};
