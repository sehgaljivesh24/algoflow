# Phone test checklist

What a scripted headless-Chrome harness (iframes at 390 / 768 / 1280 px, scripted clicks and key presses) could **not** verify. Open each URL on a real phone (Safari on iPhone, Chrome on Android) and tick it off.

1. **Touch scrolling inside a picture.** `/patterns/sliding-window-fixed?ex=1`: drag the picture sideways and then scroll the page up and down with your thumb on the picture. The page must not get stuck and the picture must scroll smoothly.
2. **Wide graph scrolls sideways.** `/patterns/graph-union-find?ex=1` and `/problem/743-network-delay-time`: nodes should be about 34 px with readable labels; swipe the graph left and right, and check the swipe does not fight the page scroll.
3. **Binary tree fits.** `/problem/105-construct-tree-from-preorder-inorder` (step through to the end): a small tree must fit the card without sideways scrolling.
4. **Tap targets.** `/` : tap the filter chips (P1, Easy, Animated only), the bookmark star, the status circle, `viz` and `LC` chips with one finger without hitting a neighbour. Same for `/patterns` (`Open →` card, practice pills) and `/cheatsheets` (link rows).
5. **Play / Pause / Next / Prev / Reset by touch.** `/patterns/two-pointers-opposite?ex=1` and `/problem/1-two-sum`: all five controls reachable with one thumb, the Speed select opens the native picker, the step counter stays visible.
6. **Speed slider.** `/problem/1-two-sum`: drag the Speed slider (the thumb should be easy to grab) and the progress bar under the buttons (tap it to jump to a step).
7. **Pinch zoom.** Pinch-zoom the picture on `/problem/1-two-sum` and `/patterns/sliding-window-fixed?ex=1`, then double-tap to reset. Nothing should overflow sideways once zoomed out.
8. **On-screen keyboard.** `/problem/1-two-sum`: tap the `Custom:` input and type `[2,7,11,15] 9`. The keyboard must not hide the input or the Run button, the page must not jump, and the notes button (bottom right) must stay reachable.
9. **iOS 100vh and address bar.** Scroll `/patterns/sliding-window-fixed?ex=1` up and down: the sticky header must stay put while the Safari address bar collapses and expands, with no gap or jump. Check the same in landscape.
10. **Sticky header on the problem page.** `/problem/1-two-sum`: scroll past the header and back; look for jitter or a white strip.
11. **Content shifting while playing.** Press Play on `/problem/77-combinations` (the picture and the narration under it should stay roughly in place) and on `/patterns/graph-union-find?ex=1`. The one expected move is the approach banner collapsing when step 1 starts.
12. **Animation smoothness.** Press Play on `/patterns/sliding-window-dynamic?ex=1` (speed Fast) and watch the window frame, the pop and shake of cells and the pointer slide. Look for stutter or dropped frames; also try Turbo and `/problem/206-reverse-linked-list`.
13. **Rotate while playing.** Rotate the phone to landscape and back during playback on `/problem/1-two-sum`; the layout must re-flow and playback keep going.
14. **Light theme on a bright screen.** Tap the sun / moon button on `/patterns/sliding-window-fixed?ex=1` and `/problem/1-two-sum`; check contrast of faded cells and small labels.
15. **Code panel copy.** `/problem/1-two-sum`: tap `Copy` and `Java | Python` in the code panel (small buttons), then paste somewhere to confirm the clipboard works on iOS.
