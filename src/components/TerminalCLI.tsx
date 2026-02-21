import { useState, useRef, useEffect, KeyboardEvent } from "react";

const WELCOME_TEXT = [
  "",
  "  ██████  ██  ██████  ██  ██ ████████ ██████   ██████   ██████  ██  ██",
  "  ██       ██ ██       ██  ██    ██    ██   ██ ██    ██ ██    ██ ██ ██ ",
  "  █████    ██ ██   ███ ██████    ██    ██████  ██    ██ ██    ██ ████  ",
  "  ██       ██ ██    ██ ██  ██    ██    ██   ██ ██    ██ ██    ██ ██ ██ ",
  "  ██       ██  ██████  ██  ██    ██    ██████   ██████   ██████  ██  ██",
  "",
  "  ═══════════════════════════════════════════════════════════════════",
  "  AI Combat Simulator v1.0.0 | OpenClaw Engine",
  "  ═══════════════════════════════════════════════════════════════════",
  "",
  "  Type 'help' for available commands.",
  "",
];

interface HistoryEntry {
  type: "input" | "output" | "system" | "fight";
  text: string;
}

const FIGHTERS = [
  { name: "IRON MANTIS", style: "Kung Fu", power: 88, speed: 92, defense: 75 },
  { name: "SHADOW VIPER", style: "Ninjutsu", power: 78, speed: 98, defense: 70 },
  { name: "THUNDER BEAR", style: "Wrestling", power: 95, speed: 60, defense: 90 },
  { name: "CRIMSON PHOENIX", style: "Muay Thai", power: 85, speed: 85, defense: 80 },
  { name: "STEEL WOLF", style: "MMA", power: 90, speed: 80, defense: 85 },
  { name: "GHOST CRANE", style: "Wing Chun", power: 72, speed: 95, defense: 78 },
];

const processCommand = (cmd: string): HistoryEntry[] => {
  const lower = cmd.trim().toLowerCase();

  if (lower === "help") {
    return [
      { type: "system", text: "╔═══════════════════════════════════════╗" },
      { type: "system", text: "║       FIGHTBOOK COMMANDS              ║" },
      { type: "system", text: "╠═══════════════════════════════════════╣" },
      { type: "system", text: "║  fighters    - List all fighters      ║" },
      { type: "system", text: "║  fight       - Start a random fight   ║" },
      { type: "system", text: "║  stats <name>- View fighter stats     ║" },
      { type: "system", text: "║  clear       - Clear terminal         ║" },
      { type: "system", text: "║  about       - About FightBook        ║" },
      { type: "system", text: "║  help        - Show this menu         ║" },
      { type: "system", text: "╚═══════════════════════════════════════╝" },
    ];
  }

  if (lower === "fighters") {
    const lines: HistoryEntry[] = [
      { type: "system", text: "┌──────────────────┬──────────────┬─────┬─────┬─────┐" },
      { type: "system", text: "│ FIGHTER          │ STYLE        │ PWR │ SPD │ DEF │" },
      { type: "system", text: "├──────────────────┼──────────────┼─────┼─────┼─────┤" },
    ];
    FIGHTERS.forEach((f) => {
      lines.push({
        type: "output",
        text: `│ ${f.name.padEnd(16)} │ ${f.style.padEnd(12)} │ ${String(f.power).padStart(3)} │ ${String(f.speed).padStart(3)} │ ${String(f.defense).padStart(3)} │`,
      });
    });
    lines.push({ type: "system", text: "└──────────────────┴──────────────┴─────┴─────┴─────┘" });
    return lines;
  }

  if (lower === "fight") {
    const a = FIGHTERS[Math.floor(Math.random() * FIGHTERS.length)];
    let b = a;
    while (b.name === a.name) b = FIGHTERS[Math.floor(Math.random() * FIGHTERS.length)];

    const rounds: HistoryEntry[] = [];
    rounds.push({ type: "fight", text: "═══════════════════════════════════════" });
    rounds.push({ type: "fight", text: `  ⚔️  ${a.name}  vs  ${b.name}  ⚔️` });
    rounds.push({ type: "fight", text: `       ${a.style}      ${b.style}` });
    rounds.push({ type: "fight", text: "═══════════════════════════════════════" });

    let hpA = 100, hpB = 100;
    let round = 1;
    while (hpA > 0 && hpB > 0 && round <= 5) {
      const dmgA = Math.max(5, Math.floor((a.power * (0.7 + Math.random() * 0.6)) - b.defense * 0.3));
      const dmgB = Math.max(5, Math.floor((b.power * (0.7 + Math.random() * 0.6)) - a.defense * 0.3));
      hpB = Math.max(0, hpB - dmgA);
      hpA = Math.max(0, hpA - dmgB);
      rounds.push({ type: "output", text: `  Round ${round}: ${a.name} deals ${dmgA} dmg | ${b.name} deals ${dmgB} dmg` });
      rounds.push({ type: "output", text: `         HP: ${a.name} ${hpA}/100 | ${b.name} ${hpB}/100` });
      round++;
    }

    rounds.push({ type: "fight", text: "───────────────────────────────────────" });
    const winner = hpA >= hpB ? a : b;
    rounds.push({ type: "fight", text: `  🏆 WINNER: ${winner.name}` });
    rounds.push({ type: "fight", text: "═══════════════════════════════════════" });
    return rounds;
  }

  if (lower.startsWith("stats ")) {
    const name = cmd.slice(6).trim().toUpperCase();
    const fighter = FIGHTERS.find((f) => f.name.includes(name));
    if (!fighter) return [{ type: "output", text: `Fighter "${name}" not found. Type 'fighters' to see the roster.` }];

    const bar = (val: number) => "█".repeat(Math.floor(val / 5)) + "░".repeat(20 - Math.floor(val / 5));
    return [
      { type: "system", text: `┌─── ${fighter.name} ───────────────────┐` },
      { type: "output", text: `  Style:   ${fighter.style}` },
      { type: "output", text: `  Power:   ${bar(fighter.power)} ${fighter.power}` },
      { type: "output", text: `  Speed:   ${bar(fighter.speed)} ${fighter.speed}` },
      { type: "output", text: `  Defense: ${bar(fighter.defense)} ${fighter.defense}` },
      { type: "system", text: `└────────────────────────────────────┘` },
    ];
  }

  if (lower === "about") {
    return [
      { type: "system", text: "FightBook v1.0.0 — AI Combat Simulator" },
      { type: "output", text: "Built on the OpenClaw engine." },
      { type: "output", text: "Powered by artificial intelligence." },
      { type: "output", text: "Every fight is unique. Every outcome unpredictable." },
    ];
  }

  if (lower === "clear") {
    return [{ type: "system", text: "__CLEAR__" }];
  }

  return [{ type: "output", text: `Command not recognized: '${cmd}'. Type 'help' for available commands.` }];
};

const TerminalCLI = () => {
  const [history, setHistory] = useState<HistoryEntry[]>(
    WELCOME_TEXT.map((t) => ({ type: "system" as const, text: t }))
  );
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [history]);

  const handleSubmit = () => {
    if (!input.trim()) return;

    const newHistory: HistoryEntry[] = [
      ...history,
      { type: "input", text: `❯ ${input}` },
    ];

    const result = processCommand(input);

    if (result.length === 1 && result[0].text === "__CLEAR__") {
      setHistory([]);
    } else {
      setHistory([...newHistory, ...result]);
    }

    setCmdHistory((prev) => [input, ...prev]);
    setHistoryIdx(-1);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIdx < cmdHistory.length - 1) {
        const newIdx = historyIdx + 1;
        setHistoryIdx(newIdx);
        setInput(cmdHistory[newIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx > 0) {
        const newIdx = historyIdx - 1;
        setHistoryIdx(newIdx);
        setInput(cmdHistory[newIdx]);
      } else {
        setHistoryIdx(-1);
        setInput("");
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-background flex flex-col scanline-overlay crt-flicker"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">❯_</span>
          <span className="text-sm text-foreground terminal-glow">fightbook</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="status-online">●</span>
            <span className="text-muted-foreground">Online</span>
          </div>
          <span className="text-muted-foreground">v1.0.0</span>
        </div>
      </div>

      {/* Terminal body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 pb-0"
      >
        {history.map((entry, i) => (
          <div
            key={i}
            className={`text-sm leading-relaxed whitespace-pre ${
              entry.type === "input"
                ? "text-foreground terminal-glow"
                : entry.type === "fight"
                ? "text-accent terminal-glow-strong"
                : entry.type === "system"
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {entry.text}
          </div>
        ))}

        {/* Input line */}
        <div className="flex items-center gap-2 py-2 text-sm">
          <span className="text-foreground terminal-glow">❯</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-foreground caret-foreground"
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-secondary text-xs shrink-0">
        <span className="text-muted-foreground">FightBook CLI</span>
        <span className="text-muted-foreground">OpenClaw Engine</span>
        <span className="text-muted-foreground">{history.length} lines</span>
      </div>
    </div>
  );
};

export default TerminalCLI;
