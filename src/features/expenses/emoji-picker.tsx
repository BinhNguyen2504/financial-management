"use client";
import { useI18n } from "@/i18n/provider";

import {
  EMOJI_NAMES,
  EMOJI_VALUES,
  jarEmoji,
  isJarEmoji,
  type JarEmoji,
} from "@/domain/expenses/emoji";
import { useId, useState } from "react";
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
  const { t: tr } = useI18n("expenses");

  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState(
    value && !EMOJI_VALUES.some((emoji) => emoji === value) ? value : "",
  );
  const customId = useId();
  const error =
    custom !== "" && !isJarEmoji(custom) ? tr("Chỉ nhập một emoji.") : "";
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLocaleLowerCase("vi");
  const options = EMOJI_VALUES.map((emoji, i) => ({
    emoji,
    name: tr(EMOJI_NAMES[i]),
  })).filter(
    (item) =>
      normalize(item.name).includes(normalize(query.trim())) ||
      item.emoji === query.trim(),
  );
  function choose(emoji: JarEmoji | null) {
    setCustom("");
    onChange(emoji);
  }
  return (
    <fieldset className="emoji-picker">
      <legend>{tr("Biểu tượng của hũ")}</legend>
      <button
        type="button"
        className="emoji-auto"
        aria-pressed={value === null}
        onClick={() => choose(null)}
      >
        <span aria-hidden="true">{jarEmoji(name, kind)}</span>{" "}
        {tr("Tự động theo tên")}
      </button>
      <div className="emoji-custom">
        <label htmlFor="expense-field-emoji">{tr("Emoji từ bàn phím")}</label>
        <div className="emoji-custom-input">
          <input
            id="expense-field-emoji"
            name="emoji"
            type="text"
            value={custom}
            autoComplete="off"
            spellCheck={false}
            placeholder="🦋"
            aria-invalid={!!error}
            aria-describedby={`${customId}-hint${error ? ` ${customId}-error` : ""}`}
            ref={(input) => {
              input?.setCustomValidity(error);
            }}
            onChange={(event) => {
              const next = event.target.value.trim();
              setCustom(next);
              if (!next || isJarEmoji(next)) onChange(next || null);
            }}
          />
          <span role="status" className="emoji-selection">
            {tr("Đang chọn: {0}", { 0: jarEmoji(name, kind, value) })}
          </span>
        </div>
        <small id={`${customId}-hint`}>
          {tr("Nhập hoặc dán một emoji bất kỳ từ bàn phím.")}
        </small>
        {error && (
          <small id={`${customId}-error`} className="field-error">
            {error}
          </small>
        )}
      </div>
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
        {options.map(({ emoji, name }) => (
          <button
            type="button"
            key={emoji}
            aria-label={name}
            title={name}
            aria-pressed={value === emoji}
            onClick={() => choose(emoji)}
          >
            <span aria-hidden="true">{emoji}</span>
          </button>
        ))}
      </div>
      {options.length === 0 && (
        <p className="expense-muted">
          {tr("Không tìm thấy biểu tượng. Bạn có thể nhập emoji từ bàn phím.")}
        </p>
      )}
    </fieldset>
  );
}
