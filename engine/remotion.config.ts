/**
 * Cấu hình CLI Remotion cho engine. Mọi lệnh chạy với cwd = engine/ (tools/*.py tự làm việc này),
 * entry là projects/<id>/video/entry.tsx và public dir là projects/<id>/public.
 * Alias @kit/* và @lib/* trỏ về engine/kit, engine/lib cho code của các dự án.
 */
import { Config } from "@remotion/cli/config";
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

// Render bằng chrome-headless-shell tải kèm Remotion. Không dùng Chrome hệ thống: ở chế độ ẩn nó chụp khung
// trước khi GPU vẽ xong lớp nặng (filter #sh/#glow), làm vật thể/chữ 2D chớp mất ngẫu nhiên trong video xuất.
