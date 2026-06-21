export interface WizState {
  state: boolean;
  dimming: number;
  r?: number;
  g?: number;
  b?: number;
  temp?: number;
  sceneId?: number;
}

export interface WizDevice {
  ip: string;
  name?: string;
  state?: WizState;
}

export interface WizScene {
  id: number;
  name: string;
  colors: string[];
  description?: string;
}

export interface GetStateResponse {
  state: boolean;
  dimming: number;
  r?: number;
  g?: number;
  b?: number;
  temp?: number;
  sceneId?: number;
}

export interface DiscoverDeviceResponse {
  ip: string;
  state?: {
    state: boolean;
    dimming: number;
    r?: number;
    g?: number;
    b?: number;
    temp?: number;
    sceneId?: number;
  };
}
