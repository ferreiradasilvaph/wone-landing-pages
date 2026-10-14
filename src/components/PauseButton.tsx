"use client";

import { Pause, Play } from "lucide-react";

/**
 * O "pausar" do site: uma peça só para o telefone do hero e para cada barra de
 * `SegmentProgress` (Recursos, Segurança, Premiações). Qualquer coisa que anda
 * sozinha na página tem como parar.
 *
 * `aria-pressed` é o estado — o botão é um alternador, não dois botões — e o
 * rótulo acompanha: pressionado, ele oferece "Reproduzir".
 *
 * A pílula tem 36px de altura para não brigar com os controles ao lado, e o
 * alvo de toque chega aos 44px do portão de acessibilidade pelo pseudo-elemento
 * de 10px em volta, que não ocupa espaço no layout.
 */
export function PauseButton({
  pressed,
  onToggle,
  labels,
  className = "",
}: {
  pressed: boolean;
  onToggle: () => void;
  labels: { pause: string; play: string };
  className?: string;
}) {
  const Icone = pressed ? Play : Pause;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={pressed}
      className={`relative inline-flex h-9 items-center gap-1.5 rounded-full bg-ink-800 px-3 text-[13px] font-medium text-muted transition-colors before:absolute before:-inset-[10px] before:content-[''] hover:text-cream${
        className ? ` ${className}` : ""
      }`}
    >
      <Icone className="h-3.5 w-3.5" aria-hidden />
      {pressed ? labels.play : labels.pause}
    </button>
  );
}
