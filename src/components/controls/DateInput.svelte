<script lang="ts">
  type Props = {
    label: string;
    hint?: string;
    value: string;
    onChange: (iso: string) => void;
  };
  let { label, hint, value, onChange }: Props = $props();

  function handle(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.value) onChange(target.value);
  }
</script>

<label class="field">
  <span>
    <span class="field-key">{label}</span>
    {#if hint}<span class="field-hint">{hint}</span>{/if}
  </span>
  <input class="input date" type="date" value={value} oninput={handle} />
</label>
