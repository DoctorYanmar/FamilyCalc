<script lang="ts">
  type Props = {
    label: string;
    value: number;
    onChange: (v: number) => void;
    suffix?: string;
    hint?: string;
    placeholder?: string;
  };
  let { label, value, onChange, suffix, hint, placeholder = '0' }: Props = $props();

  function onInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value;
    const n = Number(raw);
    if (!Number.isNaN(n) && n >= 0) onChange(n);
  }
</script>

<label class="field">
  <span class="field-key">
    {label}
    {#if hint}<span class="hint">{hint}</span>{/if}
  </span>
  <span class="input-wrap">
    <input class="input{suffix ? ' with-suffix' : ''}"
           type="number" inputmode="decimal" min="0" step="any"
           value={value === 0 ? '' : value}
           {placeholder}
           oninput={onInput} />
    {#if suffix}<span class="suffix">{suffix}</span>{/if}
  </span>
</label>
