"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/** Tem cursor de verdade e não pediu menos movimento? */
function subscribe(notify: () => void) {
  const queries = [
    window.matchMedia("(pointer: fine)"),
    window.matchMedia("(prefers-reduced-motion: reduce)"),
  ];
  queries.forEach((query) => query.addEventListener("change", notify));
  return () =>
    queries.forEach((query) => query.removeEventListener("change", notify));
}

function snapshot() {
  return (
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Halo laranja que acompanha o cursor pela página inteira.
 *
 * `mix-blend-screen` faz a luz somar em vez de cobrir o conteúdo, e z-30 a
 * mantém acima do fundo das seções e abaixo do header. Os eventos de mousemove
 * são agrupados em um repaint por frame.
 *
 * Quem não tem cursor não vê nada disto — e agora a div nem chega a existir no
 * celular. Não é só economia: uma camada fixa de tela cheia com blend obriga o
 * compositor a rasterizar o fundo inteiro, e era parte do motivo de a barra do
 * topo sumir ao rolar no telefone.
 */
export function InteractiveBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const lit = useSyncExternalStore(subscribe, snapshot, () => false);

  useEffect(() => {
    if (!lit) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    const paint = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      el.style.setProperty("--mouse-x", `${x}px`);
      el.style.setProperty("--mouse-y", `${y}px`);
      el.style.opacity = "1";
    };

    const handleMouseMove = (event: MouseEvent) => {
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const handleMouseLeave = () => {
      if (ref.current) ref.current.style.opacity = "0";
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [lit]);

  if (!lit) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-30 opacity-0 mix-blend-screen transition-opacity duration-500"
      style={{
        background:
          "radial-gradient(34rem circle at var(--mouse-x, -50rem) var(--mouse-y, -50rem), rgba(255, 119, 0, 0.11), transparent 70%)",
      }}
    />
  );
}
