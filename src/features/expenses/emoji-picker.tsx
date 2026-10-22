"use client";
import { useI18n } from "@/i18n/provider";

import {
  EMOJI_NAMES,
  EMOJI_VALUES,
  jarEmoji,
  type JarEmoji,
} from "@/domain/expenses/emoji";
import { useState } from "react";
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
  const { t: tr, config: localize } = useI18n("expenses");

  const [query, setQuery] = useState("");
  return (
    <fieldset className="emoji-picker">
      <legend>{tr("Biểu tượng của hũ")}</legend>
      <button
        type="button"
        className="emoji-auto"
        aria-pressed={value === null}
        onClick={() => onChange(null)}
      >
        <span aria-hidden="true">{jarEmoji(name, kind)}</span>{" "}
        {tr("Tự động theo tên")}
      </button>
      <label className="emoji-search">
        {tr("Tìm biểu tượng")}
        <input
          type="search"
          value={query}
          onChange={(event) => {
            event.stopPropagation();
            setQuery(event.target.value);
          }}
          placeholder={tr("Ăn uống, xe, học tập…")}
        />
      </label>
      <div className="emoji-options">
        {localize(EMOJI_VALUES)
          .map((emoji, i) => ({ emoji, name: tr(EMOJI_NAMES[i]) }))
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
