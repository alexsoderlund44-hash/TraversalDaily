Slideshow sources. They reuse the reel toolkit in ../../reels/src (base.css, lib.js, fonts, d3, world-lite.js, render.js):
copy these four files next to it, then `node render.js slides-a-quiz.html out/slide.png 0,1,2,3,4,5,6` writes one JPEG per slide
and `node render.js slides-a-quiz.html qa` checks every slide for TikTok safe zones and overlapping text.
`ig/` holds 1080×1350 crops (y 165–1515) for Instagram carousels.
