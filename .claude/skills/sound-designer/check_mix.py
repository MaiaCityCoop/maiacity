#!/usr/bin/env python3
"""The mix of a story/1 timeline, simulated and checked before it is proposed (transitions.md).

    python3 .claude/skills/sound-designer/check_mix.py story.json [--files DIR] [--min-voice 10] [--allow SECONDS ...]

story.json is a story/1 body: get_story's answer, or the body about to be proposed. Each clip's `audio` is either a
recording's hash, fetched from play's /api/files/<hash> with $PLAY_MCP_TOKEN (sent to play.maia.city only) and kept in
DIR (default ~/.cache/maia-sound), or a local file path.

The mix is simulated as the Stories player plays it: each clip's recording from its `audio_in` for its `duration`, at
its `gain` plus its track's, its `keys`, its fades (linear in amplitude), a highpass in its `eq` and half the depth of
a peaking band on music, weighted like hearing (highpass 100 Hz, +4 dB shelf from 1.5 kHz), in 50 ms steps. Three lanes:
the voice, the music (kind music or score) and the rest (ambience, sfx).

It prints and flags:
  - every voice line's margin over everything else (dB), LOW under --min-voice;
  - around every section boundary (a notes clip's start) and every music clip's first and last second, the music and
    the beds in 0.5 s steps, with:
      HOLE  the music under -52 dB for 0.4 s or more while the beds are under -45 (nothing carries across), or under
            -50 dB for a second or more even over the beds (a break in the music: an L- and a J-cut belong there);
      JUMP  the music rising more than 12 dB within 0.25 s from under -45 to over -42 (a hard cut in from nothing; a
            J-cut or a swell rises over half a second or more);
      LATE  a music clip still under -42 dB a second after it starts (an entrance too low or too slow).
  Not checked: the film's first half second and its ending after the last line, and a section boundary inside one
  music clip with no clip starting or ending within 2 s of it (the cue's own composed dynamics, a drop after its peak).
Exit code 1 when anything is flagged, so a proposal can wait on it. A break Samuel has heard and wants (a breath he asked
for) is passed with --allow and its second on the timeline: flags within 2.5 s of it are listed as allowed, and the
proposal's note says why.
"""
import argparse, json, os, re, subprocess, sys, urllib.request
import numpy as np

H = 0.05  # seconds a step
HASH = re.compile(r'^[0-9a-f]{64}$')


def fetch(audio, cache):
    if not HASH.match(audio):
        return audio
    path = os.path.join(cache, audio)
    if not os.path.exists(path):
        token = os.environ.get('PLAY_MCP_TOKEN')
        if not token:
            sys.exit(f'{audio[:12]}: a hash, and no $PLAY_MCP_TOKEN to fetch it from play')
        os.makedirs(cache, exist_ok=True)
        req = urllib.request.Request(f'https://play.maia.city/api/files/{audio}', headers={'Authorization': f'Bearer {token}'})
        with urllib.request.urlopen(req, timeout=60) as r, open(path + '.part', 'wb') as f:
            f.write(r.read())
        os.replace(path + '.part', path)
    return path


_env = {}
def envelope(path, hp=None):
    key = (path, hp)
    if key not in _env:
        af = (f'highpass=f={hp}:p=2,' if hp else '') + 'highpass=f=100:p=2,highshelf=f=1500:g=4'
        x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-af', af, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                                         capture_output=True, check=True).stdout, np.float32)
        n = int(16000 * H); k = len(x) // n
        _env[key] = 20 * np.log10(np.sqrt(np.mean(x[:k * n].reshape(k, n) ** 2, axis=1)) + 1e-6)
    return _env[key]


def simulate(story, cache):
    end = max(c['at'] + c['duration'] for t in story['tracks'] for c in t['clips'])
    N = int(end / H) + 40
    lanes = {k: np.full(N, -120.0) for k in ('voice', 'music', 'other')}
    for t in story['tracks']:
        if t.get('mute'):
            continue
        lane = 'voice' if t['kind'] == 'voice' else 'music' if t['kind'] in ('music', 'score') else 'other'
        for c in t['clips']:
            if not isinstance(c.get('audio'), str) or not c['audio']:
                continue
            hp = next((b['f'] for b in c.get('eq', []) if b['type'] == 'highpass'), None)
            e = envelope(fetch(c['audio'], cache), hp)
            a, i0, n = int(round(c['at'] / H)), int(round(c.get('audio_in', 0) / H)), int(round(c['duration'] / H))
            seg = e[i0:i0 + n] + c.get('gain', 0) + t.get('gain', 0)
            if lane == 'music':
                seg = seg + sum(b.get('gain', 0) * 0.5 for b in c.get('eq', []) if b['type'] == 'peaking')
            tt = np.arange(len(seg)) * H
            if c.get('keys'):
                ks = np.array(c['keys'], float)
                seg = seg + np.interp(tt, ks[:, 0], ks[:, 1])
            f = np.ones(len(seg))
            if c.get('fade_in'):
                f = np.minimum(f, tt / c['fade_in'])
            if c.get('fade_out'):
                f = np.minimum(f, (c['duration'] - tt) / c['fade_out'])
            seg = seg + 20 * np.log10(np.clip(f, 1e-3, 1))
            cur = lanes[lane][a:a + len(seg)]
            lanes[lane][a:a + len(seg)] = 10 * np.log10(10 ** (cur / 10) + 10 ** (seg[:len(cur)] / 10))
    return lanes


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('story')
    ap.add_argument('--files', default=os.path.expanduser('~/.cache/maia-sound'))
    ap.add_argument('--min-voice', type=float, default=10.0)
    ap.add_argument('--allow', type=float, nargs='*', default=[], help='seconds of breaks wanted on purpose')
    o = ap.parse_args()
    story = json.load(open(o.story))
    story = story.get('body', story)
    L = simulate(story, o.files)
    bed = 10 * np.log10(10 ** (L['music'] / 10) + 10 ** (L['other'] / 10))
    flags, passed = [], []
    clips = lambda kinds: [c for t in story['tracks'] if t['kind'] in kinds for c in t['clips']]

    print('Voice over everything else:')
    for c in sorted(clips(('voice',)), key=lambda c: c['at']):
        a, b = int(c['at'] / H), int((c['at'] + c['duration']) / H)
        v = L['voice'][a:b]
        if not len(v) or v.max() < -100:
            continue
        m = v > v.max() - 25
        mg = float(np.mean(v[m] - bed[a:b][m]))
        low = mg < o.min_voice
        print(f"  {c['id']:8} {c['at']:7.2f}s {mg:5.1f} dB{'   LOW' if low else ''}  {str(c.get('line', ''))[:48]}")
        if low:
            flags.append(f"LOW voice {c['id']} at {c['at']:.2f}s: {mg:.1f} dB")

    music = clips(('music', 'score'))
    edges = sorted([c['at'] for c in music] + [c['at'] + c['duration'] for c in music])
    film_end = max(c['at'] + c['duration'] for t in story['tracks'] for c in t['clips'])
    near_edge = lambda t0: any(abs(e - t0) <= 2 for e in edges)
    marks = [(n['at'], f"section {n.get('section', n['id'])}") for n in clips(('notes',)) if near_edge(n['at'])]
    for c in music:
        marks += [(c['at'], f"music in: {c['id']}"), (c['at'] + c['duration'], f"music out: {c['id']}")]
        s = int((c['at'] + 1.0) / H)
        if s + 4 <= len(L['music']) and L['music'][s:s + 4].max() < -42:
            late = f"LATE {c['id']}: the music under -42 dB a second after {c['at']:.2f}s"
            (passed if any(abs(c['at'] - a) <= 2.5 for a in o.allow) else flags).append(late)
    last_line = max((c['at'] + c['duration'] for c in clips(('voice',))), default=film_end)
    marks = [(t0, w) for t0, w in marks if 0.5 < t0 < min(film_end - 2.5, last_line + 1.0)]
    print('\nAround every boundary (music / beds, dB, 0.5 s steps from -2 to +2 s):')
    seen = set()
    for t0, what in sorted(marks):
        if round(t0, 1) in seen:
            continue
        seen.add(round(t0, 1))
        i0, i1 = max(0, int((t0 - 2) / H)), min(len(bed), int((t0 + 2) / H))
        mus, beds = L['music'][i0:i1], L['other'][i0:i1]
        steps = ' '.join(f'{mus[j:j + 10].max():4.0f}/{beds[j:j + 10].max():4.0f}' for j in range(0, len(mus), 10))
        hole = jump = False
        dead = gap = 0
        for j in range(len(mus)):
            dead = dead + 1 if (mus[j] < -52 and beds[j] < -45) else 0
            gap = gap + 1 if mus[j] < -50 else 0
            hole |= dead * H >= 0.4 or gap * H >= 1.0
        for j in range(len(mus) - 5):
            jump |= mus[j] < -45 and mus[j + 5] > -42 and mus[j + 5] - mus[j] > 12
        tag = ('  HOLE' if hole else '') + ('  JUMP' if jump else '')
        print(f'  {t0:7.2f}s {what[:34]:34} {steps}{tag}')
        allowed = any(abs(t0 - a) <= 2.5 for a in o.allow)
        if hole:
            (passed if allowed else flags).append(f'HOLE around {t0:.2f}s ({what}): the music gone with nothing carrying across')
        if jump:
            (passed if allowed else flags).append(f'JUMP around {t0:.2f}s ({what}): the music rises more than 12 dB within 0.25 s')

    if passed:
        print('\nAllowed (--allow):\n' + '\n'.join(passed))
    print('\n' + ('\n'.join(flags) if flags else 'Nothing flagged.'))
    sys.exit(1 if flags else 0)


if __name__ == '__main__':
    main()
