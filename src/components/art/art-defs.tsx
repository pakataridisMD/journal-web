/** Filter ids shared by every <Plate> and <Scene> on the page. */
export const GRAIN_FILTER = "url(#art-grain)";
export const ROUGH_FILTER = "url(#art-rough)";

/**
 * The two filters behind the cut-paper look, rendered once in the root
 * layout: `art-grain` prints a paper grain of light and dark specks over a
 * coloured field, and `art-rough` wobbles ink lines a little, like a pen on
 * paper. Kept out of `display: none`, which would switch the filters off.
 */
export function ArtDefs() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <filter id="art-grain" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves={3} seed={4} stitchTiles="stitch" result="noise" />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0.98  0 0 0 0 0.97  0 0 0 0 0.94  10 0 0 0 -6.9"
            result="light"
          />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0.1  0 0 0 0 0.08  0 0 0 0 0.06  0 -9 0 0 3.5"
            result="dark"
          />
          <feComposite in="light" in2="SourceGraphic" operator="in" result="lightOnField" />
          <feComposite in="dark" in2="SourceGraphic" operator="in" result="darkOnField" />
          <feComponentTransfer in="darkOnField" result="darkSoft">
            <feFuncA type="linear" slope={0.18} />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="darkSoft" />
            <feMergeNode in="lightOnField" />
          </feMerge>
        </filter>
        <filter id="art-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves={2} seed={8} result="wobble" />
          <feDisplacementMap in="SourceGraphic" in2="wobble" scale={3} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
