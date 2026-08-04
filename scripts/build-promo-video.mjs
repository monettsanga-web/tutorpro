/**
 * Placeholder note: the promo video is rendered by scripts/build_promo_video.py
 * because video encoding needs OpenCV, which is a Python library.
 *
 * Run:  python3 scripts/build_promo_video.py
 *
 * Output: public/assets/tutorpro-promo-en.webm
 *         public/assets/tutorpro-promo-ko.webm
 *
 * The narration audio is generated separately and stored alongside as .mp3.
 * This file exists so the build pipeline has a documented entry point.
 */
console.log('[promo-video] Run: python3 scripts/build_promo_video.py')
