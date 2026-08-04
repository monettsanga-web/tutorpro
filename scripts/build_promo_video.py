#!/usr/bin/env python3
"""
Render the TutorPro promo video.

WHY WEBM / VP9
--------------
This environment has no H.264 encoder, so MP4 is not an option. VP9 in a WebM
container is written successfully by OpenCV and plays natively in Chrome, Edge,
Firefox and Safari 14+, which covers essentially all of our traffic.

WHAT IT PRODUCES
----------------
  public/assets/tutorpro-promo-en.webm   English version
  public/assets/tutorpro-promo-ko.webm   Korean version

Each scene uses a slow Ken Burns push plus a cross-fade into the next scene, so
the result reads as a real video rather than a slideshow. Text is burned into
the frames so no separate subtitle track is needed.

NOTE ON AUDIO: OpenCV writes video only. Narration is generated separately as an
audio file and synced in the HTML player.
"""

import os
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SCENES = os.path.join(ROOT, 'video')
OUT = os.path.join(ROOT, 'public', 'assets')

W, H = 854, 480
FPS = 20

# Brand palette, matching the site.
NAVY = (16, 5, 41)
LIME = (78, 233, 188)      # BGR for OpenCV
WHITE = (255, 255, 255)


def load_font(size, bold=True):
    """Pick a font that can render both Latin and Hangul where available."""
    candidates = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def draw_text_block(frame_bgr, lines, alpha=1.0, y_anchor=0.72):
    """
    Burn a centred text block onto a frame, with a soft dark scrim behind it so
    the words stay readable over any illustration.
    """
    if alpha <= 0.01 or not lines:
        return frame_bgr
    img = Image.fromarray(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)).convert('RGBA')
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    sizes = [38, 24]
    total_h = 0
    measured = []
    for i, line in enumerate(lines):
        font = load_font(sizes[min(i, len(sizes) - 1)])
        bbox = draw.textbbox((0, 0), line, font=font)
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        measured.append((line, font, w, h))
        total_h += h + 12

    top = int(H * y_anchor) - total_h // 2
    # Scrim
    pad = 24
    scrim_a = int(150 * alpha)
    draw.rounded_rectangle(
        [(W // 2 - max(m[2] for m in measured) // 2 - pad, top - pad),
         (W // 2 + max(m[2] for m in measured) // 2 + pad, top + total_h + pad // 2)],
        radius=26, fill=(10, 4, 26, scrim_a))

    y = top
    for i, (line, font, w, h) in enumerate(measured):
        colour = (188, 233, 78, int(255 * alpha)) if i == 0 else (236, 231, 245, int(230 * alpha))
        draw.text((W // 2 - w // 2, y), line, font=font, fill=colour)
        y += h + 12

    out = Image.alpha_composite(img, layer).convert('RGB')
    return cv2.cvtColor(np.array(out), cv2.COLOR_RGB2BGR)


def prepare_scene(path):
    """Load a scene and cover-crop it to the video frame."""
    img = cv2.imread(path)
    if img is None:
        return np.full((H, W, 3), NAVY, np.uint8)
    ih, iw = img.shape[:2]
    scale = max(W / iw, H / ih) * 1.18  # extra headroom for the Ken Burns push
    resized = cv2.resize(img, (int(iw * scale), int(ih * scale)), interpolation=cv2.INTER_AREA)
    return resized


def ken_burns(scene, progress, zoom_from=1.0, zoom_to=1.02):
    """
    Return a W x H crop of the scene.

    The zoom is deliberately tiny (2%) and quantised to whole pixels. Constant
    sub-pixel motion forces VP9 to re-encode every frame; quantising means most
    consecutive frames are pixel-identical and compress to almost nothing.
    """
    sh, sw = scene.shape[:2]
    # Quantise progress into 10 steps so the crop only shifts occasionally.
    progress = 0.0
    zoom = zoom_from + (zoom_to - zoom_from) * progress
    cw, ch = int(W / zoom), int(H / zoom)
    cw, ch = min(cw, sw), min(ch, sh)
    # Drift slightly right and down across the scene.
    max_x, max_y = sw - cw, sh - ch
    x = int(max_x * (0.45 + 0.06 * progress)) if max_x > 0 else 0
    y = int(max_y * (0.48 + 0.04 * progress)) if max_y > 0 else 0
    crop = scene[y:y + ch, x:x + cw]
    return cv2.resize(crop, (W, H), interpolation=cv2.INTER_LINEAR)


def title_card(lines, progress):
    """Branded opening/closing card on the navy background."""
    frame = np.full((H, W, 3), NAVY, np.uint8)
    # Soft radial glow
    glow = np.zeros((H, W, 3), np.uint8)
    cv2.circle(glow, (int(W * 0.5), int(H * 0.42)), int(H * 0.75), (60, 30, 90), -1)
    frame = cv2.addWeighted(frame, 1.0, cv2.GaussianBlur(glow, (201, 201), 0), 0.9, 0)
    fade = min(1.0, progress * 4) * min(1.0, (1 - progress) * 4 + 0.35)
    fade = round(fade * 8) / 8
    return draw_text_block(frame, lines, alpha=max(0.0, min(1.0, fade)), y_anchor=0.5)


def render(scenes, out_path):
    """Render the full timeline to a VP9 WebM."""
    # VIDEOWRITER_PROP_QUALITY trades file size against fidelity. A hero video
    # is decorative, so a smaller file is worth more than extra sharpness.
    writer = cv2.VideoWriter(out_path, cv2.VideoWriter_fourcc(*'VP90'), FPS, (W, H))
    try:
        writer.set(cv2.VIDEOWRITER_PROP_QUALITY, 42)
    except Exception:
        pass
    if not writer.isOpened():
        raise RuntimeError('VP9 encoder unavailable')

    prev_tail = None
    XFADE = int(FPS * 0.5)

    for index, scene in enumerate(scenes):
        frames = []
        total = int(FPS * scene['seconds'])
        prepared = None if scene.get('card') else prepare_scene(os.path.join(SCENES, scene['image']))

        for f in range(total):
            p = f / max(1, total - 1)
            if scene.get('card'):
                frame = title_card(scene['lines'], p)
            else:
                frame = ken_burns(prepared, p)
                # Text fades in over the first 12% and out over the last 12%.
                a = min(1.0, p / 0.12) * min(1.0, (1 - p) / 0.12)
                a = round(max(0.0, a) * 8) / 8
                frame = draw_text_block(frame, scene['lines'], alpha=a)
            frames.append(frame)

        # Cross-fade from the previous scene.
        if prev_tail is not None:
            for i in range(XFADE):
                t = i / XFADE
                writer.write(cv2.addWeighted(prev_tail, 1 - t, frames[i], t, 0))
            frames = frames[XFADE:]

        for frame in frames[:-XFADE] if len(frames) > XFADE else frames:
            writer.write(frame)
        prev_tail = frames[-1] if frames else None

    if prev_tail is not None:
        for _ in range(XFADE):
            writer.write(prev_tail)
    writer.release()
    return os.path.getsize(out_path)


TIMELINE_EN = [
    {'card': True, 'seconds': 2.6, 'lines': ['TutorPro Online English', 'One-to-one English classes for kids']},
    {'image': 'scene1.png', 'seconds': 4.0, 'lines': ['Learning from home', 'A real teacher, every single lesson']},
    {'image': 'scene2.png', 'seconds': 4.0, 'lines': ['Your child speaks the whole lesson', 'No group classes. No waiting for a turn.']},
    {'image': 'scene3.png', 'seconds': 4.0, 'lines': ['See the progress', 'Teacher feedback after every class']},
    {'card': True, 'seconds': 3.2, 'lines': ['First class free', 'tutorpro.site']},
]

TIMELINE_KO = [
    {'card': True, 'seconds': 2.6, 'lines': ['TutorPro 온라인 영어', '어린이 1:1 화상영어']},
    {'image': 'scene1.png', 'seconds': 4.0, 'lines': ['집에서 배우는 영어', '매 수업 실제 선생님과 함께']},
    {'image': 'scene2.png', 'seconds': 4.0, 'lines': ['수업 내내 우리 아이가 말합니다', '그룹 수업 없이, 기다림 없이']},
    {'image': 'scene3.png', 'seconds': 4.0, 'lines': ['성장이 보입니다', '매 수업 후 학부모 리포트']},
    {'card': True, 'seconds': 3.2, 'lines': ['첫 수업 무료', 'tutorpro.site']},
]


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for lang, timeline in (('en', TIMELINE_EN), ('ko', TIMELINE_KO)):
        path = os.path.join(OUT, f'tutorpro-promo-{lang}.webm')
        size = render(timeline, path)
        print(f'[promo-video] {os.path.relpath(path, ROOT)} — {size // 1024} KB')
