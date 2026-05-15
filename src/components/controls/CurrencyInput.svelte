<script lang="ts">
  type Props = {
    label: string;
    hint?: string;
    value: number;
    onChange: (n: number) => void;
    suffix?: string;
    placeholder?: string;
  };
  let { label, hint, value, onChange, suffix = '', placeholder }: Props = $props();

  function handle(e: Event) {
    const target = e.target as HTMLInputElement;
    const n = Number(target.value.replace(/\s/g, ''));
    if (!Number.isNaN(n) && n >= 0) onChange(n);
  }
</script>

<label class="field">
  <span>
    <span class="field-key">{label}{#if suffix} · {suffix}{/if}</span>
    {#if hint}<span class="field-hint">{hint}</span>{/if}
  </span>
  <input
    class="input"
    type="number"
    inputmode="decimal"
    min="0"
    step="any"
    {placeholder}
    value={value === 0 ? '' : value}
    oninput={handle}
  />
</label>
