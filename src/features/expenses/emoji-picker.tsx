"use client";
import { useState } from "react";
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
  const [query, setQuery] = useState("");
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
      <label className="emoji-search">
        Tìm biểu tượng
        <input
          type="search"
          value={query}
          onChange={(event) => {
            event.stopPropagation();
            setQuery(event.target.value);
          }}
          placeholder="Ăn uống, xe, học tập…"
        />
      </label>
      <div className="emoji-options">
        {EMOJI_VALUES.map((emoji, i) => ({ emoji, name: EMOJI_NAMES[i] }))
          .filter((item) =>
            item.name
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLocaleLowerCase("vi")
              .includes(
                query
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLocaleLowerCase("vi"),
              ),
          )
          .map(({ emoji, name }) => (
            <button
              type="button"
              key={emoji}
              aria-label={name}
              title={name}
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
