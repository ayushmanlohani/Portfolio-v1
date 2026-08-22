import { DebugOverlay } from "@/components/DebugOverlay";
import { Monitor } from "@/components/Monitor";
import { Taskbar } from "@/components/Taskbar";
import { DesktopSurface } from "@/components/win7/DesktopSurface";
import { WallpaperBg } from "@/components/win7/WallpaperBg";
import { WindowLayer } from "@/components/win7/WindowLayer";

export default function Home() {
  return (
    <main className="room">
      <Monitor>
        <div className="win7">
          <WallpaperBg />
          <DesktopSurface />
          <WindowLayer />
          <Taskbar />
        </div>
      </Monitor>
      <DebugOverlay />
    </main>
  );
}
