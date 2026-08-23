"use client";

import { launchWindow, PERSONALIZE_ID, PHOTOS_PREFIX } from "@/components/win7/apps";
import {
  ClockRegionIcon,
  ComputerIcon,
  EaseOfAccessIcon,
  HardwareIcon,
  NavArrowIcon,
  NetworkIcon,
  PersonalizeIcon,
  ProgramsIcon,
  SearchIcon,
  UserIcon,
} from "@/components/win7/icons";

/**
 * Control Panel Home — the category grid Windows 7 opens to. The one real
 * applet is Appearance and Personalization's "Change the desktop background",
 * which opens the same Personalize window the desktop's right-click menu
 * does. Every other link and category heading is a joke button: it opens
 * TrySomethingElse.jpg in Photo Viewer instead of doing anything real.
 */

const openMeme = () => launchWindow(`${PHOTOS_PREFIX}/letterbox/TrySomethingElse.jpg`);

type Category = {
  icon: (props: { className?: string }) => React.ReactElement;
  title: string;
  links: { label: string; onClick?: () => void }[];
};

function categories(): Category[] {
  return [
    {
      icon: ComputerIcon,
      title: "System and Security",
      links: [
        { label: "Review your computer's status" },
        { label: "Back up your computer" },
        { label: "Find and fix problems" },
      ],
    },
    {
      icon: NetworkIcon,
      title: "Network and Internet",
      links: [
        { label: "View network status and tasks" },
        { label: "Choose homegroup and sharing options" },
      ],
    },
    {
      icon: HardwareIcon,
      title: "Hardware and Sound",
      links: [
        { label: "View devices and printers" },
        { label: "Adjust commonly used mobility settings" },
      ],
    },
    {
      icon: ProgramsIcon,
      title: "Programs",
      links: [{ label: "Uninstall a program" }],
    },
    {
      icon: UserIcon,
      title: "User Accounts and Family Safety",
      links: [
        { label: "Add or remove user accounts" },
        { label: "Set up parental controls for any user" },
      ],
    },
    {
      icon: PersonalizeIcon,
      title: "Appearance and Personalization",
      links: [
        { label: "Change the desktop background", onClick: () => launchWindow(PERSONALIZE_ID) },
        { label: "Adjust screen resolution" },
      ],
    },
    {
      icon: ClockRegionIcon,
      title: "Clock, Language, and Region",
      links: [{ label: "Change keyboards or other input methods" }],
    },
    {
      icon: EaseOfAccessIcon,
      title: "Ease of Access",
      links: [
        { label: "Let Windows suggest settings" },
        { label: "Optimize visual display" },
      ],
    },
  ];
}

export function ControlPanel() {
  return (
    <div className="cp">
      <div className="ex-nav">
        <button type="button" className="ex-nav-btn" aria-label="Back" disabled>
          <NavArrowIcon className="ex-nav-arrow" />
        </button>
        <button type="button" className="ex-nav-btn" aria-label="Forward" disabled>
          <NavArrowIcon className="ex-nav-arrow" flip />
        </button>

        <div className="ex-address">
          <ComputerIcon className="ex-icon" />
          <span className="ex-crumb">Control Panel</span>
        </div>

        <div className="ex-search">
          <span className="ex-search-text">Search Control Panel</span>
          <SearchIcon className="ex-icon ex-search-icon" />
        </div>
      </div>

      <div className="cp-body">
        <h1 className="cp-title">Adjust your computer&rsquo;s settings</h1>

        <div className="cp-home">
          {categories().map((cat) => (
            <div className="cp-cat" key={cat.title}>
              <cat.icon className="cp-cat-icon" />
              <div className="cp-cat-body">
                <button type="button" className="cp-cat-title" onClick={openMeme}>
                  {cat.title}
                </button>
                <ul className="cp-cat-links">
                  {cat.links.map((link) => (
                    <li key={link.label}>
                      <button
                        type="button"
                        className="cp-cat-link"
                        onClick={link.onClick ?? openMeme}
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
