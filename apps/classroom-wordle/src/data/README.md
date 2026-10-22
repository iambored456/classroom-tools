# Guess dictionary

`english-words.txt` contains the unique lowercase ASCII words of lengths 3–6
from [sindresorhus/word-list](https://github.com/sindresorhus/word-list), pinned to
commit `60b5059f4782080b1b254ac6cca46bb5eb4902ea` (retrieved October 21, 2026).
The upstream MIT license is distributed in `public/word-list-license.txt`.

The dictionary is bundled into the app; submitting a guess makes no network
request. It is broader than the answer library and includes plurals and spelling
variants. It does not claim to contain every English word. Words configured in
the active teacher word set, including the round's answer, are also accepted.
The answer pool is still controlled by the teacher's word library.

To refresh, download `words.txt` from a pinned upstream commit, retain lines
matching `^[a-z]{3,6}$`, remove duplicates, sort, and save with LF line endings.
Update this commit reference and retain the upstream license.
