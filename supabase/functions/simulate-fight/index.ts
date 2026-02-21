import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fighter_a_id, fighter_b_id } = await req.json();
    if (!fighter_a_id || !fighter_b_id) throw new Error("Both fighter IDs required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch both fighters
    const { data: fighters, error: fetchErr } = await supabase
      .from("fighters")
      .select("*")
      .in("id", [fighter_a_id, fighter_b_id]);

    if (fetchErr || !fighters || fighters.length !== 2) {
      throw new Error("Could not fetch fighters");
    }

    const a = fighters.find((f: any) => f.id === fighter_a_id)!;
    const b = fighters.find((f: any) => f.id === fighter_b_id)!;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a professional MMA fight commentator and simulator AI. You simulate realistic MMA fights based on fighter stats.

Given two fighters with their stats (power, speed, defense, stamina, technique on a 30-99 scale), simulate a complete fight.

IMPORTANT RULES:
- Higher stats give advantages but don't guarantee wins. Upsets happen.
- Speed vs Power creates interesting dynamics (fast strikers vs heavy hitters)
- High technique fighters land more precise strikes
- High stamina fighters perform better in later rounds
- Defense reduces damage taken
- Fights can end by: KO, TKO, Submission, Decision (Unanimous or Split)
- Most fights go to decision. KOs should be rare (maybe 20% of fights)
- Submissions are more likely with high technique fighters
- Be dramatic but realistic in narration

You MUST respond with a JSON object using this EXACT tool call format.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Simulate this fight:

FIGHTER A: ${a.name}
Style: ${a.style}
Power: ${a.power} | Speed: ${a.speed} | Defense: ${a.defense} | Stamina: ${a.stamina} | Technique: ${a.technique}
Record: ${a.wins}-${a.losses} | ELO: ${a.elo_rating}

FIGHTER B: ${b.name}
Style: ${b.style}
Power: ${b.power} | Speed: ${b.speed} | Defense: ${b.defense} | Stamina: ${b.stamina} | Technique: ${b.technique}
Record: ${b.wins}-${b.losses} | ELO: ${b.elo_rating}

Simulate a 5-round championship fight between these two.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "record_fight_result",
              description: "Record the complete fight simulation result",
              parameters: {
                type: "object",
                properties: {
                  winner_id: {
                    type: "string",
                    description: `The ID of the winning fighter. Use "${a.id}" for ${a.name} or "${b.id}" for ${b.name}. Use "draw" for a draw.`,
                  },
                  method: {
                    type: "string",
                    enum: ["KO", "TKO", "Submission", "Unanimous Decision", "Split Decision", "Draw"],
                  },
                  finish_round: {
                    type: "integer",
                    description: "Round the fight ended (1-5). Use 5 for decisions.",
                    minimum: 1,
                    maximum: 5,
                  },
                  narration: {
                    type: "string",
                    description: "A dramatic 3-5 paragraph fight narration in commentator style. Include key moments from each round. Be vivid and exciting.",
                  },
                  rounds: {
                    type: "array",
                    description: "Round-by-round scoring and highlights",
                    items: {
                      type: "object",
                      properties: {
                        round: { type: "integer" },
                        fighter_a_score: { type: "integer", minimum: 7, maximum: 10 },
                        fighter_b_score: { type: "integer", minimum: 7, maximum: 10 },
                        highlight: { type: "string", description: "Key moment of the round in one sentence" },
                      },
                      required: ["round", "fighter_a_score", "fighter_b_score", "highlight"],
                    },
                  },
                },
                required: ["winner_id", "method", "finish_round", "narration", "rounds"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "record_fight_result" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const fightResult = JSON.parse(toolCall.function.arguments);
    const isDraw = fightResult.winner_id === "draw";
    const winnerId = isDraw ? null : fightResult.winner_id;

    // Record the fight
    const { data: fight, error: fightErr } = await supabase.from("fights").insert({
      fighter_a_id: a.id,
      fighter_b_id: b.id,
      winner_id: winnerId,
      method: fightResult.method,
      finish_round: fightResult.finish_round,
      total_rounds: 5,
      narration: fightResult.narration,
      round_data: fightResult.rounds,
    }).select().single();

    if (fightErr) {
      console.error("Fight insert error:", fightErr);
      throw new Error("Failed to record fight");
    }

    // Update fighter records and ELO
    const K = 32; // ELO K-factor
    const expectedA = 1 / (1 + Math.pow(10, (b.elo_rating - a.elo_rating) / 400));
    const expectedB = 1 - expectedA;

    const isKO = ["KO", "TKO"].includes(fightResult.method);
    const isSub = fightResult.method === "Submission";

    if (isDraw) {
      // Draw: both get 0.5
      await supabase.from("fighters").update({
        total_fights: a.total_fights + 1,
        elo_rating: Math.round(a.elo_rating + K * (0.5 - expectedA)),
        win_streak: 0,
      }).eq("id", a.id);
      await supabase.from("fighters").update({
        total_fights: b.total_fights + 1,
        elo_rating: Math.round(b.elo_rating + K * (0.5 - expectedB)),
        win_streak: 0,
      }).eq("id", b.id);
    } else {
      const winner = winnerId === a.id ? a : b;
      const loser = winnerId === a.id ? b : a;
      const expectedW = winnerId === a.id ? expectedA : expectedB;
      const expectedL = winnerId === a.id ? expectedB : expectedA;

      const newWinStreak = winner.win_streak + 1;
      await supabase.from("fighters").update({
        wins: winner.wins + 1,
        total_fights: winner.total_fights + 1,
        ko_wins: isKO ? winner.ko_wins + 1 : winner.ko_wins,
        sub_wins: isSub ? winner.sub_wins + 1 : winner.sub_wins,
        win_streak: newWinStreak,
        best_streak: Math.max(winner.best_streak, newWinStreak),
        elo_rating: Math.round(winner.elo_rating + K * (1 - expectedW)),
      }).eq("id", winner.id);

      await supabase.from("fighters").update({
        losses: loser.losses + 1,
        total_fights: loser.total_fights + 1,
        ko_losses: isKO ? loser.ko_losses + 1 : loser.ko_losses,
        win_streak: 0,
        elo_rating: Math.round(loser.elo_rating + K * (0 - expectedL)),
      }).eq("id", loser.id);
    }

    return new Response(JSON.stringify({
      fight_id: fight.id,
      winner: isDraw ? "DRAW" : (winnerId === a.id ? a.name : b.name),
      loser: isDraw ? "DRAW" : (winnerId === a.id ? b.name : a.name),
      method: fightResult.method,
      finish_round: fightResult.finish_round,
      narration: fightResult.narration,
      rounds: fightResult.rounds,
      fighter_a: a.name,
      fighter_b: b.name,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("simulate-fight error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
