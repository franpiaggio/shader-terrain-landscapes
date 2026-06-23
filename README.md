# Shader Terrain & Landscapes — an advanced raymarching track

Build an Iñigo-Quílez-style **landscape renderer** in the browser, step by step. Heightfield raymarching,
noise terrain, slope/height materials, cast shadows and atmospheric fog — ending in a flythrough vista you
can paste straight into [Shadertoy](https://www.shadertoy.com/), plus sunset and desert variants.

Every lesson runs **live in the page**: real WebGL shaders, draggable sliders, and ▶ Run buttons. No build
step, no dependencies.

> **▶ Full-screen live demo:** https://franpiaggio.github.io/shader-terrain-landscapes/demo/terrain.html — fly through a raymarched landscape (move the mouse to look)
> **📚 Learning path:** https://franpiaggio.github.io/shader-terrain-landscapes/

<!-- Add a screenshot for your post, e.g.: ![preview](preview.png) -->

This is the **advanced track** that follows the core
[Interactive Shader Course](https://franpiaggio.github.io/interactive-shader-course/)
([repo](https://github.com/franpiaggio/interactive-shader-course)). Do the core course first —
especially raymarching, fBM noise, and lighting/fog.

## The track

| # | Lesson | The win |
|---|---|---|
| A1 | Heightfield raymarching | March a ray and compare it to a height map `h(x,z)` |
| A2 | Noise terrain & light | fBM height + normals from finite differences + diffuse |
| A3 | Painting the landscape | Slope/height materials, cast shadows, fog — a postable vista |
| A4 | Variants & moods | The same renderer as a sunset and a desert; the knobs that carry a mood |

## Run it locally

```bash
python3 -m http.server 8777
# then open http://localhost:8777/  (redirects to advanced/index.html)
```

ES modules need HTTP — opening files as `file://` won't load the shaders.

## Credits

Grounded in **[Iñigo Quílez](https://iquilezles.org/articles/)** — especially
[Terrain marching](https://iquilezles.org/articles/terrainmarching/),
[fBM](https://iquilezles.org/articles/fbm/), and his
["Painting a landscape with maths"](https://www.youtube.com/watch?v=BFld4EBO2RE) talk.

## License

MIT — see [`LICENSE`](./LICENSE).
