import { DebugOverlay } from "@/components/DebugOverlay";
import { Monitor } from "@/components/Monitor";
import { Taskbar } from "@/components/Taskbar";
import { DesktopSurface } from "@/components/win7/DesktopSurface";
import { WindowLayer } from "@/components/win7/WindowLayer";

const WALLPAPER = "/letterbox/Z0Ts3J2-windows-7-official-wallpapers.jpg";

export default function Home() {
  return (
    <main className="room">
      <Monitor>
        <div className="win7">
          <div
            className="win7-wallpaper"
            style={{ backgroundImage: `url(${WALLPAPER})` }}
          />
          <DesktopSurface />
          <WindowLayer />
          <Taskbar />
        </div>
      </Monitor>
      <DebugOverlay />
    </main>
  );
}
