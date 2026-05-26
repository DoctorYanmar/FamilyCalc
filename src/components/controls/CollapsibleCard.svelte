<script lang="ts">
  type Props = {
    title: string;
    subtitle?: string;
    meta?: string;
    dataTour?: string;
    children?: import('svelte').Snippet;
  };
  let { title, subtitle, meta, dataTour, children }: Props = $props();
</script>

<section class="card" data-tour={dataTour}>
  <div class="card-head">
    <div class="card-title">{title}{#if subtitle} · <span style="color:var(--fg-3);font-weight:400">{subtitle}</span>{/if}</div>
    {#if meta}<div class="card-meta">{meta}</div>{/if}
  </div>
  <div class="card-body">
    {@render children?.()}
  </div>
</section>
