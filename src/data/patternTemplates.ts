/** "Complete Java template" for the first 13 pattern pages (newer pages carry their own `template`). */
export const TEMPLATES: Record<string, string> = {
  'sliding-window-fixed': `int maxWindowSum(int[] nums, int k) {
    // ── Phase 1: build the first window ──────────────────
    int windowSum = 0;
    for (int i = 0; i < k; i++) {
        windowSum += nums[i];
    }
    int best = windowSum;

    // ── Phase 2: slide one step at a time ────────────────
    for (int i = k; i < nums.length; i++) {
        windowSum += nums[i] - nums[i - k];   // add right, drop left
        best = Math.max(best, windowSum);
    }

    return best;   // O(n) time, O(1) space
}`,

  'sliding-window-dynamic': `int shortestWindow(int[] nums, int target) {
    int left = 0, sum = 0, best = Integer.MAX_VALUE;

    for (int right = 0; right < nums.length; right++) {
        sum += nums[right];                      // expand: take the new element

        while (sum >= target) {                  // shrink while the window is still valid
            best = Math.min(best, right - left + 1);
            sum -= nums[left++];
        }
    }

    return best == Integer.MAX_VALUE ? 0 : best;   // O(n) time, O(1) space
}`,

  'two-pointers-opposite': `int bestPair(int[] a) {
    int l = 0, r = a.length - 1, best = 0;

    while (l < r) {
        best = Math.max(best, score(a, l, r));   // evaluate the current pair
        if (a[l] < a[r]) l++;                    // move the limiting side inward
        else r--;
    }

    return best;   // O(n) time, O(1) space
}`,

  'two-pointers-same': `int compact(int[] nums) {
    int slow = 0;                                // end of the cleaned prefix

    for (int fast = 1; fast < nums.length; fast++) {
        if (nums[fast] != nums[slow]) {          // fast found a value worth keeping
            slow++;
            nums[slow] = nums[fast];
        }
    }

    return slow + 1;   // length of the cleaned prefix; O(n) time, O(1) space
}`,

  'hashing-frequency': `int[] pairWithSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>();   // value -> index

    for (int i = 0; i < nums.length; i++) {
        int need = target - nums[i];
        if (seen.containsKey(need)) {               // look up BEFORE inserting
            return new int[]{seen.get(need), i};
        }
        seen.put(nums[i], i);
    }

    return new int[]{};   // O(n) time, O(n) space
}`,

  kadane: `int maxSubarray(int[] nums) {
    int cur = nums[0], best = nums[0];

    for (int i = 1; i < nums.length; i++) {
        cur = Math.max(nums[i], cur + nums[i]);   // extend the run or restart here
        best = Math.max(best, cur);               // the best run may end before the last index
    }

    return best;   // O(n) time, O(1) space
}`,

  'binary-search-classic': `int search(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1;

    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;            // overflow-safe midpoint
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) lo = mid + 1;    // discard the left half
        else hi = mid - 1;                       // discard the right half
    }

    return -1;   // O(log n) time, O(1) space
}`,

  'stack-simple': `boolean balanced(String s) {
    Map<Character, Character> opener = Map.of(')', '(', ']', '[', '}', '{');   // closer -> its opener
    Deque<Character> stack = new ArrayDeque<>();

    for (char c : s.toCharArray()) {
        if (!opener.containsKey(c)) {
            stack.push(c);                       // an opener: remember the unfinished work
        } else {
            if (stack.isEmpty()) return false;   // a closer with nothing to close
            if (!stack.pop().equals(opener.get(c))) return false;   // the most recent opener must be its partner
        }
    }

    return stack.isEmpty();   // O(n) time, O(n) space
}`,

  'stack-monotonic-dec': `int[] nextWarmer(int[] t) {
    int[] ans = new int[t.length];
    Deque<Integer> stack = new ArrayDeque<>();   // indexes; their values never increase

    for (int i = 0; i < t.length; i++) {
        while (!stack.isEmpty() && t[i] > t[stack.peek()]) {
            int j = stack.pop();                 // day j just found its answer
            ans[j] = i - j;
        }
        stack.push(i);
    }

    return ans;   // every index is pushed and popped once: O(n)
}`,

  'linkedlist-reversal': `ListNode reverse(ListNode head) {
    ListNode prev = null, curr = head;

    while (curr != null) {
        ListNode next = curr.next;   // 1. save the rest of the list
        curr.next = prev;            // 2. flip the arrow
        prev = curr;                 // 3. advance both pointers
        curr = next;
    }

    return prev;   // the new head; O(n) time, O(1) space
}`,

  'tree-dfs': `int height(TreeNode node) {
    if (node == null) return 0;              // base case: an empty subtree

    int left = height(node.left);            // solve both subtrees first
    int right = height(node.right);

    return 1 + Math.max(left, right);        // combine; O(n) time, O(h) space
}`,

  'grid-flood-fill': `int countRegions(char[][] grid) {
    int count = 0;

    for (int r = 0; r < grid.length; r++) {
        for (int c = 0; c < grid[0].length; c++) {
            if (grid[r][c] == '1') {
                count++;
                fill(grid, r, c);                // mark the whole region as visited
            }
        }
    }

    return count;
}

void fill(char[][] g, int r, int c) {
    if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] != '1') return;
    g[r][c] = '0';                               // mark on entry, not on exit
    fill(g, r + 1, c); fill(g, r - 1, c); fill(g, r, c + 1); fill(g, r, c - 1);
}`,

  'dp-1d': `int ways(int n) {
    if (n <= 2) return n;                        // base cases

    int[] dp = new int[n + 1];
    dp[1] = 1;
    dp[2] = 2;

    for (int i = 3; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];           // the last move was 1 step or 2 steps
    }

    return dp[n];   // O(n) time; O(1) space with two rolling variables
}`,
};
