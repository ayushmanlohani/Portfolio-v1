"use client";

import { useEffect, useState } from "react";

/**
 * What Explorer's Network place shows.
 *
 * Just whether the visitor is online, read from `navigator.onLine` and kept
 * current by the online/offline events.
 *
 * It stays this thin on purpose. The obvious thing to show here would be the
 * network's name, and **no browser will give a web page the WiFi SSID or the
 * carrier on a SIM** — the network someone is joined to is enough to locate
 * them, so it is withheld on every platform and no permission unlocks it. The
 * speed and latency readings the Network Information API does offer were tried
 * and cut: estimates dressed up as a status panel read worse than one true line.
 */
export function Network() {
  // Starts null so the server and the first client render agree; the real
  // reading only exists in a browser.
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();

    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online === null) return <p className="ex-empty">Checking network status&hellip;</p>;

  return (
    <div className="net">
      <div className="ex-heading">This computer&rsquo;s connection</div>

      <dl className="net-table">
        <div className="net-row">
          <dt>Status</dt>
          <dd>{online ? "Connected" : "No network access"}</dd>
        </div>
      </dl>
    </div>
  );
}
