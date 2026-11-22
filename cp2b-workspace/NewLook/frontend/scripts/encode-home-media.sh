#!/usr/bin/env bash
# Builds the home page videos and their posters from the source clips.
#
# The output is not kept in git (frontend/.gitignore). It is served from
# <base path>/media (see src/lib/mediaUrl.ts):
#   development  frontend/public/media/home, which this script writes by default
#   production   /var/www/pilar2b/media/home on the server, behind an Apache Alias
#
# Usage:  SRC=~/Downloads scripts/encode-home-media.sh
#   SRC     folder holding the source clips (names below)
#   OUT     output folder (default: public/media/home)
#   FFMPEG  ffmpeg binary (default: ffmpeg on the PATH)
#
# Sources (all free to use, no attribution required):
#   gemini_generated_video_c3bedb58.mp4   biogas plant, drone pull-back (AI-generated)
#   7120005-uhd_3840_2160_30fps.mp4       cattle grazing (Pexels)
#   15791219_3840_2160_30fps.mp4          crop field with wind turbines (Pexels)
#   13805097-hd_1920_1080_30fps.mp4       sewage treatment plant, aerial (Pexels)
#   16487588-uhd_3840_2160_30fps.mp4      fuel station with wind turbines (Pexels)
#   5624050-uhd_3840_2160_24fps.mp4       river port with barges and tanks (Pexels)
set -euo pipefail

cd "$(dirname "$0")/.."
SRC="${SRC:?set SRC to the folder with the source clips}"
OUT="${OUT:-public/media/home}"
FFMPEG="${FFMPEG:-ffmpeg}"
mkdir -p "$OUT"

# Every output: H.264, 24 fps, no audio, moov atom first so it starts streaming.
ENC=(-an -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -movflags +faststart)

# Hero: one loop through the sources of biogas, 1 s cross-fades, and a short dip
# from and to petrol (#09161C) so the loop has no hard cut. The segment times
# must match SEGMENTS in src/components/home/HeroStage.tsx:
#   plant 0-9.5, livestock 9.5-14.5, crops 14.5-19.5, sewage 19.5-25.
hero() {
  local name=$1 width=$2 crf=$3
  local n="scale=$width:-2:flags=lanczos,fps=24,format=yuv420p,setsar=1,setpts=PTS-STARTPTS"
  "$FFMPEG" -v error -y \
    -ss 15 -t 10 -i "$SRC/gemini_generated_video_c3bedb58.mp4" \
    -ss 14 -t 6 -i "$SRC/7120005-uhd_3840_2160_30fps.mp4" \
    -ss 6 -t 6 -i "$SRC/15791219_3840_2160_30fps.mp4" \
    -ss 0 -t 6 -i "$SRC/13805097-hd_1920_1080_30fps.mp4" \
    -filter_complex "[0:v]$n,fade=t=in:st=0:d=0.6:color=0x09161C[a];[1:v]$n[b];[2:v]$n[c];[3:v]$n[d];[a][b]xfade=transition=fade:duration=1:offset=9[ab];[ab][c]xfade=transition=fade:duration=1:offset=14[abc];[abc][d]xfade=transition=fade:duration=1:offset=19,fade=t=out:st=24.4:d=0.6:color=0x09161C[v]" \
    -map "[v]" "${ENC[@]}" -crf "$crf" "$OUT/$name.mp4"
  "$FFMPEG" -v error -y -ss 1.5 -i "$OUT/$name.mp4" -frames:v 1 -q:v 4 "$OUT/$name.jpg"
}

# A single clip as a section backdrop: name, source, start, length, width, crf.
band() {
  local name=$1 src=$2 start=$3 length=$4 width=$5 crf=$6
  "$FFMPEG" -v error -y -ss "$start" -t "$length" -i "$SRC/$src" \
    -vf "scale=$width:-2:flags=lanczos,fps=24" "${ENC[@]}" -crf "$crf" "$OUT/$name.mp4"
  "$FFMPEG" -v error -y -ss "$start" -i "$SRC/$src" -frames:v 1 -vf "scale=$width:-2:flags=lanczos" -q:v 4 "$OUT/$name.jpg"
}

hero hero 1600 30
hero hero-small 960 29
band station 16487588-uhd_3840_2160_30fps.mp4 4 16 1600 29
band port 5624050-uhd_3840_2160_24fps.mp4 2 16 1600 29

ls -l "$OUT"
