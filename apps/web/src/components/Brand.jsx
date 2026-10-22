// The Alfa Maps logo: the app icon from the brand kit (github.com/global-alfabet/brand) and the name in Inter.
// The name takes the text colour, so it works on the dark hero and on light pages.
export function Logo() {
  return (
    <span className="logo">
      <img src="/alfa-maps-icon.svg" alt="" width="30" height="30" />
      <span className="word">Alfa Maps</span>
    </span>
  );
}
