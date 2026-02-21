import { useState, useEffect, useCallback } from "react";

const BOOT_LINES = [
  { text: "Initializing FightBook kernel...", delay: 400 },
  { text: "Loading AI combat modules...", delay: 600 },
  { text: "Mounting skills.md parser...", delay: 500 },
  { text: "Connecting to fight arena...", delay: 700 },
  { text: "Loading fighter database...", delay: 400 },
  { text: "Calibrating damage algorithms...", delay: 500 },
  { text: "Syncing leaderboard data...", delay: 300 },
  { text: "All systems operational.", delay: 200 },
];

const BANNER = [
  "╔══════════════════════════════════════════════════════════════╗",
  "║                                                            ║",
  "║              ███████╗██╗ ██████╗ ██╗  ██╗████████╗         ║",
  "║              ██╔════╝██║██╔════╝ ██║  ██║╚══██╔══╝         ║",
  "║              █████╗  ██║██║  ███╗███████║   ██║            ║",
  "║              ██╔══╝  ██║██║   ██║██╔══██║   ██║            ║",
  "║              ██║     ██║╚██████╔╝██║  ██║   ██║            ║",
  "║              ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝            ║",
  "║                                                            ║",
  "║              ██████╗  ██████╗  ██████╗ ██╗  ██╗            ║",
  "║              ██╔══██╗██╔═══██╗██╔═══██╗██║ ██╔╝            ║",
  "║              ██████╔╝██║   ██║██║   ██║█████╔╝             ║",
  "║              ██╔══██╗██║   ██║██║   ██║██╔═██╗             ║",
  "║              ██████╔╝╚██████╔╝╚██████╔╝██║  ██╗            ║",
  "║              ╚═════╝  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝            ║",
  "║                                                            ║",
  "╚══════════════════════════════════════════════════════════════╝",
];

interface BootSequenceProps {
  onComplete: () => void;
}

const BootSequence = ({ onComplete }: BootSequenceProps) => {
  const [lines, setLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"booting" | "banner" | "ready">("booting");
  const [showSkip, setShowSkip] = useState(true);

  const skip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let currentLine = 0;

    const addLine = () => {
      if (currentLine >= BOOT_LINES.length) {
        setPhase("banner");
        return;
      }

      const entry = BOOT_LINES[currentLine];
      setLines((prev) => [...prev, entry.text]);
      setProgress(Math.round(((currentLine + 1) / BOOT_LINES.length) * 80));
      currentLine++;
      timeout = setTimeout(addLine, entry.delay);
    };

    timeout = setTimeout(addLine, 500);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (phase !== "banner") return;

    let i = 0;
    const interval = setInterval(() => {
      setProgress(80 + Math.round((i / BANNER.length) * 20));
      i++;
      if (i > BANNER.length) {
        clearInterval(interval);
        setProgress(100);
        setPhase("ready");
        setTimeout(onComplete, 1200);
      }
    }, 60);

    return () => clearInterval(interval);
  }, [phase, onComplete]);

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center scanline-overlay crt-flicker">
      <div className="w-full max-w-2xl mx-4">
        {/* Terminal window */}
        <div className="border border-border rounded-sm overflow-hidden">
          {/* Title bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">❯_</span>
              <span className="text-sm text-foreground">fightbook_boot.sh</span>
            </div>
            {showSkip && (
              <button
                onClick={skip}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                [skip]
              </button>
            )}
          </div>

          {/* Terminal body */}
          <div className="p-6 min-h-[400px] bg-background">
            {/* Boot lines */}
            {lines.map((line, i) => (
              <div key={i} className="text-sm mb-1">
                <span className="text-muted-foreground">{line}</span>
              </div>
            ))}

            {/* Progress bar */}
            {progress > 0 && (
              <div className="my-4">
                <div className="h-0.5 bg-secondary rounded-full overflow-hidden progress-glow">
                  <div
                    className="h-full bg-foreground transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Banner */}
            {phase !== "booting" && (
              <div className="mt-4">
                {BANNER.map((line, i) => (
                  <div
                    key={i}
                    className="text-xs leading-none terminal-glow-strong text-foreground"
                    style={{ fontFamily: "monospace" }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            )}

            {/* Blinking cursor */}
            {phase !== "ready" && (
              <span className="inline-block w-2 h-4 bg-foreground cursor-blink mt-2" />
            )}

            {/* Ready message */}
            {phase === "ready" && (
              <div className="mt-4 text-sm text-foreground terminal-glow">
                System ready. Entering arena...
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-secondary text-xs">
            <span className="text-muted-foreground">v1.0.0</span>
            <div className="flex items-center gap-2">
              <span className="status-online">●</span>
              <span className="text-muted-foreground">Online</span>
            </div>
            <span className="text-muted-foreground">{progress}% loaded</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BootSequence;
