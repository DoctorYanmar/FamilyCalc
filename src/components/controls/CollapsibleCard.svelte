<script lang="ts">
  type Props = {
    title: string;
    subtitle?: string;
    open?: boolean;
    onToggle?: (open: boolean) => void;
    children?: import('svelte').Snippet;
  };
  let { title, subtitle, open = $bindable(true), onToggle, children }: Props = $props();

  function toggle() {
    open = !open;
    onToggle?.(open);
  }
</script>

<section class="card">
  <button class="card-head" type="button" onclick={toggle} aria-expanded={open}>
    <span class="card-title">{title}</span>
    <span class="card-sub">{#if subtitle}{subtitle} · {/if}{open ? '─' : '+'}</span>
  </button>
  {#if open}
    <div class="card-body">
      {@render children?.()}
    </div>
  {/if}
</section>

<style>
  button.card-head {
    background: transparent;
    border: 0;
    width: 100%;
    text-align: left;
  }
</style>
