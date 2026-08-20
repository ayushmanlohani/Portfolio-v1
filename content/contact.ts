/**
 * ┌───────────────────────────────────────────────────────────────┐
 * │  THE CONTACT PAGE. EDIT THIS FILE.                            │
 * │  Nothing here is code. Change the words, save, and the page   │
 * │  updates itself — the dev server reloads on its own.          │
 * └───────────────────────────────────────────────────────────────┘
 *
 * `links` become buttons, in the order written — LinkedIn first because it is
 * the one you asked to lead with. Add or remove a line and the row re-centres
 * on its own; nothing else has to change.
 *
 * `email` is printed under its own heading and is also the mailto link. It is
 * deliberately plain text in the HTML rather than assembled in JavaScript:
 * obfuscation stops naive scrapers only, and the address is on the resume page
 * anyway, so hiding it here would buy nothing while breaking for anyone
 * without JS. Clear it to "" and the whole Email block disappears.
 */

export const CONTACT = {
  intro: [
    `The quickest way to reach me is LinkedIn or email — both go straight to me.`,
  ],

  links: [
    { label: "LinkedIn", href: "https://linkedin.com/in/ayushmanlohani" },
    { label: "GitHub", href: "https://github.com/ayushmanlohani" },
    { label: "LeetCode", href: "https://leetcode.com/u/ayushmanlohani/" },
  ],

  email: "aayushmanlohani@gmail.com",
};
