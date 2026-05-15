<script lang="ts">
  type Props = {
    label: string;
    value: string;
    onChange: (v: string) => void;
    hint?: string;
  };
  let { label, value, onChange, hint }: Props = $props();
</script>

<label class="field">
  <span class="field-key">
    {label}
    {#if hint}<span class="hint">{hint}</span>{/if}
  </span>
  <input class="input date" type="date" value={value}
         oninput={(e) => onChange((e.target as HTMLInputElement).value)} />
</label>
