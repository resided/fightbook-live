import { useEffect, useState } from "react";

type FighterAction = "idle" | "punch" | "kick" | "block" | "hit" | "knockdown" | "takedown" | "submission" | "victory" | "defeat";

interface FightArenaProps {
  fighterAName: string;
  fighterBName: string;
  currentAction?: string;
  round?: number;
  isActive?: boolean;
}

// Pixel art fighter rendered with CSS grid
const PixelFighter = ({
  mirrored = false,
  action = "idle" as FighterAction,
  color = "primary" as string,
}: {
  mirrored?: boolean;
  action?: FighterAction;
  color?: string;
}) => {
  // 8x12 pixel grid sprites for each action
  const sprites: Record<FighterAction, number[][]> = {
    idle: [
      [0,0,1,1,1,0,0,0],
      [0,0,1,1,1,0,0,0],
      [0,0,0,1,0,0,0,0],
      [0,1,1,1,1,1,0,0],
      [0,0,0,1,0,0,0,0],
      [0,0,0,1,0,0,0,0],
      [0,0,0,1,0,0,0,0],
      [0,0,1,0,1,0,0,0],
      [0,0,1,0,1,0,0,0],
      [0,1,0,0,0,1,0,0],
    ],
    punch: [
      [0,0,1,1,1,0,0,0],
      [0,0,1,1,1,0,0,0],
      [0,0,0,1,0,0,0,0],
      [0,0,1,1,1,1,1,1],
      [0,0,0,1,0,0,0,0],
      [0,0,0,1,0,0,0,0],
      [0,0,0,1,0,0,0,0],
      [0,0,1,0,1,0,0,0],
      [0,1,0,0,0,1,0,0],
      [0,1,0,0,0,1,0,0],
    ],
    kick: [
      [0,0,1,1,1,0,0,0],
      [0,0,1,1,1,0,0,0],
      [0,0,0,1,0,0,0,0],
      [0,1,1,1,1,1,0,0],
      [0,0,0,1,0,0,0,0],
      [0,0,0,1,0,0,0,0],
      [0,0,1,0,0,0,0,0],
      [0,0,1,0,0,0,0,0],
      [0,0,0,1,1,1,1,0],
      [0,0,0,0,0,0,0,0],
    ],
    block: [
      [0,0,1,1,1,0,0,0],
      [0,0,1,1,1,0,0,0],
      [0,0,0,1,0,0,0,0],
      [0,1,1,1,1,0,0,0],
      [0,1,0,1,0,0,0,0],
      [0,1,0,1,0,0,0,0],
      [0,0,0,1,0,0,0,0],
      [0,0,1,0,1,0,0,0],
      [0,0,1,0,1,0,0,0],
      [0,1,0,0,0,1,0,0],
    ],
    hit: [
      [0,0,0,1,1,1,0,0],
      [0,0,0,1,1,1,0,0],
      [0,0,0,0,1,0,0,0],
      [0,0,1,1,1,1,0,0],
      [0,0,0,0,1,0,0,0],
      [0,0,0,1,0,0,0,0],
      [0,0,0,1,0,0,0,0],
      [0,0,1,0,1,0,0,0],
      [0,1,0,0,0,1,0,0],
      [0,1,0,0,0,0,1,0],
    ],
    knockdown: [
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,1,1,1,0,0,0,0],
      [0,1,1,1,0,0,0,0],
      [1,1,1,1,1,1,1,0],
      [0,0,0,0,1,0,1,0],
    ],
    takedown: [
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,1,1,1,0,0,0],
      [0,0,1,1,1,0,0,0],
      [0,1,1,1,1,1,0,0],
      [1,1,0,1,0,1,1,0],
      [0,0,0,1,0,0,0,0],
      [0,0,1,0,1,0,0,0],
    ],
    submission: [
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,1,1,1,0,0,0,0],
      [0,1,1,1,0,0,0,0],
      [1,1,1,1,1,1,0,0],
      [0,0,1,1,1,0,1,0],
      [0,0,0,0,0,1,0,0],
    ],
    victory: [
      [0,0,1,1,1,0,0,0],
      [0,0,1,1,1,0,0,0],
      [0,0,0,1,0,0,0,0],
      [1,1,1,1,1,1,1,0],
      [0,0,0,1,0,0,0,0],
      [0,0,0,1,0,0,0,0],
      [0,0,0,1,0,0,0,0],
      [0,0,1,0,1,0,0,0],
      [0,1,0,0,0,1,0,0],
      [1,0,0,0,0,0,1,0],
    ],
    defeat: [
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,1,1,1,0,0,0,0],
      [0,1,1,1,1,1,0,0],
      [1,0,0,0,0,1,1,0],
    ],
  };

  const sprite = sprites[action] || sprites.idle;
  const pixelSize = 5;

  const animClass =
    action === "punch" ? "pixel-fighter-punch" :
    action === "kick" ? "pixel-fighter-kick" :
    action === "hit" ? "pixel-fighter-hit" :
    action === "knockdown" ? "pixel-fighter-knockdown" :
    action === "takedown" ? "pixel-fighter-takedown" :
    action === "victory" ? "pixel-fighter-victory" :
    action === "block" ? "pixel-fighter-block" :
    "pixel-fighter-idle";

  const colorClass = color === "accent" ? "pixel-accent" : "pixel-primary";

  return (
    <div
      className={`${animClass} ${mirrored ? "scale-x-[-1]" : ""}`}
      style={{ display: "inline-block" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(8, ${pixelSize}px)`,
          gridTemplateRows: `repeat(10, ${pixelSize}px)`,
          gap: "1px",
        }}
      >
        {sprite.flat().map((pixel, idx) => (
          <div
            key={idx}
            className={pixel ? colorClass : ""}
            style={{
              width: pixelSize,
              height: pixelSize,
              imageRendering: "pixelated",
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Impact/effect sprites
const ImpactEffect = ({ type }: { type: "punch" | "kick" | "slam" | "star" }) => {
  const effects: Record<string, string[]> = {
    punch: ["💥"],
    kick: ["💢"],
    slam: ["💫"],
    star: ["⭐"],
  };
  return (
    <div className="pixel-impact absolute">
      <span className="text-2xl">{effects[type]?.[0] || "💥"}</span>
    </div>
  );
};

// Parse action text to determine animation
const parseAction = (text: string): { attackerA: FighterAction; attackerB: FighterAction; effect?: string } => {
  const lower = text.toLowerCase();

  // Knockdown/KO
  if (lower.includes("knockdown") || lower.includes("knock down") || lower.includes("drops") || lower.includes("floors") || lower.includes("knocks out") || lower.includes("ko")) {
    // Determine who got knocked down by checking name position relative to action words
    return { attackerA: "punch", attackerB: "knockdown", effect: "slam" };
  }

  // Takedown/wrestling
  if (lower.includes("takedown") || lower.includes("takes down") || lower.includes("slams") || lower.includes("throws") || lower.includes("trips")) {
    return { attackerA: "takedown", attackerB: "knockdown", effect: "slam" };
  }

  // Submission
  if (lower.includes("submission") || lower.includes("choke") || lower.includes("armbar") || lower.includes("triangle") || lower.includes("guillotine") || lower.includes("lock")) {
    return { attackerA: "submission", attackerB: "submission", effect: "star" };
  }

  // Kicks
  if (lower.includes("kick") || lower.includes("knee") || lower.includes("shin") || lower.includes("leg") || lower.includes("head kick") || lower.includes("roundhouse")) {
    return { attackerA: "kick", attackerB: "hit", effect: "kick" };
  }

  // Block/defense
  if (lower.includes("block") || lower.includes("parr") || lower.includes("evade") || lower.includes("dodge") || lower.includes("slip") || lower.includes("misses")) {
    return { attackerA: "punch", attackerB: "block", effect: undefined };
  }

  // Clinch
  if (lower.includes("clinch") || lower.includes("grappl") || lower.includes("wrestl") || lower.includes("cage")) {
    return { attackerA: "block", attackerB: "block", effect: undefined };
  }

  // Default: punch/strike
  if (lower.includes("punch") || lower.includes("jab") || lower.includes("hook") || lower.includes("uppercut") || lower.includes("cross") || lower.includes("overhand") || lower.includes("lands") || lower.includes("connects") || lower.includes("strikes") || lower.includes("hits") || lower.includes("combo") || lower.includes("right hand") || lower.includes("left hand")) {
    return { attackerA: "punch", attackerB: "hit", effect: "punch" };
  }

  // Fallback
  return { attackerA: "idle", attackerB: "idle" };
};

const FightArena = ({ fighterAName, fighterBName, currentAction, round, isActive }: FightArenaProps) => {
  const [fighterAAction, setFighterAAction] = useState<FighterAction>("idle");
  const [fighterBAction, setFighterBAction] = useState<FighterAction>("idle");
  const [showEffect, setShowEffect] = useState<string | null>(null);
  const [effectPos, setEffectPos] = useState<"left" | "center" | "right">("center");

  useEffect(() => {
    if (!currentAction || !isActive) {
      setFighterAAction("idle");
      setFighterBAction("idle");
      setShowEffect(null);
      return;
    }

    const parsed = parseAction(currentAction);

    // Randomly decide who is attacking (50/50 with some text parsing)
    const lower = currentAction.toLowerCase();
    const aFirst = lower.indexOf(fighterAName.toLowerCase());
    const bFirst = lower.indexOf(fighterBName.toLowerCase());
    const aAttacks = aFirst !== -1 && (bFirst === -1 || aFirst < bFirst);

    if (aAttacks) {
      setFighterAAction(parsed.attackerA);
      setFighterBAction(parsed.attackerB);
      setEffectPos("right");
    } else {
      setFighterAAction(parsed.attackerB);
      setFighterBAction(parsed.attackerA);
      setEffectPos("left");
    }

    if (parsed.effect) {
      setShowEffect(parsed.effect);
      setTimeout(() => setShowEffect(null), 600);
    }

    // Reset to idle after animation
    const timer = setTimeout(() => {
      setFighterAAction("idle");
      setFighterBAction("idle");
    }, 1200);

    return () => clearTimeout(timer);
  }, [currentAction, isActive, fighterAName, fighterBName]);

  if (!isActive) return null;

  return (
    <div className="fight-arena my-2 mx-4 select-none">
      {/* Round indicator */}
      <div className="text-center text-xs text-muted-foreground mb-1">
        {round ? `━━━ ROUND ${round} ━━━` : "━━━━━━━━━━━━━"}
      </div>

      {/* Arena */}
      <div className="arena-bg relative flex items-end justify-between px-6 py-2" style={{ height: 80 }}>
        {/* Ring ropes (top) */}
        <div className="absolute top-2 left-0 right-0 border-t border-border opacity-40" />
        <div className="absolute top-4 left-0 right-0 border-t border-border opacity-20" />

        {/* Fighter A */}
        <div className="flex flex-col items-center gap-1 z-10">
          <span className="text-[9px] text-primary font-bold truncate max-w-[60px]">
            {fighterAName.slice(0, 8)}
          </span>
          <PixelFighter action={fighterAAction} color="primary" />
          {/* Health-ish bar */}
          <div className="w-10 h-1 bg-muted rounded-sm overflow-hidden">
            <div className="h-full bg-terminal-green transition-all" style={{ width: "100%" }} />
          </div>
        </div>

        {/* Center VS / Effect */}
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          {showEffect ? (
            <ImpactEffect type={showEffect as any} />
          ) : (
            <span className="text-[10px] text-muted-foreground opacity-30">VS</span>
          )}
        </div>

        {/* Fighter B */}
        <div className="flex flex-col items-center gap-1 z-10">
          <span className="text-[9px] text-accent font-bold truncate max-w-[60px]">
            {fighterBName.slice(0, 8)}
          </span>
          <PixelFighter action={fighterBAction} color="accent" mirrored />
          <div className="w-10 h-1 bg-muted rounded-sm overflow-hidden">
            <div className="h-full bg-terminal-green transition-all" style={{ width: "100%" }} />
          </div>
        </div>

        {/* Floor */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-secondary border-t border-border" />
      </div>
    </div>
  );
};

export default FightArena;
