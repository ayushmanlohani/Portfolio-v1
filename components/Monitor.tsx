/**
 * The beige CRT the whole site lives inside. Children render into the glass;
 * this component owns nothing but the plastic.
 *
 * The monitor fills the viewport, so the glass takes the viewer's own screen
 * shape — no fixed aspect ratio, no stand, nothing to gap or clip. See the
 * --bezel / --chin / --px notes in globals.css.
 *
 * `data-frame="off"` strips the plastic entirely — Windows edge to edge.
 * Switch it to "on" to bring the bezel and chin back.
 */
export function Monitor({ children }: { children: React.ReactNode }) {
  return (
    <div className="crt" data-frame="off">
      <div className="crt-body">
        <div className="crt-screen">
          {children}
          <div className="crt-glass" />
        </div>

        <div className="crt-chin">
          <div className="crt-brand">MULTISYNC</div>
          <div className="crt-controls">
            <div className="crt-button" />
            <div className="crt-button" />
            <div className="crt-button" />
            <div className="crt-led" />
          </div>
        </div>
      </div>
    </div>
  );
}
