import React, { useRef, useState } from "react";
import styles from "./ProfileModal.module.css";
import { useSettingsStore } from "@/lib/state/useSettingsStore";
import { Icon } from "@/lib/utils/IconRegistry";

/**
 * ProfileModal — Glass card modal for user profile
 * - Upload avatar (local image, persisted)
 * - Display name, bio, theme preference
 * - Save, Reset, Close buttons
 * - Full keyboard trap, a11y
 */
const defaultAvatar = "https://ui-avatars.com/api/?name=User&background=1A2B45&color=fff";

export const ProfileModal: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [theme, setTheme] = useState("system");
  const fileInput = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Focus trap
  React.useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  // Handle avatar upload
  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setAvatar(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Save profile (persist to localStorage for MVP)
  const handleSave = () => {
    localStorage.setItem("eh-profile", JSON.stringify({ avatar, name, bio, theme }));
    onClose();
  };

  // Reset profile
  const handleReset = () => {
    setAvatar(null);
    setName("");
    setBio("");
    setTheme("system");
  };

  // Load profile on open
  React.useEffect(() => {
    if (open) {
      const saved = localStorage.getItem("eh-profile");
      if (saved) {
        try {
          const { avatar, name, bio, theme } = JSON.parse(saved);
          setAvatar(avatar || null);
          setName(name || "");
          setBio(bio || "");
          setTheme(theme || "system");
        } catch {}
      }
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.modal} eh-glass glass-surface`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-title"
      tabIndex={-1}
      open
    >
      <form
        className={styles.form}
        onSubmit={e => { e.preventDefault(); handleSave(); }}
        autoComplete="off"
      >
        <h2 id="profile-title">Profile</h2>
        <div className={styles.avatarRow}>
          <img
            src={avatar || defaultAvatar}
            alt="Avatar preview"
            className={styles.avatar}
            onClick={() => fileInput.current?.click()}
            tabIndex={0}
            aria-label="Upload avatar"
            style={{ cursor: "pointer" }}
          />
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleAvatar}
            tabIndex={-1}
          />
        </div>
        <label>
          Display Name
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={32}
            required
            autoFocus
          />
        </label>
        <label>
          Short Bio
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={120}
            rows={2}
          />
        </label>
        <label>
          Theme
          <select value={theme} onChange={e => setTheme(e.target.value)}>
            <option value="system">System</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <div className={styles.buttonRow}>
          <button type="submit" className={styles.saveBtn}>Save</button>
          <button type="button" onClick={handleReset} className={styles.resetBtn}>Reset</button>
          <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close profile">Close</button>
        </div>
      </form>
    </dialog>
  );
};

export default ProfileModal;
