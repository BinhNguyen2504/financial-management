"use client";
import {
  EMOJI_NAMES,
  EMOJI_VALUES,
  jarEmoji,
  type JarEmoji,
} from "@/domain/expenses/emoji";
export function EmojiPicker({
  value,
  onChange,
  name,
  kind,
}: {
  value: JarEmoji | null;
  onChange: (value: JarEmoji | null) => void;
  name: string;
  kind: string;
}) {
  return (
    <fieldset className="emoji-picker">
      <legend>Biểu tượng của hũ</legend>
      <button
        type="button"
        className="emoji-auto"
        aria-pressed={value === null}
        onClick={() => onChange(null)}
      >
        <span aria-hidden="true">{jarEmoji(name, kind)}</span> Tự động theo tên
      </button>
      <div className="emoji-options">
        {EMOJI_VALUES.map((emoji, i) => (
          <button
            type="button"
            key={emoji}
            aria-label={EMOJI_NAMES[i]}
            aria-pressed={value === emoji}
            onClick={() => onChange(emoji)}
          >
            <span aria-hidden="true">{emoji}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
