export type Status = 'watching' | 'passed' | 'skipped' | 'error';

export interface Position {
  entryTime: number;
  entryPrice: number;
  entryTx: string;
  minsAfterLaunch: number;
  sizeSol: number;
  tokens: number;
  sellAt: number;
  exit: null | { time: number; price: number; why: 'day 2' | 'take-profit' | 'stop-loss'; tx?: string };
  mark: number;
  pnlSol: number;
  pnlPct: number;
  open: boolean;
  atEntry?: { vol: number; holders: number; dev: number };
}

export interface Row {
  pad: string;
  domain: string;
  padImg: string;
  configs: number;
  coinsOnPad: number;
  relaunches: number;
  name: string;
  symbol: string;
  mint: string;
  poolId: string;
  creator: string;
  logo: string;
  twitter: string;
  createdAt: number;
  curvePct: number;
  price: number;
  mcapUsd: number;
  sinceLaunchPct: number;
  quote: string;
  status: Status;
  reason: string;
  vol1h: number;
  holders1h: number;
  devPct: number;
  complete: boolean;
  spark: number[];
  position: Position | null;
}

export interface Rules {
  minVol1hSol: number;
  minHolders: number;
  maxDevPct: number;
  sizeSol: number;
  sellAfterH: number;
  takeProfitX: number;
  stopLossPct: number | null;
}

export interface Board {
  updatedAt: number;
  solPrice: number;
  rules: Rules;
  windowHours: number;
  coinsScanned: number;
  stats: { padsTracked: number; bought: number; closed: number; avgReturnPct: number; pnlSol: number };
  rows: Row[];
}
