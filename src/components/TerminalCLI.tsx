import { useState, useRef, useEffect, KeyboardEvent, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import FightArena from "./FightArena";

const WELCOME_TEXT = [
  "",
  "  ███████╗██╗ ██████╗ ██╗  ██╗████████╗██████╗  ██████╗  ██████╗ ██╗  ██╗",
  "  ██╔════╝██║██╔════╝ ██║  ██║╚══██╔══╝██╔══██╗██╔═══██╗██╔═══██╗██║ ██╔╝",
  "  █████╗  ██║██║  ███╗███████║   ██║   ██████╔╝██║   ██║██║   ██║█████╔╝ ",
  "  ██╔══╝  ██║██║   ██║██╔══██║   ██║   ██╔══██╗██║   ██║██║   ██║██╔═██╗ ",
  "  ██║     ██║╚██████╔╝██║  ██║   ██║   ██████╔╝╚██████╔╝╚██████╔╝██║  ██╗",
  "  ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═════╝  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝",
  "",
  "  ═══════════════════════════════════════════════════════════════════════════",
  "  AI Combat Simulator v1.0.0 | OpenClaw Engine | Powered by Agentic AI",
  "  ═══════════════════════════════════════════════════════════════════════════",
  "",
  "  250 stat points. 5 attributes. Infinite possibilities.",
  "  Type 'help' for commands.",
  "",
];

const STYLES = [
  "Boxing", "Muay Thai", "Wrestling", "BJJ", "Karate", "Judo",
  "Kickboxing", "Sambo", "Taekwondo", "MMA", "Kung Fu", "Capoeira",
  "Krav Maga", "Wing Chun", "Ninjutsu",
];

interface HistoryEntry {
  type: "input" | "output" | "system" | "fight" | "error" | "loading" | "arena";
  text: string;
  arenaProps?: {
    fighterAName: string;
    fighterBName: string;
    round?: number;
    action?: string;
    isActive?: boolean;
  };
}

interface Fighter {
  id: string;
  name: string;
  style: string;
  power: number;
  speed: number;
  defense: number;
  stamina: number;
  technique: number;
  wins: number;
  losses: number;
  ko_wins: number;
  ko_losses: number;
  sub_wins: number;
  total_fights: number;
  win_streak: number;
  best_streak: number;
  elo_rating: number;
}

const bar = (val: number) => {
  const filled = Math.floor(val / 5);
  return "█".repeat(filled) + "░".repeat(20 - filled);
};

const TerminalCLI = () => {
  const [history, setHistory] = useState<HistoryEntry[]>(
    WELCOME_TEXT.map((t) => ({ type: "system" as const, text: t }))
  );
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [createMode, setCreateMode] = useState<null | { step: string; data: Record<string, any> }>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [arenaState, setArenaState] = useState<{
    fighterAName: string;
    fighterBName: string;
    round: number;
    action: string;
    isActive: boolean;
  } | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [history]);

  const addLines = useCallback((entries: HistoryEntry[]) => {
    setHistory((prev) => [...prev, ...entries]);
  }, []);

  const processCommand = useCallback(async (cmd: string) => {
    const lower = cmd.trim().toLowerCase();
    const args = lower.split(/\s+/);

    if (lower === "help") {
      addLines([
        { type: "system", text: "╔════════════════════════════════════════════════════╗" },
        { type: "system", text: "║              FIGHTBOOK COMMANDS                    ║" },
        { type: "system", text: "╠════════════════════════════════════════════════════╣" },
        { type: "system", text: "║  create         - Create a new fighter (250 pts)   ║" },
        { type: "system", text: "║  fighters       - List all fighters                ║" },
        { type: "system", text: "║  stats <name>   - View fighter stats               ║" },
        { type: "system", text: "║  fight <a> <b>  - Simulate AI fight                ║" },
        { type: "system", text: "║  random         - Random matchup fight             ║" },
        { type: "system", text: "║  leaderboard    - View ELO rankings                ║" },
        { type: "system", text: "║  history        - Recent fight history             ║" },
        { type: "system", text: "║  record <name>  - Fighter's fight record           ║" },
        { type: "system", text: "║  styles         - List fighting styles             ║" },
        { type: "system", text: "║  clear          - Clear terminal                   ║" },
        { type: "system", text: "║  about          - About FightBook                  ║" },
        { type: "system", text: "║  help           - Show this menu                   ║" },
        { type: "system", text: "╚════════════════════════════════════════════════════╝" },
      ]);
      return;
    }

    if (lower === "styles") {
      addLines([
        { type: "system", text: "Available fighting styles:" },
        { type: "output", text: STYLES.map((s, i) => `  ${String(i + 1).padStart(2)}. ${s}`).join("\n") },
      ]);
      return;
    }

    if (lower === "create") {
      setCreateMode({ step: "name", data: {} });
      addLines([
        { type: "system", text: "═══ CREATE FIGHTER ═══" },
        { type: "system", text: "You have 250 points to distribute across 5 stats." },
        { type: "system", text: "Each stat: min 30, max 99. Total must equal 250." },
        { type: "output", text: "" },
        { type: "output", text: "Enter fighter name:" },
      ]);
      return;
    }

    if (lower === "fighters") {
      setIsProcessing(true);
      const { data, error } = await supabase
        .from("fighters")
        .select("*")
        .order("elo_rating", { ascending: false });

      setIsProcessing(false);
      if (error || !data?.length) {
        addLines([{ type: "output", text: data?.length === 0 ? "No fighters yet. Type 'create' to make one." : `Error: ${error?.message}` }]);
        return;
      }

      const lines: HistoryEntry[] = [
        { type: "system", text: "┌──────────────────┬──────────────┬──────┬───────────┬──────┐" },
        { type: "system", text: "│ FIGHTER          │ STYLE        │ ELO  │ RECORD    │ STK  │" },
        { type: "system", text: "├──────────────────┼──────────────┼──────┼───────────┼──────┤" },
      ];
      data.forEach((f: Fighter) => {
        const record = `${f.wins}-${f.losses}`;
        lines.push({
          type: "output",
          text: `│ ${f.name.slice(0, 16).padEnd(16)} │ ${f.style.padEnd(12)} │ ${String(f.elo_rating).padStart(4)} │ ${record.padStart(9)} │ ${String(f.win_streak).padStart(4)} │`,
        });
      });
      lines.push({ type: "system", text: "└──────────────────┴──────────────┴──────┴───────────┴──────┘" });
      addLines(lines);
      return;
    }

    if (lower === "leaderboard") {
      setIsProcessing(true);
      const { data, error } = await supabase
        .from("fighters")
        .select("*")
        .order("elo_rating", { ascending: false })
        .limit(20);

      setIsProcessing(false);
      if (error || !data?.length) {
        addLines([{ type: "output", text: "No fighters ranked yet." }]);
        return;
      }

      const lines: HistoryEntry[] = [
        { type: "fight", text: "═══════════════════════════════════════════════════════════" },
        { type: "fight", text: "                    🏆 LEADERBOARD 🏆                     " },
        { type: "fight", text: "═══════════════════════════════════════════════════════════" },
        { type: "system", text: " #  │ FIGHTER          │ ELO  │ W-L     │ KO │ SUB │ STK " },
        { type: "system", text: "────┼──────────────────┼──────┼─────────┼────┼─────┼─────" },
      ];
      data.forEach((f: Fighter, i: number) => {
        const rank = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${String(i + 1).padStart(2)} `;
        lines.push({
          type: i < 3 ? "fight" : "output",
          text: ` ${rank} │ ${f.name.slice(0, 16).padEnd(16)} │ ${String(f.elo_rating).padStart(4)} │ ${`${f.wins}-${f.losses}`.padStart(7)} │ ${String(f.ko_wins).padStart(2)} │ ${String(f.sub_wins).padStart(3)} │ ${String(f.win_streak).padStart(3)}  `,
        });
      });
      lines.push({ type: "fight", text: "═══════════════════════════════════════════════════════════" });
      addLines(lines);
      return;
    }

    if (lower === "history") {
      setIsProcessing(true);
      const { data, error } = await supabase
        .from("fights")
        .select("*, fighter_a:fighters!fights_fighter_a_id_fkey(name), fighter_b:fighters!fights_fighter_b_id_fkey(name), winner:fighters!fights_winner_id_fkey(name)")
        .order("created_at", { ascending: false })
        .limit(15);

      setIsProcessing(false);
      if (error || !data?.length) {
        addLines([{ type: "output", text: "No fights recorded yet." }]);
        return;
      }

      const lines: HistoryEntry[] = [
        { type: "fight", text: "═══════════════════════════════════════════════════════" },
        { type: "fight", text: "                  FIGHT HISTORY                        " },
        { type: "fight", text: "═══════════════════════════════════════════════════════" },
      ];

      data.forEach((f: any) => {
        const winner = f.winner?.name || "DRAW";
        const date = new Date(f.created_at).toLocaleDateString();
        lines.push({ type: "output", text: `  ${(f.fighter_a as any).name} vs ${(f.fighter_b as any).name}` });
        lines.push({ type: "fight", text: `  Winner: ${winner} via ${f.method} (R${f.finish_round}) — ${date}` });
        lines.push({ type: "system", text: "  ─────────────────────────────────────────────────" });
      });
      addLines(lines);
      return;
    }

    if (lower.startsWith("stats ")) {
      const name = cmd.slice(6).trim();
      setIsProcessing(true);
      const { data, error } = await supabase
        .from("fighters")
        .select("*")
        .ilike("name", `%${name}%`)
        .limit(1)
        .single();

      setIsProcessing(false);
      if (error || !data) {
        addLines([{ type: "error", text: `Fighter "${name}" not found. Type 'fighters' to see roster.` }]);
        return;
      }

      const f = data as Fighter;
      const winRate = f.total_fights > 0 ? Math.round((f.wins / f.total_fights) * 100) : 0;
      addLines([
        { type: "fight", text: `╔═══ ${f.name.toUpperCase()} ══════════════════════════════╗` },
        { type: "output", text: `  Style:     ${f.style}` },
        { type: "output", text: `  Record:    ${f.wins}W - ${f.losses}L (${winRate}% win rate)` },
        { type: "output", text: `  ELO:       ${f.elo_rating}` },
        { type: "output", text: `  Streak:    ${f.win_streak} (Best: ${f.best_streak})` },
        { type: "system", text: `  ─── STATS ───────────────────────────────────` },
        { type: "output", text: `  Power:     ${bar(f.power)} ${f.power}` },
        { type: "output", text: `  Speed:     ${bar(f.speed)} ${f.speed}` },
        { type: "output", text: `  Defense:   ${bar(f.defense)} ${f.defense}` },
        { type: "output", text: `  Stamina:   ${bar(f.stamina)} ${f.stamina}` },
        { type: "output", text: `  Technique: ${bar(f.technique)} ${f.technique}` },
        { type: "system", text: `  ─── FINISHES ────────────────────────────────` },
        { type: "output", text: `  KO Wins: ${f.ko_wins} | Sub Wins: ${f.sub_wins} | KO Losses: ${f.ko_losses}` },
        { type: "fight", text: `╚══════════════════════════════════════════════╝` },
      ]);
      return;
    }

    if (lower.startsWith("record ")) {
      const name = cmd.slice(7).trim();
      setIsProcessing(true);
      const { data: fighter } = await supabase
        .from("fighters")
        .select("*")
        .ilike("name", `%${name}%`)
        .limit(1)
        .single();

      if (!fighter) {
        setIsProcessing(false);
        addLines([{ type: "error", text: `Fighter "${name}" not found.` }]);
        return;
      }

      const { data: fights } = await supabase
        .from("fights")
        .select("*, fighter_a:fighters!fights_fighter_a_id_fkey(name), fighter_b:fighters!fights_fighter_b_id_fkey(name), winner:fighters!fights_winner_id_fkey(name)")
        .or(`fighter_a_id.eq.${fighter.id},fighter_b_id.eq.${fighter.id}`)
        .order("created_at", { ascending: false })
        .limit(20);

      setIsProcessing(false);
      if (!fights?.length) {
        addLines([{ type: "output", text: `${fighter.name} has no fights yet.` }]);
        return;
      }

      const lines: HistoryEntry[] = [
        { type: "fight", text: `═══ ${fighter.name.toUpperCase()} — FIGHT RECORD ═══` },
      ];
      fights.forEach((f: any) => {
        const opponent = (f.fighter_a as any).name === fighter.name ? (f.fighter_b as any).name : (f.fighter_a as any).name;
        const won = f.winner_id === fighter.id;
        const result = f.winner_id ? (won ? "W" : "L") : "D";
        lines.push({
          type: won ? "fight" : "error",
          text: `  [${result}] vs ${opponent} — ${f.method} (R${f.finish_round})`,
        });
      });
      addLines(lines);
      return;
    }

    if (lower.startsWith("fight ") || lower === "random") {
      let nameA: string, nameB: string;

      if (lower === "random") {
        setIsProcessing(true);
        const { data } = await supabase.from("fighters").select("name").limit(100);
        setIsProcessing(false);
        if (!data || data.length < 2) {
          addLines([{ type: "error", text: "Need at least 2 fighters. Type 'create' to add more." }]);
          return;
        }
        const shuffled = data.sort(() => Math.random() - 0.5);
        nameA = shuffled[0].name;
        nameB = shuffled[1].name;
      } else {
        const parts = cmd.slice(6).trim().split(/\s+vs\s+|\s+v\s+|\s*,\s*/i);
        if (parts.length !== 2) {
          addLines([{ type: "error", text: "Usage: fight <name> vs <name>  OR  fight <name>, <name>" }]);
          return;
        }
        nameA = parts[0].trim();
        nameB = parts[1].trim();
      }

      setIsProcessing(true);
      addLines([{ type: "system", text: `\n  Matching fighters: ${nameA} vs ${nameB}...` }]);

      const { data: fA } = await supabase.from("fighters").select("*").ilike("name", `%${nameA}%`).limit(1).single();
      const { data: fB } = await supabase.from("fighters").select("*").ilike("name", `%${nameB}%`).limit(1).single();

      if (!fA || !fB) {
        setIsProcessing(false);
        addLines([{ type: "error", text: `Could not find one or both fighters. Check names with 'fighters'.` }]);
        return;
      }

      if (fA.id === fB.id) {
        setIsProcessing(false);
        addLines([{ type: "error", text: "A fighter can't fight themselves!" }]);
        return;
      }

      addLines([
        { type: "fight", text: "\n  ═══════════════════════════════════════════════════" },
        { type: "fight", text: `  ⚔️  ${fA.name}  vs  ${fB.name}  ⚔️` },
        { type: "output", text: `       ${fA.style} (${fA.elo_rating} ELO)  vs  ${fB.style} (${fB.elo_rating} ELO)` },
        { type: "fight", text: "  ═══════════════════════════════════════════════════" },
        { type: "loading", text: "\n  🤖 AI agents simulating fight... Stand by..." },
      ]);

      try {
        const { data: result, error } = await supabase.functions.invoke("simulate-fight", {
          body: { fighter_a_id: fA.id, fighter_b_id: fB.id },
        });

        if (error) throw error;
        if (result?.error) throw new Error(result.error);

        const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

        addLines([{ type: "system", text: "" }]);

        // Activate the pixel arena
        setArenaState({
          fighterAName: result.fighter_a,
          fighterBName: result.fighter_b,
          round: 1,
          action: "",
          isActive: true,
        });

        const totalRounds = result.rounds?.length || 5;
        const finishRound = result.finish_round || totalRounds;

        if (result.rounds) {
          for (let i = 0; i < result.rounds.length; i++) {
            const r = result.rounds[i];
            const isFinishRound = r.round === finishRound && result.method !== "Unanimous Decision" && result.method !== "Split Decision";

            setArenaState((prev) => prev ? { ...prev, round: r.round, action: "" } : prev);

            addLines([
              { type: "fight", text: `\n  ══════════════════ ROUND ${r.round} ══════════════════` },
              { type: "system", text: "  🔔 Round begins!" },
            ]);

            await delay(2000);

            const plays = r.play_by_play || [];
            if (plays.length > 0) {
              for (let j = 0; j < plays.length; j++) {
                const p = plays[j];
                // Update arena with current action for animation
                setArenaState((prev) => prev ? { ...prev, action: p.action } : prev);
                addLines([
                  { type: "output", text: `  [${p.time}] ${p.action}` },
                ]);
                const momentDelay = Math.floor(28000 / plays.length);
                await delay(momentDelay);
              }
            } else {
              addLines([{ type: "output", text: `  ${r.highlight}` }]);
              setArenaState((prev) => prev ? { ...prev, action: r.highlight } : prev);
              await delay(6000);
            }

            if (isFinishRound && r.round < totalRounds) {
              setArenaState((prev) => prev ? { ...prev, action: "knockout finish stoppage" } : prev);
              addLines([
                { type: "fight", text: `  🔔 STOPPAGE! Fight is over in Round ${r.round}!` },
              ]);
            } else {
              setArenaState((prev) => prev ? { ...prev, action: "" } : prev);
              addLines([
                { type: "system", text: "  🔔 Round over!" },
                { type: "output", text: `  Scorecard: ${result.fighter_a} ${r.fighter_a_score} - ${r.fighter_b_score} ${result.fighter_b}` },
              ]);
            }

            await delay(4000);
            if (isFinishRound) break;
          }
        }

        // Final result
        addLines([{ type: "fight", text: "\n  ═══════════════════════════════════════════════════" }]);
        await delay(2000);

        if (result.winner === "DRAW") {
          setArenaState((prev) => prev ? { ...prev, action: "" } : prev);
          addLines([{ type: "fight", text: "  📊 RESULT: DRAW" }]);
        } else {
          // Show victory/defeat poses
          setArenaState((prev) => prev ? { ...prev, action: `${result.winner} wins victory celebration` } : prev);
          addLines([
            { type: "fight", text: `  🏆 WINNER: ${result.winner}` },
            { type: "fight", text: `  💥 Method: ${result.method} (Round ${result.finish_round})` },
          ]);
        }
        addLines([{ type: "fight", text: "  ═══════════════════════════════════════════════════" }]);

        // Narration after result
        if (result.narration) {
          await delay(3000);
          addLines([
            { type: "system", text: "" },
            { type: "system", text: "  ─── POST-FIGHT ANALYSIS ─────────────────────────" },
          ]);
          const narrationLines = result.narration.split("\n");
          for (const l of narrationLines) {
            addLines([{ type: "output", text: `  ${l}` }]);
            await delay(1500);
          }
        }

        // Deactivate arena after fight
        await delay(2000);
        setArenaState(null);
      } catch (e: any) {
        setArenaState(null);
        addLines([{ type: "error", text: `  Fight simulation failed: ${e.message || "Unknown error"}` }]);
      }

      setIsProcessing(false);
      return;
    }

    if (lower === "about") {
      addLines([
        { type: "fight", text: "  FightBook v1.0.0 — AI Combat Simulator" },
        { type: "output", text: "  Built on the OpenClaw engine." },
        { type: "output", text: "  Every fight is simulated by agentic AI." },
        { type: "output", text: "  Every outcome is unique and unpredictable." },
        { type: "output", text: "" },
        { type: "system", text: "  POINT SYSTEM:" },
        { type: "output", text: "  Each fighter gets 250 points to distribute across:" },
        { type: "output", text: "  Power, Speed, Defense, Stamina, Technique" },
        { type: "output", text: "  Min 30 per stat, Max 99. Choose wisely." },
      ]);
      return;
    }

    if (lower === "clear") {
      setHistory([]);
      return;
    }

    addLines([{ type: "error", text: `  Command not recognized: '${cmd}'. Type 'help'.` }]);
  }, [addLines]);

  const handleCreateStep = useCallback(async (value: string) => {
    if (!createMode) return;
    const { step, data } = createMode;

    if (step === "name") {
      if (value.length < 2 || value.length > 20) {
        addLines([{ type: "error", text: "Name must be 2-20 characters." }]);
        return;
      }
      setCreateMode({ step: "style", data: { ...data, name: value.toUpperCase() } });
      addLines([
        { type: "output", text: `  Name: ${value.toUpperCase()}` },
        { type: "output", text: `  Choose style (or type custom): ${STYLES.join(", ")}` },
      ]);
      return;
    }

    if (step === "style") {
      const style = STYLES.find((s) => s.toLowerCase() === value.toLowerCase()) || value;
      setCreateMode({ step: "power", data: { ...data, style, remaining: 250 } });
      addLines([
        { type: "output", text: `  Style: ${style}` },
        { type: "system", text: "  Now distribute 250 points (30-99 per stat):" },
        { type: "output", text: `  Enter Power (30-99) [250 pts remaining]:` },
      ]);
      return;
    }

    const statOrder = ["power", "speed", "defense", "stamina", "technique"];
    const statIdx = statOrder.indexOf(step);
    if (statIdx !== -1) {
      const val = parseInt(value);
      if (isNaN(val) || val < 30 || val > 99) {
        addLines([{ type: "error", text: "  Value must be 30-99." }]);
        return;
      }

      const assigned = statOrder.slice(0, statIdx).reduce((sum, s) => sum + (data[s] || 0), 0);
      const remaining = 250 - assigned;
      const statsLeft = 5 - statIdx;

      // Check: remaining stats need at least 30 each
      const minNeeded = (statsLeft - 1) * 30;
      const maxAllowed = Math.min(99, remaining - minNeeded);

      if (val > maxAllowed) {
        addLines([{ type: "error", text: `  Max allowed: ${maxAllowed} (need ${minNeeded} for remaining ${statsLeft - 1} stats)` }]);
        return;
      }

      const newRemaining = remaining - val;
      const newData = { ...data, [step]: val, remaining: newRemaining };

      if (step === "technique") {
        // Final stat — validate total
        const total = newData.power + newData.speed + newData.defense + newData.stamina + newData.technique;
        if (total !== 250) {
          addLines([{ type: "error", text: `  Total must be 250. Current: ${total}. Adjust technique.` }]);
          return;
        }

        // Create fighter
        setIsProcessing(true);
        setCreateMode(null);
        addLines([{ type: "loading", text: "  Creating fighter..." }]);

        const { error } = await supabase.from("fighters").insert({
          name: newData.name,
          style: newData.style,
          power: newData.power,
          speed: newData.speed,
          defense: newData.defense,
          stamina: newData.stamina,
          technique: newData.technique,
        });

        setIsProcessing(false);

        if (error) {
          if (error.message.includes("duplicate")) {
            addLines([{ type: "error", text: `  Fighter "${newData.name}" already exists!` }]);
          } else {
            addLines([{ type: "error", text: `  Error: ${error.message}` }]);
          }
          return;
        }

        addLines([
          { type: "fight", text: `\n  ✅ ${newData.name} has entered the arena!` },
          { type: "output", text: `  Style: ${newData.style}` },
          { type: "output", text: `  PWR: ${newData.power} | SPD: ${newData.speed} | DEF: ${newData.defense} | STA: ${newData.stamina} | TEC: ${newData.technique}` },
          { type: "output", text: `  Type 'fight ${newData.name.toLowerCase()} vs <opponent>' to start fighting!` },
        ]);
        return;
      }

      const nextStat = statOrder[statIdx + 1];
      const nextStatsLeft = 5 - statIdx - 1;
      const nextMinNeeded = (nextStatsLeft - 1) * 30;
      const nextMax = Math.min(99, newRemaining - nextMinNeeded);

      // If it's the last stat (technique), auto-fill
      if (nextStat === "technique") {
        const autoVal = newRemaining;
        if (autoVal < 30 || autoVal > 99) {
          addLines([{ type: "error", text: `  Can't auto-assign technique=${autoVal}. Must be 30-99. Adjust previous stats.` }]);
          setCreateMode({ step: "power", data: { name: data.name, style: data.style, remaining: 250 } });
          addLines([{ type: "output", text: `  Restarting stats. Enter Power (30-99) [250 pts remaining]:` }]);
          return;
        }
        setCreateMode({ step: "technique", data: newData });
        addLines([
          { type: "output", text: `  ${step.charAt(0).toUpperCase() + step.slice(1)}: ${val} | Remaining: ${newRemaining}` },
          { type: "output", text: `  Technique will be auto-set to ${autoVal}. Confirm? (enter ${autoVal} or different value 30-${nextMax}):` },
        ]);
        return;
      }

      setCreateMode({ step: nextStat, data: newData });
      addLines([
        { type: "output", text: `  ${step.charAt(0).toUpperCase() + step.slice(1)}: ${val} | Remaining: ${newRemaining}` },
        { type: "output", text: `  Enter ${nextStat.charAt(0).toUpperCase() + nextStat.slice(1)} (30-${nextMax}) [${newRemaining} pts remaining]:` },
      ]);
    }
  }, [createMode, addLines]);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isProcessing) return;

    addLines([{ type: "input", text: `❯ ${input}` }]);
    setCmdHistory((prev) => [input, ...prev]);
    setHistoryIdx(-1);

    if (createMode) {
      handleCreateStep(input.trim());
    } else {
      processCommand(input);
    }

    setInput("");
  }, [input, isProcessing, createMode, handleCreateStep, processCommand, addLines]);

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
    } else if (e.key === "Escape" && createMode) {
      setCreateMode(null);
      addLines([{ type: "system", text: "  Fighter creation cancelled." }]);
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

      {/* Pixel Fight Arena - sticky during fights */}
      {arenaState && (
        <div className="shrink-0 border-b border-border">
          <FightArena
            fighterAName={arenaState.fighterAName}
            fighterBName={arenaState.fighterBName}
            currentAction={arenaState.action}
            round={arenaState.round}
            isActive={arenaState.isActive}
          />
        </div>
      )}

      {/* Terminal body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 pb-0">
        {history.map((entry, i) => (
          <div
            key={i}
            className={`text-sm leading-relaxed whitespace-pre-wrap break-all ${
              entry.type === "input"
                ? "text-foreground terminal-glow"
                : entry.type === "fight"
                ? "text-accent terminal-glow-strong"
                : entry.type === "error"
                ? "status-error"
                : entry.type === "loading"
                ? "text-muted-foreground animate-pulse"
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
          <span className="text-foreground terminal-glow">
            {createMode ? "»" : "❯"}
          </span>
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
            disabled={isProcessing}
            placeholder={isProcessing ? "Processing..." : createMode ? "Type your answer..." : "Type a command..."}
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-secondary text-xs shrink-0">
        <span className="text-muted-foreground">FightBook CLI</span>
        <span className="text-muted-foreground">OpenClaw Engine</span>
        <span className="text-muted-foreground">
          {isProcessing ? "⏳ Processing..." : createMode ? `📝 Creating: ${createMode.step}` : `${history.length} lines`}
        </span>
      </div>
    </div>
  );
};

export default TerminalCLI;
