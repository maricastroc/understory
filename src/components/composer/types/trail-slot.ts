export type TrailSlot = {
  key: string;
  text: string;
  filled: boolean;
  current: boolean;
  enabled: boolean;
  tone?: "datum";
  dot?: boolean;
  onPick: () => void;
};
