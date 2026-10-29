// Tổng hợp toàn bộ 11 mô hình 3D đã kiểm duyệt 4 góc của dự án PS.
import type { ModelSet } from '@lib/3d/turntable';
import { PatriotLauncher, patriotMuzzlePos, MODELS as M_LAUNCHER, type PatriotLauncherProps } from './PatriotLauncher';
import { PatriotRadar, MODELS as M_RADAR, type PatriotRadarProps } from './PatriotRadar';
import { PAC3, PAC2, Kinzhal, MODELS as M_INT, type PAC3Props, type PAC2Props, type KinzhalProps } from './Interceptors';
import { MiG31K, MIG31_PYLON_OFFSET, MODELS as M_MIG, type MiG31KProps } from './MiG31K';
import { Shahed136, Kh101, MODELS as M_SWARM, type Shahed136Props, type Kh101Props } from './SwarmThreats';
import { Oreshnik, OreshnikRV, MODELS as M_ORESH, type OreshnikProps, type OreshnikRVProps } from './Oreshnik';
import { S400Launcher, MODELS as M_S400, type S400LauncherProps } from './S400Launcher';

export {
  PatriotLauncher,
  patriotMuzzlePos,
  PatriotRadar,
  PAC3,
  PAC2,
  Kinzhal,
  MiG31K,
  MIG31_PYLON_OFFSET,
  Shahed136,
  Kh101,
  Oreshnik,
  OreshnikRV,
  S400Launcher,
};

export type {
  PatriotLauncherProps,
  PatriotRadarProps,
  PAC3Props,
  PAC2Props,
  KinzhalProps,
  MiG31KProps,
  Shahed136Props,
  Kh101Props,
  OreshnikProps,
  OreshnikRVProps,
  S400LauncherProps,
};

export const MODELS: ModelSet = {
  ...M_LAUNCHER,
  ...M_RADAR,
  ...M_INT,
  ...M_MIG,
  ...M_SWARM,
  ...M_ORESH,
  ...M_S400,
};
