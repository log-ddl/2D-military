/**
 * Cấu hình CLI Remotion cho engine. Mọi lệnh chạy với cwd = engine/ (tools/*.py tự làm việc này),
 * entry là projects/<id>/video/entry.tsx và public dir là projects/<id>/public.
 * Alias @kit/* và @lib/* trỏ về engine/kit, engine/lib cho code của các dự án.
 */
import { Config } from "@remotion/cli/config";
import { existsSync } from "node:fs";
import path from "node:path";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);
// GPU qua ANGLE cho cảnh 3D (bóng đổ, hậu kỳ); render phần mềm rất chậm.
Config.setChromiumOpenGlRenderer("angle");

const ENGINE = process.cwd();
const ALIAS = { "@kit": path.join(ENGINE, "kit"), "@lib": path.join(ENGINE, "lib") };
const MODULES = [path.join(ENGINE, "node_modules"), "node_modules"];
Config.overrideRspackConfig((c) => ({
  ...c,
  resolve: { ...c.resolve, alias: { ...((c.resolve?.alias as object) ?? {}), ...ALIAS }, modules: MODULES },
}));

// Bản chrome-headless-shell tải kèm có lúc treo ở "Waiting for root component" trên máy này;
// có Chrome hệ thống thì dùng nó để render.
const SYSTEM_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (existsSync(SYSTEM_CHROME)) Config.setBrowserExecutable(SYSTEM_CHROME);
