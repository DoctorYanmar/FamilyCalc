<div class="atmos">
  <div class="vignette"></div>
  <div class="static"></div>
  <div class="scanline"></div>
</div>

<style>
  .atmos { position: fixed; inset: 0; pointer-events: none; z-index: 90; }
  .vignette {
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 80% 60% at center, transparent 0%, transparent 50%, rgba(0,0,0,0.55) 100%);
  }
  .static {
    position: absolute; inset: 0;
    background: repeating-linear-gradient(
      0deg,
      rgba(255,255,255,0.018) 0,
      rgba(255,255,255,0.018) 1px,
      transparent 1px,
      transparent 3px
    );
  }
  .scanline {
    position: absolute; left: 0; right: 0; top: -2px;
    height: 2px;
    background: linear-gradient(180deg, transparent, rgba(255, 180, 84, 0.10), transparent);
    animation: scan 8s linear infinite;
  }
  @keyframes scan { to { top: 100%; } }

  /* Suppress atmosphere on light theme — keep the paper-terminal calm */
  :global([data-theme='light']) .static,
  :global([data-theme='light']) .vignette,
  :global([data-theme='light']) .scanline { display: none; }

  @media print { .atmos { display: none; } }
  @media (prefers-reduced-motion: reduce) { .scanline { display: none; } }
</style>
