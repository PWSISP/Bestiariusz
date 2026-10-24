export type ScreenId = string;

export interface Size {
  width: number;
  height: number;
}

export interface AppEvents {
  'screen:changed': { from: ScreenId | null; to: ScreenId };
  'app:resize': Size;
}
