#!/usr/bin/env bash
# A work folder for one character's face fit, OUTSIDE the repository (a person's photos and their landmarks are private):
#   bash tools/character/setup.sh <work folder>
set -euo pipefail
W="${1:?give a work folder outside the repository}"; mkdir -p "$W"; cd "$W"
[ -d venv ] || python3 -m venv venv
./venv/bin/pip install -q mediapipe numpy scipy pillow
# MediaPipe's tasks need libEGL (not used: CPU only)
# (as root here, with sudo on a runner)
SUDO=; [ "$(id -u)" = 0 ] || SUDO="sudo -n"
[ "$(uname)" = Darwin ] || python3 -c "import ctypes; ctypes.CDLL('libEGL.so.1')" 2>/dev/null || { $SUDO apt-get update -q >/dev/null; $SUDO apt-get install -y -q libegl1 libgles2 >/dev/null; }
[ -f face_landmarker.task ] || curl -sSfo face_landmarker.task https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
# MakeHuman's CC0 data: the base mesh, the modifiers and the targets only (a sparse, blob-less clone)
if [ ! -d mh ]; then
  git clone -q --filter=blob:none --sparse --depth 1 https://github.com/makehumancommunity/makehuman mh
  git -C mh sparse-checkout set --no-cone '/makehuman/data/3dobjs/base.obj' '/makehuman/data/modifiers/' '/makehuman/data/targets/*/*.target' '/makehuman/data/targets/expression/units/caucasian/'
fi
echo "ready: $W"
